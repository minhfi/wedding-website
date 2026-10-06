<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles: placeholders → I. Typed Next.js Stack; II. Private Data & Server Boundary;
  III. Test-First (NON-NEGOTIABLE); IV. Mobile-First, Accessible Vietnamese UX; V. Simplicity
- Added sections: Technology & Data Constraints; Development Workflow & Quality Gates; Governance
- Removed sections: none
- Templates: plan/spec/tasks templates read this file at runtime; no template edits made here
- Deferred TODOs: none
-->

# Wedding Website Constitution

Single-page wedding invitation with RSVP and guest bus booking for
Nguyễn Minh Phi & Trần Thị Mỹ Ngân.

## Core Principles

### I. Typed Next.js Stack

- The app MUST use Next.js 16.3.x (App Router, Turbopack default), React 19, TypeScript, and
  pnpm. It is deployed on Vercel.
- TypeScript runs in `strict` mode. `any` is forbidden unless unavoidable and justified in a
  comment; type guards and narrowing MUST be preferred over assertions; unsafe casts MUST NOT
  be used to silence errors.
- Props, API request/response bodies, Sheet rows, and config MUST have explicit types.
- Before using any Next.js API, read the relevant guide in `node_modules/next/dist/docs/`
  (Next 16 has breaking changes versus older training data) and heed deprecation notices.

Rationale: strict types and current Next docs prevent the most common silent bugs in a
codebase that will be maintained by agents.

### II. Private Data & Server Boundary

- A private Google Sheet (never shared publicly) is the only datastore. It MUST be accessed
  only through a Google Apps Script web app, called only from server code (Route Handlers or
  `server-only` modules).
- The Apps Script URL and any shared secret MUST live in server-only environment variables
  (no `NEXT_PUBLIC_` prefix) and MUST NOT appear in client bundles.
- Guest phone numbers (`sdt`) MUST NEVER be sent to the browser. Lookup responses return only
  guest `id`, name, and the guest's existing RSVP.
- All input MUST be validated on the server, using the same schema/rules as the client.
- Unsafe HTML rendering (`dangerouslySetInnerHTML` with untrusted data) is forbidden.

Rationale: the guest list contains personal data; the server boundary is the only control that
keeps it private.

### III. Test-First (NON-NEGOTIABLE)

- TDD is mandatory: write a failing test, make it pass, then refactor.
- Tooling: Vitest + React Testing Library.
- Required coverage: unit tests for pure logic (validation, date/countdown/lunar formatting,
  Sheet response mapping); Route Handler tests with Apps Script mocked; component tests for
  every RSVP form state (hidden/visible fields, validation errors, loading, error, success).
- Implemented UI MUST be verified in the running app with `agent-browser` via `next-dev-loop`.
- Tests MUST NOT be skipped (`.skip`/`.only`), weakened, or deleted to get green.

Rationale: the RSVP flow writes real guest data; regressions must be caught before guests do.

### IV. Mobile-First, Accessible Vietnamese UX

- Layouts are designed for phones first (guests open the link from Zalo/Messenger), then scale
  up to tablet/desktop.
- All UI copy is Vietnamese.
- Accessibility basics are required: semantic HTML, labelled form controls, full keyboard
  operation, visible focus, WCAG AA color contrast.
- Every async action (guest lookup, bus info load, RSVP submit) MUST render explicit loading,
  empty, error, and success states.
- Styling uses Tailwind CSS v4; colors, fonts, and spacing MUST come from design tokens declared
  as CSS variables in `@theme`. Magic values in components are forbidden.

Rationale: many guests are older relatives on phones; clarity and accessibility decide whether
they can RSVP at all.

### V. Simplicity

- One page. No state-management libraries; React state and Server Components are enough.
- Every new dependency MUST be justified in `plan.md`; prefer the platform and existing deps.
- No premature abstraction: extract shared code only when it is used at least twice.
- Static content (names, date, venue, map link, QR, cover image) lives in a typed config file
  plus `public/`. Frequently changing bus info (pickup point, times) comes from the Sheet.

Rationale: a one-off event site must be cheap to build and easy to change near the wedding day.

## Technology & Data Constraints

- Datastore: Google Sheet with tabs `Khach` (guest list + RSVP result per row), `LichSu`
  (append-only change log), `CauHinh` (bus info). Sheet column names are the contract between
  Apps Script and the app; changing them requires updating the spec and the mapping tests.
- Apps Script latency (~1–2 s) and quota are accepted; the UI MUST show loading feedback.
- Time zone for all event times and the countdown is Asia/Ho_Chi_Minh (UTC+7).

## Development Workflow & Quality Gates

- "Verify" means all of these pass: `pnpm lint`, `pnpm typecheck` (`tsc --noEmit`),
  `pnpm test` (`vitest run`), `pnpm build`.
- A task is done only with fresh evidence from verify, plus `agent-browser` checks for UI tasks.
- Commits use Conventional Commits with the Jira key: `<type>(<scope>): MP-<n> <task id> <summary>`.
- Process (lanes, specs, tasks, build) is governed by the root `CLAUDE.md`; this constitution
  governs technical rules.

## Governance

- This constitution supersedes other technical practices in this repo. Specs, plans, and code
  reviews MUST check compliance; any deviation MUST be justified in `plan.md` (Complexity
  Tracking) or recorded in the spec's `Implementation notes`.
- Amendments are made via `/speckit-constitution`, with a Sync Impact Report and a version bump:
  MAJOR for removed/redefined principles, MINOR for new or materially expanded principles or
  sections, PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-06
