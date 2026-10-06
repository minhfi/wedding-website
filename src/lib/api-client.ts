import type { RsvpField, RsvpInput } from "./rsvp-validation";
import type { GuestDetail, GuestSuggestion, Rsvp } from "./types";

export type ApiFieldErrors = Partial<Record<RsvpField, string>>;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string; fields?: ApiFieldErrors };

type ApiFailure = Extract<ApiResult<never>, { ok: false }>;

export type SearchBy = "ten" | "sdt";

const FALLBACK_MESSAGE = "Có lỗi kết nối, vui lòng thử lại";

const RSVP_FIELDS: readonly RsvpField[] = [
  "guestId",
  "diTiec",
  "soNguoi",
  "xeDi",
  "gheXeDi",
  "xeVe",
  "gheXeVe",
];

const UNKNOWN_FAILURE: ApiFailure = { ok: false, code: "unknown", message: FALLBACK_MESSAGE };
const NETWORK_FAILURE: ApiFailure = { ok: false, code: "network", message: FALLBACK_MESSAGE };
const ABORTED_FAILURE: ApiFailure = { ok: false, code: "aborted", message: "" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeatCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRsvpField(key: string): key is RsvpField {
  return RSVP_FIELDS.some((field) => field === key);
}

function parseSuggestion(value: unknown): GuestSuggestion | null {
  if (!isRecord(value)) return null;
  const { id, ten } = value;
  if (typeof id !== "string" || typeof ten !== "string") return null;
  return { id, ten };
}

function parseSuggestions(body: unknown): GuestSuggestion[] | null {
  if (!isRecord(body) || !Array.isArray(body.items)) return null;
  const suggestions: GuestSuggestion[] = [];
  for (const item of body.items) {
    const suggestion = parseSuggestion(item);
    if (!suggestion) return null;
    suggestions.push(suggestion);
  }
  return suggestions;
}

/** `undefined` means the value is not a valid RSVP; `null` is a valid "no RSVP yet". */
function parseRsvp(value: unknown): Rsvp | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (value.diTiec === "khong") return { diTiec: "khong" };
  if (value.diTiec !== "co") return undefined;
  const { soNguoi, gheXeDi, gheXeVe } = value;
  if (!isSeatCount(soNguoi) || !isSeatCount(gheXeDi) || !isSeatCount(gheXeVe)) {
    return undefined;
  }
  return { diTiec: "co", soNguoi, gheXeDi, gheXeVe };
}

function parseGuestDetail(value: unknown): GuestDetail | null {
  if (!isRecord(value)) return null;
  const { id, ten, capNhatLuc } = value;
  if (typeof id !== "string" || typeof ten !== "string") return null;
  if (typeof capNhatLuc !== "string" && capNhatLuc !== null) return null;
  const rsvp = parseRsvp(value.rsvp);
  if (rsvp === undefined) return null;
  return { id, ten, rsvp, capNhatLuc };
}

function parseSubmitResponse(body: unknown): GuestDetail | null {
  if (!isRecord(body) || body.ok !== true) return null;
  return parseGuestDetail(body.guest);
}

function parseFieldErrors(value: unknown): ApiFieldErrors | undefined {
  if (!isRecord(value)) return undefined;
  const fields: ApiFieldErrors = {};
  for (const [key, message] of Object.entries(value)) {
    if (isRsvpField(key) && typeof message === "string") {
      fields[key] = message;
    }
  }
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function parseErrorBody(body: unknown): ApiFailure {
  if (!isRecord(body) || !isRecord(body.error)) return UNKNOWN_FAILURE;
  const { code, message } = body.error;
  if (typeof code !== "string" || typeof message !== "string") return UNKNOWN_FAILURE;
  const fields = parseFieldErrors(body.error.fields);
  return fields ? { ok: false, code, message, fields } : { ok: false, code, message };
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

async function request<T>(
  url: string,
  init: RequestInit,
  parse: (body: unknown) => T | null,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return isAbort(error, init.signal ?? undefined) ? ABORTED_FAILURE : NETWORK_FAILURE;
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    return isAbort(error, init.signal ?? undefined) ? ABORTED_FAILURE : UNKNOWN_FAILURE;
  }

  if (!response.ok) return parseErrorBody(body);
  const data = parse(body);
  return data === null ? UNKNOWN_FAILURE : { ok: true, data };
}

export function searchGuests(
  by: SearchBy,
  q: string,
  signal?: AbortSignal,
): Promise<ApiResult<GuestSuggestion[]>> {
  const params = new URLSearchParams({ by, q });
  return request(`/api/guests/search?${params.toString()}`, { signal }, parseSuggestions);
}

export function getGuest(id: string): Promise<ApiResult<GuestDetail>> {
  return request(`/api/guests/${encodeURIComponent(id)}`, {}, parseGuestDetail);
}

export function submitRsvp(payload: RsvpInput): Promise<ApiResult<GuestDetail>> {
  return request(
    "/api/rsvp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    parseSubmitResponse,
  );
}
