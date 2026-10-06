import "server-only";
import { cacheLife } from "next/cache";
import type { BusInfo, BusInfoResult, BusTrip } from "@/lib/types";
import { callAppsScript } from "./apps-script";

/** `CauHinh` keys returned by the Apps Script `getBusInfo` action. */
type BusInfoKey =
  | "xe_di_diem_don"
  | "xe_di_gio"
  | "xe_ve_diem_don"
  | "xe_ve_gio";
type BusInfoData = Record<BusInfoKey, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Missing keys become "", values are trimmed; non-string values are rejected. */
function readField(data: Record<string, unknown>, key: BusInfoKey): string {
  const value = data[key];
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`getBusInfo: "${key}" is not a string`);
  }
  return value.trim();
}

function parseBusInfoData(data: unknown): BusInfoData {
  if (!isRecord(data)) {
    throw new Error("getBusInfo: data is not an object");
  }
  return {
    xe_di_diem_don: readField(data, "xe_di_diem_don"),
    xe_di_gio: readField(data, "xe_di_gio"),
    xe_ve_diem_don: readField(data, "xe_ve_diem_don"),
    xe_ve_gio: readField(data, "xe_ve_gio"),
  };
}

function toTrip(diemDon: string, gio: string): BusTrip | null {
  return diemDon && gio ? { diemDon, gio } : null;
}

function toBusInfo(data: BusInfoData): BusInfo {
  return {
    di: toTrip(data.xe_di_diem_don, data.xe_di_gio),
    ve: toTrip(data.xe_ve_diem_don, data.xe_ve_gio),
  };
}

/**
 * Cached part. It throws on failure so errors are never stored in the cache;
 * only successful reads are kept (refreshed in the background after 240 s).
 */
async function fetchBusInfo(): Promise<BusInfo> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 240, expire: 3600 });

  const data = await callAppsScript("getBusInfo", {}, parseBusInfoData);
  return toBusInfo(data);
}

/** Never throws: any failure maps to `unavailable` so the page still renders. */
export async function getBusInfo(): Promise<BusInfoResult> {
  try {
    return { status: "ok", info: await fetchBusInfo() };
  } catch {
    return { status: "unavailable" };
  }
}
