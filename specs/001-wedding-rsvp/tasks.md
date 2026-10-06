---
description: "Task list for MP-1 wedding website with RSVP & guest bus booking"
---

# Tasks: Wedding Website with RSVP & Guest Bus Booking

**Ticket**: [MP-1](https://minhfitech.atlassian.net/browse/MP-1)

**Input**: Design documents from `specs/001-wedding-rsvp/` (plan.md, spec.md, research.md,
data-model.md, contracts/, quickstart.md)

**Tests**: Required — constitution III (TDD). Every code task starts by writing failing tests,
then implements until they pass. Verify = `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

**Organization**: Grouped by user story (US1 P1 RSVP, US2 P2 information page, US3 P3 edit).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3
- **[manual]**: needs human action or judgement; steps included; ticked only after the owner confirms
- All paths relative to `workspace/frontend/`. All tasks belong to **MP-1**.

**UI task rules (no Figma)**: every UI task ends with (a) verify with `agent-browser` (via
`next-dev-loop`, Next 16.3 + Turbopack) against the spec AC and the approved visual direction at
360 px, 768 px and 1280 px, checking every state it touches, and (b) review the changed UI files
with `web-design-guidelines`; fix findings or record accepted deviations in spec
`Implementation notes`. Colors/fonts/spacing only via `@theme` tokens.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and configuration required before any feature code.

- [x] T001 MP-1 Add test tooling: `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths`; create `vitest.config.mts` (plugins react + tsconfigPaths, `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, alias `server-only` → `./src/test/server-only-stub.ts`), `vitest.setup.ts` (imports `@testing-library/jest-dom/vitest`), `src/test/server-only-stub.ts` (empty export); add scripts to `package.json`: `"typecheck": "tsc --noEmit"`, `"test": "vitest run --passWithNoTests"`, `"test:watch": "vitest"`. Done when `pnpm test` and `pnpm typecheck` exit 0.
- [x] T002 MP-1 Enable Cache Components and env template: set `cacheComponents: true` in `next.config.ts` (per `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`); create `.env.example` with `APPS_SCRIPT_URL=` and `APPS_SCRIPT_SECRET=` (comment: server-only, never `NEXT_PUBLIC_`); confirm `.gitignore` ignores `.env*` except `.env.example` (add `!.env.example` if needed). Done when `pnpm build` passes.
- [x] T003 MP-1 Run verify once (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) and record results as the baseline in `## Build log` of `specs/001-wedding-rsvp/tasks.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Visual direction, shared types/config, pure logic, and the Sheet gateway.

**⚠️ CRITICAL**: T004 (approval) blocks every UI task (T005, T016–T019, T022–T024, T026–T027,
T030, T032).

- [x] T004 [manual] MP-1 Propose visual direction with the `frontend-design` skill, constrained by constitution IV and spec FR-023: palette from the bridal bouquet (white/cream primary, fresh leaf-green accent, charcoal contrast), modern with generous whitespace, thin serif for the couple's names, clean sans for body, both fonts with a Vietnamese subset (e.g. Cormorant Garamond + Be Vietnam Pro). Deliver: token list (color names + hex with AA contrast pairs, font families, type scale, spacing scale, radius), and a short description/sketch of each of the 7 sections at 360 px. Record it in `specs/001-wedding-rsvp/spec.md` under `## Implementation notes → Visual direction`. **Steps for owner**: review the proposal → reply "approved" or list changes. Tick only after owner approval.
- [ ] T005 MP-1 Implement approved tokens and fonts: `@theme` tokens in `src/app/globals.css` (remove create-next-app demo styles), `src/app/layout.tsx` with `lang="vi"`, `next/font/google` fonts with `subsets: ['latin', 'vietnamese']` exposed as CSS variables, metadata title "Phi & Ngân — 17.01.2027" and description in Vietnamese; replace demo `src/app/page.tsx` content with an empty `<main>`. Verify per UI task rules (fonts render Vietnamese diacritics correctly).
- [x] T006 [P] MP-1 Types and site config: create `src/lib/types.ts` with the types in `data-model.md` (GuestId, GuestSuggestion, Rsvp, GuestDetail, BusTrip, BusInfo; GuestIndexEntry documented as server-only) and `src/config/site.ts` (typed `siteConfig`: groom "Nguyễn Minh Phi", bride "Trần Thị Mỹ Ngân", `dateText: "Chủ nhật, 17.01.2027"`, `lunarText: "Nhằm ngày 10 tháng Chạp năm Bính Ngọ"`, `timeText: "14:00"`, `eventAt: "2027-01-17T14:00:00+07:00"`, venue placeholder "Nhà hàng A" + address + mapsUrl, cover/QR image paths, QR account holder + bank placeholders). TDD: `src/config/site.test.ts` asserts the exact date/lunar strings and that `Date.parse(eventAt) === Date.UTC(2027, 0, 17, 7, 0, 0)`.
- [x] T007 [P] MP-1 TDD name/phone normalization in `src/lib/normalize.ts` with tests in `src/lib/normalize.test.ts`: `normalizeName` (lowercase, NFD, strip `̀-ͯ`, `đ→d`, collapse/trim spaces; "NGUYỄN  Văn An" → "nguyen van an"), `normalizePhone` (digits only; leading "84" → "0"; "+84 901-234.567" → "0901234567"; empty → null), `matchesName(entryNorm, query)` (contains), `matchesPhone(entryNorm, query)` (prefix).
- [x] T008 [P] MP-1 TDD shared validator `validateRsvp(input: unknown)` in `src/lib/rsvp-validation.ts` with tests in `src/lib/rsvp-validation.test.ts`, implementing data-model rules verbatim: "`guestId` non-empty string"; "`diTiec ∈ {co, khong}`"; "`khong` → people/bus fields must be absent; output `{ diTiec: 'khong' }`"; "`co` → `soNguoi` integer 1–10"; "`xeX === true` → `gheXeX` integer 1–10 and ≤ `soNguoi`; `xeX === false` → `gheXeX` absent; output seat 0". Returns `{ ok: true, value: { guestId, rsvp: Rsvp } } | { ok: false, errors: Partial<Record<'guestId'|'diTiec'|'soNguoi'|'gheXeDi'|'gheXeVe', string>> }` with Vietnamese messages (e.g. "Số ghế không được nhiều hơn số người đi tiệc"). Cover: boundaries 0/1/10/11, non-integers, strings, seats > people, missing fields, extra fields with `khong`.
- [x] T009 MP-1 TDD server-only Apps Script client in `src/lib/server/apps-script.ts` (`import 'server-only'`) with tests in `src/lib/server/apps-script.test.ts` (`// @vitest-environment node`, `fetch` mocked): `callAppsScript<T>(action, params)` posts `JSON.stringify({ secret, action, ...params })` with `Content-Type: text/plain` to `process.env.APPS_SCRIPT_URL`, `signal: AbortSignal.timeout(10_000)`; returns `data` on `{ ok: true }`; throws typed `AppsScriptError` with `code` (`'not_found' | 'unauthorized' | 'upstream'`) on `{ ok: false }`, non-JSON, network error, or timeout; throws `upstream` when env vars are missing. Per `contracts/apps-script.md`.
- [x] T010 MP-1 Write the Sheet gateway `apps-script/Code.gs` implementing `contracts/apps-script.md`: `doPost(e)` parses `e.postData.contents`, checks `secret` against Script Property `SECRET`, dispatches `listGuests`, `getGuest`, `getBusInfo`, `submitRsvp`; locates columns by row-1 header names; `submitRsvp` runs inside `LockService.getScriptLock().waitLock(10000)`, updates the Khach row (`di_tiec`, `so_nguoi`, `ghe_xe_di`, `ghe_xe_ve`, `cap_nhat_luc` formatted `yyyy-MM-dd HH:mm:ss` in `Asia/Ho_Chi_Minh`) and appends `[thoi_gian, id, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve]` to LichSu; returns `ContentService.createTextOutput(JSON.stringify(...)).setMimeType(ContentService.MimeType.JSON)`. Include a header comment with deploy steps (quickstart §2). Not unit-tested (runs in Google); verified in T011.
- [ ] T011 [manual] MP-1 Sheet setup and gateway deploy (quickstart §1–§3). **Preconditions**: owner logged into the Google account owning the Sheet. **Steps**: (1) create tabs `Khach` (headers `id, ten, sdt, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve, cap_nhat_luc`), `LichSu` (`thoi_gian, id, di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve`), `CauHinh` (`khoa, gia_tri` with rows `xe_di_diem_don | Công ty`, `xe_di_gio | 11:30`, `xe_ve_diem_don | Nhà hàng A`, `xe_ve_gio | 17:30`); (2) add test guests K001 "Nguyễn Văn An" 0901234567, K002 "Nguyễn Văn An" 0912000111, K003 "Trần Thị Bình" (no phone); (3) Extensions → Apps Script, paste `apps-script/Code.gs`, set Script Property `SECRET`; (4) Deploy → Web app, Execute as Me, Access Anyone; (5) put URL + secret in `.env.local`; (6) agent runs `curl -sL -X POST "$APPS_SCRIPT_URL" -H 'Content-Type: text/plain' -d '{"secret":"…","action":"getBusInfo"}'`. **Expected**: JSON `{ "ok": true, "data": { "xe_di_diem_don": "Công ty", … } }`; wrong secret returns `unauthorized`. Sheet must remain private (not "Anyone with the link").

