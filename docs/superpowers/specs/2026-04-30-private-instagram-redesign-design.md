# Private Instagram Redesign — Design Spec

**Date:** 2026-04-30
**Status:** Approved (brainstorm phase)
**Replaces:** Existing static-export photo-gallery app (`travel-taste`).

## Goal

Replace the current static-export Cloudinary photo gallery with a private, broadcast-only Instagram-style feed. One owner posts photos; specific recipients view them through per-person passcodes. No public access, no social graph, no comments, no reactions.

## Non-Goals (v1)

- Multi-owner / co-poster support.
- Likes, comments, reactions, DMs.
- Push notifications, email digests.
- Native mobile apps.
- Carousel posts, albums, stories.
- Photo edit / re-crop / re-caption after upload.
- Mobile camera-capture flow beyond the browser file picker's `capture` attribute.
- Magic-link / OAuth identity for viewers.

## Locked Decisions

| # | Decision |
|---|---|
| 1 | Solo poster, invite-only viewers. |
| 2 | Per-person passcode auth for viewers (no email, no OAuth). |
| 3 | Whole-feed access — one code grants the entire feed past + future. |
| 4 | Pure broadcast — viewers are read-only. |
| 5 | Post = single photo + caption + date. No carousels, no albums. |
| 6 | Supabase (Postgres + Storage + RLS) as backend. |
| 7 | Owner auth = server-side hardcoded password → httpOnly cookie. |
| 8 | Codes are labeled, manually revocable, never auto-expire. |
| 9 | Mobile-first design. |
| 10 | Feed layout = 2-column masonry with inline captions. |
| 11 | v1 scope = MVP + admin UI for code management. |

## Architecture

Drop `output: 'export'`. Run Next.js 16 App Router on Vercel Fluid Compute. Three runtime surfaces:

**Public site (no auth):**
- `/` — if no `viewer_session` cookie, render `<CodeEntry/>`. If cookie valid → redirect `/feed`.
- `/feed` — server component, viewer-gated, renders 2-col masonry feed.
- `/feed/[postId]` — server component, single-post detail view.

**Owner admin (password-gated):**
- `/admin/login` — password form.
- `/admin` — posts list + new-post entry.
- `/admin/new` — upload form (file + caption).
- `/admin/codes` — viewer codes table (label, masked code, last-seen, revoke).

**API routes (`/api/*` Route Handlers):**
- `POST /api/viewer/redeem` — exchange passcode for viewer cookie.
- `POST /api/viewer/logout` — clear viewer cookie.
- `POST /api/admin/login` — exchange password for owner cookie.
- `POST /api/admin/logout` — clear owner cookie.
- `POST /api/admin/posts` — create post (multipart upload).
- `DELETE /api/admin/posts/[id]` — delete post.
- `GET /api/admin/codes` — list codes.
- `POST /api/admin/codes` — create code (returns plaintext ONCE).
- `DELETE /api/admin/codes/[id]` — revoke (sets `revoked_at`).

**Middleware (`middleware.ts`):**
- Protects `/feed` and `/feed/[postId]` (and any future `/feed/*` route) — verifies viewer cookie, looks up `viewer_codes` to confirm not revoked. Direct navigation to a post detail URL without a valid viewer cookie redirects to `/`.
- Protects `/admin` and all `/admin/*` routes except `/admin/login` — verifies owner cookie. Failure redirects to `/admin/login`.
- Protects `/api/admin/*` route handlers — same owner cookie check; failure returns 401 JSON.

Supabase = single source of truth. Storage holds photos in a private bucket. Postgres holds posts, codes, redemption audit log. Viewer reads use anon key + JWT-backed RLS. Owner writes go through server routes that hold the service role key in env.

```
Browser ──code──> /api/viewer/redeem ──> argon2-verify in DB ──> sets viewer cookie (signed JWT)
Browser ──cookie──> /feed (server)   ──> Supabase anon w/ JWT ──> RLS allows posts SELECT
Owner   ──pwd───> /api/admin/login   ──> sets owner cookie (signed JWT)
Owner   ──upl──> /api/admin/posts    ──> sharp pipeline ──> service-role insert + storage
```

