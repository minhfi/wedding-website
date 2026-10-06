export type GuestId = string;

/** The only guest shape sent to the browser for search results. */
export interface GuestSuggestion {
  id: GuestId;
  ten: string;
}

/** Seat count 0 means the guest is not taking that bus. */
export type Rsvp =
  | { diTiec: "khong" }
  | { diTiec: "co"; soNguoi: number; gheXeDi: number; gheXeVe: number };

export interface GuestDetail {
  id: GuestId;
  ten: string;
  rsvp: Rsvp | null;
  capNhatLuc: string | null;
}

export interface BusTrip {
  diemDon: string;
  gio: string;
}

/** A null direction renders the "not updated yet" empty state. */
export interface BusInfo {
  di: BusTrip | null;
  ve: BusTrip | null;
}

export type BusInfoResult =
  | { status: "ok"; info: BusInfo }
  | { status: "unavailable" };

/**
 * Server-only: used by the guest search index in `src/lib/server/`.
 * Contains the normalized phone number — never serialize it to the client.
 */
export interface GuestIndexEntry {
  id: GuestId;
  ten: string;
  tenNorm: string;
  sdtNorm: string | null;
}
