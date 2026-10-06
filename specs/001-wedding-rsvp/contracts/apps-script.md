# Contract: Next.js server ↔ Google Apps Script Web App

- Endpoint: `APPS_SCRIPT_URL` (server-only env). Method: `POST`, `Content-Type: text/plain`
  with a JSON string body (read in the script via `e.postData.contents`), redirects followed,
  timeout 10 s. Server-to-server only, so CORS does not apply.
- Every request body: `{ "secret": APPS_SCRIPT_SECRET, "action": string, ...params }`.
  Script compares `secret` with Script Property `SECRET`; mismatch → `{ "ok": false, "error": "unauthorized" }`.
- Every response: `{ "ok": true, "data": ... }` or `{ "ok": false, "error": "<code>" }`
  (HTTP status is always 200 from Apps Script; the client maps `ok:false` to errors).

| action | params | data |
|---|---|---|
| `listGuests` | – | `[{ "id", "ten", "sdt" }]` (rows with non-empty id; `sdt` raw string or "") |
| `getGuest` | `id` | `{ "id", "ten", "di_tiec", "so_nguoi", "ghe_xe_di", "ghe_xe_ve", "cap_nhat_luc" }` or error `not_found` |
| `getBusInfo` | – | `{ "xe_di_diem_don", "xe_di_gio", "xe_ve_diem_don", "xe_ve_gio" }` (missing keys → "") |
| `submitRsvp` | `id`, `di_tiec` ("Có"/"Không"), `so_nguoi`, `ghe_xe_di`, `ghe_xe_ve` (numbers or "") | same shape as `getGuest` after write |

`submitRsvp` behavior (inside `LockService.getScriptLock()`, wait ≤ 10 s):
1. Find row by `id` in `Khach`; none → `not_found`, nothing written.
2. Write `di_tiec`, `so_nguoi`, `ghe_xe_di`, `ghe_xe_ve`, `cap_nhat_luc` (Asia/Ho_Chi_Minh,
   `yyyy-MM-dd HH:mm:ss`).
3. Append `[thoi_gian, id, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve]` to `LichSu`.
4. Columns are located by header name in row 1 (not by position).

The Next.js server re-validates everything before calling `submitRsvp`; the script trusts only the
secret, not the values' shape beyond row lookup.