The Cloudinary pipeline is removed: `scripts/fetch-photos.mjs`, `lib/photos.generated.ts`, `lib/photos-build.ts`, and `next-cloudinary` are deleted. `predev` / `prebuild` hooks for photo fetching are removed from `package.json`.

## Data Model

```sql
create table posts (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,        -- from EXIF DateTimeOriginal if present
  created_at   timestamptz not null default now(),
  width        int,
  height       int,
  blurhash     text                -- low-res placeholder
);
create index posts_created_at_idx on posts (created_at desc);

create table viewer_codes (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,     -- "Mom", "Sister", etc.
  code_hash     text not null unique,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  last_used_at  timestamptz
);
create index viewer_codes_active_idx on viewer_codes (revoked_at) where revoked_at is null;

create table viewer_sessions (
  id           uuid primary key default gen_random_uuid(),
  code_id      uuid not null references viewer_codes(id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  ip_hash      text,               -- sha256 of client IP
  user_agent   text
);
```

**RLS:**

```sql
alter table posts enable row level security;
alter table viewer_codes enable row level security;
alter table viewer_sessions enable row level security;

create policy posts_viewer_read on posts
  for select to anon
  using (current_setting('request.jwt.claims', true)::jsonb ? 'viewer_code_id');

-- viewer_codes + viewer_sessions: anon = no access. Service role bypasses RLS.
```

**Viewer JWT shape:**

```json
{ "viewer_code_id": "uuid", "label": "Mom", "exp": <unix-ts> }
```

Signed with `VIEWER_JWT_SECRET` (HS256). Posted to Supabase as `Authorization: Bearer <jwt>` on the anon client; Postgres `request.jwt.claims` then includes `viewer_code_id`, satisfying the RLS policy.

**Code storage:** plaintext code is shown to the owner ONCE at creation, stored as an argon2 hash, and cannot be re-displayed. The owner must copy/save the code at creation time.

**Code format:** 10-character base32-Crockford string (no `0/O/I/L/U` to avoid misreads), generated via crypto-random bytes → ~50 bits of entropy. Easy to read aloud, hard to brute-force. Displayed grouped: `XXXXX-XXXXX`. Stored as the unbroken 10-char form (hashed).

**Why no `viewers` table:** the code IS the viewer. One code per recipient. The label is human-readable. No accounts.

## Auth Flows

**Viewer:**

1. `GET /` — server checks `viewer_session` cookie. Valid → redirect `/feed`. Missing/expired → render code-entry form.
2. User submits code → `POST /api/viewer/redeem`:
   - Server-side rate limit per IP (10 attempts / minute).
   - Argon2 verify against `viewer_codes` rows where `revoked_at IS NULL`.
   - Match → insert `viewer_sessions` row, update `last_used_at`, sign JWT, set `viewer_session` httpOnly cookie (Secure in prod, SameSite=Lax, 30-day rolling expiry).
   - No match → 401 with generic `"Invalid code"` message; failure counter incremented.
3. Subsequent navigations: middleware decodes cookie, attaches JWT to Supabase anon client. Cookie expiry refreshed on each successful request.
4. Logout: `POST /api/viewer/logout` clears cookie. The `viewer_sessions` audit row is retained.
5. Revocation: setting `revoked_at` on a code does not invalidate already-issued JWTs cryptographically. Mitigation: middleware does a cheap indexed DB lookup on each protected navigation and rejects if `revoked_at IS NOT NULL`.

**Owner:**

1. `GET /admin` — no `owner_session` cookie → redirect `/admin/login`.
2. `POST /api/admin/login`:
   - Constant-time compare against `OWNER_PASSWORD` env (server-only, NOT `NEXT_PUBLIC_*`).
   - Set `owner_session` httpOnly cookie (Secure in prod, SameSite=Strict, 7-day absolute expiry — no rolling).
   - Per-IP rate limit (5 attempts / 10 min).
3. Owner-only routes verify cookie via shared middleware. Failure → 401, redirect `/admin/login`.

**Cookies:**

| Cookie | httpOnly | Secure (prod) | SameSite | Expiry |
|---|---|---|---|---|
| `viewer_session` | yes | yes | Lax | 30d rolling |
| `owner_session`  | yes | yes | Strict | 7d absolute |