**Checkpoint**: tokens, types, validator, normalization, gateway ready — user stories can start.

---

## Phase 3: User Story 1 - Guest confirms attendance and bus seats (Priority: P1) 🎯 MVP

**Goal**: A guest finds themselves by name or phone, answers attendance/people/bus seats, submits,
and the Sheet row + LichSu row are written.

**Independent Test**: quickstart V2–V6, V10, V12: look up a test guest, submit, confirm the Khach
row and one new LichSu row; no phone numbers in any response.

- [x] T012 [US1] MP-1 TDD guest server module `src/lib/server/guests.ts` (`import 'server-only'`) with tests `src/lib/server/guests.test.ts` (node env; mock `./apps-script` and `next/cache`): `getGuestIndex()` with `'use cache'` + `cacheLife('minutes')` builds `GuestIndexEntry[]` from `listGuests` (skip rows with empty id/ten); `searchGuests(by: 'ten'|'sdt', q)` returns `[]` below minimums ("at least 2 characters for name or 3 digits for phone"), else up to 8 `GuestSuggestion` sorted by `ten` (assert returned objects have exactly keys `id`,`ten`); `mapSheetGuest(row)` → `GuestDetail` ("`di_tiec` empty = not answered" → `rsvp: null`; "Có" → `{diTiec:'co', soNguoi, gheXeDi, gheXeVe}` with empty seats → 0; "Không" → `{diTiec:'khong'}`); `toSheetRsvp(rsvp)` → `{ di_tiec, so_nguoi, ghe_xe_di, ghe_xe_ve }` ("all counts empty when not attending", seats 0 when direction is "Không").
- [x] T013 [US1] MP-1 TDD `GET /api/guests/search` in `src/app/api/guests/search/route.ts` with tests `src/app/api/guests/search/route.test.ts` (node env; mock `@/lib/server/guests`): per `contracts/http-api.md` — 400 `bad_request` for missing/invalid `by`; 200 `{ items }`; 502 `upstream` on `AppsScriptError`; error body shape `{ error: { code, message } }` with Vietnamese message; response JSON never contains `sdt`.
- [x] T014 [US1] MP-1 TDD `POST /api/rsvp` in `src/app/api/rsvp/route.ts` with tests `src/app/api/rsvp/route.test.ts` (node env; mock `@/lib/server/apps-script`): invalid body → 400 `invalid` with `fields` from `validateRsvp` and **no** Apps Script call; unknown id (`not_found`) → 404; success calls `submitRsvp` with `{ id, ...toSheetRsvp(rsvp) }` and returns `200 { ok: true, guest: GuestDetail }`; upstream failure → 502; malformed JSON → 400.
- [x] T015 [P] [US1] MP-1 TDD browser API client `src/lib/api-client.ts` with tests `src/lib/api-client.test.ts` (`fetch` mocked): `searchGuests(by, q, signal)`, `getGuest(id)`, `submitRsvp(payload)`; parse success bodies into `src/lib/types.ts` types with type guards (no `as` casts); map error bodies/network failures to `{ ok: false, code, message, fields? }` with a Vietnamese fallback message ("Có lỗi kết nối, vui lòng thử lại").
- [ ] T016 [US1] MP-1 TDD `GuestLookup` client component `src/components/rsvp/GuestLookup.tsx` with tests `src/components/rsvp/GuestLookup.test.tsx` (mock `@/lib/api-client`, fake timers): radio/segmented toggle "Tên" / "SĐT" (phone input `inputMode="tel"`), labelled input, 300 ms debounce, aborts stale requests, ARIA combobox/listbox with keyboard (↑/↓/Enter/Esc), states: searching (spinner text "Đang tìm…"), suggestions (names only; duplicate names listed separately), no match "Không tìm thấy tên trong danh sách khách mời" + contact-the-couple hint, error with "Thử lại" button; calls `onSelect({ id, ten })`. Verify per UI task rules.
- [ ] T017 [US1] MP-1 TDD `RsvpFields` client component `src/components/rsvp/RsvpFields.tsx` with tests `src/components/rsvp/RsvpFields.test.tsx`: controlled fields "Có đi tiệc?" (Có/Không radios); only when Có shows "Số người đi tiệc" (number 1–10), "Đi xe chiều đi?" Có/Không → "Số ghế" (1–10), "Đi xe chiều về?" Có/Không → "Số ghế" (1–10); switching a direction to Không clears its seats; shows field errors from `validateRsvp` with `aria-describedby`/`aria-invalid`; all inputs labelled. Verify per UI task rules.
- [ ] T018 [US1] MP-1 TDD `RsvpForm` client component `src/components/rsvp/RsvpForm.tsx` with tests `src/components/rsvp/RsvpForm.test.tsx` (mock `@/lib/api-client`): composes `GuestLookup` + `RsvpFields`; shows selected guest name with "Đổi người" action; client-side `validateRsvp` before submit; submitting state disables the button (no double submit); success message "Cảm ơn bạn đã xác nhận!" with summary; submit error shows message + "Thử lại" and keeps entered values; server `fields` errors shown inline. Verify per UI task rules.
- [ ] T019 [US1] MP-1 Add the RSVP section (section 6, heading "Xác nhận tham dự", `id="rsvp"`) to `src/app/page.tsx` rendering `RsvpForm`. With T011 deployed, verify with `agent-browser` (via `next-dev-loop`) quickstart V2, V3, V4, V5, V6, V10, V12 at 360/768/1280 px, including network inspection that no response contains `sdt` or the Apps Script URL, and network timings for SC-004 (suggestions < 3 s after typing pause, submit confirmed < 5 s; record numbers in Build log); review with `web-design-guidelines`.
- [ ] T020 [manual] [US1] MP-1 Confirm Sheet writes for V5. **Steps**: after T019's submit for K001 (Có, 3 người, xe đi 2, xe về Không), owner opens the Sheet. **Expected**: Khach K001 = `Có | 3 | 2 | 0 | <time UTC+7>`; exactly one new LichSu row with the same values. Owner confirms in chat.

