import "server-only";

import { cacheLife } from "next/cache";
import { AppsScriptError, callAppsScript } from "./apps-script";
import { matchesName, matchesPhone, normalizeName, normalizePhone } from "../normalize";
import { MAX_COUNT, MIN_COUNT } from "../rsvp-validation";
import type { GuestDetail, GuestId, GuestIndexEntry, GuestSuggestion, Rsvp } from "../types";

/** A Sheet count cell: a number, or "" when empty. */
export type SheetCount = number | "";

/** Row of the `Khach` tab as returned by Apps Script `getGuest` / `submitRsvp`. */
export interface SheetGuestRow {
  id: string;
  ten: string;
  di_tiec: string;
  so_nguoi: SheetCount;
  ghe_xe_di: SheetCount;
  ghe_xe_ve: SheetCount;
  cap_nhat_luc: string;
}

/** RSVP columns written by Apps Script `submitRsvp`. */
export interface SheetRsvp {
  di_tiec: "Có" | "Không";
  so_nguoi: SheetCount;
  ghe_xe_di: SheetCount;
  ghe_xe_ve: SheetCount;
}

interface SheetGuestListItem {
  id: string;
  ten: string;
  sdt: string;
}

export type GuestSearchBy = "ten" | "sdt";

const MAX_SUGGESTIONS = 8;
const MIN_NAME_LENGTH = 2;
const MIN_PHONE_DIGITS = 3;
const SHEET_YES = "Có";
const SHEET_NO = "Không";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSheetCount(value: unknown): value is SheetCount {
  return value === "" || (typeof value === "number" && Number.isFinite(value));
}

function parseGuestListItem(value: unknown): SheetGuestListItem {
  if (!isRecord(value)) {
    throw new Error("listGuests: item is not an object");
  }
  const { id, ten, sdt } = value;
  if (typeof id !== "string" || typeof ten !== "string") {
    throw new Error("listGuests: id/ten must be strings");
  }
  // Sheets may store a phone cell as a number; accept it rather than failing the whole list.
  if (typeof sdt === "string") {
    return { id, ten, sdt };
  }
  if (typeof sdt === "number") {
    return { id, ten, sdt: String(sdt) };
  }
  throw new Error("listGuests: sdt must be a string");
}

function parseGuestList(data: unknown): SheetGuestListItem[] {
  if (!Array.isArray(data)) {
    throw new Error("listGuests: data is not an array");
  }
  return data.map(parseGuestListItem);
}

/** Runtime guard for an Apps Script guest row; throws on any shape mismatch. Drops extra fields. */
export function parseSheetGuestRow(data: unknown): SheetGuestRow {
  if (!isRecord(data)) {
    throw new Error("guest row: not an object");
  }
  const { id, ten, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve, cap_nhat_luc } = data;
  if (
    typeof id !== "string" ||
    typeof ten !== "string" ||
    typeof di_tiec !== "string" ||
    typeof cap_nhat_luc !== "string"
  ) {
    throw new Error("guest row: id/ten/di_tiec/cap_nhat_luc must be strings");
  }
  if (!isSheetCount(so_nguoi) || !isSheetCount(ghe_xe_di) || !isSheetCount(ghe_xe_ve)) {
    throw new Error("guest row: counts must be numbers or empty");
  }
  return { id, ten, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve, cap_nhat_luc };
}

/** Cached guest index (includes sdtNorm — server-side only, never return it to the client). */
export async function getGuestIndex(): Promise<GuestIndexEntry[]> {
  "use cache";
  cacheLife("minutes");

  const rows = await callAppsScript("listGuests", {}, parseGuestList);
  const entries: GuestIndexEntry[] = [];
  for (const row of rows) {
    const id = row.id.trim();
    const ten = row.ten.trim();
    if (id === "" || ten === "") {
      continue;
    }
    entries.push({ id, ten, tenNorm: normalizeName(ten), sdtNorm: normalizePhone(row.sdt) });
  }
  return entries;
}

function isQueryLongEnough(by: GuestSearchBy, q: string): boolean {
  if (by === "ten") {
    return normalizeName(q).length >= MIN_NAME_LENGTH;
  }
  const digits = normalizePhone(q);
  return digits !== null && digits.length >= MIN_PHONE_DIGITS;
}

/** Up to 8 `{ id, ten }` suggestions sorted by name; [] below the minimum query length. */
/** Errors thrown inside a 'use cache' function lose their class, so restore the AppsScriptError contract. */
async function loadGuestIndex(): Promise<GuestIndexEntry[]> {
  try {
    return await getGuestIndex();
  } catch (error) {
    if (error instanceof AppsScriptError) {
      throw error;
    }
    throw new AppsScriptError("upstream", { cause: error });
  }
}

export async function searchGuests(by: GuestSearchBy, q: string): Promise<GuestSuggestion[]> {
  if (!isQueryLongEnough(by, q)) {
    return [];
  }
  const index = await loadGuestIndex();
  const matches = index.filter((entry) =>
    by === "ten" ? matchesName(entry.tenNorm, q) : matchesPhone(entry.sdtNorm, q),
  );
  return matches
    .sort((a, b) => a.ten.localeCompare(b.ten, "vi"))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ id, ten }) => ({ id, ten }));
}

function isPeopleCount(value: SheetCount): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_COUNT &&
    value <= MAX_COUNT
  );
}

/** Empty seat cell = 0; otherwise an integer 0–MAX_COUNT, or null when invalid. */
function toSeatCount(value: SheetCount): number | null {
  if (value === "") {
    return 0;
  }
  return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
}

/**
 * Empty or unexpected `di_tiec` → not answered (`rsvp: null`). A "Có" row whose people or seat
 * counts are missing/invalid is also treated as not answered, so the guest re-enters valid data.
 */
function toRsvp(row: SheetGuestRow): Rsvp | null {
  if (row.di_tiec === SHEET_NO) {
    return { diTiec: "khong" };
  }
  if (row.di_tiec !== SHEET_YES || !isPeopleCount(row.so_nguoi)) {
    return null;
  }
  const gheXeDi = toSeatCount(row.ghe_xe_di);
  const gheXeVe = toSeatCount(row.ghe_xe_ve);
  if (gheXeDi === null || gheXeVe === null) {
    return null;
  }
  return { diTiec: "co", soNguoi: row.so_nguoi, gheXeDi, gheXeVe };
}

export function mapSheetGuest(row: SheetGuestRow): GuestDetail {
  return {
    id: row.id,
    ten: row.ten,
    rsvp: toRsvp(row),
    capNhatLuc: row.cap_nhat_luc === "" ? null : row.cap_nhat_luc,
  };
}

export function toSheetRsvp(rsvp: Rsvp): SheetRsvp {
  if (rsvp.diTiec === "khong") {
    return { di_tiec: SHEET_NO, so_nguoi: "", ghe_xe_di: "", ghe_xe_ve: "" };
  }
  return {
    di_tiec: SHEET_YES,
    so_nguoi: rsvp.soNguoi,
    ghe_xe_di: rsvp.gheXeDi,
    ghe_xe_ve: rsvp.gheXeVe,
  };
}

/** Fresh (uncached) guest detail; AppsScriptError (e.g. `not_found`) propagates to the caller. */
export async function getGuestDetail(id: GuestId): Promise<GuestDetail> {
  const row = await callAppsScript("getGuest", { id }, parseSheetGuestRow);
  return mapSheetGuest(row);
}