**Secrets (env vars):**

- `OWNER_PASSWORD` — server only.
- `VIEWER_JWT_SECRET` — server only, ≥32 random bytes.
- `OWNER_JWT_SECRET` — server only, separate from viewer secret.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — anon client.
- `SUPABASE_SERVICE_ROLE_KEY` — server only, owner routes only.

`NEXT_PUBLIC_APP_PASSWORD` from the current app is removed.

## Pages & Components

**Routes:**

```
app/
  layout.tsx                  → root, ThemeProvider only
  page.tsx                    → public landing: <CodeEntry/>
  feed/
    page.tsx                  → viewer-gated, <MasonryFeed/>
    [postId]/page.tsx         → single-post detail
  admin/
    layout.tsx                → owner-gated wrapper, <AdminNav/>
    login/page.tsx            → <OwnerLogin/>
    page.tsx                  → posts list + "+ New post" link
    new/page.tsx              → <NewPostForm/>
    codes/page.tsx            → <CodesTable/>
  api/
    viewer/redeem/route.ts
    viewer/logout/route.ts
    admin/login/route.ts
    admin/logout/route.ts
    admin/posts/route.ts          (POST)
    admin/posts/[id]/route.ts     (DELETE)
    admin/codes/route.ts          (GET, POST)
    admin/codes/[id]/route.ts     (DELETE)
middleware.ts
```

**New components:**

- `components/auth/code-entry.tsx` — single input → `POST /api/viewer/redeem`. Replaces `login-form.tsx`.
- `components/auth/owner-login.tsx` — password form.
- `components/feed/masonry-feed.tsx` — 2-col CSS-grid masonry, server-fetched, "Load more" cursor pagination by `created_at`.
- `components/feed/post-tile.tsx` — image (signed Storage URL) + caption + relative date. Click → `/feed/[postId]`.
- `components/feed/post-detail.tsx` — full-bleed photo, caption, `taken_at` and `created_at`, back button.
- `components/admin/admin-nav.tsx` — top tabs: Posts | Codes | Logout.
- `components/admin/posts-list.tsx` — table of posts: thumb, caption, `created_at`, delete.
- `components/admin/new-post-form.tsx` — `<input type="file" accept="image/*" capture>` + caption textarea.
- `components/admin/codes-table.tsx` — rows: label, masked code (`••••XX12`), `created_at`, `last_used_at`, revoke. "+ New code" → modal with label input. On create, plaintext code shown ONCE with copy button + warning.

**Components kept:**

- `components/ui/*` (shadcn).
- `components/theme-provider.tsx`, `components/ui/theme-toggle.tsx`.
- `components/ui/sonner.tsx` (toaster) — used for upload + copy feedback.

**Components removed:**

- `components/auth/login-form.tsx` — replaced.
- `components/client-layout.tsx` — pattern dies; server components handle session.
- `components/gallery/photo-section.tsx`, `components/gallery/masonry-grid.tsx`, `components/gallery/photo-tile.tsx` — replaced by `feed/*`.
- `components/ui/image-modal.tsx` — replaced by the `/feed/[postId]` route (deep-linkable, share-safe).
- `components/navigation.tsx` — public site does not need it; admin has its own nav.

**Lib (kept / new):**

- `lib/supabase/server.ts` — server client factories (anon + service role).
- `lib/supabase/viewer.ts` — anon client with viewer JWT attached.
- `lib/auth/viewer.ts` — JWT sign/verify, cookie helpers.
- `lib/auth/owner.ts` — same for owner.
- `lib/auth/cookies.ts` — shared cookie option helpers.
- `lib/codes/hash.ts` — argon2 wrappers + plaintext code generator.
- `lib/photos/process.ts` — sharp pipeline (decode, EXIF strip, resize, blurhash).
- `lib/utils.ts` — keep `cn()`.
- `lib/constants.ts` — kept; holds cookie names.

**Lib removed:**

- `lib/photos.generated.ts`, `lib/photos-build.ts`, `lib/photos.ts`, `scripts/fetch-photos.mjs`.

## Photo Upload & Storage