**Checkpoint**: MVP — guests can RSVP end-to-end.

---

## Phase 4: User Story 2 - Guest views wedding information (Priority: P2)

**Goal**: The full invitation page: cover, names + date, countdown, party info + map, bus info
from Sheet, RSVP, gift QR — mobile-first.

**Independent Test**: quickstart V1, V9: all 7 sections in order at 360 px, countdown ticks, bus info
changes in Sheet appear within 5 minutes.

- [x] T021 [P] [US2] MP-1 TDD pure countdown logic `src/lib/countdown.ts` with tests `src/lib/countdown.test.ts`: `getRemaining(targetMs, nowMs)` → `{ days, hours, minutes, seconds }` or `{ passed: true }` when `nowMs >= targetMs`; tests with fixed instants around `2027-01-17T14:00:00+07:00` and with `process.env.TZ` variations to prove device-time-zone independence.
- [ ] T022 [US2] MP-1 TDD `Countdown` client component `src/components/Countdown.tsx` with tests `src/components/Countdown.test.tsx` (fake timers): renders a neutral placeholder before mount, then "N ngày N giờ N phút N giây" updating every second; interval cleared on unmount; shows "Hôm nay là ngày vui của chúng mình!" (or approved copy) once passed; uses `siteConfig.eventAt`. Verify per UI task rules.
- [ ] T023 [P] [US2] MP-1 TDD `CoverSection` and `CoupleDateSection` in `src/components/CoverSection.tsx`, `src/components/CoupleDateSection.tsx` with tests `src/components/CoupleDateSection.test.tsx`; add placeholder `public/cover.jpg`. Cover uses `next/image` with `priority` and Vietnamese `alt`; names in the serif token; date text "Chủ nhật, 17.01.2027" prominent and "Nhằm ngày 10 tháng Chạp năm Bính Ngọ" beneath, all from `siteConfig`. Verify per UI task rules.
- [ ] T024 [P] [US2] MP-1 TDD `PartyInfoSection` and `GiftQrSection` in `src/components/PartyInfoSection.tsx`, `src/components/GiftQrSection.tsx` with tests `src/components/PartyInfoSection.test.tsx`; add placeholder `public/qr.png`. Party: time 14:00, venue name, address, Google Maps embed iframe (`https://www.google.com/maps?q=<encodeURIComponent(address)>&output=embed`, `title`, `loading="lazy"`) and "Mở bản đồ" link to `siteConfig.mapsUrl` (`target="_blank" rel="noopener noreferrer"`). Gift: exactly one QR image + account holder name + bank name (FR-005a). Verify per UI task rules.
- [x] T025 [US2] MP-1 TDD bus info server helper `src/lib/server/bus-info.ts` (`import 'server-only'`) with tests `src/lib/server/bus-info.test.ts` (node env; mock `./apps-script`, `next/cache`): `getBusInfo()` with `'use cache'` + `cacheLife({ stale: 60, revalidate: 240, expire: 3600 })` returns `BusInfoResult` (data-model): `{ status: 'ok', info }` mapping data to `BusInfo` (a direction with empty pickup or time → `null`); on `AppsScriptError` returns `{ status: 'unavailable' }` (page must not break). Add `BusInfoResult` to `src/lib/types.ts`.
- [ ] T026 [US2] MP-1 TDD bus section: presentational `src/components/BusInfoView.tsx` (tests `src/components/BusInfoView.test.tsx`: shows "Chiều đi: đón tại X lúc HH:mm" / "Chiều về: khởi hành từ Y lúc HH:mm"; null direction → "Thông tin xe sẽ được cập nhật sau" (empty state); `unavailable` → "Chưa tải được thông tin xe" with a "Tải lại trang" link to `/#bus` (error state)) and async Server Component `src/components/BusInfoSection.tsx` (`id="bus"`) calling `getBusInfo()`; loading state is the `<Suspense>` fallback in T027. Verify per UI task rules.
- [ ] T027 [US2] MP-1 Compose the full page in `src/app/page.tsx` in FR-001 order: CoverSection, CoupleDateSection, Countdown, PartyInfoSection, BusInfoSection inside `<Suspense>` with a loading fallback, RSVP section, GiftQrSection; semantic `<main>`/`<section aria-labelledby>`. Verify with `agent-browser` quickstart V1 at 360/768/1280 px (no horizontal scroll at 360 px, SC-006); `pnpm build` shows `/` prerendered with the bus section streamed; review with `web-design-guidelines`.
- [ ] T028 [manual] [US2] MP-1 Bus info freshness (V9). **Steps**: on the deployed site (or `pnpm build && pnpm start`), note the bus time; owner changes `xe_di_gio` in CauHinh; reload after 5 minutes. **Expected**: new time shown without redeploy. Owner confirms.

