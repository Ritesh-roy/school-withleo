
# School withleo — Enterprise Upgrade Plan

Scope confirmed: **parallel MySQL/Express backend** (generated as artifacts, you host separately) + finish all location/audit/quick-fix work on the live Lovable Cloud (Postgres) backend so the app keeps running. UI unchanged.

---

## Milestone 1 — Quick Fixes (live app)

1. **Login page** (`src/routes/auth.tsx`)
   - Inline "Invalid credentials" alert directly above Email/Password (not disconnected toast).
   - Password field: eye icon toggle (Show/Hide), `aria-label`, keyboard accessible.

2. **Centralized logo** (`src/lib/branding.ts` + update Sidebar/Topbar/Auth)
   - Single `LOGO_URL` + `<AppLogo/>` component. Replace all direct img refs.
   - Fixes broken logo across Admin/Librarian/Sidebar/Header.

3. **Dashboard chart** (`src/routes/_app.dashboard.tsx`)
   - Sort issue-by-month series by month index Jan→Dec dynamically (no manual order).

4. **Book Master number fields** (`src/routes/_app.books.tsx`)
   - Pages / Price / MRP default = `""` not `0`. Validation: Pages > 0, Price ≥ 0, MRP ≥ 0.

5. **Book Master cover image**
   - Create Lovable Cloud Storage bucket `book-covers` (public read, staff write).
   - Add drag-and-drop upload (JPG/PNG/WEBP, ≤2MB) with preview, alongside existing URL input. Store either uploaded public URL or user URL in `books.image_url`.

6. **Bulk Entry CRUD** (`src/routes/_app.bulk-entry.tsx`)
   - Row-level Edit / Delete / View actions (dialog).
   - Unique ISBN check before insert → "ISBN already exists." Add DB unique index on `books.isbn` (partial, where isbn not null).

---

## Milestone 2 — Location Hierarchy (live Postgres backend)

Because rebuilding the UI is out of scope, the 7-level hierarchy is added as **structured data + optional pickers**, keeping the current Location tab in Library Master working as before (legacy free-text names remain).

### New tables (Postgres migration)

```text
campuses      (id, name, code, status)
buildings     (id, campus_id, name, code, status)
floors        (id, building_id, name, level_no, status)
rooms         (id, floor_id, name, code, status)
almirahs      (id, room_id, name, code, status)
racks         (id, almirah_id, name, code, capacity int, status)
shelves       (id, rack_id, name, position int, status)   -- optional
book_locations(book_id PK/FK, campus_id, building_id, floor_id, room_id,
               almirah_id, rack_id, shelf_id, position int, updated_at, updated_by)
book_transfers(id, book_id, from_rack_id, to_rack_id, from_json, to_json,
               moved_by, moved_at, remarks)
book_movements(id, book_id, event_type enum(issue|return|transfer|lost|damaged|deleted|updated),
               actor_id, actor_name, from_json, to_json, remarks, created_at)
```

- All timestamps, `created_by`, `updated_by`, `deleted_at` (soft delete) on every table.
- FKs cascade sensibly; indexes on every FK + `books.isbn`, `books.accession_no`.
- GRANTs + RLS: staff (admin/librarian) full CRUD; teacher/student read-only where needed.

### Rack capacity & auto-inventory (DB triggers)

- View `rack_inventory` = `capacity`, `current_count` (from `book_locations`), `available`.
- Triggers on `book_locations` insert/update/delete + on `book_issues` (issued books decrement available count on the source rack) keep counts automatic.

### Book location search

- New route `src/routes/_app.book-location.tsx` (added under Library group; no sidebar restructure).
- Search by ISBN / accession / name / author / category / publisher → shows Campus → Building → Floor → Room → Almirah → Rack → Shelf → Position.

### Book Transfer

- New route `src/routes/_app.book-transfer.tsx`: pick book, choose new location via cascading dropdowns → writes `book_locations` + `book_transfers` + `book_movements`.

### Movement history

- New route `src/routes/_app.book-history.tsx`: filterable timeline per book.

---

## Milestone 3 — Audit Log Upgrade

- Extend `activity_logs`: add `ip_address inet`, `user_agent text`, `event_type text`.
- Server function `logEvent` captures IP via `getRequestHeader('x-forwarded-for')` and UA header.
- Emit events for: login, logout, create/update/delete on masters/books/members, issue, return, transfer, role change, settings change.
- Existing Activity page gets IP / browser columns.

---

## Milestone 4 — Parallel MySQL Backend (artifacts only)

Generated under `backend-mysql/` — you host it separately (Railway / VPS / etc.). The Lovable app keeps using Lovable Cloud; nothing in the live app connects to MySQL.

### Deliverables

```text
backend-mysql/
├── sql/
│   ├── 001_schema.sql        -- full normalized MySQL 8 schema (all 24 tables you listed)
│   ├── 002_seed.sql          -- admin, librarian, sample masters/books/members
│   └── README.md             -- import instructions
├── src/
│   ├── server.ts             -- Express, helmet, cors, rate-limit, morgan
│   ├── db.ts                 -- mysql2/promise pool
│   ├── auth/                 -- bcrypt, JWT + refresh, role middleware
│   ├── middleware/           -- validate (zod), errorHandler, auditLogger
│   ├── modules/              -- controllers + services + repositories per domain
│   │   ├── users/ roles/ books/ members/ issues/ returns/
│   │   ├── locations/ transfers/ movements/ audit/ dashboard/
│   └── routes/               -- REST routers mounted at /api/v1/*
├── package.json  tsconfig.json  .env.example  Dockerfile  README.md
```

- Auth: bcrypt (12 rounds), JWT access (15m) + refresh (7d, rotated), role-based guard, `express-rate-limit` on auth routes.
- Security: helmet, cors allowlist, `express-validator`/zod, parameterized queries only (SQL injection safe), file upload via multer with mime/size checks storing under `server/uploads/books/`.
- Pagination / server-side search on all list endpoints, indexes in schema, prepared statements.
- README with `mysql -u root -p < sql/001_schema.sql` + `npm i && npm run dev` instructions.

---

## Out of scope / explicit non-goals

- No UI redesign, no theme/color/sidebar/dashboard-layout changes.
- No cutover of the live app to MySQL — MySQL bundle is standalone.
- Storage uploads use Lovable Cloud Storage (Workers have no local FS); the MySQL Express bundle uses local `server/uploads/books` as you specified.

---

## Order of execution (single continuous run)

1. Milestone 1 fixes (small files, parallel edits).
2. Milestone 2 Postgres migration + new routes.
3. Milestone 3 audit fields migration + helper wiring.
4. Milestone 4 generate `backend-mysql/` bundle.
5. Build / typecheck; fix any errors.

Rough size: ~30-40 files touched or created. This is a large single turn — I will run continuously and only stop on approval-gated tools (DB migrations).

Reply **"go"** to start, or tell me to trim any milestone first.
