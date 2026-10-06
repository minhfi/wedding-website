# Quickstart & Validation: Wedding Website with RSVP

## Prerequisites

- Node 22, pnpm; `agent-browser` CLI installed (root README → Prerequisites).
- Access to the private Google Sheet (owner account).

## 1. Prepare the Sheet

1. Create tabs `Khach`, `LichSu`, `CauHinh` with the row-1 headers in [data-model.md](./data-model.md).
2. Add test guests to `Khach`, e.g. `K001 | Nguyễn Văn An | 0901234567`,
   `K002 | Nguyễn Văn An | 0912000111` (duplicate name), `K003 | Trần Thị Bình | (empty)`.
3. Fill `CauHinh` keys (`xe_di_diem_don`, `xe_di_gio`, `xe_ve_diem_don`, `xe_ve_gio`).

## 2. Deploy Apps Script

1. Sheet → Extensions → Apps Script; paste `apps-script/Code.gs` from this repo.
2. Project Settings → Script Properties → add `SECRET` = a long random string.
3. Deploy → New deployment → Web app; Execute as **Me**; Who has access **Anyone**. Copy the URL.
4. Contract: [contracts/apps-script.md](./contracts/apps-script.md).

## 3. Configure and run

```bash
cp .env.example .env.local   # set APPS_SCRIPT_URL and APPS_SCRIPT_SECRET
pnpm install
pnpm dev                     # http://localhost:3000
```

On Vercel set the same two env vars (Production + Preview). Never prefix them with `NEXT_PUBLIC_`.

## 4. Verify (automated)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## 5. Validation scenarios (agent-browser at 360 px and 1280 px)

| # | Steps | Expected |
|---|---|---|
| V1 | Open `/` | 7 sections in order (FR-001); date + lunar line; countdown ticking |
| V2 | Tìm theo tên → type `nguyen van` | Two "Nguyễn Văn An" suggestions; Network: response items only `id`,`ten` |
| V3 | Tìm theo SĐT → type `+84 901 234` | K001 suggested |
| V4 | Type `zzz` | "Không tìm thấy tên trong danh sách khách mời" |
| V5 | Pick K001 → Có, 3 người, xe đi Có 2, xe về Không → Gửi | Success; Sheet K001 row: Có/3/2/0 + time; one new LichSu row |
| V6 | Set 2 người, xe đi 3 ghế | Inline error, submit blocked |
| V7 | Reload, look up K001 again | Form pre-filled Có/3/2/Không, "đã xác nhận" note |
| V8 | Change to Không → Gửi | Row Không with empty counts; another LichSu row |
| V9 | Edit `CauHinh` value, wait ≤ 5 min, reload | New bus info shown |
| V10 | Set wrong `APPS_SCRIPT_URL`, try search/submit | Error message with retry; entered values kept |
| V11 | Keyboard only through the form | All controls reachable, visible focus |
| V12 | DevTools → search all JS/HTML/JSON responses for `090` phone digits and script URL | Not found (SC-003) |