**Checkpoint**: Invitation page complete.

---

## Phase 5: User Story 3 - Guest edits a previous answer (Priority: P3)

**Goal**: Re-lookup pre-fills the saved answer; edits overwrite the row and append to LichSu.

**Independent Test**: quickstart V7, V8.

- [x] T029 [US3] MP-1 TDD `GET /api/guests/[id]` in `src/app/api/guests/[id]/route.ts` with tests `src/app/api/guests/[id]/route.test.ts` (node env; mock `@/lib/server/apps-script`; read the Next 16 route params docs — `params` is a Promise): 200 `GuestDetail` via `mapSheetGuest` (no `sdt` key), 404 `not_found`, 502 `upstream`.
- [ ] T030 [US3] MP-1 TDD pre-fill in `src/components/rsvp/RsvpForm.tsx` (tests in `src/components/rsvp/RsvpForm.test.tsx`): after a guest is selected, call `getGuest(id)` with loading state "Đang tải thông tin…" and error + retry; when `rsvp` exists, pre-fill fields and show "Bạn đã xác nhận lúc <capNhatLuc>, có thể sửa lại bên dưới"; success screen offers "Sửa câu trả lời" returning to the pre-filled form. Verify with `agent-browser` quickstart V7, V8; review with `web-design-guidelines`.
- [ ] T031 [manual] [US3] MP-1 Confirm edit writes (V8). **Steps**: change K001 to Không and submit. **Expected**: Khach K001 = `Không` with empty counts and new time; a second LichSu row for K001. Owner confirms.

