# Feature Specification: Wedding Website with RSVP & Guest Bus Booking

**Feature Branch**: `001-wedding-rsvp`

**Created**: 2026-10-06

**Status**: Implemented (pending manual checks T020, T028, T031, T034)

**Input**: Jira [MP-1](https://minhfitech.atlassian.net/browse/MP-1) — single-page mobile-first wedding
website for Nguyễn Minh Phi & Trần Thị Mỹ Ngân. Guests open one shared link, see event info, and
RSVP: attending or not, how many people, and whether they take the guest bus (outbound and
return chosen separately).

## Clarifications

### Session 2026-10-06

- Q: Phần mã QR mừng cưới hiện một mã chung hay hai mã riêng cho cô dâu và chú rể? → A: Một mã
  QR chung, kèm tên chủ tài khoản và ngân hàng.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest confirms attendance and bus seats (Priority: P1)

A guest opens the shared link on their phone, finds themselves in the guest list by typing
their name or phone number, picks their name from the suggestions, says whether they will
attend, and, if attending, how many people are coming and how many bus seats they need for
the outbound and return trips. They submit and see a clear confirmation.

**Why this priority**: Collecting attendance and bus numbers is the reason the site exists; the
couple needs these totals to book tables and buses.

**Independent Test**: With a guest list containing test guests, open the page, look up a guest,
submit an RSVP, and confirm the guest's row in the owner's spreadsheet holds the submitted
values and a change-log row was added.

**Acceptance Scenarios**:

1. **Given** the guest list contains "Nguyễn Văn An", **When** a guest selects "Tên" in the "Tìm theo" toggle and
   types "nguyen van", **Then** "Nguyễn Văn An" appears among the suggestions and no phone
   numbers are shown or delivered to the guest's device.
2. **Given** the guest list contains a guest with phone 0901234567, **When** a guest selects
   "SĐT" and types "0901234", **Then** that guest's name appears in the suggestions
   (name only).
3. **Given** a guest is selected, **When** they choose "Có đi tiệc? → Không" and submit, **Then**
   the RSVP is saved as not attending with no people or seat counts, and a success message is
   shown.
4. **Given** a guest is selected, **When** they choose "Có", enter 3 people, choose outbound bus
   "Có" with 2 seats and return bus "Không", and submit, **Then** the guest's row stores
   attending = Có, people = 3, outbound seats = 2, return seats = 0, and the update time.
5. **Given** a guest is selected and has chosen "Có", **When** they enter 2 people and 3
   outbound seats, **Then** the form blocks submission with a Vietnamese message that seats
   cannot exceed the number of people.
6. **Given** a guest is selected, **When** "Có đi tiệc?" is "Không" or not yet answered,
   **Then** the people and bus fields are hidden.
7. **Given** any submission (first answer or edit), **When** it is saved, **Then** exactly one
   row is appended to the change log with the time, the guest id, and the submitted values.

---

### User Story 2 - Guest views wedding information (Priority: P2)

A guest opens the link and sees, on one scrolling page designed for phones: the cover image, the
couple's names, the wedding date in both solar and lunar form, a live countdown, the party time
and venue with an embedded map, the guest bus pickup point and times, and the wedding gift QR
code.

**Why this priority**: Guests need to know when and where to go and how the bus works; it also
works as the online invitation card shared with the link.

**Independent Test**: Open the page on a phone-sized screen and check all seven sections render
with the configured content and that the countdown ticks.

**Acceptance Scenarios**:

1. **Given** the page loads, **Then** the sections appear in this order: cover image; couple
   names and date; countdown; party information; bus information; RSVP form; wedding gift QR.
2. **Given** the page loads, **Then** the date reads "Chủ nhật, 17.01.2027" prominently with
   the line "Nhằm ngày 10 tháng Chạp năm Bính Ngọ" beneath it, and the party time reads 14:00.
3. **Given** the current time is before 14:00 17/01/2027 Vietnam time (UTC+7), **Then** the
   countdown shows the remaining time as a sentence ("Còn N ngày N giờ N phút nữa", per the
   approved visual direction; no seconds), recalculated every second, correctly regardless of the
   visitor's device time zone.
4. **Given** the countdown target has passed, **Then** the countdown is replaced by a message
   that the wedding day has arrived/passed instead of showing negative numbers.
5. **Given** the party information section, **Then** it shows venue name, address, an embedded
   map, and a link that opens the location in the guest's maps app.
6. **Given** the owner has entered pickup point and departure times for the outbound and return
   trips in the spreadsheet's bus settings, **Then** the bus section shows them; **When** the
   owner changes them in the spreadsheet, **Then** the site shows the new values without a
   redeploy (within the freshness window in FR-016).
7. **Given** a phone screen 360 px wide, **Then** no content overflows horizontally and all text
   is readable without zooming.

---

### User Story 3 - Guest edits a previous answer (Priority: P3)

A guest who already answered comes back (e.g., their plans changed), looks themselves up again,
sees their previous answer pre-filled, changes it, and submits.

**Why this priority**: Plans change in the weeks before the wedding; editing keeps totals right
without the couple handling messages by hand.

**Independent Test**: Submit an RSVP for a test guest, reload the page, look the guest up again,
verify the form is pre-filled, change a value, submit, and verify the spreadsheet row and change
log reflect the edit.

**Acceptance Scenarios**:

1. **Given** a guest previously answered "Có, 3 people, outbound 2, return 0", **When** they look
   themselves up again, **Then** the form shows those values pre-filled and an indication that
   they already responded.
2. **Given** a pre-filled form, **When** the guest changes to "Không" and submits, **Then** the
   row is updated to not attending, people and seat counts are cleared, and a new change-log row
   is appended.

---

### Edge Cases

- **No match**: lookup text matches no guest → show "Không tìm thấy tên trong danh sách khách
  mời" with guidance to contact the couple; no submission possible.
- **Duplicate names**: two guests share the same display name → both appear as separate
  suggestions; selection is by guest identity, not by name text.
- **Diacritics/case**: "nguyen van an", "NGUYỄN VĂN AN", and "Nguyễn Văn An" match the same guest.
- **Phone formats**: spaces, dots, dashes and a leading "+84" are ignored when matching
  (e.g., "+84 901 234 567" matches 0901234567).
- **Too-short input**: suggestions appear only after at least 2 characters for name or 3 digits
  for phone.
- **People reduced below seats**: guest lowers people count below an already-entered seat count →
  validation error shown until seats are lowered or the bus option is turned off.
- **Bus option turned off**: switching a direction to "Không" clears that direction's seats (saved
  as 0).