**Bucket:** Supabase Storage bucket `posts`, **private** (no public read). Files keyed `posts/YYYY/MM/<uuid>.<ext>`.

**Upload (`POST /api/admin/posts`):**

1. Owner cookie verified.
2. Body parsed as `multipart/form-data` (file + caption).
3. Validation:
   - Mime type ∈ `{image/jpeg, image/png, image/webp, image/heic}`.
   - Size ≤ 20 MB.
4. `sharp` pipeline:
   - Decode → extract `DateTimeOriginal` from EXIF (if present) for `taken_at`.
   - Strip remaining EXIF (no GPS leaks to viewers).
   - Auto-rotate per orientation tag.
   - Resize: max 2400 px on long edge.
   - Re-encode (JPEG q=82 or WebP q=80).
   - Compute width/height + blurhash.
5. `supabase.storage.from('posts').upload(path, buffer)` using service role.
6. `insert into posts (...)` returning the row.
7. Respond `{ id, storage_path, ... }`. Client toasts "Posted", redirects `/admin`.

**Read (viewer feed):**

- Server component renders `<MasonryFeed/>` after middleware decodes the viewer JWT.
- Query: `from('posts').select(...).order('created_at', { ascending: false }).limit(20)`.
- For each post, generate a signed URL: `supabase.storage.from('posts').createSignedUrl(path, 3600)` (1h TTL).
- Signed URL renewed on every server render. Browser caches with Supabase's cache headers.
- Initial paint uses `blurhash` placeholder while the signed image loads.

**Why private bucket + signed URLs:** keeps photos un-Googleable and un-hotlinkable by anyone without a current viewer session. A public bucket would defeat the "private" goal.

**Delete:**

- `DELETE /api/admin/posts/[id]` — service role removes the storage object, then deletes the row. If storage delete fails after row delete, the orphan is logged; no user-visible error (acceptable trade-off — no leak risk).

**Image rendering:**

- Plain `<img loading="lazy" srcset>` on the feed. `next/image` is not used because signed URLs change per render and would defeat the optimizer's cache. Acceptable: Supabase Storage already returns optimized JPEG/WebP and the sharp pipeline pre-resizes.

## Error Handling

| Surface | Failure | Strategy |
|---|---|---|
| `POST /api/viewer/redeem` | wrong code | 401 `{error:"Invalid code"}`; constant-time argon2 verify; no distinction between "not found" and "revoked". |
| `POST /api/viewer/redeem` | rate limit hit | 429 `{error,"Try again in N seconds"}` + `Retry-After` header. |
| `POST /api/admin/login` | wrong password | 401, generic message; per-IP failure counter. |
| `POST /api/admin/posts` | sharp decode fails | 415 `{error:"Could not read image"}`; client toast. |
| `POST /api/admin/posts` | storage upload fails | 502 `{error:"Storage unavailable"}`; no DB row inserted (storage first, then row). |
| `POST /api/admin/posts` | DB insert fails after upload | server best-effort deletes the uploaded blob; returns 500. |
| `/feed` server render | Supabase down | error boundary: "Can't load right now. Try again." Logged via `console.error`. |
| Middleware | malformed/expired cookie | clear cookie; redirect `/` (viewer) or `/admin/login` (owner). |
| Image render | signed URL 404 (post deleted between query and render) | `<img onError>` swap to local placeholder; detail page renders 404. |

**Client UX:**

- Transient errors → `sonner` toasts.
- Auth-form errors → inline red text under the input (current pattern).
- 404/500 pages → plain shadcn cards, link back to `/` or `/admin`.

**Logging:**

- All `/api/*` routes log `{route, status, durationMs, errorCode}` via `console.log` (Vercel captures stdout).
- No PII (no codes, no passwords, no captions). Hashed IP only.
- Failed redemptions logged with a marker that does not reveal which code was attempted, so brute-force patterns are visible without leaking code identity.

**No retries, no silent fallbacks:** server routes do not auto-retry. Clients do not auto-retry. If Supabase is down, viewers see an error state, not a stale cached feed.

## Testing

**Unit (Vitest, jsdom):**

