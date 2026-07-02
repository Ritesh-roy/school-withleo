
# Scope — three big pieces, delivered in order

This is a large request. To keep it shippable and reviewable, I'll do it in **three phases** and stop after each so you can verify. Nothing about UI theme, routes, or existing features changes — only functionality is upgraded.

---

## Phase 1 — Bulk Entry: Excel Import (live app)

Keep the current manual "Add Book" form on `/bulk-entry` exactly as-is. Add a second panel next to it: **Import Excel**.

- Drag-and-drop + file picker for `.xlsx` / `.xls` (uses already-installed `xlsx`).
- "Download Sample Template" button → generates an `.xlsx` with the exact columns:
  `Book Type, Category, ISBN, Title, Author, Publisher, Language, Edition, Price, MRP, Pages, Copies, Location, Rack, Shelf`.
- **Preview step**: parsed rows shown in a table with per-row validation status (valid / invalid + reason, duplicate ISBN in file, duplicate ISBN already in DB).
- Import runs in **batches of 200** with a progress bar and live "Success / Failed" counters.
- On finish: summary dialog + **Export failed rows** button (downloads `.xlsx` with an added `Error` column).
- Masters (Book Type, Category, Author, Publisher, Language) auto-created if missing so rows don't fail on unknown lookups (toggleable checkbox: "Auto-create missing masters").
- DB uniqueness enforced by existing partial unique index on `books.isbn`.

Files touched: `src/routes/_app.bulk-entry.tsx` (add tab/section, no removals), new `src/lib/excel-import.ts` helper. No schema change.

---

## Phase 2 — Location Master: real 7-level hierarchy UI

DB tables already exist (`campuses → buildings → floors → rooms → almirahs → racks → shelves`, plus `book_locations`, `book_transfers`, `book_movements`, `rack_inventory` view). Only the UI is missing.

- **Rewrite the "Location" tab** inside existing `/library-master` page — same page, same theme, same tab bar. Replace the single-name form with a hierarchy manager:
  - Left: tree/breadcrumb selector (Campus → Building → Floor → Room → Almirah → Rack → Shelf).
  - Right: CRUD form for the currently selected level (add child, edit, soft-delete).
  - Rack level shows: Capacity, Current Books, Available (from `rack_inventory` view).
- **Book Master**: add cascading dropdowns (Campus→…→Rack→Shelf + Position number) that write to `book_locations` on save. The existing free-text Location field stays for backwards compatibility, marked "legacy".
- New route `/book-location` (search any book → shows full breadcrumb + position).
- New route `/book-transfer` (pick book → pick new rack/shelf → writes `book_transfers` + `book_movements`, auto-updates rack inventory via existing trigger).
- Sidebar: add "Book Location" and "Book Transfer" under the existing Library group (no restructure).

No schema changes needed — the tables from the earlier migration are used as-is.

---

## Phase 3 — MySQL + Express backend bundle (standalone artifact)

Generated under `backend-mysql/` in this repo. **Not** wired into the live app — you download / host it separately (Railway, VPS, XAMPP, etc.). The Lovable app keeps running on Lovable Cloud unchanged.

```text
backend-mysql/
├── sql/
│   ├── 001_schema.sql     -- all tables listed below, FKs, indexes, unique, soft-delete
│   ├── 002_seed.sql       -- admin/librarian users, sample masters, sample books
│   └── README.md          -- `mysql -u root -p school_withleo < sql/001_schema.sql`
├── src/
│   ├── server.ts          -- express + helmet + cors + rate-limit + morgan
│   ├── db.ts              -- mysql2/promise pool
│   ├── auth/              -- bcrypt, JWT access+refresh, role middleware
│   ├── middleware/        -- validate (zod), errorHandler, auditLogger
│   ├── modules/
│   │   users/ roles/ permissions/ books/ authors/ categories/ publishers/
│   │   languages/ book-types/ libraries/ buildings/ floors/ rooms/
│   │   almirahs/ racks/ shelves/ book-locations/ issues/ returns/
│   │   transfers/ members/ fines/ audit-logs/ settings/ notifications/
│   └── routes/            -- REST at /api/v1/*
├── package.json  tsconfig.json  .env.example  Dockerfile  README.md
└── API.md                 -- endpoint reference
```

Every table gets: PK, FKs, indexes on FKs + search columns, unique constraints (ISBN, email, code), `created_at`, `updated_at`, `deleted_at` (soft delete), `created_by`, `updated_by`.

Auth: bcrypt (12 rounds), JWT access (15 min) + refresh (7 d, rotated), role-guard middleware, `express-rate-limit` on `/auth/*`.
Security: helmet, cors allowlist, parameterized queries only (no string concat), zod validation on every body/query, multer for uploads (mime + 2 MB size check, saved to `server/uploads/books/`).

---

## What I need from you before starting

1. **Go / no-go on all three phases.** Reply "go" and I run Phase 1 → 2 → 3 back-to-back, stopping only if a migration or approval-gated tool needs your OK. If you'd rather I stop between phases for review, say "phase by phase".
2. **Auto-create missing masters during Excel import?** Default = yes (checkbox on, user can uncheck). Say "no" to make unknown Category/Author/etc. hard-fail the row instead.
3. **MySQL backend language: TypeScript (default) or plain JavaScript?** TS gives typing and better DX; JS is easier to run without a build step.

Reply with any of: `go`, `phase by phase`, or answers to 2/3. Anything you don't answer, I'll use the defaults above.