- **Out-of-range or tampered input**: values outside 1–10, seats > people, unknown guest id, or
  people/seats sent with "Không" are rejected by the server with an error message; nothing is
  written.
- **Data source slow or unavailable**: lookup or submit shows a loading state; on failure shows a
  Vietnamese error message with a retry option, and the guest's entered values are kept.
- **Bus settings missing**: if a direction's pickup/time values are empty, that direction shows
  "Thông tin xe sẽ được cập nhật sau" (empty state).
- **Bus settings unavailable**: if the data source fails, the bus section shows "Chưa tải được
  thông tin xe" with a "Tải lại trang" action (error state); the rest of the page still works.
- **Double submit**: repeated taps on submit while a request is in progress do not send duplicate
  submissions.
- **Simultaneous edits**: two submissions for the same guest → the last one saved wins; both
  appear in the change log.

## Requirements *(mandatory)*

### Functional Requirements

**Page & content**

- **FR-001**: The site MUST be a single page containing, in order: cover image; couple names and
  wedding date; countdown; party information; bus information; RSVP form; wedding gift QR.
- **FR-002**: The page MUST display the date as "Chủ nhật, 17.01.2027" with the secondary line
  "Nhằm ngày 10 tháng Chạp năm Bính Ngọ", and the party time 14:00.
- **FR-003**: The countdown MUST target 14:00 on 17/01/2027 in Vietnam time (UTC+7), show the
  remaining days, hours and minutes as one sentence ("Còn N ngày N giờ N phút nữa"; under one day
  "Còn N giờ N phút nữa"; under one minute "Còn chưa đầy 1 phút nữa"), recalculate every
  second, be independent of the visitor's device time zone, and show an "arrived/passed" message
  once the target is reached.
