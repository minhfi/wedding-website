import type { GuestId, Rsvp } from "./types";

/** Wire/form shape of an RSVP submission. Numbers must be real numbers, not strings. */
export interface RsvpInput {
  guestId: GuestId;
  diTiec: "co" | "khong";
  soNguoi?: number;
  xeDi?: boolean;
  gheXeDi?: number;
  xeVe?: boolean;
  gheXeVe?: number;
}

export type RsvpField = keyof RsvpInput;

export type RsvpErrors = Partial<Record<RsvpField, string>>;

export type RsvpValidationResult =
  | { ok: true; value: { guestId: GuestId; rsvp: Rsvp } }
  | { ok: false; errors: RsvpErrors };

export const MIN_COUNT = 1;
export const MAX_COUNT = 10;

const MESSAGES = {
  guestId: "Vui lòng chọn tên khách mời",
  diTiec: "Vui lòng chọn có đi tiệc hay không",
  soNguoi: `Số người đi tiệc phải từ ${MIN_COUNT} đến ${MAX_COUNT}`,
  xe: "Vui lòng chọn có đi xe hay không",
  gheRange: `Số ghế phải từ ${MIN_COUNT} đến ${MAX_COUNT}`,
  gheOverPeople: "Số ghế không được nhiều hơn số người đi tiệc",
  gheWithoutBus: "Không cần nhập số ghế khi không đi xe",
  notAttendingExtra: "Không cần nhập khi không đi tiệc",
} as const;

const ATTENDANCE_FIELDS = ["soNguoi", "xeDi", "gheXeDi", "xeVe", "gheXeVe"] as const;

const BUS_DIRECTIONS = [
  { flag: "xeDi", seats: "gheXeDi" },
  { flag: "xeVe", seats: "gheXeVe" },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_COUNT &&
    value <= MAX_COUNT
  );
}

export function validateRsvp(input: unknown): RsvpValidationResult {
  const data = isRecord(input) ? input : {};
  const errors: RsvpErrors = {};

  const { guestId, diTiec } = data;
  if (typeof guestId !== "string" || guestId.trim() === "") {
    errors.guestId = MESSAGES.guestId;
  }

  if (diTiec === "khong") {
    for (const field of ATTENDANCE_FIELDS) {
      if (data[field] !== undefined) {
        errors[field] = MESSAGES.notAttendingExtra;
      }
    }
    if (typeof guestId === "string" && Object.keys(errors).length === 0) {
      return { ok: true, value: { guestId, rsvp: { diTiec: "khong" } } };
    }
    return { ok: false, errors };
  }

  if (diTiec !== "co") {
    errors.diTiec = MESSAGES.diTiec;
    return { ok: false, errors };
  }

  const { soNguoi } = data;
  if (!isCount(soNguoi)) {
    errors.soNguoi = MESSAGES.soNguoi;
  }

  const seats = { gheXeDi: 0, gheXeVe: 0 };
  for (const { flag, seats: seatField } of BUS_DIRECTIONS) {
    const takesBus = data[flag];
    const seatValue = data[seatField];
    if (takesBus === true) {
      if (!isCount(seatValue)) {
        errors[seatField] = MESSAGES.gheRange;
      } else if (isCount(soNguoi) && seatValue > soNguoi) {
        errors[seatField] = MESSAGES.gheOverPeople;
      } else {
        seats[seatField] = seatValue;
      }
    } else if (takesBus === false) {
      if (seatValue !== undefined) {
        errors[seatField] = MESSAGES.gheWithoutBus;
      }
    } else {
      errors[flag] = MESSAGES.xe;
    }
  }

  if (
    typeof guestId === "string" &&
    isCount(soNguoi) &&
    Object.keys(errors).length === 0
  ) {
    return {
      ok: true,
      value: {
        guestId,
        rsvp: { diTiec: "co", soNguoi, gheXeDi: seats.gheXeDi, gheXeVe: seats.gheXeVe },
      },
    };
  }
  return { ok: false, errors };
}
