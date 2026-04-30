# Private Instagram Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static-export Cloudinary photo gallery with a Supabase-backed, broadcast-only private Instagram feed: one owner posts photos, viewers redeem per-person passcodes to read-only access the whole feed.

**Architecture:** Next.js 16 App Router on Vercel Fluid Compute (drop `output:'export'`). Supabase Postgres + Storage + RLS as the only data layer. Viewer auth = passcode → JWT cookie that satisfies an RLS policy. Owner auth = server-side hardcoded password → separate JWT cookie that gates `/admin/*` routes; owner-only writes use a service-role Supabase client.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v3, shadcn/ui, sonner, `@supabase/supabase-js`, `@supabase/ssr`, `@node-rs/argon2`, `jose`, `sharp`, `blurhash`, Vitest (jsdom + node), Playwright.

**Spec:** `docs/superpowers/specs/2026-04-30-private-instagram-redesign-design.md` — keep open while executing.

---

## File Structure

**New / modified files (created or rewritten in this plan):**

```
app/
  layout.tsx                              MODIFY — strip ClientLayout, mount ThemeProvider only
  page.tsx                                MODIFY — render <CodeEntry/> when no viewer cookie, redirect /feed otherwise
  feed/page.tsx                           CREATE — server component, masonry feed
  feed/[postId]/page.tsx                  CREATE — server component, single post detail
  admin/layout.tsx                        CREATE — owner-gated wrapper + <AdminNav/>
  admin/login/page.tsx                    CREATE — <OwnerLogin/>
  admin/page.tsx                          CREATE — posts list
  admin/new/page.tsx                      CREATE — new post form
  admin/codes/page.tsx                    CREATE — codes table
  api/viewer/redeem/route.ts              CREATE
  api/viewer/logout/route.ts              CREATE
  api/admin/login/route.ts                CREATE
  api/admin/logout/route.ts               CREATE
  api/admin/posts/route.ts                CREATE  (POST)
  api/admin/posts/[id]/route.ts           CREATE  (DELETE)
  api/admin/codes/route.ts                CREATE  (GET, POST)
  api/admin/codes/[id]/route.ts           CREATE  (DELETE)

middleware.ts                             CREATE — viewer + owner cookie protection

components/
  auth/code-entry.tsx                     CREATE
  auth/owner-login.tsx                    CREATE
  feed/masonry-feed.tsx                   CREATE
  feed/post-tile.tsx                      CREATE
  feed/post-detail.tsx                    CREATE
  feed/load-more.tsx                      CREATE — client component, pagination
  admin/admin-nav.tsx                     CREATE
  admin/posts-list.tsx                    CREATE
  admin/new-post-form.tsx                 CREATE
  admin/codes-table.tsx                   CREATE
  admin/new-code-dialog.tsx               CREATE

lib/
  constants.ts                            MODIFY — add cookie names + JWT iss
  auth/viewer.ts                          CREATE — viewer JWT sign/verify
  auth/owner.ts                           CREATE — owner JWT sign/verify
  auth/cookies.ts                         CREATE — cookie option helpers
  codes/hash.ts                           CREATE — argon2 wrappers
  codes/format.ts                         CREATE — base32-Crockford generator + grouping
  codes/rate-limit.ts                     CREATE — Postgres-backed sliding window
  photos/process.ts                       CREATE — sharp pipeline (decode, EXIF strip, resize, blurhash)
  supabase/server.ts                      CREATE — anon + service-role server clients
  supabase/viewer.ts                      CREATE — anon client w/ viewer JWT bearer

supabase/
  config.toml                             CREATE — local Supabase config
  migrations/0001_init.sql                CREATE — posts, viewer_codes, viewer_sessions, rate_limit_attempts, RLS

tests / e2e:
  test/lib/codes/hash.test.ts             CREATE
  test/lib/codes/format.test.ts           CREATE
  test/lib/auth/viewer.test.ts            CREATE
  test/lib/auth/owner.test.ts             CREATE
  test/lib/photos/process.test.ts         CREATE
  test/api/viewer/redeem.test.ts          CREATE
  test/api/admin/login.test.ts            CREATE
  test/api/admin/posts.test.ts            CREATE
  test/components/auth/code-entry.test.tsx CREATE
  e2e/viewer-flow.spec.ts                 CREATE
  e2e/viewer-invalid-code.spec.ts         CREATE
  e2e/viewer-rate-limit.spec.ts           CREATE
  e2e/owner-login.spec.ts                 CREATE
  e2e/owner-upload.spec.ts                CREATE
  e2e/owner-revoke.spec.ts                CREATE
  e2e/mobile-feed.spec.ts                 CREATE
  e2e/fixtures/test-image.jpg             CREATE
  e2e/seed.sql                            CREATE
  playwright.config.ts                    MODIFY — wire test Supabase env, swap fixture flow

config:
  next.config.js                          MODIFY — drop `output:'export'`, drop `images.unoptimized`, drop `remotePatterns` Cloudinary
  package.json                            MODIFY — drop `predev`/`prebuild`, drop `next-cloudinary`, `cloudinary`; add Supabase/auth/photo deps; add `db:*` scripts
  .env.example                            CREATE — document all env vars
  vitest.config.ts                        MODIFY — add `node` test environment project for integration tests
```

**Files DELETED in Phase 8:**

```
components/auth/login-form.tsx
components/client-layout.tsx
components/navigation.tsx
components/gallery/photo-section.tsx
components/gallery/masonry-grid.tsx
components/gallery/photo-tile.tsx
components/ui/image-modal.tsx
lib/photos.generated.ts
lib/photos-build.ts
lib/photos.ts (if present)
scripts/fetch-photos.mjs
e2e/fixtures/photos.json (current Cloudinary fixture)
e2e/auth.spec.ts, e2e/gallery.spec.ts, e2e/modal.spec.ts, e2e/mobile.spec.ts (old gallery e2e)
```

---

## Phase 0 — Project Setup

### Task 0.1: Create implementation worktree

**Files:** none (git only)

- [ ] **Step 1: Create worktree off `main`**

```bash
git worktree add ../travel-taste-private-ig -b feat/private-ig-redesign main
cd ../travel-taste-private-ig
```

- [ ] **Step 2: Verify clean state**

```bash
git status
git log --oneline -3
```

Expected: working tree clean; HEAD is the spec commit on `feat/private-ig-redesign`.

- [ ] **Step 3: Install current deps to baseline**

```bash
pnpm install
```

Expected: `pnpm install` exits 0.

---

### Task 0.2: Drop Cloudinary + static-export config

**Files:**
- Modify: `next.config.js`
- Modify: `package.json`

- [ ] **Step 1: Replace `next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase storage signed URLs are served from the project subdomain.
      // The exact hostname is set per environment via NEXT_PUBLIC_SUPABASE_URL.
      // We allowlist the wildcard here; Next.js validates against the configured URL at build time.
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: Edit `package.json` — remove Cloudinary + photo prebuild hooks**

Open `package.json` and:
- Delete `"predev": "node scripts/fetch-photos.mjs"`.
- Delete `"prebuild": "node scripts/fetch-photos.mjs"`.
- Delete `"cloudinary"` and `"next-cloudinary"` from `dependencies`.

- [ ] **Step 3: Reinstall to drop removed deps from lockfile**

```bash
pnpm install
```

Expected: lockfile updates; `node_modules/cloudinary` and `node_modules/next-cloudinary` are gone.

- [ ] **Step 4: Verify build no longer needs photos generation**

```bash
test -f lib/photos.generated.ts && rm lib/photos.generated.ts
pnpm build 2>&1 | tail -20
```

Expected: build attempt fails because `app/page.tsx` still imports `lib/photos.generated.ts` — that's OK; we will rewrite `app/page.tsx` in Phase 5. Confirm the failure is the expected import error and not a config error.

- [ ] **Step 5: Commit**

```bash
git add next.config.js package.json pnpm-lock.yaml
git commit -m "chore: drop static export and Cloudinary pipeline"
```

---

### Task 0.3: Add new dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @supabase/supabase-js @supabase/ssr @node-rs/argon2 jose sharp blurhash
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D supabase
```

- [ ] **Step 3: Verify versions**

```bash
pnpm list --depth 0 | grep -E "(supabase|argon2|jose|sharp|blurhash)"
```

Expected output includes all six packages.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Supabase, argon2, jose, sharp, blurhash deps"
```

---

### Task 0.4: Bootstrap Supabase locally

**Files:**
- Create: `supabase/config.toml` (generated)
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize Supabase project**

```bash
pnpm exec supabase init
```

Expected: writes `supabase/config.toml` and `supabase/seed.sql`.

- [ ] **Step 2: Add Supabase artifacts to `.gitignore`**

Append to `.gitignore`:

```
# Supabase local
supabase/.branches/
supabase/.temp/
.env
.env.local
.env.test
```

- [ ] **Step 3: Create `.env.example`**

Create `.env.example`:

```bash
# Server-only
OWNER_PASSWORD=change-me-min-12-chars
VIEWER_JWT_SECRET=change-me-32-random-bytes-base64
OWNER_JWT_SECRET=change-me-32-random-bytes-base64-different-from-viewer
SUPABASE_SERVICE_ROLE_KEY=eyJ...service-role...

# Public (safe in browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon...

# Test-only (Playwright)
SUPABASE_URL_TEST=
SUPABASE_SERVICE_ROLE_KEY_TEST=
NEXT_PUBLIC_SUPABASE_URL_TEST=
NEXT_PUBLIC_SUPABASE_ANON_KEY_TEST=
```

- [ ] **Step 4: Generate JWT secrets locally**

```bash
node -e "console.log('VIEWER:', require('crypto').randomBytes(32).toString('base64')); console.log('OWNER:', require('crypto').randomBytes(32).toString('base64'))"
```

Copy values into `.env` (you create `.env` manually; not committed).

- [ ] **Step 5: Start Supabase local stack**

```bash
pnpm exec supabase start
```

Expected: prints `API URL`, `anon key`, `service_role key`. Copy into `.env`:
- `NEXT_PUBLIC_SUPABASE_URL` ← API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← anon key
- `SUPABASE_SERVICE_ROLE_KEY` ← service_role key
- `OWNER_PASSWORD` ← any value e.g. `dev-only-pwd`

- [ ] **Step 6: Add db scripts to `package.json`**

In `package.json` `scripts` block, add:

```json
"db:start": "supabase start",
"db:stop": "supabase stop",
"db:reset": "supabase db reset",
"db:diff": "supabase db diff -f new_migration",
"db:migrate": "supabase migration up"
```

- [ ] **Step 7: Commit**

```bash
git add supabase/config.toml .env.example .gitignore package.json
git commit -m "chore: bootstrap Supabase local stack and env template"
```

---

## Phase 1 — Database Schema

### Task 1.1: Write `0001_init.sql` migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migrations/0001_init.sql`:

