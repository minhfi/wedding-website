# Contract: Browser ↔ Next.js Route Handlers

All responses are JSON. Errors use `{ "error": { "code": string, "message": string, "fields"?: Record<string,string> } }`
with Vietnamese `message`. No response ever contains `sdt` or the Apps Script URL/secret.

## `GET /api/guests/search?by=ten|sdt&q=<text>`

- `by` required: `ten` or `sdt`. `q` required.
- Below minimum length (2 chars for `ten`, 3 digits for `sdt`) → `200 { "items": [] }`.
- Matching per research R6; max 8 items, sorted by name.

| Status | Body |
|---|---|
| 200 | `{ "items": [{ "id": "K001", "ten": "Nguyễn Văn An" }] }` (empty array = no match) |
| 400 | `error.code = "bad_request"` (missing/invalid `by`) |
| 502 | `error.code = "upstream"` (Apps Script failed/timeout) |

## `GET /api/guests/{id}`

| Status | Body |
|---|---|
| 200 | `{ "id": "K001", "ten": "Nguyễn Văn An", "rsvp": null \| Rsvp, "capNhatLuc": null \| "2026-11-02 20:15:03" }` |
| 404 | `error.code = "not_found"` |
| 502 | `error.code = "upstream"` |

`Rsvp` = `{ "diTiec": "khong" }` or `{ "diTiec": "co", "soNguoi": 3, "gheXeDi": 2, "gheXeVe": 0 }`.

## `POST /api/rsvp`

Request body:

```json
{ "guestId": "K001", "diTiec": "co", "soNguoi": 3, "xeDi": true, "gheXeDi": 2, "xeVe": false }
```

| Status | Body |
|---|---|
| 200 | `{ "ok": true, "guest": GuestDetail }` (saved values echo) |
| 400 | `error.code = "invalid"`, `fields` per data-model validation rules; nothing written |
| 404 | `error.code = "not_found"` (unknown guestId); nothing written |
| 502 | `error.code = "upstream"` |
