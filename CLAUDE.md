# CLAUDE.md

Guidance for Claude Code working in this repo.

## Commands

Package manager: **pnpm**.

- `pnpm dev` — Next.js dev server.
- `pnpm build` / `pnpm start` — production build + serve.
- `pnpm lint` / `pnpm lint:fix` — ESLint (flat config in `eslint.config.mjs`).
- `pnpm test` / `pnpm test:watch` — Vitest unit + integration tests.
- `pnpm test:e2e` / `pnpm test:e2e:ui` — Playwright end-to-end tests.
- `pnpm db:start` / `pnpm db:stop` — Supabase local stack (Docker).
- `pnpm db:reset` — drop and re-apply all migrations.
- `pnpm db:diff` — generate a new migration from local edits.

Husky + `lint-staged` run `eslint --fix` and `prettier --write` on staged `*.{js,jsx,ts,tsx}`.

## Environment

Server-only (`.env`, never `NEXT_PUBLIC_*`):
- `OWNER_PASSWORD` — owner sign-in password (constant-time compared).
- `VIEWER_JWT_SECRET` / `OWNER_JWT_SECRET` — HS256 JWT secrets, ≥32 random bytes.
- `SUPABASE_SERVICE_ROLE_KEY` — used by all `/api/admin/*` and `/api/feed`.

Public:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

`.env.example` documents the full set including Playwright `*_TEST` slots.

## Architecture

Next.js 16 App Router on Vercel Fluid Compute. Single Supabase backend (Postgres + Storage + RLS). No more static export.

- **Public landing (`/`)** — server component checks `viewer_session` cookie; renders `<CodeEntry/>` if absent/invalid, redirects to `/feed` if valid.
- **Viewer feed (`/feed`, `/feed/[postId]`)** — server-rendered, gated by `middleware.ts` which verifies the viewer JWT and rejects revoked codes via a cheap indexed Postgres lookup on every navigation.
- **Owner admin (`/admin/*`)** — gated by `middleware.ts` against the owner JWT. `/admin/login` is the only public sub-route; `/api/admin/login` likewise public.
- **API routes**:
  - `viewer/redeem` — argon2 verifies code against active rows, signs JWT, sets cookie, audits redemption.
  - `viewer/logout` — clears cookie.
  - `admin/login` / `admin/logout` — password gate, owner cookie.
  - `admin/posts` — POST upload (sharp pipeline), GET list with signed URLs, DELETE per id.
  - `admin/codes` — CRUD viewer codes; create returns plaintext ONCE (`XXXXX-XXXXX`).
  - `feed` — viewer-side post fetch with cursor pagination (20/page).

Storage uses a **private** `posts` bucket; viewers see signed URLs only (1 h TTL, regenerated on each render).

## Auth flow

Viewer:
1. POST `/api/viewer/redeem` with code → server argon2-verifies, signs `viewer_session` httpOnly cookie (HS256, 30 d rolling).
2. Middleware decodes cookie + verifies code is not revoked on every `/feed/*` navigation.
3. Logout clears cookie.

Owner:
1. POST `/api/admin/login` with password (constant-time compare) → sets `owner_session` (HS256, 7 d absolute, SameSite=Strict).
2. Middleware verifies on every `/admin/*` and `/api/admin/*` (except `/admin/login` itself).

Rate limits (Postgres-backed sliding window in `rate_limit_attempts`):
- viewer redeem: 10 / 60 s per IP
- owner login: 5 / 600 s per IP

## Data model

`supabase/migrations/0001_init.sql`:
- `posts` (id, storage_path, caption, taken_at, created_at, width, height, blurhash) — RLS lets `anon` SELECT iff JWT carries `viewer_code_id`.
- `viewer_codes` (label, code_hash, revoked_at, last_used_at).
- `viewer_sessions` — audit log of redemptions.
- `rate_limit_attempts` — sliding-window bucket.

## Path aliases

`@/*` → repo root (`tsconfig.json` + `components.json`).

## Styling

Tailwind v3 + shadcn/ui (`components/ui/*`, baseColor `neutral`). Theme handled by `next-themes`. Use `cn()` from `lib/utils.ts`.

## Photo upload

Owner POSTs `multipart/form-data` to `/api/admin/posts`. Server pipeline (`lib/photos/process.ts`):
1. Validate mime ∈ `{jpeg, png, webp, heic}` and size ≤ 20 MB.
2. Extract EXIF `DateTimeOriginal` → `taken_at`.
3. Strip EXIF (no GPS leak), auto-rotate, resize ≤ 2400 px on long edge.
4. Re-encode JPEG q=82 (mozjpeg).
5. Compute blurhash via `blurhash` from a 32×32 raw RGBA preview.
6. Upload to Supabase Storage `posts/YYYY/MM/<uuid>.jpg`, then DB insert. On DB failure, best-effort storage cleanup.

## Notable constraints

- Middleware runs on Node runtime (`runtime: 'nodejs'`) so it can use `@supabase/supabase-js` and `jose` directly. `@node-rs/argon2` is server-only and lives in route handlers, not middleware.
- Service role key never ships to the browser. Only used by `lib/supabase/server.ts → supabaseServiceRole()`.
- All viewer reads from Storage go through server-minted signed URLs; bucket is private at the RLS layer.