```sql
-- Enable required extensions
create extension if not exists pgcrypto;

-- =========================================================================
-- POSTS
-- =========================================================================
create table posts (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption      text,
  taken_at     timestamptz,
  created_at   timestamptz not null default now(),
  width        int,
  height       int,
  blurhash     text
);
create index posts_created_at_idx on posts (created_at desc);

-- =========================================================================
-- VIEWER CODES
-- =========================================================================
create table viewer_codes (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  code_hash     text not null unique,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  last_used_at  timestamptz
);
create index viewer_codes_active_idx on viewer_codes (revoked_at)
  where revoked_at is null;

-- =========================================================================
-- VIEWER SESSIONS (audit log of redemptions)
-- =========================================================================
create table viewer_sessions (
  id           uuid primary key default gen_random_uuid(),
  code_id      uuid not null references viewer_codes(id) on delete cascade,
  redeemed_at  timestamptz not null default now(),
  ip_hash      text,
  user_agent   text
);
create index viewer_sessions_code_idx on viewer_sessions (code_id, redeemed_at desc);

-- =========================================================================
-- RATE LIMIT BUCKET (per-IP sliding window for redeem + admin login)
-- =========================================================================
create table rate_limit_attempts (
  id           bigserial primary key,
  bucket       text not null,           -- e.g. 'viewer_redeem' | 'owner_login'
  ip_hash      text not null,
  attempted_at timestamptz not null default now()
);
create index rate_limit_lookup_idx
  on rate_limit_attempts (bucket, ip_hash, attempted_at desc);

-- Cleanup helper used by rate-limit module
create or replace function rate_limit_purge_old(older_than interval)
returns void
language sql
as $$
  delete from rate_limit_attempts
  where attempted_at < now() - older_than;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table posts enable row level security;
alter table viewer_codes enable row level security;
alter table viewer_sessions enable row level security;
alter table rate_limit_attempts enable row level security;

-- Anon clients with viewer_session JWT can read posts
create policy posts_viewer_read on posts
  for select to anon
  using (current_setting('request.jwt.claims', true)::jsonb ? 'viewer_code_id');

-- viewer_codes, viewer_sessions, rate_limit_attempts: anon = no access
-- (no policy = deny). Service role bypasses RLS by design.

-- =========================================================================
-- STORAGE BUCKET (private) — created via SQL helper
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('posts', 'posts', false)
on conflict (id) do nothing;

-- Storage RLS: only service role can read/write the bucket. Viewers get
-- signed URLs minted server-side.
create policy "posts_no_anon_read"
  on storage.objects for select to anon
  using (false);

create policy "posts_no_anon_write"
  on storage.objects for insert to anon
  with check (false);
```

- [ ] **Step 2: Apply migration**

```bash
pnpm exec supabase db reset
```

Expected: migration applies cleanly; output shows `0001_init.sql` applied.

- [ ] **Step 3: Verify tables exist**

```bash
pnpm exec supabase db dump --data-only --schema public | head -5
pnpm exec supabase db psql -c "\dt public.*"
```

Expected: lists `posts`, `viewer_codes`, `viewer_sessions`, `rate_limit_attempts`.

- [ ] **Step 4: Verify RLS is on**

```bash
pnpm exec supabase db psql -c "select relname, relrowsecurity from pg_class where relname in ('posts','viewer_codes','viewer_sessions','rate_limit_attempts');"
```

Expected: all four show `relrowsecurity = t`.

- [ ] **Step 5: Verify storage bucket**

```bash
pnpm exec supabase db psql -c "select id, public from storage.buckets where id='posts';"
```

Expected: one row with `public = f`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): initial schema with posts, codes, sessions, rate limits, RLS"
```

---

## Phase 2 — Lib Utilities (TDD)

### Task 2.1: Update `lib/constants.ts`

**Files:**
- Modify: `lib/constants.ts`

- [ ] **Step 1: Replace contents**

```ts
// Cookie names
export const VIEWER_COOKIE = 'viewer_session';
export const OWNER_COOKIE = 'owner_session';

// JWT issuer claim
export const JWT_ISSUER = 'travel-taste';

// Cookie lifetimes (seconds)
export const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, rolling
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;   // 7 days, absolute

// Rate limits
export const VIEWER_REDEEM_LIMIT = { count: 10, windowSec: 60 };
export const OWNER_LOGIN_LIMIT = { count: 5, windowSec: 600 };

// Upload constraints
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);
export const RESIZE_MAX_EDGE_PX = 2400;

// Storage
export const POSTS_BUCKET = 'posts';
export const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors related to `lib/constants.ts`. Pre-existing errors elsewhere are OK; we'll clean them up as we delete old code.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat(constants): add cookie names, rate limits, upload constraints"
```

---

### Task 2.2: `lib/codes/format.ts` — base32-Crockford generator

**Files:**
- Create: `lib/codes/format.ts`
- Create: `test/lib/codes/format.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/lib/codes/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateCode, groupCode, isValidCodeFormat } from '@/lib/codes/format';

describe('generateCode', () => {
  it('returns a 10-character string', () => {
    expect(generateCode()).toHaveLength(10);
  });

  it('uses Crockford alphabet only (no 0/O/I/L/U)', () => {
    const allowed = /^[0-9A-HJKMNP-TV-Z]+$/;
    for (let i = 0; i < 100; i++) {
      const c = generateCode();
      expect(c).toMatch(allowed);
      expect(c).not.toMatch(/[OILU]/);
    }
  });

  it('returns different codes on successive calls', () => {
    const a = generateCode();
    const b = generateCode();
    expect(a).not.toEqual(b);
  });
});