- **FR-004**: Party information MUST show venue name, address, an embedded map, and a link that
  opens the location in a maps app.
- **FR-005**: Couple names, date, time, venue details, map link, cover image, and gift QR content
  MUST be editable by changing the site's content configuration (placeholder values until real
  content is supplied).
- **FR-005a**: The gift section MUST show exactly one shared QR code together with the account
  holder's name and the bank name.
- **FR-006**: Bus information (outbound pickup point and departure time; return departure point
  and time) MUST be read from the owner's spreadsheet bus settings and shown in the bus section.
- **FR-007**: All guest-facing text MUST be in Vietnamese.

**Guest lookup**

- **FR-008**: The RSVP form MUST let the guest choose to search by name ("Tên") or by phone
  number ("SĐT") and MUST show matching guests as suggestions while typing (after the minimums in
  Edge Cases).
- **FR-009**: Suggestions and any data delivered to the guest's device MUST contain only guest
  identity and display name (plus that guest's existing RSVP once selected); phone numbers MUST
  NEVER be delivered to the guest's device.
- **FR-010**: Name matching MUST ignore case and Vietnamese diacritics; phone matching MUST ignore
  formatting characters and treat "+84" as a leading "0".

**RSVP**

- **FR-011**: After a guest is selected, the form MUST ask whether the guest attends ("Bạn có đến dự tiệc không?":
  "Có, mình sẽ đến" / "Không đến được"). The people
  and bus fields MUST be shown only when "Có" is selected.
- **FR-012**: When attending, the form MUST require "Số người đi tiệc" as a whole number 1–10, and
  ask "Đi xe khách chiều đi?" and "Đi xe khách chiều về?" (Có/Không each). When a direction is "Có", its seat
  count MUST be a whole number 1–10 and not greater than the number of people.
- **FR-013**: The same rules as FR-011/FR-012 MUST be enforced again on the server; invalid
  submissions MUST be rejected without writing anything, and the guest shown an error.
- **FR-014**: A valid submission MUST update the selected guest's row: attending (Có/Không),
  people, outbound seats, return seats (0 when the direction is "Không"; all counts empty when not
  attending), and the update time in Vietnam time.
- **FR-015**: Every valid submission (first answer or edit) MUST append exactly one change-log row
  containing time, guest id, and the submitted values.
- **FR-016**: Bus settings changed in the spreadsheet MUST appear on the site within 5 minutes
  without a redeploy.
- **FR-017**: Looking up a guest who already answered MUST pre-fill the form with their saved
  answer and allow any change; there is no RSVP deadline and no limit on edits.
- **FR-018**: There MUST be no bus capacity limit; seat requests are never refused for capacity.
- **FR-019**: Lookup, bus info loading, and submission MUST each show explicit loading, empty,
  error, and success states. Lookup: empty = no-match message; error offers retry. Submission:
  error offers retry and keeps entered values. Bus info: loading placeholder; empty = "Thông tin
  xe sẽ được cập nhật sau" per direction; error = "Chưa tải được thông tin xe" with reload.
- **FR-020**: The spreadsheet MUST stay private; the site MUST reach it only through a
  server-side intermediary whose address and credentials are never exposed to the guest's device.

**Experience**

- **FR-021**: The layout MUST be designed for phones first (from 360 px wide) and also work on
  tablet and desktop widths.
- **FR-022**: Form controls MUST have visible labels, be fully operable by keyboard, show a
  visible focus indicator, and text MUST meet WCAG AA contrast.
- **FR-023**: Visual style MUST follow the owner-approved direction: white/cream primary, fresh
  leaf-green accent, charcoal contrast; modern with generous whitespace, a thin serif for the
  couple's names, and a clean sans-serif for body text, decorated per the approved "Cành hoa nở"
  refinement (botanical line art from the bouquet; see Implementation notes).
- **FR-024**: On desktop widths (≥ 1024 px) the page MUST use a two-column layout: a sticky left
  column with the cover, names, date and countdown, and a scrolling right column with the other
  sections. Below 1024 px it stays a single column.

### Key Entities *(include if feature involves data)*

- **Guest (Khach)**: one invited guest or household entered by the owner. Owner-entered: id
  (unique), display name (ten), phone (sdt, private). Site-written: attending (di_tiec:
  Có/Không/empty = not answered), people (so_nguoi), outbound seats (ghe_xe_di), return seats
  (ghe_xe_ve), last update time (cap_nhat_luc).
- **Change log entry (LichSu)**: append-only record of each submission — time, guest id, and the
  submitted attending/people/outbound/return values.
- **Bus settings (CauHinh)**: owner-maintained values — outbound pickup point and departure time,
  return departure point and time.
- **Site content**: couple names, solar and lunar date text, party time, venue name/address/map
  link, cover image, one gift QR image with account holder name and bank name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time guest on a phone can find themselves and submit an RSVP in under
  2 minutes.
- **SC-002**: 100% of valid submissions are reflected in the owner's spreadsheet (guest row and
  one change-log row each); 0 invalid submissions are written.