**Checkpoint**: All user stories complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T032 MP-1 Accessibility and responsive pass over `src/components/**` and `src/app/page.tsx`: keyboard-only walkthrough (V11), visible focus, labels, WCAG AA contrast of token pairs, 360/768/1280 px with `agent-browser`; full `web-design-guidelines` review; fix findings (≤ 5 files; split into T032a/b… if more) or record accepted deviations in spec `Implementation notes`.
- [ ] T033 MP-1 Privacy audit (SC-003, FR-020): add `src/lib/server/privacy.test.ts` asserting search/detail/rsvp route responses for fixture data contain no `sdt` key and no phone digits; after `pnpm build`, `grep -r "APPS_SCRIPT\|script.google.com" .next/static` returns nothing. Record results in `Implementation notes`.
- [ ] T034 [manual] MP-1 Deploy to Vercel. **Steps**: import `workspace/frontend` repo in Vercel, set `APPS_SCRIPT_URL` and `APPS_SCRIPT_SECRET` (Production + Preview), deploy; run quickstart V1–V8 on the `*.vercel.app` URL on a real phone via Zalo/Messenger in-app browser. **Expected**: all pass. Owner confirms and shares the URL.
- [ ] T035 MP-1 Docs sync: update `specs/001-wedding-rsvp/spec.md` requirement text to match what was built and fill `## Implementation notes` (key files, decisions/deviations from plan.md with reasons, visual direction, known limitations incl. accepted risks, manual verification results T011/T020/T028/T031/T034).

