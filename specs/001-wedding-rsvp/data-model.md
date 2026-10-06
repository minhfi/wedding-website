# Data Model: Wedding Website with RSVP & Guest Bus Booking

Storage is a private Google Sheet; row 1 of each tab holds the exact column headers below.

## Sheet tab `Khach` (Guest)

| Column | Type | Written by | Rules |
|---|---|---|---|
| `id` | string | owner | Unique, non-empty (e.g. `K001`). Rows without id are ignored. |
| `ten` | string | owner | Display name, non-empty. |
| `sdt` | string | owner | Optional. Private: never leaves the server. Normalized for matching. |
| `di_tiec` | `"Có"` \| `"Không"` \| empty | site | Empty = not answered. |
| `so_nguoi` | integer 1–10 \| empty | site | Empty unless `di_tiec = Có`. |
| `ghe_xe_di` | integer 0–10 \| empty | site | 0 = not taking outbound bus; ≤ `so_nguoi`. Empty unless attending. |
| `ghe_xe_ve` | integer 0–10 \| empty | site | Same rules for return bus. |
| `cap_nhat_luc` | string `yyyy-MM-dd HH:mm:ss` (UTC+7) | site | Time of last submission. |

Owner sums: total people = `SUM(so_nguoi)`, outbound seats = `SUM(ghe_xe_di)`, return =
`SUM(ghe_xe_ve)` (SC-005).

## Sheet tab `LichSu` (Change log) — append-only

| Column | Type |
|---|---|
| `thoi_gian` | string `yyyy-MM-dd HH:mm:ss` (UTC+7) |
| `id` | guest id |
| `di_tiec` | `"Có"` \| `"Không"` |
| `so_nguoi` | integer \| empty |
| `ghe_xe_di` | integer \| empty |
| `ghe_xe_ve` | integer \| empty |

## Sheet tab `CauHinh` (Bus settings) — key/value

| `khoa` (key) | `gia_tri` (value) example |
|---|---|
| `xe_di_diem_don` | Công ty |
| `xe_di_gio` | 11:30 |
| `xe_ve_diem_don` | Nhà hàng A |
| `xe_ve_gio` | 17:30 |

Missing/empty values for a direction → that direction shows "Thông tin xe sẽ được cập nhật sau".
Gateway failure → `unavailable` → "Chưa tải được thông tin xe" + "Tải lại trang".

## Application types (TypeScript, `src/lib/types.ts`)

```ts
type GuestId = string

interface GuestSuggestion { id: GuestId; ten: string }          // the only shape sent for search

type Rsvp =
  | { diTiec: 'khong' }
  | { diTiec: 'co'; soNguoi: number; gheXeDi: number; gheXeVe: number } // ghe 0 = no bus

interface GuestDetail { id: GuestId; ten: string; rsvp: Rsvp | null; capNhatLuc: string | null }

interface BusTrip { diemDon: string; gio: string }
interface BusInfo { di: BusTrip | null; ve: BusTrip | null }   // null direction = empty state
type BusInfoResult = { status: 'ok'; info: BusInfo } | { status: 'unavailable' } // error state

// Server-only (src/lib/server/): never serialized to the client
interface GuestIndexEntry { id: GuestId; ten: string; tenNorm: string; sdtNorm: string | null }
```

## RSVP form state (client)

```text
idle ──search──▶ searching ──▶ suggestions | noMatch | searchError
suggestion picked ──▶ loadingGuest ──▶ editing(prefilled or empty) | guestError
editing ──submit(valid)──▶ submitting ──▶ success | submitError(keeps values)
success ──"Sửa câu trả lời"──▶ editing
```

## Validation rules (`validateRsvp`, shared client + server)

Input (form/wire): `{ guestId, diTiec: 'co'|'khong', soNguoi?, xeDi?: boolean, gheXeDi?, xeVe?: boolean, gheXeVe? }`

1. `guestId` non-empty string (server additionally checks it exists).
2. `diTiec ∈ {co, khong}`.
3. `khong` → people/bus fields must be absent; output `{ diTiec: 'khong' }`.
4. `co` → `soNguoi` integer 1–10.
5. For each direction: `xeX === true` → `gheXeX` integer 1–10 and ≤ `soNguoi`; `xeX === false` →
   `gheXeX` absent; output seat 0.
6. Error messages (Vietnamese) keyed by field: `soNguoi`, `gheXeDi`, `gheXeVe`, `diTiec`, `guestId`.