- **SC-003**: 0 phone numbers appear in any data delivered to guests' devices (verified by
  inspecting all responses during testing).
- **SC-004**: Suggestions appear within 3 seconds of the guest pausing typing, and a submission
  is confirmed within 5 seconds, on a typical 4G connection.
- **SC-005**: The owner can read total attending people and total outbound/return bus seats
  directly from the spreadsheet with simple column sums, with no manual reconciliation.
- **SC-006**: The page is fully usable at 360 px width with no horizontal scrolling, and every
  section is readable without zooming.
- **SC-007**: Bus info changes made in the spreadsheet appear on the site within 5 minutes.

## Assumptions

- Guests reach the site through one shared link (no per-guest links, no login).
- Accepted risk: guest names are visible through suggestions, and anyone with the link can view or
  change any guest's RSVP; the change log is the mitigation for spotting and reverting misuse.
- The owner maintains the guest list (id, name, phone) and bus settings directly in the private
  spreadsheet; there is no admin page.
- One party at one venue; exactly one bus trip per direction; outbound picks up at the pickup
  point (placeholder "Công ty"), return departs from the venue.
- Venue, address, map link, pickup point, bus times, cover image, and gift QR (one shared code)
  are placeholders until the owner supplies real content.
- Wedding date/time is fixed: 14:00 Sunday 17/01/2027, Vietnam time (lunar 10 tháng Chạp năm
  Bính Ngọ).
- Data source responses may take 1–2 seconds; this is acceptable at wedding scale (hundreds of
  guests).
- Go-live date is not fixed; suggested before 15/12/2026 so the link can go out with invitations.
- Visual direction is proposed by the team and approved by the owner before UI build starts (no
  Figma).

## Implementation notes

### Visual direction (T004 — approved by owner 2026-10-06)

Concept **"Cành hoa" (the stem)**: taken from the bridal bouquet. A thin 1px leaf-green stem runs
down the left edge of the page; each section heading sits on a small round bud on that stem. This
is the single bold element; everything else stays quiet.

**Color tokens** (contrast measured on `canh-hoa` background):

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `canh-hoa` | `#FBFAF5` | page background | – |
| `lua` | `#F0F3E8` | input/QR surface, highlighted suggestion | – |
| `nu` | `#DDE9C6` | selected choice background (text `la-dam` 5.97:1) | – |
| `la-non` | `#86AD55` | stem line and buds only, decorative, never text or required borders | 2.47:1 |
| `la-dam` | `#3E5C2B` | buttons (white text 7.58:1), links, accent text | 7.25:1 |
| `da` | `#5B635C` | secondary text, input borders | 5.94:1 |
| `than` | `#2B302C` | primary text | 12.87:1 |

**Typography**: Noto Serif Display 200 (couple names ~60px at 360px, "và" 36px in `la-dam`) and 300
(section headings ~26px); Be Vietnam Pro 400/500 for body (15–18px). Both loaded with the
`vietnamese` subset.

