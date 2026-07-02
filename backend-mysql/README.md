# School withleo — MySQL + Express Backend

Production-ready standalone REST API using **Node.js + Express + MySQL 8 + JWT**.
This bundle is **independent** of the Lovable/Supabase frontend and can be pointed
to by any client via `VITE_API_BASE_URL`.

## Architecture

```
backend-mysql/
├── sql/
│   ├── 001_schema.sql   # complete MySQL 8 schema (tables, views, triggers)
│   └── 002_seed.sql     # roles, demo users, masters, sample campus
└── src/
    ├── server.ts        # express bootstrap
    ├── db.ts            # mysql2 pool
    ├── auth/jwt.ts      # JWT sign/verify + role guards
    ├── middleware/      # error handler
    ├── repositories/    # raw SQL (Repository layer)
    ├── services/        # business rules (Service layer)
    └── routes/          # HTTP (Controller layer)
```

Layers: **Controller → Service → Repository → MySQL**. All writes that touch
multiple tables (bulk import, issue, return, transfer) use `conn.beginTransaction()`.

## Setup

```bash
cd backend-mysql
cp .env.example .env
# edit .env with your MySQL credentials
mysql -u root -p < sql/001_schema.sql
mysql -u root -p school_withleo < sql/002_seed.sql
npm install
npm run dev
```

Server listens on `http://localhost:4000`. Health check: `GET /health`.

## Demo credentials

Password hashes in `002_seed.sql` correspond to:

| Email | Password | Role |
|-------|----------|------|
| Admin@leo.com | admin@leo12 | admin |
| Librarian@leo.com | Librarian@123 | librarian |
| Teacher@leo.com | Teacher@123 | teacher |

> Regenerate any hash with `node -e "console.log(require('bcryptjs').hashSync('yourpass',12))"`
> if you change passwords.

## API summary

All non-auth routes require `Authorization: Bearer <accessToken>`.

### Auth
- `POST /api/v1/auth/login` → `{ accessToken, refreshToken, user }`

### Books
- `GET  /api/v1/books?q=&limit=&offset=`
- `POST /api/v1/books` *(admin, librarian)*
- `POST /api/v1/books/bulk-import` *(admin, librarian)* — body `{ rows: [...] }`, transactional

### Members
- `GET  /api/v1/members`
- `POST /api/v1/members` *(admin, librarian)*

### Locations (7-level hierarchy)
`level` ∈ `campuses | buildings | floors | rooms | almirahs | racks | shelves`
- `GET    /api/v1/locations/:level?parentId=`
- `POST   /api/v1/locations/:level` *(admin, librarian)*
- `DELETE /api/v1/locations/:level/:id` *(admin, librarian)*
- `GET    /api/v1/locations/racks/:id/inventory` — `{ capacity, current_count, available }`
- `POST   /api/v1/locations/transfer` *(admin, librarian)* — moves a book, writes `book_transfers` + `book_movements`

### Issue / Return
- `POST /api/v1/issues` *(admin, librarian)* — decrements `available_copies`
- `POST /api/v1/issues/:id/return` *(admin, librarian)* — computes fine using `settings.fine_per_day`

## Database highlights

- **Location hierarchy**: `campuses → buildings → floors → rooms → almirahs → racks → shelves`, each with soft delete (`deleted_at`) and cascading FKs.
- **`book_locations`**: one row per book with the full 7 IDs + `position`; a trigger writes to `book_movements` on insert/update, so **inventory history is automatic**.
- **`rack_inventory`** view: `capacity`, `current_count`, `available` in one query.
- **`audit_logs`**: includes `ip_address` and `user_agent` for forensic tracing.
- **Enums** for `books.status` and `book_movements.event_type`.
- **Indexes** on every FK and common search column (`books.title`, `members.name`).
- **Soft delete** on `users`, `books`, `members`, and every location level.

## Wiring the frontend

Set `VITE_API_BASE_URL=http://localhost:4000/api/v1` and the existing forms
(Book Master, Bulk Entry Excel import, Location Master, Issue/Return) can call
these endpoints instead of Supabase. The routes intentionally mirror the
Supabase table names so the transition is a search-and-replace.
