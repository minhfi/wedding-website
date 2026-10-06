# Research: Wedding Website with RSVP & Guest Bus Booking

Sources: `node_modules/next/dist/docs/` (Next.js 16.3.8) — `01-getting-started/08-caching.md`,
`15-route-handlers.md`, `03-api-reference/04-functions/cacheLife.md`, `02-guides/testing/vitest.md`.

## R1. Caching model and 5-minute freshness for bus info (FR-016, SC-007)

- **Decision**: Enable `cacheComponents: true`. Read bus settings in a server-only helper using
  `'use cache'` + `cacheLife({ stale: 60, revalidate: 240, expire: 3600 })`. The bus section is a
  Server Component wrapped in `<Suspense>`.
- **Rationale**: Next 16's recommended model. With revalidate 240 s the next request after 4 min
  triggers a background refresh, so changes show within ~5 min. The page shell (names, date,
  venue, QR) stays fully static/prerendered.
- **Alternatives**: Previous model (`fetch(..., { next: { revalidate } })`) — still supported but
  legacy in v16 docs; fetching CauHinh on every request — adds 1–2 s Apps Script latency to every
  page view and burns quota.

## R2. Guest lookup without per-keystroke Apps Script calls (FR-008–FR-010, SC-004)

- **Decision**: Two server paths.
  1. **Search** `GET /api/guests/search?by=ten|sdt&q=...`: matches against a server-side guest
     index (id, name, normalized name, normalized phone) loaded from Apps Script through a
     `'use cache'` helper with `cacheLife('minutes')` (revalidate 60 s). Returns at most 8
     `{ id, ten }` items. Phone fields never leave the server.
  2. **Detail** `GET /api/guests/[id]`: uncached call to Apps Script returning the guest's
     current RSVP for pre-fill (fresh after edits).
- **Rationale**: Suggestions respond in tens of ms from cache instead of 1–2 s per keystroke;
  prefill is always fresh; newly added guests appear within ~1 min.
- **Alternatives**: Ship the whole name list to the browser (violates "phone never sent" only if
  phones included, but still exposes the full list at once and grows payload); call Apps Script
  per keystroke (too slow, quota heavy).

## R3. Apps Script web app as the Sheet gateway (FR-014, FR-015, FR-020)

- **Decision**: One Apps Script project bound to the Sheet, deployed as a Web App
  ("Execute as: me", "Who has access: Anyone"). Single `doPost(e)` endpoint taking JSON
  `{ secret, action, ... }` with actions `listGuests`, `getGuest`, `getBusInfo`, `submitRsvp`.
  Secret compared against a Script Property. Writes use `LockService.getScriptLock()`; `submitRsvp`
  updates the Khach row and appends the LichSu row inside the same lock.
- **Rationale**: Apps Script `doPost` cannot read custom request headers, so the secret travels in
  the JSON body (server-to-server only, never in the browser). One POST endpoint keeps the script
  tiny. Lock prevents interleaved writes (spec: last write wins, both logged).
- **Notes**: Apps Script responds with a 302 to `script.googleusercontent.com`; Node `fetch` with
  default `redirect: 'follow'` handles it (the script has already executed). Server timeout
  10 s via `AbortSignal.timeout(10_000)`.
- **Source location**: `apps-script/Code.gs` in this repo; deployed manually by copy-paste
  (manual task with steps in quickstart).
- **Alternatives**: Google Sheets API with a service account (more setup: GCP project, key in
  env, `googleapis` dependency ~ large) — rejected per Simplicity.

## R4. Route Handlers vs Server Actions

- **Decision**: Route Handlers for search, detail, and submit (`POST /api/rsvp`).
- **Rationale**: Constitution allows either; Route Handlers are plain `Request → Response`
  functions, easy to unit-test with Vitest by constructing `Request` objects and mocking the
  Apps Script client. GET handlers read `request.nextUrl`/params so they render at request time
  under Cache Components.
- **Alternatives**: Server Action for submit — fine, but mixing two patterns adds cognitive load.

## R5. Validation without a schema library

- **Decision**: Hand-written, pure TypeScript validator `validateRsvp(input: unknown)` returning
  a discriminated union `{ ok: true, value } | { ok: false, errors }`, shared by client form and
  route handler.
- **Rationale**: ~5 fields with simple rules; avoids adding `zod` (constitution: justify deps).
- **Alternatives**: zod — nicer ergonomics, rejected as unnecessary dependency.

## R6. Vietnamese text normalization and phone normalization (FR-010)

- **Decision**: `normalizeName(s)`: lowercase → `normalize('NFD')` → strip `̀-ͯ` →
  `đ→d` → collapse spaces. Match if the normalized name contains the normalized query.
  `normalizePhone(s)`: keep digits; leading `84` (from "+84") → `0`. Match by prefix of the
  normalized phone. Minimum query: 2 chars (name) / 3 digits (phone).
- **Rationale**: Platform APIs only, no dependency; covers "nguyen van" → "Nguyễn Văn An".

## R7. Countdown independent of device time zone (FR-003)

- **Decision**: Target is the absolute instant `2027-01-17T14:00:00+07:00`. A Client Component
  computes `target - Date.now()` only after mount (`useEffect` + 1 s interval, cleared on
  unmount); before mount it renders a neutral placeholder. After the target it shows the
  "arrived" message.
- **Rationale**: Absolute instant makes device time zone irrelevant. Reading time only after
  mount avoids hydration mismatch and avoids non-deterministic values during prerender under
  Cache Components.

## R8. Lunar date and date text

- **Decision**: Static strings in the typed site config (`"Chủ nhật, 17.01.2027"`,
  `"Nhằm ngày 10 tháng Chạp năm Bính Ngọ"`). Conversion verified once with Hồ Ngọc Đức's
  algorithm (UTC+7): lunar 10/12 Bính Ngọ = 17/01/2027; Tết Đinh Mùi = 06/02/2027.
- **Rationale**: Single fixed event; no lunar library needed.

## R9. Map, images, fonts

- **Map**: Google Maps embed iframe `https://www.google.com/maps?q=<encoded address>&output=embed`
  (no API key) with `title`, `loading="lazy"`; plus a "Mở bản đồ" link to the configured maps URL.
- **Images**: `next/image` for cover (priority) and QR from `public/`.
- **Fonts**: `next/font/google` with `subsets: ['latin', 'vietnamese']`; exact families chosen in
  the approved visual direction (must support Vietnamese, e.g. Cormorant Garamond / Be Vietnam
  Pro).

## R10. Testing setup

- **Decision**: Per Next docs: `vitest @vitejs/plugin-react jsdom @testing-library/react
  @testing-library/dom vite-tsconfig-paths`, plus `@testing-library/user-event` and
  `@testing-library/jest-dom`. Alias `server-only` to an empty module in `vitest.config.mts` so
  server modules are importable in tests. Route handler tests run in the `node` environment
  (`// @vitest-environment node`). Async Server Components are not unit-tested (Vitest limitation
  per docs); they are verified with agent-browser.
- **Scripts**: `typecheck: tsc --noEmit`, `test: vitest run`, `test:watch: vitest`.

## R11. Visual direction

- **Decision**: Before any UI task, propose a direction with `frontend-design` (palette tokens,
  typography, section layouts at 360 px) and get owner approval; record it in spec
  `Implementation notes`. Tokens go in `@theme` in `src/app/globals.css`.

## R12. Tooling gap

- `agent-browser` CLI is not installed on the machine. UI verification tasks are blocked until
  the owner installs it (root README → Prerequisites).
