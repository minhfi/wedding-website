# Implementation Plan: Wedding Website with RSVP & Guest Bus Booking

**Branch**: `001-wedding-rsvp` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Ticket**: [MP-1](https://minhfitech.atlassian.net/browse/MP-1)

**Input**: Feature specification from `specs/001-wedding-rsvp/spec.md`

## Summary

A single prerendered page (Next.js 16 App Router, Cache Components) shows the invitation content
from a typed config, bus info from the Sheet (cached ~4–5 min), and a client RSVP form. The form
talks only to three Route Handlers (search, guest detail, submit), which validate input and call a
Google Apps Script web app (shared secret, server-only env) that reads/writes the private Sheet
tabs `Khach`, `LichSu`, `CauHinh`. Phone numbers stay on the server. See [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node 22; Google Apps Script (V8) for the gateway

**Primary Dependencies**: next 16.3.8, react 19.2, tailwindcss 4; dev: vitest, @vitejs/plugin-react,
jsdom, @testing-library/{react,dom,user-event,jest-dom}, vite-tsconfig-paths. No runtime deps added.

**Storage**: Private Google Sheet via Apps Script web app ([contracts/apps-script.md](./contracts/apps-script.md))

**Testing**: Vitest + React Testing Library (jsdom; `node` env for route handlers); agent-browser
via next-dev-loop for UI

**Target Platform**: Vercel; mobile browsers (Zalo/Messenger in-app browsers, iOS Safari, Android
Chrome) first, desktop second

**Project Type**: Web application (single Next.js app with Route Handlers)

**Performance Goals**: Suggestions < 3 s after typing pause (cached index → typically < 300 ms);
submit confirmed < 5 s; static shell served from CDN

**Constraints**: Phone numbers never sent to browser; secret/URL server-only; bus info fresh
within 5 min; Apps Script ~1–2 s latency, 10 s timeout; 360 px minimum width

**Scale/Scope**: One page, hundreds of guests, low concurrency; ~7 sections, 3 API routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| I. Typed Next.js Stack | PASS | Next 16.3.8 App Router, TS strict, pnpm; docs read (research sources) |
| II. Private Data & Server Boundary | PASS | Apps Script only from `src/lib/server/*` (`server-only`); env without `NEXT_PUBLIC_`; search returns `{id,ten}`; shared `validateRsvp` on server |
| III. Test-First | PASS | Every logic/handler/form task starts with a failing Vitest test; UI checked by agent-browser |
| IV. Mobile-First, Accessible Vietnamese UX | PASS | 360 px baseline, Vietnamese copy, labelled controls, explicit async states; tokens in `@theme` |
| V. Simplicity | PASS | No runtime deps; no state lib; hand-written validator; content in typed config |

Post-design re-check (after data-model/contracts): **PASS** — no violations, Complexity Tracking empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-wedding-rsvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-api.md
│   └── apps-script.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root = workspace/frontend)

```text
apps-script/
└── Code.gs                         # Sheet gateway (deployed manually)

src/
├── app/
│   ├── layout.tsx                  # fonts (vietnamese subset), metadata, lang="vi"
│   ├── page.tsx                    # composes the 7 sections
│   ├── globals.css                 # Tailwind v4 + @theme design tokens
│   └── api/
│       ├── guests/search/route.ts  # GET search
│       ├── guests/[id]/route.ts    # GET detail
│       └── rsvp/route.ts           # POST submit
├── components/
│   ├── CoverSection.tsx
│   ├── CoupleDateSection.tsx
│   ├── Countdown.tsx               # 'use client'
│   ├── PartyInfoSection.tsx
│   ├── BusInfoSection.tsx          # async Server Component (Suspense)
│   ├── BusInfoView.tsx             # presentational: ok / empty / unavailable
│   ├── GiftQrSection.tsx
│   └── rsvp/
│       ├── RsvpForm.tsx            # 'use client', state machine
│       ├── GuestLookup.tsx         # 'use client', autocomplete combobox
│       └── RsvpFields.tsx          # 'use client', conditional fields
├── config/
│   └── site.ts                     # typed static content (placeholders)
└── lib/
    ├── types.ts
    ├── rsvp-validation.ts          # shared validator
    ├── normalize.ts                # name/phone normalization
    ├── countdown.ts                # pure remaining-time calc
    ├── api-client.ts               # browser fetch wrappers for the 3 routes
    └── server/
        ├── apps-script.ts          # server-only client (secret, timeout)
        ├── guests.ts               # cached index + search + detail mapping
        └── bus-info.ts             # 'use cache' getBusInfo

tests/ mirrors src/ as colocated *.test.ts(x) files next to sources.
public/
├── cover.jpg                       # placeholder
└── qr.png                          # placeholder
```

**Structure Decision**: Single Next.js app (existing `src/` layout from create-next-app). Server-only
code isolated under `src/lib/server/` guarded by `import 'server-only'`. Tests colocated as
`*.test.ts(x)`.

## Key Design Decisions

1. `cacheComponents: true`; bus info via `'use cache'` + `cacheLife({ stale: 60, revalidate: 240, expire: 3600 })` (R1).
2. Guest index cached with `cacheLife('minutes')`; detail and submit uncached (R2).
3. Apps Script single `doPost` with `action` + secret in body, `LockService` on writes, columns by header name (R3).
4. Route Handlers, not Server Actions (R4); hand-written shared validator (R5).
5. Countdown computes from absolute instant `2027-01-17T14:00:00+07:00` after mount (R7).
6. Visual direction proposed with `frontend-design` and approved by owner **before** UI tasks (R11).

## Risks

- Accepted (spec): names visible via autocomplete; anyone can edit any RSVP; LichSu mitigates.
- Apps Script quota/latency → cached index and bus info; 10 s timeout with retry UI.
- `agent-browser` not installed → UI verification tasks blocked until installed (R12).

## Complexity Tracking

No constitution violations.