**Layout (360px)**: content left-aligned, 24px outer gutter, content indented to 44px from the stem.
1. Cover: full-bleed photo 4:5.
2. Names stacked "Minh Phi / và / Mỹ Ngân", overlapping the bottom ~56px of the cover; below them
   "Chủ nhật, 17.01.2027" + time (500), then the lunar line in `da`.
3. Countdown as a sentence: "Còn N ngày N giờ N phút nữa" (no digit boxes).
4. Party: bud + heading, venue name, address, rounded map embed, "Mở bản đồ" link.
5. Bus: two lines "Chiều đi: đón tại … lúc …" / "Chiều về: khởi hành từ … lúc …".
6. RSVP: Tên/SĐT pill toggle, input with suggestion list, two large choice buttons ("Có, mình sẽ
   đến" / "Không đến được"), conditional people/seat fields, full-width primary "Gửi xác nhận".
7. Gift: one QR on `lua` surface with account holder and bank name.

Motion: none beyond responses to user actions; respect `prefers-reduced-motion`. Radius: 10px for
controls, pills for the Tên/SĐT toggle.

### Visual refinement "Cành hoa nở" (approved by owner 2026-10-06)

The owner found the first build too plain. Refinement of the same direction (palette, fonts,
left-aligned stem unchanged):

1. **Arched cover**: the cover sits in an arch frame (rounded top, 10px bottom corners, `nu` 1px
   border) inset by the gutter. Until the real photo exists, the arch shows a line-art bouquet drawn
   from the owner's bouquet photo (white ranunculus/roses with `la-dam` outlines, `la-non` leaves,
   small `nu` buds) on `lua`.
2. **Leafy stem**: the stem is a slightly curved branch with small leaves. Each section heading has
   its own bloom from the bouquet: rose (Tiệc cưới), tulip (Xe khách), Queen Anne's lace umbel
   (Xác nhận tham dự), bud (Mừng cưới). Blooms are decorative (`aria-hidden`).
3. **Leaf sprig** beside "và" between the names.
4. **Countdown pill**: the sentence sits in a rounded `lua` pill with a `nu` border; numbers weight 500.
5. **Line icons** (inline SVG, no icon dependency) for party time and place; bus info as two labelled
   rows ("Chiều đi" / "Chiều về") with a `nu` left rule.
6. **Corner sprig** crossing the bottom-right corner of the QR card.
7. **One motion moment**: on load the stem draws downward from the cover once (~1.2 s); disabled with
   `prefers-reduced-motion`.
8. **Desktop (≥ 1024 px)**: two columns (FR-024). Left column (~45%) is sticky and holds the arched
   cover, names, date and countdown; right column holds the stem and the remaining sections. Max
   content width ~1120 px, centred.

### Background botanicals (approved by owner 2026-10-06, option A)

The owner found the flat cream background plain. Chosen: large, very faint line-art branches,
leaves and a few blooms from the same botanical kit reaching in from the page corners and side
margins (option A of A/B/C). Rules:

- Decorative only: `aria-hidden`, `pointer-events: none`, behind content, no motion.
- Very low contrast (la-non leaves and la-dam outlines at roughly 10–20% opacity) so body text keeps
  WCAG AA; never placed under the RSVP form controls on mobile (corners only on small screens).
- Wide desktop (≥1280 px): bigger sprigs fill the side margins. Below 1280 px only the corner
  branches show (between 1024 and 1279 px there are no real side margins). From 1024 px the sticky
  hero column sits on a soft `lua` panel (rounded, full column height); the arch and countdown pill
  switch to `canh-hoa` there so they stand out on the panel.
- Accepted deviations: on mobile a faint corner bloom can sit behind a few lines of text while
  scrolling (worst case ≈ 4.8:1 for `da` text, still AA); the layer is ~60 KB of SVG markup
  (both sets in the DOM, ~8–10 KB gzipped); on iOS the fixed layer follows the toolbar, so the
  bottom-left sprig shifts slightly while scrolling.
- Stays fixed to the viewport (does not scroll), so it frames every part of the page.

### Key files

