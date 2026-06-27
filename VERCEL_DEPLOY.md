# Deploy to Vercel (Frontend + SSR) — Backend stays on Lovable Cloud

Architecture:
- **Vercel** hosts the TanStack Start app (UI + SSR + server functions runtime)
- **Lovable Cloud (Supabase)** keeps Database, Auth, Storage — unchanged

## 1. Push the project to GitHub
Use the "GitHub" button in Lovable (top right) to connect and push the repo.

## 2. Import the repo on Vercel
- vercel.com → **Add New → Project** → pick the repo
- Framework Preset: **Other** (the included `vercel.json` handles the build)
- Build Command: leave default (uses `vercel.json` → `NITRO_PRESET=vercel bun run build`)
- Output Directory: leave default (`.vercel/output`)

## 3. Add Environment Variables (Project Settings → Environment Variables)

Add for **Production, Preview, Development**:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://wrqbcvsbhtrpzeukmizz.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (copy from `.env`) |
| `VITE_SUPABASE_PROJECT_ID` | `wrqbcvsbhtrpzeukmizz` |
| `SUPABASE_URL` | `https://wrqbcvsbhtrpzeukmizz.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | (copy from `.env`) |
| `SUPABASE_PROJECT_ID` | `wrqbcvsbhtrpzeukmizz` |

> **Note:** `SUPABASE_SERVICE_ROLE_KEY` is NOT accessible on Lovable Cloud. The demo-account seeding server function (`/auth` page) will silently no-op on Vercel — but all 3 demo accounts are **already seeded in the database**, so login works fine. Students can self-register normally.

## 4. Deploy
Click **Deploy**. First build takes ~2 minutes.

## 5. CORS — no action needed
Supabase Data API and Auth allow all origins with the publishable key by default. Vercel domain will work out of the box.

## 6. Optional: custom domain
Vercel Project → Settings → Domains → add your domain and point DNS as instructed.

---

### What stays on Lovable
- Postgres database, RLS policies, migrations
- Auth (email/password sessions)
- All data (members, books, issues, logs)

### What runs on Vercel
- React UI + SSR
- TanStack `createServerFn` calls (they hit Supabase over HTTPS, same as locally)

### Updating after deploy
Push to your GitHub repo → Vercel auto-deploys. Database changes still happen via Lovable.