describe('groupCode', () => {
  it('formats 10-char code as 5-5 with hyphen', () => {
    expect(groupCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
  });

  it('throws on wrong length', () => {
    expect(() => groupCode('SHORT')).toThrow();
    expect(() => groupCode('ABCDEFGHJKL')).toThrow();
  });
});

describe('isValidCodeFormat', () => {
  it('accepts both grouped and ungrouped 10-char Crockford', () => {
    expect(isValidCodeFormat('ABCDEFGHJK')).toBe(true);
    expect(isValidCodeFormat('ABCDE-FGHJK')).toBe(true);
  });

  it('rejects wrong alphabet, wrong length, empty', () => {
    expect(isValidCodeFormat('ABCDEOGHJK')).toBe(false); // contains O
    expect(isValidCodeFormat('ABC')).toBe(false);
    expect(isValidCodeFormat('')).toBe(false);
  });

  it('is case-insensitive (lowercase normalized)', () => {
    expect(isValidCodeFormat('abcde-fghjk')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
pnpm test -- test/lib/codes/format.test.ts
```

Expected: FAIL with "Cannot find module `@/lib/codes/format`".

- [ ] **Step 3: Implement `lib/codes/format.ts`**

```ts
import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford, no I L O U
const CODE_LEN = 10;
const GROUP_AT = 5;

export function generateCode(): string {
  const out: string[] = [];
  // Reject-sample to avoid modulo bias.
  while (out.length < CODE_LEN) {
    const buf = randomBytes(CODE_LEN * 2);
    for (let i = 0; i < buf.length && out.length < CODE_LEN; i++) {
      const v = buf[i];
      if (v < ALPHABET.length * 8) {
        out.push(ALPHABET[v % ALPHABET.length]);
      }
    }
  }
  return out.join('');
}

export function groupCode(code: string): string {
  if (code.length !== CODE_LEN) {
    throw new Error(`code must be ${CODE_LEN} chars, got ${code.length}`);
  }
  return `${code.slice(0, GROUP_AT)}-${code.slice(GROUP_AT)}`;
}

export function normalizeCode(input: string): string {
  return input.replace(/-/g, '').toUpperCase();
}

export function isValidCodeFormat(input: string): boolean {
  if (!input) return false;
  const norm = normalizeCode(input);
  if (norm.length !== CODE_LEN) return false;
  for (const ch of norm) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
pnpm test -- test/lib/codes/format.test.ts
```

Expected: 7+ tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/codes/format.ts test/lib/codes/format.test.ts
git commit -m "feat(codes): base32-Crockford code generator and validator"
```

---

### Task 2.3: `lib/codes/hash.ts` — argon2 wrappers

**Files:**
- Create: `lib/codes/hash.ts`
- Create: `test/lib/codes/hash.test.ts`

- [ ] **Step 1: Write failing test**

Create `test/lib/codes/hash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashCode, verifyCode } from '@/lib/codes/hash';

describe('hashCode + verifyCode', () => {
  it('verifies a correct code', async () => {
    const code = 'ABCDEFGHJK';
    const hash = await hashCode(code);
    expect(hash).toMatch(/^\$argon2/);
    expect(await verifyCode(code, hash)).toBe(true);
  });

  it('rejects an incorrect code', async () => {
    const hash = await hashCode('ABCDEFGHJK');
    expect(await verifyCode('ZZZZZZZZZZ', hash)).toBe(false);
  });

  it('produces different hashes for the same input (salted)', async () => {
    const a = await hashCode('ABCDEFGHJK');
    const b = await hashCode('ABCDEFGHJK');
    expect(a).not.toEqual(b);
  });

  it('returns false on malformed hash without throwing', async () => {
    expect(await verifyCode('ABCDEFGHJK', 'not-a-hash')).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (`Cannot find module @/lib/codes/hash`)

```bash
pnpm test -- test/lib/codes/hash.test.ts
```

- [ ] **Step 3: Implement `lib/codes/hash.ts`**

```ts
import { hash, verify, Algorithm } from '@node-rs/argon2';

const OPTS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashCode(plaintext: string): Promise<string> {
  return hash(plaintext, OPTS);
}

export async function verifyCode(plaintext: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plaintext);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
pnpm test -- test/lib/codes/hash.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/codes/hash.ts test/lib/codes/hash.test.ts
git commit -m "feat(codes): argon2id hash + verify wrappers"
```

---

### Task 2.4: `lib/auth/viewer.ts` — viewer JWT

**Files:**
- Create: `lib/auth/viewer.ts`
- Create: `test/lib/auth/viewer.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/lib/auth/viewer.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { signViewerJwt, verifyViewerJwt } from '@/lib/auth/viewer';

beforeAll(() => {
  process.env.VIEWER_JWT_SECRET = 'a'.repeat(43); // base64 of 32 bytes-ish
});

describe('viewer JWT', () => {
  it('signs and verifies a token', async () => {
    const token = await signViewerJwt({ viewer_code_id: 'uuid-123', label: 'Mom' });
    const claims = await verifyViewerJwt(token);
    expect(claims.viewer_code_id).toBe('uuid-123');
    expect(claims.label).toBe('Mom');
  });

  it('rejects tampered tokens', async () => {
    const token = await signViewerJwt({ viewer_code_id: 'uuid-123', label: 'Mom' });
    const bad = token.slice(0, -2) + 'AA';
    await expect(verifyViewerJwt(bad)).rejects.toThrow();
  });

  it('rejects expired tokens', async () => {
    const token = await signViewerJwt(
      { viewer_code_id: 'uuid-123', label: 'Mom' },
      { expiresInSec: -10 },
    );
    await expect(verifyViewerJwt(token)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
pnpm test -- test/lib/auth/viewer.test.ts
```

- [ ] **Step 3: Implement `lib/auth/viewer.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import { JWT_ISSUER, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants';

export interface ViewerClaims {
  viewer_code_id: string;
  label: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.VIEWER_JWT_SECRET;
  if (!secret) {
    throw new Error('VIEWER_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signViewerJwt(
  claims: ViewerClaims,
  opts: { expiresInSec?: number } = {},
): Promise<string> {
  const expSec = opts.expiresInSec ?? VIEWER_COOKIE_MAX_AGE;
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${expSec}s`)
    .sign(getSecret());
}

export async function verifyViewerJwt(token: string): Promise<ViewerClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { issuer: JWT_ISSUER });
  return {
    viewer_code_id: String(payload.viewer_code_id),
    label: String(payload.label ?? ''),
  };
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
pnpm test -- test/lib/auth/viewer.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth/viewer.ts test/lib/auth/viewer.test.ts
git commit -m "feat(auth): viewer JWT sign and verify with jose"
```

---

### Task 2.5: `lib/auth/owner.ts` — owner JWT

**Files:**
- Create: `lib/auth/owner.ts`
- Create: `test/lib/auth/owner.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// test/lib/auth/owner.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { signOwnerJwt, verifyOwnerJwt } from '@/lib/auth/owner';

beforeAll(() => {
  process.env.OWNER_JWT_SECRET = 'b'.repeat(43);
});

describe('owner JWT', () => {
  it('signs and verifies', async () => {
    const t = await signOwnerJwt();
    const claims = await verifyOwnerJwt(t);
    expect(claims.role).toBe('owner');
  });

  it('rejects expired', async () => {
    const t = await signOwnerJwt({ expiresInSec: -1 });
    await expect(verifyOwnerJwt(t)).rejects.toThrow();
  });

  it('rejects token signed with viewer secret', async () => {
    process.env.VIEWER_JWT_SECRET = 'a'.repeat(43);
    const { signViewerJwt } = await import('@/lib/auth/viewer');
    const viewerToken = await signViewerJwt({ viewer_code_id: 'x', label: 'y' });
    await expect(verifyOwnerJwt(viewerToken)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
pnpm test -- test/lib/auth/owner.test.ts
```

- [ ] **Step 3: Implement `lib/auth/owner.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import { JWT_ISSUER, OWNER_COOKIE_MAX_AGE } from '@/lib/constants';

export interface OwnerClaims {
  role: 'owner';
}

function getSecret(): Uint8Array {
  const secret = process.env.OWNER_JWT_SECRET;
  if (!secret) {
    throw new Error('OWNER_JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

export async function signOwnerJwt(opts: { expiresInSec?: number } = {}): Promise<string> {
  const expSec = opts.expiresInSec ?? OWNER_COOKIE_MAX_AGE;
  return new SignJWT({ role: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setSubject('owner')
    .setIssuedAt()
    .setExpirationTime(`${expSec}s`)
    .sign(getSecret());
}

export async function verifyOwnerJwt(token: string): Promise<OwnerClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: JWT_ISSUER,
    subject: 'owner',
  });
  if (payload.role !== 'owner') throw new Error('not owner');
  return { role: 'owner' };
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
pnpm test -- test/lib/auth/owner.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth/owner.ts test/lib/auth/owner.test.ts
git commit -m "feat(auth): owner JWT sign and verify"
```

---

### Task 2.6: `lib/auth/cookies.ts` — cookie option helpers

**Files:**
- Create: `lib/auth/cookies.ts`

(No unit tests — trivial passthrough; covered via integration tests of routes.)

- [ ] **Step 1: Implement**

```ts
import {
  VIEWER_COOKIE_MAX_AGE,
  OWNER_COOKIE_MAX_AGE,
} from '@/lib/constants';

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
}

const isProd = () => process.env.NODE_ENV === 'production';

export function viewerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: VIEWER_COOKIE_MAX_AGE,
  };
}

export function ownerCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    maxAge: OWNER_COOKIE_MAX_AGE,
  };
}

export function expiredCookieOptions(): CookieOptions {
  return { httpOnly: true, secure: isProd(), path: '/', maxAge: 0 };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm exec tsc --noEmit lib/auth/cookies.ts 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/auth/cookies.ts
git commit -m "feat(auth): cookie option helpers"
```

---

### Task 2.7: `lib/supabase/server.ts` — server clients

**Files:**
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from '@supabase/supabase-js';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} is not set`);
  return v;
}

/** Service role client. NEVER ship to the browser. */
export function supabaseServiceRole() {
  return createClient(
    envOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
    envOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 2: Compile-check**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat(supabase): server-side client factories"
```

---

### Task 2.8: `lib/supabase/viewer.ts` — anon client w/ viewer JWT

**Files:**
- Create: `lib/supabase/viewer.ts`

- [ ] **Step 1: Implement**

```ts
import { createClient } from '@supabase/supabase-js';

/**
 * Anon client whose every request carries the viewer JWT.
 * This is what lets RLS see `viewer_code_id` in the JWT claims.
 */
export function supabaseViewerClient(viewerJwt: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('SUPABASE env not set');
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${viewerJwt}` },
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase/viewer.ts
git commit -m "feat(supabase): anon client wrapper that injects viewer JWT"
```

---

### Task 2.9: `lib/codes/rate-limit.ts` — Postgres-backed sliding window

**Files:**
- Create: `lib/codes/rate-limit.ts`

(Integration-tested via the redeem route; no unit test here because logic is one query.)

- [ ] **Step 1: Implement**

```ts
import { supabaseServiceRole } from '@/lib/supabase/server';
import { createHash } from 'node:crypto';

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Records an attempt and returns whether the caller is within the limit.
 * Uses a fixed sliding window: counts attempts in the last `windowSec` seconds.
 */
export async function checkAndRecord(
  bucket: string,
  ipHash: string,
  count: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const sb = supabaseServiceRole();
  const since = new Date(Date.now() - windowSec * 1000).toISOString();

  const { data, error } = await sb
    .from('rate_limit_attempts')
    .select('attempted_at', { count: 'exact' })
    .eq('bucket', bucket)
    .eq('ip_hash', ipHash)
    .gte('attempted_at', since);
  if (error) throw error;

  const used = data?.length ?? 0;
  if (used >= count) {
    const oldest = data && data.length ? new Date(data[data.length - 1].attempted_at) : new Date();
    const retry = Math.max(1, Math.ceil((oldest.getTime() + windowSec * 1000 - Date.now()) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec: retry };
  }

  await sb.from('rate_limit_attempts').insert({ bucket, ip_hash: ipHash });

  return { allowed: true, remaining: count - used - 1, retryAfterSec: 0 };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/codes/rate-limit.ts
git commit -m "feat(rate-limit): Postgres sliding-window check-and-record"
```

---

### Task 2.10: `lib/photos/process.ts` — sharp pipeline

**Files:**
- Create: `lib/photos/process.ts`
- Create: `test/lib/photos/process.test.ts`
- Create: `test/fixtures/with-gps.jpg` (small JPEG with EXIF GPS — generate below)

- [ ] **Step 1: Generate the fixture image**

```bash
mkdir -p test/fixtures
node -e "
const sharp = require('sharp');
sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 100, g: 200, b: 50 } } })
  .jpeg()
  .withMetadata({ exif: { IFD0: { ImageDescription: 'fixture' }, GPS: { GPSLatitudeRef: 'N', GPSLatitude: [37,49,30], GPSLongitudeRef: 'W', GPSLongitude: [122,25,0] } } })
  .toFile('test/fixtures/with-gps.jpg').then(() => console.log('ok'));
"
ls -la test/fixtures/with-gps.jpg
```

Expected: file exists, ≥ 1 KB.

- [ ] **Step 2: Write failing test**

```ts
// test/lib/photos/process.test.ts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { processUpload } from '@/lib/photos/process';

describe('processUpload', () => {
  it('strips EXIF GPS, resizes large images, emits blurhash + dimensions', async () => {
    const input = await readFile('test/fixtures/with-gps.jpg');
    const result = await processUpload(input, 'image/jpeg');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.blurhash).toMatch(/^[A-Za-z0-9#$%*+,\-.:;=?@\[\]^_{|}~]+$/);

    // EXIF GPS must be stripped
    const meta = await sharp(result.buffer).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it('rejects unsupported mime', async () => {
    await expect(processUpload(Buffer.from('not-an-image'), 'application/pdf')).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run, expect FAIL** (`Cannot find module @/lib/photos/process`)

```bash
pnpm test -- test/lib/photos/process.test.ts
```

- [ ] **Step 4: Implement `lib/photos/process.ts`**

```ts
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import { ALLOWED_MIME, RESIZE_MAX_EDGE_PX } from '@/lib/constants';

export interface ProcessedUpload {
  buffer: Buffer;
  width: number;
  height: number;
  blurhash: string;
  takenAt: Date | null;
  contentType: 'image/jpeg';
}

export async function processUpload(input: Buffer, mime: string): Promise<ProcessedUpload> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported mime type: ${mime}`);
  }

  const pre = sharp(input, { failOn: 'error' });
  const meta = await pre.metadata();
  const takenAt = parseExifDate(meta.exif);

  const pipeline = sharp(input, { failOn: 'error' })
    .rotate() // honor orientation
    .resize({
      width: RESIZE_MAX_EDGE_PX,
      height: RESIZE_MAX_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true });

  const buffer = await pipeline.toBuffer();
  const out = await sharp(buffer).metadata();

  const small = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const blurhash = encodeBlurhash(
    new Uint8ClampedArray(small.data),
    small.info.width,
    small.info.height,
    4,
    4,
  );

  return {
    buffer,
    width: out.width ?? 0,
    height: out.height ?? 0,
    blurhash,
    takenAt,
    contentType: 'image/jpeg',
  };
}

function parseExifDate(exif: Buffer | undefined): Date | null {
  if (!exif) return null;
  // sharp returns raw EXIF bytes; parsing the full block is heavy.
  // We use exif-reader if available, else null. To keep zero extra deps
  // we attempt a minimal text scan for "DateTimeOriginal".
  const ascii = exif.toString('latin1');
  const m = ascii.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}
```

- [ ] **Step 5: Run, expect PASS**

```bash
pnpm test -- test/lib/photos/process.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/photos/process.ts test/lib/photos/process.test.ts test/fixtures/with-gps.jpg
git commit -m "feat(photos): sharp pipeline with EXIF strip, resize, blurhash"
```

---

## Phase 3 — Owner Auth

### Task 3.1: `POST /api/admin/login`

**Files:**
- Create: `app/api/admin/login/route.ts`
- Create: `test/api/admin/login.test.ts`

- [ ] **Step 1: Write failing integration test**

```ts
// test/api/admin/login.test.ts
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { POST } from '@/app/api/admin/login/route';

beforeAll(() => {
  process.env.OWNER_PASSWORD = 'correct-horse-battery';
  process.env.OWNER_JWT_SECRET = 'b'.repeat(43);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

afterEach(() => vi.restoreAllMocks());

function makeReq(body: object, ip = '1.2.3.4'): Request {
  return new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/login', () => {
  it('rejects wrong password with 401', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 4, retryAfterSec: 0 }),
      hashIp: () => 'ipx',
    }));
    const res = await POST(makeReq({ password: 'wrong' }));
    expect(res.status).toBe(401);
  });

  it('accepts correct password and sets owner cookie', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 4, retryAfterSec: 0 }),
      hashIp: () => 'ipx',
    }));
    const res = await POST(makeReq({ password: 'correct-horse-battery' }));
    expect(res.status).toBe(200);
    const sc = res.headers.get('set-cookie') ?? '';
    expect(sc).toMatch(/owner_session=/);
    expect(sc).toMatch(/HttpOnly/i);
  });

  it('rate-limits when exceeded', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: false, remaining: 0, retryAfterSec: 30 }),
      hashIp: () => 'ipx',
    }));
    const res = await POST(makeReq({ password: 'whatever' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('30');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (route doesn't exist)

```bash
pnpm test -- test/api/admin/login.test.ts
```

- [ ] **Step 3: Implement route**

```ts
// app/api/admin/login/route.ts
import { NextResponse } from 'next/server';
import { signOwnerJwt } from '@/lib/auth/owner';
import { ownerCookieOptions } from '@/lib/auth/cookies';
import { OWNER_COOKIE, OWNER_LOGIN_LIMIT } from '@/lib/constants';
import { checkAndRecord, hashIp } from '@/lib/codes/rate-limit';
import { timingSafeEqual } from 'node:crypto';

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || '0.0.0.0';
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipH = hashIp(ip);
  const rl = await checkAndRecord(
    'owner_login',
    ipH,
    OWNER_LOGIN_LIMIT.count,
    OWNER_LOGIN_LIMIT.windowSec,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';
  const expected = process.env.OWNER_PASSWORD ?? '';

  if (!expected || !constantTimeEqual(password, expected)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await signOwnerJwt();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, token, ownerCookieOptions());
  return res;
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
pnpm test -- test/api/admin/login.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/login/route.ts test/api/admin/login.test.ts
git commit -m "feat(api): owner login route with constant-time compare and rate limit"
```

---

### Task 3.2: `POST /api/admin/logout`

**Files:**
- Create: `app/api/admin/logout/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server';
import { OWNER_COOKIE } from '@/lib/constants';
import { expiredCookieOptions } from '@/lib/auth/cookies';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, '', expiredCookieOptions());
  return res;
}
```

- [ ] **Step 2: Manual smoke**

```bash
pnpm dev &
sleep 5
curl -i -X POST http://localhost:3000/api/admin/logout | head
kill %1
```

Expected: `200`, `Set-Cookie: owner_session=; Max-Age=0`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/logout/route.ts
git commit -m "feat(api): owner logout"
```

---

### Task 3.3: `middleware.ts` — owner protection

**Files:**
- Create: `middleware.ts`

(We'll add viewer protection later in Task 5.3.)

- [ ] **Step 1: Implement initial middleware**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerJwt } from '@/lib/auth/owner';
import { OWNER_COOKIE } from '@/lib/constants';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
  runtime: 'nodejs',
};

const OWNER_PUBLIC = new Set([
  '/admin/login',
  '/api/admin/login',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public owner endpoints
  if (OWNER_PUBLIC.has(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(OWNER_COOKIE)?.value;
  if (cookie) {
    try {
      await verifyOwnerJwt(cookie);
      return NextResponse.next();
    } catch {
      // fall through
    }
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}
```

- [ ] **Step 2: Smoke-test**

```bash
pnpm dev &
sleep 5
curl -i http://localhost:3000/admin 2>&1 | head -5
curl -i -X POST http://localhost:3000/api/admin/posts 2>&1 | head -5
kill %1
```

Expected: `/admin` → 307 redirect to `/admin/login`. `POST /api/admin/posts` → 401 JSON.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): owner cookie protection for admin routes"
```

---

### Task 3.4: `/admin/login` page

**Files:**
- Create: `components/auth/owner-login.tsx`
- Create: `app/admin/login/page.tsx`

- [ ] **Step 1: Implement form component**

```tsx
// components/auth/owner-login.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function OwnerLogin() {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = '/admin';
      return;
    }
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Too many attempts');
      return;
    }
    setErr('Invalid password');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="owner-pwd">Owner password</Label>
        <Input
          id="owner-pwd"
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          required
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      <Button type="submit" disabled={busy || !pwd}>
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Implement page**

```tsx
// app/admin/login/page.tsx
import { OwnerLogin } from '@/components/auth/owner-login';

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Owner sign in</h1>
        </div>
        <OwnerLogin />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke test**

```bash
pnpm dev &
sleep 5
open http://localhost:3000/admin/login
```

Verify wrong password shows "Invalid password"; correct password redirects to `/admin` (which 404s for now; that's fine).

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add components/auth/owner-login.tsx app/admin/login/page.tsx
git commit -m "feat(admin): owner login page"
```

---

### Task 3.5: `/admin/layout.tsx` + admin nav

**Files:**
- Create: `components/admin/admin-nav.tsx`
- Create: `app/admin/layout.tsx`

- [ ] **Step 1: Nav component**

```tsx
// components/admin/admin-nav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin', label: 'Posts' },
  { href: '/admin/codes', label: 'Codes' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-between border-b p-4">
      <div className="flex gap-4">
        {tabs.map(t => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'text-sm',
              pathname === t.href ? 'font-semibold' : 'text-muted-foreground',
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="text-sm text-muted-foreground hover:text-foreground"
        onClick={async () => {
          await fetch('/api/admin/logout', { method: 'POST' });
          window.location.href = '/admin/login';
        }}
      >
        Sign out
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Layout**

```tsx
// app/admin/layout.tsx
import { AdminNav } from '@/components/admin/admin-nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="container mx-auto p-4">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm dev &
sleep 5
# Sign in via /admin/login first, then:
open http://localhost:3000/admin
kill %1
```

Expected: redirects to /admin/login if not signed in; otherwise renders empty page with Posts | Codes tabs and Sign out. (404 on /admin still expected — fixed in Phase 6.)

- [ ] **Step 4: Commit**

```bash
git add components/admin/admin-nav.tsx app/admin/layout.tsx
git commit -m "feat(admin): admin layout with nav and sign out"
```

---

## Phase 4 — Code Management

### Task 4.1: `GET /api/admin/codes`

**Files:**
- Create: `app/api/admin/codes/route.ts` (GET handler)

- [ ] **Step 1: Implement GET (POST added in Task 4.2)**

```ts
// app/api/admin/codes/route.ts
import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';

export async function GET() {
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('viewer_codes')
    .select('id, label, created_at, revoked_at, last_used_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data });
}
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev &
sleep 5
# Sign in as owner first, capture cookie via curl -c cookies.txt
curl -c cookies.txt -X POST http://localhost:3000/api/admin/login \
  -H 'content-type: application/json' \
  -d '{"password":"'"$OWNER_PASSWORD"'"}'
curl -b cookies.txt http://localhost:3000/api/admin/codes
kill %1
```

Expected: `{"codes":[]}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/codes/route.ts
git commit -m "feat(api): list viewer codes"
```

---

### Task 4.2: `POST /api/admin/codes` (create)

**Files:**
- Modify: `app/api/admin/codes/route.ts`

- [ ] **Step 1: Add POST handler**

Append to `app/api/admin/codes/route.ts`:

```ts
import { generateCode, groupCode } from '@/lib/codes/format';
import { hashCode } from '@/lib/codes/hash';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 });
  if (label.length > 60) return NextResponse.json({ error: 'label too long' }, { status: 400 });

  const plaintext = generateCode();
  const code_hash = await hashCode(plaintext);

  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('viewer_codes')
    .insert({ label, code_hash })
    .select('id, label, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    label: data.label,
    created_at: data.created_at,
    code: groupCode(plaintext),
  });
}
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev &
sleep 5
curl -b cookies.txt -X POST http://localhost:3000/api/admin/codes \
  -H 'content-type: application/json' \
  -d '{"label":"Mom"}'
kill %1
```

Expected: JSON with `id`, `label:"Mom"`, `code:"XXXXX-XXXXX"`.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/codes/route.ts
git commit -m "feat(api): create viewer code with one-time plaintext display"
```

---

### Task 4.3: `DELETE /api/admin/codes/[id]` (revoke)

**Files:**
- Create: `app/api/admin/codes/[id]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseServiceRole();
  const { error } = await sb
    .from('viewer_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev &
sleep 5
# Re-create a code, capture id, then revoke it
ID=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/admin/codes \
  -H 'content-type: application/json' -d '{"label":"Test"}' | jq -r .id)
curl -i -b cookies.txt -X DELETE http://localhost:3000/api/admin/codes/$ID
kill %1
```

Expected: `{"ok":true}`. DB row has `revoked_at` set.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/codes/[id]/route.ts
git commit -m "feat(api): revoke viewer code (soft delete via revoked_at)"
```

---

### Task 4.4: `/admin/codes` page + components

**Files:**
- Create: `components/admin/codes-table.tsx`
- Create: `components/admin/new-code-dialog.tsx`
- Create: `app/admin/codes/page.tsx`

- [ ] **Step 1: Implement table**

```tsx
// components/admin/codes-table.tsx
'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { NewCodeDialog } from './new-code-dialog';

interface Row {
  id: string;
  label: string;
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

export function CodesTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/codes');
    const j = await r.json();
    setRows(j.codes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: string) {
    if (!confirm('Revoke this code?')) return;
    const r = await fetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Revoked');
      load();
    } else {
      toast.error('Revoke failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Viewer codes</h2>
        <NewCodeDialog onCreated={load} />
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No codes yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2">Label</th>
              <th>Created</th>
              <th>Last seen</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.label}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td>{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : '—'}</td>
                <td>{r.revoked_at ? <span className="text-red-500">revoked</span> : 'active'}</td>
                <td className="text-right">
                  {!r.revoked_at && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(r.id)}>Revoke</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement create dialog**

```tsx
// components/admin/new-code-dialog.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function NewCodeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const r = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    setBusy(false);
    if (!r.ok) {
      toast.error('Could not create code');
      return;
    }
    const j = await r.json();
    setCreatedCode(j.code);
    onCreated();
  }

  function reset() {
    setOpen(false);
    setCreatedCode(null);
    setLabel('');
  }

  return (
    <Dialog open={open} onOpenChange={v => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button>+ New code</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createdCode ? 'Code created' : 'New code'}</DialogTitle>
        </DialogHeader>
        {!createdCode ? (
          <div className="grid gap-3">
            <Label htmlFor="label">Label (e.g. Mom, Sister)</Label>
            <Input id="label" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Save this code now. It will not be shown again.
            </p>
            <code className="block rounded bg-muted p-3 text-center text-lg tracking-widest">
              {createdCode}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(createdCode);
                toast.success('Copied');
              }}
            >
              Copy to clipboard
            </Button>
          </div>
        )}
        <DialogFooter>
          {!createdCode ? (
            <Button onClick={create} disabled={busy || !label.trim()}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          ) : (
            <Button onClick={reset}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Page**

```tsx
// app/admin/codes/page.tsx
import { CodesTable } from '@/components/admin/codes-table';

export default function Page() {
  return <CodesTable />;
}
```

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev &
sleep 5
open http://localhost:3000/admin/codes
```

Steps to verify in browser:
1. Sign in via /admin/login.
2. Navigate to /admin/codes — empty state.
3. + New code → label "Mom" → Create → plaintext code shown → Copy → Done.
4. Row appears with Active status.
5. Revoke → toast → row shows "revoked".

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/codes-table.tsx components/admin/new-code-dialog.tsx app/admin/codes/page.tsx
git commit -m "feat(admin): viewer-codes table with create-once-display and revoke"
```

---

## Phase 5 — Viewer Auth

### Task 5.1: `POST /api/viewer/redeem`

**Files:**
- Create: `app/api/viewer/redeem/route.ts`
- Create: `test/api/viewer/redeem.test.ts`

- [ ] **Step 1: Failing test (focus on rate limit + format check + outcome)**

```ts
// test/api/viewer/redeem.test.ts
import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';

beforeAll(() => {
  process.env.VIEWER_JWT_SECRET = 'a'.repeat(43);
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

afterEach(() => vi.resetModules());

function makeReq(body: object): Request {
  return new Request('http://localhost/api/viewer/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/viewer/redeem', () => {
  it('rejects malformed code with 401', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 9, retryAfterSec: 0 }),
      hashIp: () => 'h',
    }));
    const { POST } = await import('@/app/api/viewer/redeem/route');
    const res = await POST(makeReq({ code: 'short' }));
    expect(res.status).toBe(401);
  });

  it('returns 429 when rate-limited', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: false, remaining: 0, retryAfterSec: 12 }),
      hashIp: () => 'h',
    }));
    const { POST } = await import('@/app/api/viewer/redeem/route');
    const res = await POST(makeReq({ code: 'ABCDE-FGHJK' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('12');
  });

  it('issues viewer cookie on match (mocked DB)', async () => {
    vi.doMock('@/lib/codes/rate-limit', () => ({
      checkAndRecord: async () => ({ allowed: true, remaining: 9, retryAfterSec: 0 }),
      hashIp: () => 'h',
    }));
    const { hashCode } = await import('@/lib/codes/hash');
    const stored = await hashCode('ABCDEFGHJK');
    vi.doMock('@/lib/supabase/server', () => ({
      supabaseServiceRole: () => ({
        from: () => ({
          select: () => ({
            is: () => ({
              limit: () => ({ data: [{ id: 'uuid-1', label: 'Mom', code_hash: stored }], error: null }),
            }),
          }),
          update: () => ({ eq: () => ({ data: null, error: null }) }),
          insert: () => ({ data: null, error: null }),
        }),
      }),
    }));
    const { POST } = await import('@/app/api/viewer/redeem/route');
    const res = await POST(makeReq({ code: 'ABCDE-FGHJK' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toMatch(/viewer_session=/);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (route doesn't exist)

```bash
pnpm test -- test/api/viewer/redeem.test.ts
```

- [ ] **Step 3: Implement**

```ts
// app/api/viewer/redeem/route.ts
import { NextResponse } from 'next/server';
import { isValidCodeFormat, normalizeCode } from '@/lib/codes/format';
import { verifyCode } from '@/lib/codes/hash';
import { signViewerJwt } from '@/lib/auth/viewer';
import { viewerCookieOptions } from '@/lib/auth/cookies';
import { VIEWER_COOKIE, VIEWER_REDEEM_LIMIT } from '@/lib/constants';
import { checkAndRecord, hashIp } from '@/lib/codes/rate-limit';
import { supabaseServiceRole } from '@/lib/supabase/server';

function clientIp(req: Request) {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || '0.0.0.0';
}

const GENERIC_INVALID = NextResponse.json({ error: 'Invalid code' }, { status: 401 });

export async function POST(req: Request) {
  const ipH = hashIp(clientIp(req));
  const rl = await checkAndRecord(
    'viewer_redeem',
    ipH,
    VIEWER_REDEEM_LIMIT.count,
    VIEWER_REDEEM_LIMIT.windowSec,
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429, headers: { 'retry-after': String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const codeRaw = typeof body?.code === 'string' ? body.code : '';
  if (!isValidCodeFormat(codeRaw)) return GENERIC_INVALID;
  const code = normalizeCode(codeRaw);

  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('viewer_codes')
    .select('id, label, code_hash')
    .is('revoked_at', null)
    .limit(200);
  if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });

  let match: { id: string; label: string } | null = null;
  for (const row of data ?? []) {
    // verifyCode is constant-time within argon2; loop is O(active codes).
    if (await verifyCode(code, row.code_hash)) {
      match = { id: row.id, label: row.label };
      break;
    }
  }
  if (!match) return GENERIC_INVALID;

  // Audit + last_used_at
  await sb.from('viewer_codes').update({ last_used_at: new Date().toISOString() }).eq('id', match.id);
  await sb.from('viewer_sessions').insert({
    code_id: match.id,
    ip_hash: ipH,
    user_agent: req.headers.get('user-agent') ?? '',
  });

  const token = await signViewerJwt({ viewer_code_id: match.id, label: match.label });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, token, viewerCookieOptions());
  return res;
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm test -- test/api/viewer/redeem.test.ts
```

- [ ] **Step 5: Manual end-to-end smoke**

```bash
pnpm dev &
sleep 5
# Sign in as owner, create a code, capture the plaintext
curl -c c.txt -X POST http://localhost:3000/api/admin/login \
  -H 'content-type: application/json' -d '{"password":"'"$OWNER_PASSWORD"'"}'
CODE=$(curl -s -b c.txt -X POST http://localhost:3000/api/admin/codes \
  -H 'content-type: application/json' -d '{"label":"Smoke"}' | jq -r .code)
echo "Code: $CODE"

# Redeem
curl -i -X POST http://localhost:3000/api/viewer/redeem \
  -H 'content-type: application/json' \
  -d "{\"code\":\"$CODE\"}"
kill %1
```

Expected: `200 OK` + `Set-Cookie: viewer_session=...; HttpOnly`.

- [ ] **Step 6: Commit**

```bash
git add app/api/viewer/redeem/route.ts test/api/viewer/redeem.test.ts
git commit -m "feat(api): viewer code redeem with rate limit + audit log"
```

---

### Task 5.2: `POST /api/viewer/logout`

**Files:**
- Create: `app/api/viewer/logout/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server';
import { VIEWER_COOKIE } from '@/lib/constants';
import { expiredCookieOptions } from '@/lib/auth/cookies';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(VIEWER_COOKIE, '', expiredCookieOptions());
  return res;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/viewer/logout/route.ts
git commit -m "feat(api): viewer logout"
```

---

### Task 5.3: Extend `middleware.ts` to gate `/feed/*`

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Replace contents**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerJwt } from '@/lib/auth/owner';
import { verifyViewerJwt } from '@/lib/auth/viewer';
import { OWNER_COOKIE, VIEWER_COOKIE } from '@/lib/constants';
import { supabaseServiceRole } from '@/lib/supabase/server';

export const config = {
  matcher: [
    '/feed/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
  ],
  runtime: 'nodejs', // Supabase JS client + jose work fine on Node middleware
};

const OWNER_PUBLIC = new Set(['/admin/login', '/api/admin/login']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ───── Owner-gated ─────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (OWNER_PUBLIC.has(pathname)) return NextResponse.next();
    const cookie = req.cookies.get(OWNER_COOKIE)?.value;
    if (cookie) {
      try {
        await verifyOwnerJwt(cookie);
        return NextResponse.next();
      } catch { /* fall through */ }
    }
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  // ───── Viewer-gated ─────
  if (pathname.startsWith('/feed')) {
    const cookie = req.cookies.get(VIEWER_COOKIE)?.value;
    if (!cookie) return redirectHome(req);
    try {
      const claims = await verifyViewerJwt(cookie);
      // Cheap revocation check — indexed lookup
      const sb = supabaseServiceRole();
      const { data } = await sb
        .from('viewer_codes')
        .select('revoked_at')
        .eq('id', claims.viewer_code_id)
        .single();
      if (!data || data.revoked_at) return redirectHome(req);
      return NextResponse.next();
    } catch {
      return redirectHome(req);
    }
  }

  return NextResponse.next();
}

function redirectHome(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/';
  const res = NextResponse.redirect(url);
  res.cookies.set(VIEWER_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
```

- [ ] **Step 2: Smoke**

```bash
pnpm dev &
sleep 5
curl -i http://localhost:3000/feed | head -3
kill %1
```

Expected: 307 redirect to `/`.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(middleware): gate /feed on viewer cookie + DB revocation check"
```

---

### Task 5.4: Rewrite `app/page.tsx` to host viewer code entry

**Files:**
- Modify: `app/page.tsx`
- Create: `components/auth/code-entry.tsx`

- [ ] **Step 1: Code-entry component**

```tsx
// components/auth/code-entry.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CodeEntry() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const res = await fetch('/api/viewer/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = '/feed';
      return;
    }
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? 'Too many attempts');
      return;
    }
    setErr('Invalid code');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="code">Your code</Label>
        <Input
          id="code"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          inputMode="text"
          placeholder="XXXXX-XXXXX"
          required
        />
        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>
      <Button type="submit" disabled={busy || !code}>
        {busy ? 'Checking…' : 'Enter'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Server-side landing page**

```tsx
// app/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CodeEntry } from '@/components/auth/code-entry';
import { VIEWER_COOKIE } from '@/lib/constants';
import { verifyViewerJwt } from '@/lib/auth/viewer';

export default async function Home() {
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (c) {
    try {
      await verifyViewerJwt(c);
      redirect('/feed');
    } catch { /* fall through */ }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Travel Taste</h1>
          <p className="text-sm text-muted-foreground">Enter the code you were given.</p>
        </div>
        <CodeEntry />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `app/layout.tsx` to drop ClientLayout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Travel Taste',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Manual smoke**

```bash
pnpm dev &
sleep 5
open http://localhost:3000/
```

Verify: clean code entry. Wrong code → "Invalid code". Correct code → redirected to /feed (404 still — fixed in Phase 7). Refresh `/` while signed in → instantly redirects /feed.

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx components/auth/code-entry.tsx
git commit -m "feat(viewer): code entry landing page replaces password gate"
```

---

## Phase 6 — Posts CRUD

### Task 6.1: `POST /api/admin/posts`

**Files:**
- Create: `app/api/admin/posts/route.ts`
- Create: `test/api/admin/posts.test.ts`

- [ ] **Step 1: Failing test focused on validation**

```ts
// test/api/admin/posts.test.ts
import { describe, it, expect, beforeAll, vi } from 'vitest';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
});

function multipart(file: Buffer, name: string, type: string, caption: string): Request {
  const fd = new FormData();
  fd.append('file', new Blob([file], { type }), name);
  fd.append('caption', caption);
  return new Request('http://localhost/api/admin/posts', { method: 'POST', body: fd });
}

describe('POST /api/admin/posts', () => {
  it('returns 415 for non-image mime', async () => {
    const { POST } = await import('@/app/api/admin/posts/route');
    const res = await POST(multipart(Buffer.from('hi'), 'a.txt', 'text/plain', 'no'));
    expect(res.status).toBe(415);
  });

  it('returns 413 for oversize payload', async () => {
    const { POST } = await import('@/app/api/admin/posts/route');
    const big = Buffer.alloc(21 * 1024 * 1024, 0xff);
    const res = await POST(multipart(big, 'a.jpg', 'image/jpeg', ''));
    expect(res.status).toBe(413);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

```bash
pnpm test -- test/api/admin/posts.test.ts
```

- [ ] **Step 3: Implement**

```ts
// app/api/admin/posts/route.ts
import { NextResponse } from 'next/server';
import { processUpload } from '@/lib/photos/process';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, POSTS_BUCKET } from '@/lib/constants';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Bad form data' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
  }

  const captionRaw = form.get('caption');
  const caption = typeof captionRaw === 'string' ? captionRaw.trim().slice(0, 1000) : '';

  const bytes = Buffer.from(await file.arrayBuffer());

  let processed;
  try {
    processed = await processUpload(bytes, file.type);
  } catch (e) {
    return NextResponse.json({ error: 'Could not read image' }, { status: 415 });
  }

  const sb = supabaseServiceRole();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const path = `posts/${yyyy}/${mm}/${randomUUID()}.jpg`;

  const up = await sb.storage.from(POSTS_BUCKET).upload(path, processed.buffer, {
    contentType: processed.contentType,
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: 'Storage unavailable' }, { status: 502 });
  }

  const ins = await sb
    .from('posts')
    .insert({
      storage_path: path,
      caption: caption || null,
      taken_at: processed.takenAt?.toISOString() ?? null,
      width: processed.width,
      height: processed.height,
      blurhash: processed.blurhash,
    })
    .select('id, storage_path, created_at, width, height, blurhash, taken_at, caption')
    .single();
  if (ins.error) {
    // Best-effort cleanup
    await sb.storage.from(POSTS_BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ post: ins.data });
}
```

- [ ] **Step 4: Run test, expect PASS**

```bash
pnpm test -- test/api/admin/posts.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/posts/route.ts test/api/admin/posts.test.ts
git commit -m "feat(api): create post — sharp pipeline, Supabase storage upload, DB insert"
```

---

### Task 6.2: `DELETE /api/admin/posts/[id]`

**Files:**
- Create: `app/api/admin/posts/[id]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET } from '@/lib/constants';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('posts')
    .select('storage_path')
    .eq('id', id)
    .single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await sb.from('posts').delete().eq('id', id);
  await sb.storage.from(POSTS_BUCKET).remove([data.storage_path]).catch(() => {});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/posts/[id]/route.ts
git commit -m "feat(api): delete post — row first, then storage cleanup"
```

---

### Task 6.3: `/admin/new` upload page + form

**Files:**
- Create: `components/admin/new-post-form.tsx`
- Create: `app/admin/new/page.tsx`

- [ ] **Step 1: Form**

```tsx
// components/admin/new-post-form.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function NewPostForm() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', caption);
    const res = await fetch('/api/admin/posts', { method: 'POST', body: fd });
    setBusy(false);
    if (res.ok) {
      toast.success('Posted');
      window.location.href = '/admin';
      return;
    }
    const j = await res.json().catch(() => ({}));
    toast.error(j.error ?? 'Upload failed');
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="file">Photo</Label>
        <input
          id="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cap">Caption</Label>
        <Textarea id="cap" value={caption} onChange={e => setCaption(e.target.value)} rows={3} />
      </div>
      <Button type="submit" disabled={busy || !file}>
        {busy ? 'Posting…' : 'Post'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Page**

```tsx
// app/admin/new/page.tsx
import { NewPostForm } from '@/components/admin/new-post-form';

export default function Page() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New post</h2>
      <NewPostForm />
    </div>
  );
}
```

- [ ] **Step 3: Manual smoke**

```bash
pnpm dev &
sleep 5
# Sign in, then:
open http://localhost:3000/admin/new
```

Choose a JPEG, write a caption, Post. Should redirect to `/admin` (will 404 until 6.4).

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/new-post-form.tsx app/admin/new/page.tsx
git commit -m "feat(admin): new post upload form"
```

---

### Task 6.4: `/admin` posts list

**Files:**
- Create: `components/admin/posts-list.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Posts list component**

```tsx
// components/admin/posts-list.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PostRow {
  id: string;
  caption: string | null;
  created_at: string;
  signed_url: string;
}

export function PostsList() {
  const [rows, setRows] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/posts');
    const j = await r.json();
    setRows(j.posts ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string) {
    if (!confirm('Delete this post?')) return;
    const r = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (r.ok) {
      toast.success('Deleted');
      load();
    } else {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Posts</h2>
        <Link href="/admin/new">
          <Button>+ New post</Button>
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map(p => (
            <li key={p.id} className="flex items-center gap-3 border-b py-2">
              <img src={p.signed_url} alt="" className="h-16 w-16 rounded object-cover" />
              <div className="flex-1 text-sm">
                <p className="line-clamp-2">{p.caption ?? <em>No caption</em>}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => del(p.id)}>Delete</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: GET handler for admin posts list**

Add `GET` to `app/api/admin/posts/route.ts`:

```ts
import { SIGNED_URL_TTL_SEC } from '@/lib/constants';

export async function GET() {
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('posts')
    .select('id, caption, created_at, storage_path')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = await Promise.all(
    (data ?? []).map(async row => {
      const { data: s } = await sb.storage
        .from(POSTS_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
      return {
        id: row.id,
        caption: row.caption,
        created_at: row.created_at,
        signed_url: s?.signedUrl ?? '',
      };
    }),
  );
  return NextResponse.json({ posts: out });
}
```

- [ ] **Step 3: Page**

```tsx
// app/admin/page.tsx
import { PostsList } from '@/components/admin/posts-list';

export default function Page() {
  return <PostsList />;
}
```

- [ ] **Step 4: Smoke**

```bash
pnpm dev &
sleep 5
# Sign in, upload a photo, return to /admin
open http://localhost:3000/admin
```

Verify thumbnail + caption appear. Delete works.

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add components/admin/posts-list.tsx app/admin/page.tsx app/api/admin/posts/route.ts
git commit -m "feat(admin): posts list with delete and signed thumb URLs"
```

---

## Phase 7 — Viewer Feed

### Task 7.1: `/feed/page.tsx`

**Files:**
- Create: `components/feed/post-tile.tsx`
- Create: `components/feed/masonry-feed.tsx`
- Create: `components/feed/load-more.tsx`
- Create: `app/feed/page.tsx`

- [ ] **Step 1: Post tile**

```tsx
// components/feed/post-tile.tsx
import Link from 'next/link';

interface Props {
  id: string;
  url: string;
  caption: string | null;
  width: number;
  height: number;
  takenAt: string | null;
  createdAt: string;
}

export function PostTile({ id, url, caption, width, height, createdAt }: Props) {
  const aspect = width && height ? `${width} / ${height}` : '1 / 1';
  return (
    <Link href={`/feed/${id}`} className="block break-inside-avoid space-y-1.5">
      <img
        src={url}
        alt=""
        loading="lazy"
        style={{ aspectRatio: aspect }}
        className="w-full rounded-md object-cover"
      />
      {caption && <p className="text-sm leading-snug line-clamp-2">{caption}</p>}
      <p className="text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleDateString()}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Load more (client)**

```tsx
// components/feed/load-more.tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PostTile } from './post-tile';

interface FeedPost {
  id: string; signed_url: string; caption: string | null;
  width: number; height: number; taken_at: string | null; created_at: string;
}

export function LoadMore({ initialCursor }: { initialCursor: string | null }) {
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [more, setMore] = useState<FeedPost[]>([]);
  const [busy, setBusy] = useState(false);

  if (!cursor) return null;

  async function load() {
    setBusy(true);
    const r = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor!)}`);
    const j = await r.json();
    setMore(prev => [...prev, ...(j.posts as FeedPost[])]);
    setCursor(j.next_cursor as string | null);
    setBusy(false);
  }

  return (
    <>
      {more.map(p => (
        <PostTile
          key={p.id}
          id={p.id}
          url={p.signed_url}
          caption={p.caption}
          width={p.width}
          height={p.height}
          takenAt={p.taken_at}
          createdAt={p.created_at}
        />
      ))}
      <div className="col-span-full flex justify-center pt-2">
        <Button onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Load more'}
        </Button>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Masonry server component**

```tsx
// components/feed/masonry-feed.tsx
import { PostTile } from './post-tile';
import { LoadMore } from './load-more';

interface FeedPost {
  id: string; signed_url: string; caption: string | null;
  width: number; height: number; taken_at: string | null; created_at: string;
}

export function MasonryFeed({
  posts,
  nextCursor,
}: { posts: FeedPost[]; nextCursor: string | null }) {
  return (
    <div className="columns-2 gap-3 px-3 [column-fill:_balance] sm:gap-4 sm:px-4">
      {posts.map(p => (
        <PostTile
          key={p.id}
          id={p.id}
          url={p.signed_url}
          caption={p.caption}
          width={p.width}
          height={p.height}
          takenAt={p.taken_at}
          createdAt={p.created_at}
        />
      ))}
      <LoadMore initialCursor={nextCursor} />
    </div>
  );
}
```

- [ ] **Step 4: Add public feed API route**

Create `app/api/feed/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyViewerJwt } from '@/lib/auth/viewer';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET, SIGNED_URL_TTL_SEC, VIEWER_COOKIE } from '@/lib/constants';

const PAGE = 20;

export async function GET(req: Request) {
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { await verifyViewerJwt(c); } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor'); // ISO ts of oldest seen

  const sb = supabaseServiceRole();
  let q = sb
    .from('posts')
    .select('id, storage_path, caption, width, height, blurhash, taken_at, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE + 1);
  if (cursor) q = q.lt('created_at', cursor);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);

  const posts = await Promise.all(page.map(async row => {
    const { data: s } = await sb.storage
      .from(POSTS_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SEC);
    return {
      id: row.id,
      caption: row.caption,
      width: row.width,
      height: row.height,
      blurhash: row.blurhash,
      taken_at: row.taken_at,
      created_at: row.created_at,
      signed_url: s?.signedUrl ?? '',
    };
  }));

  return NextResponse.json({
    posts,
    next_cursor: hasMore ? page[page.length - 1].created_at : null,
  });
}
```

- [ ] **Step 5: Feed page (server)**

```tsx
// app/feed/page.tsx
import { MasonryFeed } from '@/components/feed/masonry-feed';
import { headers } from 'next/headers';

export default async function FeedPage() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  // Reuse the API route on first paint (server-side fetch, forwards cookies).
  const res = await fetch(`${proto}://${host}/api/feed`, {
    cache: 'no-store',
    headers: { cookie: h.get('cookie') ?? '' },
  });
  const j = await res.json();
  return (
    <div className="min-h-screen pt-4">
      <header className="px-4 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Travel Taste</h1>
      </header>
      <MasonryFeed posts={j.posts ?? []} nextCursor={j.next_cursor ?? null} />
    </div>
  );
}
```

- [ ] **Step 6: Smoke**

```bash
pnpm dev &
sleep 5
# Owner upload first via /admin/new (already wired). Then redeem code as viewer.
open http://localhost:3000/
```

Verify: enter code → /feed → masonry shows the post. Click tile → 404 (next task).

```bash
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add components/feed/post-tile.tsx components/feed/masonry-feed.tsx components/feed/load-more.tsx \
        app/feed/page.tsx app/api/feed/route.ts
git commit -m "feat(feed): masonry feed, load-more pagination, signed URLs"
```

---

### Task 7.2: `/feed/[postId]/page.tsx`

**Files:**
- Create: `components/feed/post-detail.tsx`
- Create: `app/feed/[postId]/page.tsx`

- [ ] **Step 1: Detail component**

```tsx
// components/feed/post-detail.tsx
import Link from 'next/link';

interface Props {
  url: string;
  caption: string | null;
  width: number;
  height: number;
  takenAt: string | null;
  createdAt: string;
}

export function PostDetail({ url, caption, width, height, takenAt, createdAt }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <Link href="/feed" className="text-sm text-muted-foreground hover:underline">
        ← Back
      </Link>
      <img
        src={url}
        alt=""
        style={{ aspectRatio: width && height ? `${width} / ${height}` : '1 / 1' }}
        className="w-full rounded-md object-contain"
      />
      {caption && <p className="text-base leading-relaxed">{caption}</p>}
      <p className="text-xs text-muted-foreground">
        Posted {new Date(createdAt).toLocaleString()}
        {takenAt && ` · taken ${new Date(takenAt).toLocaleDateString()}`}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Detail page**

```tsx
// app/feed/[postId]/page.tsx
import { notFound } from 'next/navigation';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET, SIGNED_URL_TTL_SEC } from '@/lib/constants';
import { PostDetail } from '@/components/feed/post-detail';

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('posts')
    .select('id, storage_path, caption, width, height, taken_at, created_at')
    .eq('id', postId)
    .single();
  if (error || !data) notFound();

  const { data: s } = await sb.storage
    .from(POSTS_BUCKET)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SEC);

  return (
    <PostDetail
      url={s?.signedUrl ?? ''}
      caption={data.caption}
      width={data.width ?? 0}
      height={data.height ?? 0}
      takenAt={data.taken_at}
      createdAt={data.created_at}
    />
  );
}
```

- [ ] **Step 3: Smoke**

```bash
pnpm dev &
sleep 5
# As viewer, click any tile in /feed
kill %1
```

Verify detail page renders full image + caption + dates + back link.

- [ ] **Step 4: Commit**

```bash
git add components/feed/post-detail.tsx app/feed/[postId]/page.tsx
git commit -m "feat(feed): single-post detail view with signed URL"
```

---

## Phase 8 — Cleanup

### Task 8.1: Delete obsolete components and pipeline

**Files:**
- Delete: `components/auth/login-form.tsx`
- Delete: `components/client-layout.tsx`
- Delete: `components/navigation.tsx`
- Delete: `components/gallery/`
- Delete: `components/ui/image-modal.tsx`
- Delete: `lib/photos.generated.ts` (if regenerated)
- Delete: `lib/photos-build.ts`
- Delete: `lib/photos.ts` (if exists)
- Delete: `lib/types/photos.ts` (if exists)
- Delete: `scripts/fetch-photos.mjs`
- Delete: `e2e/auth.spec.ts`, `e2e/gallery.spec.ts`, `e2e/modal.spec.ts`, `e2e/mobile.spec.ts`
- Delete: `e2e/fixtures/photos.json`

- [ ] **Step 1: Remove files**

```bash
rm -f components/auth/login-form.tsx
rm -f components/client-layout.tsx
rm -f components/navigation.tsx
rm -rf components/gallery
rm -f components/ui/image-modal.tsx
rm -f lib/photos.generated.ts lib/photos-build.ts lib/photos.ts
rm -rf lib/types
rm -f scripts/fetch-photos.mjs
rm -f e2e/auth.spec.ts e2e/gallery.spec.ts e2e/modal.spec.ts e2e/mobile.spec.ts
rm -f e2e/fixtures/photos.json
```

- [ ] **Step 2: Compile-check + lint**

```bash
pnpm exec tsc --noEmit
pnpm lint
```

Expected: clean.

- [ ] **Step 3: Run unit + integration tests**

```bash
pnpm test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove static-export gallery, password gate, Cloudinary pipeline"
```

---

### Task 8.2: Remove unused shadcn dialog deps if dialog wasn't installed

If `components/ui/dialog.tsx` is missing (the codes dialog needs it), add it:

- [ ] **Step 1: Add shadcn dialog**

```bash
pnpm dlx shadcn@latest add dialog textarea
```

Accept defaults. Files created: `components/ui/dialog.tsx`, `components/ui/textarea.tsx`.

- [ ] **Step 2: Compile-check**

```bash
pnpm exec tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx components/ui/textarea.tsx package.json pnpm-lock.yaml
git commit -m "chore: add shadcn dialog and textarea components"
```

---

## Phase 9 — End-to-End Tests

### Task 9.1: Playwright config + seed scaffold

**Files:**
- Modify: `playwright.config.ts`
- Create: `e2e/seed.sql`
- Create: `e2e/helpers.ts`
- Create: `e2e/fixtures/test-image.jpg`

- [ ] **Step 1: Generate fixture**

```bash
node -e "
const sharp = require('sharp');
sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 30, g: 144, b: 255 } } })
  .jpeg().toFile('e2e/fixtures/test-image.jpg').then(()=>console.log('ok'));
"
ls -la e2e/fixtures/test-image.jpg
```

- [ ] **Step 2: Update `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      OWNER_PASSWORD: 'e2e-owner-pwd',
      VIEWER_JWT_SECRET: process.env.VIEWER_JWT_SECRET ?? 'a'.repeat(43),
      OWNER_JWT_SECRET: process.env.OWNER_JWT_SECRET ?? 'b'.repeat(43),
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
  },
});
```

- [ ] **Step 3: Seed SQL**

```sql
-- e2e/seed.sql
truncate table posts cascade;
truncate table viewer_codes cascade;
truncate table viewer_sessions cascade;
truncate table rate_limit_attempts cascade;
```

- [ ] **Step 4: Test helpers**

```ts
// e2e/helpers.ts
import { Page, request, APIRequestContext } from '@playwright/test';

export const OWNER_PWD = 'e2e-owner-pwd';

export async function ownerLogin(ctx: APIRequestContext) {
  return ctx.post('/api/admin/login', { data: { password: OWNER_PWD } });
}

export async function createCode(ctx: APIRequestContext, label: string): Promise<string> {
  const r = await ctx.post('/api/admin/codes', { data: { label } });
  const j = await r.json();
  return j.code as string;
}

export async function uploadPost(
  ctx: APIRequestContext,
  filePath: string,
  caption: string,
): Promise<void> {
  const fs = await import('node:fs/promises');
  const buf = await fs.readFile(filePath);
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: 'image/jpeg' }), 'test.jpg');
  fd.append('caption', caption);
  const r = await ctx.post('/api/admin/posts', { multipart: { file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: buf }, caption } });
  if (!r.ok()) throw new Error(`upload failed: ${r.status()}`);
}

export async function resetDb() {
  const { execSync } = await import('node:child_process');
  execSync('pnpm exec supabase db psql -f e2e/seed.sql');
}
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts e2e/seed.sql e2e/helpers.ts e2e/fixtures/test-image.jpg
git commit -m "test(e2e): config, seed SQL, helpers, fixture image"
```

---

### Task 9.2: `viewer-flow.spec.ts`

- [ ] **Step 1: Write spec**

```ts
// e2e/viewer-flow.spec.ts
import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('viewer enters code, sees feed, opens detail', async ({ page, baseURL }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  await uploadPost(owner, 'e2e/fixtures/test-image.jpg', 'Hello world');
  const code = await createCode(owner, 'E2E');

  await page.goto('/');
  await page.getByLabel('Your code').fill(code);
  await page.getByRole('button', { name: /enter/i }).click();
  await page.waitForURL('**/feed');
  await expect(page.locator('img').first()).toBeVisible();
  await page.locator('a[href^="/feed/"]').first().click();
  await expect(page.getByText('Hello world')).toBeVisible();
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e -- viewer-flow.spec.ts
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/viewer-flow.spec.ts
git commit -m "test(e2e): viewer code redeem → feed → detail flow"
```

---

### Task 9.3: `viewer-invalid-code.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('invalid code stays on landing with inline error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
  await page.getByRole('button', { name: /enter/i }).click();
  await expect(page.getByText('Invalid code')).toBeVisible();
  expect(page.url()).toContain('/');
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- viewer-invalid-code.spec.ts
git add e2e/viewer-invalid-code.spec.ts
git commit -m "test(e2e): invalid code shows inline error"
```

---

### Task 9.4: `viewer-rate-limit.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect } from '@playwright/test';
import { resetDb } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('11 wrong codes triggers 429 message', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 10; i++) {
    await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
    await page.getByRole('button', { name: /enter/i }).click();
    await expect(page.getByText('Invalid code')).toBeVisible();
  }
  await page.getByLabel('Your code').fill('ZZZZZ-ZZZZZ');
  await page.getByRole('button', { name: /enter/i }).click();
  await expect(page.getByText(/Too many attempts/)).toBeVisible();
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- viewer-rate-limit.spec.ts
git add e2e/viewer-rate-limit.spec.ts
git commit -m "test(e2e): rate limit kicks in at 11th attempt"
```

---

### Task 9.5: `owner-login.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect } from '@playwright/test';
import { resetDb, OWNER_PWD } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('wrong owner password shows error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill('nope');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Invalid password')).toBeVisible();
});

test('correct password lands on /admin', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- owner-login.spec.ts
git add e2e/owner-login.spec.ts
git commit -m "test(e2e): owner login wrong + right paths"
```

---

### Task 9.6: `owner-upload.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, resetDb, OWNER_PWD } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('owner uploads a post; viewer sees it', async ({ page, baseURL }) => {
  // owner UI flow
  await page.goto('/admin/login');
  await page.getByLabel('Owner password').fill(OWNER_PWD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/admin');
  await page.getByRole('link', { name: /new post/i }).click();
  await page.setInputFiles('input[type="file"]', 'e2e/fixtures/test-image.jpg');
  await page.getByLabel('Caption').fill('Sunset');
  await page.getByRole('button', { name: 'Post' }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByText('Sunset')).toBeVisible();

  // mint a code via API and redeem in fresh context
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  const code = await createCode(owner, 'V');

  const browser = await page.context().browser();
  const fresh = await browser!.newContext();
  const viewer = await fresh.newPage();
  await viewer.goto('/');
  await viewer.getByLabel('Your code').fill(code);
  await viewer.getByRole('button', { name: /enter/i }).click();
  await viewer.waitForURL('**/feed');
  await expect(viewer.getByText('Sunset')).toBeVisible();
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- owner-upload.spec.ts
git add e2e/owner-upload.spec.ts
git commit -m "test(e2e): owner upload visible to viewer"
```

---

### Task 9.7: `owner-revoke.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect, request } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.beforeEach(async () => { await resetDb(); });

test('revoking a code kicks the viewer back to /', async ({ baseURL, browser }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  await uploadPost(owner, 'e2e/fixtures/test-image.jpg', 'before revoke');
  const code = await createCode(owner, 'X');

  const ctx = await browser.newContext();
  const viewer = await ctx.newPage();
  await viewer.goto('/');
  await viewer.getByLabel('Your code').fill(code);
  await viewer.getByRole('button', { name: /enter/i }).click();
  await viewer.waitForURL('**/feed');

  // revoke via owner API (find id by listing)
  const list = await (await owner.get('/api/admin/codes')).json();
  const id = list.codes[0].id;
  await owner.delete(`/api/admin/codes/${id}`);

  // viewer refresh → should redirect to /
  await viewer.reload();
  await viewer.waitForURL('**/');
  await expect(viewer.getByLabel('Your code')).toBeVisible();
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- owner-revoke.spec.ts
git add e2e/owner-revoke.spec.ts
git commit -m "test(e2e): code revocation kicks active viewer"
```

---

### Task 9.8: `mobile-feed.spec.ts`

- [ ] **Step 1: Write spec**

```ts
import { test, expect, request, devices } from '@playwright/test';
import { ownerLogin, createCode, uploadPost, resetDb } from './helpers';

test.use({ ...devices['iPhone 13'] });
test.beforeEach(async () => { await resetDb(); });

test('mobile viewport renders 2-col masonry', async ({ page, baseURL, browser }) => {
  const owner = await request.newContext({ baseURL });
  await ownerLogin(owner);
  for (let i = 0; i < 4; i++) {
    await uploadPost(owner, 'e2e/fixtures/test-image.jpg', `Post ${i}`);
  }
  const code = await createCode(owner, 'M');

  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const v = await ctx.newPage();
  await v.goto('/');
  await v.getByLabel('Your code').fill(code);
  await v.getByRole('button', { name: /enter/i }).click();
  await v.waitForURL('**/feed');

  const tiles = v.locator('a[href^="/feed/"]');
  await expect(tiles).toHaveCount(4);
  // Confirm two columns: left tile x < right tile x for the first row
  const a = await tiles.nth(0).boundingBox();
  const b = await tiles.nth(1).boundingBox();
  expect(a!.x).toBeLessThan(b!.x);
});
```

- [ ] **Step 2: Run + commit**

```bash
pnpm test:e2e -- mobile-feed.spec.ts
git add e2e/mobile-feed.spec.ts
git commit -m "test(e2e): mobile viewport masonry is 2-col"
```

---

## Phase 10 — Final Verification & Docs

### Task 10.1: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the file**

```markdown
# CLAUDE.md

Guidance for Claude Code working in this repo.

## Commands

Package manager: **pnpm**.

- `pnpm dev` — Next.js dev server.
- `pnpm build` / `pnpm start` — production build + serve.
- `pnpm lint` / `pnpm lint:fix` — ESLint.
- `pnpm test` / `pnpm test:watch` — Vitest unit + integration tests.
- `pnpm test:e2e` / `pnpm test:e2e:ui` — Playwright.
- `pnpm db:start` / `pnpm db:stop` — Supabase local stack.
- `pnpm db:reset` — drop and re-apply all migrations.
- `pnpm db:diff` — generate a new migration from local edits.

Husky + `lint-staged` run `eslint --fix` and `prettier --write` on staged `*.{js,jsx,ts,tsx}`.

## Environment

Server-only:
- `OWNER_PASSWORD` — owner sign-in password (constant-time compared).
- `VIEWER_JWT_SECRET` / `OWNER_JWT_SECRET` — HS256 JWT secrets, ≥32 random bytes.
- `SUPABASE_SERVICE_ROLE_KEY` — used by all `/api/admin/*` and `/api/feed`.

Public:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Architecture

Next.js 16 App Router on Vercel Fluid Compute. Single Supabase backend (Postgres + Storage + RLS).

- **Public landing (`/`)** — server component checks viewer cookie; renders `<CodeEntry/>` or redirects to `/feed`.
- **Viewer feed (`/feed`, `/feed/[postId]`)** — server-rendered, gated by `middleware.ts` which verifies the viewer JWT and rejects revoked codes.
- **Owner admin (`/admin/*`)** — gated by `middleware.ts` against the owner JWT. Login page is public.
- **API routes**:
  - `viewer/redeem` — argon2 verifies code, signs JWT, sets cookie, audits.
  - `viewer/logout` — clears cookie.
  - `admin/login` / `admin/logout` — password gate.
  - `admin/posts` — POST upload (sharp pipeline, EXIF strip, signed-URL feed), DELETE.
  - `admin/codes` — CRUD viewer codes; create returns plaintext ONCE.
  - `feed` — viewer-side post fetch with cursor pagination.

Storage uses a private `posts` bucket; viewers see signed URLs only (1h TTL).

## Auth flow

Viewer:
1. POST `/api/viewer/redeem` with code → sets `viewer_session` httpOnly cookie (30d rolling).
2. Middleware decodes cookie + verifies code is not revoked on every `/feed/*` navigation.
3. Logout clears cookie.

Owner:
1. POST `/api/admin/login` with password → sets `owner_session` (7d absolute).
2. Middleware verifies on every `/admin/*` and `/api/admin/*`.

## Path aliases

`@/*` → repo root.

## Styling

Tailwind v3 + shadcn/ui (`components/ui/*`). Theme handled by `next-themes`. Use `cn()` from `lib/utils.ts`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for Supabase-backed private feed"
```

---

### Task 10.2: Final verification sweep

- [ ] **Step 1: Reset DB + run all tests**

```bash
pnpm db:reset
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```

Expected:
- Vitest: all green.
- Playwright: 7 specs green across both projects.
- ESLint: clean.
- `pnpm build`: `.next/` produced, no static-export errors, route table includes `/feed`, `/feed/[postId]`, `/admin/*`, all `/api/*`.

- [ ] **Step 2: Verify env-example matches actual usage**

```bash
grep -RhoE "process\.env\.[A-Z_]+" app lib middleware.ts | sort -u | sed 's/process.env\.//'
```

Compare output to `.env.example`. Reconcile any missing entry.

- [ ] **Step 3: If anything fails: fix in place, re-run, commit fixes; do not move on until all green.**

- [ ] **Step 4: Open PR**

```bash
git push -u origin feat/private-ig-redesign
gh pr create --title "Private Instagram redesign" --body "$(cat <<'EOF'
## Summary
- Replaces static-export Cloudinary gallery with Supabase-backed private feed.
- Per-recipient passcode auth for viewers (no email).
- Server-side hardcoded password for owner.
- New: posts CRUD, codes management, masonry feed, post detail.

## Test plan
- [x] `pnpm test` green
- [x] `pnpm test:e2e` green (chromium-desktop + mobile-safari)
- [x] `pnpm lint` clean
- [x] `pnpm build` succeeds
- [x] Manual: code redeem → feed → detail
- [x] Manual: owner login → upload → see in feed
- [x] Manual: revoke active viewer → next nav redirects /

Spec: docs/superpowers/specs/2026-04-30-private-instagram-redesign-design.md
EOF
)"
```

---

## Self-Review Checklist (write phase only — done; you're reading this)

- Spec coverage cross-checked against tasks: every spec section maps to ≥1 task.
- No "TBD"/"TODO"/"add validation"/"similar to Task N" — all code blocks complete.
- Function/method names consistent across tasks: `signViewerJwt`, `verifyViewerJwt`, `signOwnerJwt`, `verifyOwnerJwt`, `hashCode`, `verifyCode`, `generateCode`, `groupCode`, `isValidCodeFormat`, `processUpload`, `checkAndRecord`, `hashIp`, `supabaseServiceRole`, `supabaseAnonServer`, `supabaseViewerClient`.
- Constants reused: `VIEWER_COOKIE`, `OWNER_COOKIE`, `POSTS_BUCKET`, `SIGNED_URL_TTL_SEC`, `MAX_UPLOAD_BYTES`, `ALLOWED_MIME`, `RESIZE_MAX_EDGE_PX`, `VIEWER_REDEEM_LIMIT`, `OWNER_LOGIN_LIMIT`.
- Tasks ordered so each depends only on prior tasks.
- Cleanup phase (Phase 8) deletes everything the spec marks for removal.
- Tests cover every requirement called out in spec § Testing.