| Area | Files |
|---|---|
| Page and layout | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` (`@theme` tokens) |
| Sections | `src/components/{CoverSection,CoupleDateSection,Countdown,PartyInfoSection,BusInfoSection,BusInfoView,GiftQrSection}.tsx` |
| RSVP | `src/components/rsvp/{GuestLookup,RsvpFields,RsvpForm}.tsx` |
| Routes | `src/app/api/guests/search/route.ts`, `src/app/api/guests/[id]/route.ts`, `src/app/api/rsvp/route.ts` |
| Server-only | `src/lib/server/{apps-script,guests,bus-info}.ts` |
| Shared logic | `src/lib/{types,normalize,rsvp-validation,countdown,api-client}.ts`, `src/config/site.ts` |
| Sheet gateway | `apps-script/Code.gs` (pasted into the Sheet's Apps Script project, deployed as a Web app) |

### Decisions and deviations from plan.md

- **Countdown without seconds.** FR-003 originally said days/hours/minutes/seconds. The approved
  visual direction shows a sentence ("Còn N ngày N giờ N phút nữa"), so FR-003 and US2 AC3 were
  updated. It still recalculates every second.
- **Bus section always renders at request time.** `BusInfoSection` calls `await connection()` before
  `getBusInfo()`. Without it, Cache Components could bake an "unavailable" result into the static
  shell. The data itself is still cached (`cacheLife({ stale: 60, revalidate: 240, expire: 3600 })`).
  Failures are not cached: the cached inner fetch throws, the uncached wrapper returns `unavailable`.
- **Errors across `'use cache'` lose their class.** An error thrown inside the cached guest index
  reaches the route as a plain `Error`, so `searchGuests` re-wraps it as `AppsScriptError("upstream")`.
- **Apps Script dates.** Sheets converts the written `cap_nhat_luc` / `thoi_gian` strings into Date
  cells. `Code.gs` duck-types dates (`isDate`) because `instanceof Date` fails on values from the
  Sheets service, then formats them `yyyy-MM-dd HH:mm:ss` in Asia/Ho_Chi_Minh. The UI shows them as
  "HH:mm ngày dd/MM/yyyy".
- **"Tải lại trang" link** points to `/?tai-lai=1#bus` (a different URL), because `/#bus` from `/`
  only scrolls and would not reload.
- **`priority` → `preload`** on the cover image (Next 16 deprecates `priority`).
- **Token added:** `--text-body` (15px) and `--spacing-bud` (distance stem → content, used to centre
  buds on the stem). No arbitrary color/size values in components.
- **Copy differs slightly from the first spec draft** (now synced in FR-011/FR-012/US1): "Bạn có đến
  dự tiệc không?" with "Có, mình sẽ đến" / "Không đến được"; "Đi xe khách chiều đi/về?"; toggle
  "Tìm theo: Tên / SĐT"; success line "Số người đi tiệc: N".
- **No `server-only` package.** Next.js handles `import "server-only"` itself; Vitest aliases it to a
  stub.

### Known limitations

- Accepted risk (unchanged): guest names are visible through suggestions and anyone with the link can
  change any RSVP; `LichSu` keeps every submission for review.
- Apps Script cold calls can take a few seconds; the first suggestion after the guest index cache
  expires may be slower than the 3 s target. Warm searches answer in ~30 ms.
- Re-deploying `Code.gs` must use **Manage deployments → New version** to keep the same URL.
- Copying `Code.gs` with `pbcopy` needs `LANG=en_US.UTF-8`, otherwise Vietnamese strings break.
- Placeholder content still to replace: venue name/address/map, cover image, QR image, account holder
  and bank name (`src/config/site.ts`, `public/`), bus pickup point/times (`CauHinh` tab).

### Verification results

- Automated: lint 0, typecheck 0, 335/335 tests (19 files), `pnpm build` OK (`/` partial prerender).
- agent-browser on the real Sheet: V1–V8, V10–V12 passed (details in `tasks.md` → Build log).
- Manual, pending owner confirmation: T020 / T031 (Sheet rows), T028 (bus info freshness),
  T034 (Vercel deploy and real-phone check).