- `lib/auth/viewer.ts`, `lib/auth/owner.ts` — JWT sign/verify roundtrip; expiry rejection; tampered signature rejection.
- `lib/auth/cookies.ts` — option correctness (httpOnly, Secure flag in prod env).
- `lib/photos/process.ts` — fixture JPEG with GPS EXIF in → output buffer has no GPS, has correct dimensions, deterministic blurhash.
- `lib/codes/hash.ts` — argon2 verify roundtrip; wrong code rejection; constant-time-ish behavior.
- `components/auth/code-entry.tsx` — submits to mocked endpoint; displays inline error on 401; shows rate-limit text on 429.

**Integration (Vitest, Node env, mocked Supabase client):**

- `POST /api/viewer/redeem` — happy path sets cookie; revoked code → 401; rate-limit hit → 429.
- `POST /api/admin/login` — happy path sets cookie; wrong password → 401.
- `POST /api/admin/posts` — happy path; size > 20 MB → 413; non-image → 415; storage fail → 502 + no DB row.
- `DELETE /api/admin/posts/[id]` — owner cookie required; deletes row + storage; missing → 404.
- RLS test — two-client harness against a Supabase test project:
  - anon without JWT → `select * from posts` returns 0 rows.
  - anon with valid viewer JWT → returns rows.
  - service role → returns rows + can write.

**E2E (Playwright):**

Replace the existing fixture-driven photo specs. New specs in `e2e/`:

- `viewer-flow.spec.ts` — valid code → `/feed` → masonry renders → tile click → `/feed/[id]` → back.
- `viewer-invalid-code.spec.ts` — wrong code → inline error, stays on `/`.
- `viewer-rate-limit.spec.ts` — 11 wrong codes from same client → 429 text shown.
- `owner-login.spec.ts` — wrong password → error; right password → `/admin` renders.
- `owner-upload.spec.ts` — login → upload fixture → see post in admin list → log out → enter code → see post in feed.
- `owner-revoke.spec.ts` — create code, redeem from second context, revoke from owner, second context refresh → kicked back to `/`.
- `mobile-feed.spec.ts` — `iPhone 13` viewport: code entry usable, masonry 2-col, tile tap → detail.

**Test data:**

- `e2e/fixtures/test-image.jpg` (small JPEG with EXIF GPS for strip verification).
- Supabase test project (separate from prod) seeded via `e2e/seed.sql` before each run; truncated after.
- Test env vars (`SUPABASE_URL_TEST`, etc.) wired in `playwright.config.ts`.

**CI:** unit + integration on every PR. E2E gated behind a Supabase test instance — runs on `main` and via manual trigger.

## Migration

The redesign is a near-total rewrite, but the repo, build tooling, theme, and shadcn UI primitives are reused. Concretely:

**Kept:** Next.js 16, React 19, Tailwind v3, shadcn/ui components, `next-themes`, Vitest + Playwright tooling, ESLint/Prettier/Husky/lint-staged config, `cn()` helper, theme provider, sonner toaster.

**Removed:** static export config (`output: 'export'`, `images.unoptimized`), Cloudinary integration, photo-fetch script, `predev`/`prebuild` photo hooks, current login form, current gallery/modal components, current navigation, current `client-layout.tsx` mount-then-read pattern (server components handle session natively now).

**Added:** `@supabase/supabase-js`, `@supabase/ssr`, `argon2` (or `@node-rs/argon2`), `sharp`, `blurhash`, `jose` (or `jsonwebtoken`) for JWT sign/verify, optional rate-limit dep (e.g., `@upstash/ratelimit` if Vercel KV/Upstash added; otherwise a simple Postgres-backed counter).

## Risks & Open Questions

- **Argon2 in serverless:** native bindings can be heavy on cold start. Mitigation: prefer `@node-rs/argon2` (precompiled) or fall back to a tunable bcrypt cost.
- **Rate limiting:** without Vercel KV/Upstash, in-memory limits don't survive across Fluid Compute instances. Decision deferred to plan: either add KV or do a Postgres-backed counter with a small index.
- **Code distribution:** owner copies plaintext at creation and shares out-of-band (text, Signal, etc.). UX detail (QR code, share-sheet) deferred to v1.1.
- **Bucket data residency / legal:** photos are personal but private. Supabase region selection is owner's choice; not specified here.