---

## Dependencies & Execution Order

- **Setup** T001 → T002 → T003.
- **Foundational**: T004 (owner approval) → T005. T006, T007, T008 [P] after T001. T009 after T006. T010 independent; T011 after T010.
- **US1**: T012 after T006, T007, T009 → T013, T014 (T014 also needs T008) → T015 [P] → T016, T017 (need T005) → T018 → T019 (needs T011) → T020.
- **US2**: T021 [P] → T022; T023, T024 [P] after T005, T006; T025 after T009 → T026; T027 after T019, T022–T026; T028 after T027.
- **US3**: T029 after T012; T030 after T018, T029; T031 after T030.
- **Polish**: T032, T033 after all stories; T034 after T033; T035 last.

### Parallel examples

- After T001: T006, T007, T008 together.
- US1: T015 while T013/T014 are in review.
- US2: T021, T023, T024 together; T025 alongside.

## Implementation Strategy

1. MVP = Phases 1–3 (US1): guests can RSVP into the Sheet.
2. Add US2 for the full invitation page, then US3 for editing.
3. Polish, deploy, docs sync. Real content (venue, bus times, cover, QR) replaces placeholders in
   `src/config/site.ts`, `public/`, and the CauHinh tab whenever the owner supplies it.

## Build log

### Baseline (2026-10-06, branch `001-wedding-rsvp` @ 7182a60)

- `pnpm lint`: pass (0 problems)
- `pnpm exec tsc --noEmit`: pass (`typecheck` script not yet added — T001)
- `pnpm test`: n/a (no test runner yet — T001)
- `pnpm build`: pass (`/` and `/_not-found` static)
- Pre-existing failures: none

### T003 verify after setup (2026-10-06, after 6b80018)

- `pnpm lint` pass · `pnpm typecheck` pass · `pnpm test` pass (no test files yet) · `pnpm build` pass
- Warnings (not failures): Vitest 5 suggests `resolve.tsconfigPaths` instead of `vite-tsconfig-paths`;
  vitest wants `@types/node` ≥22 (repo ^20); Next notes a stray `~/package-lock.json` outside the repo.

### Process notes

- Superpowers plugin is not installed in this environment. Execution follows the same loop manually:
  one fresh implementer subagent per task (TDD), then a reviewer subagent (spec compliance + code
  quality), tick + commit per task.
- `agent-browser` CLI is not installed → UI verification steps are blocked until the owner installs it.
