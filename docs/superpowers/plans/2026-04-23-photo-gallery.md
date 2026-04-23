# Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 3-card home page with a Cloudinary-driven masonry photo gallery, section-per-folder, enhanced lightbox modal (prev/next + keyboard + swipe), and full Vitest/Playwright coverage.

**Architecture:** A prebuild Node script calls Cloudinary Admin API, groups resources by first subfolder under a configured root, and emits a typed `lib/photos.generated.ts`. The existing (statically exported) Next.js app imports that file at build time, renders each folder as a `<PhotoSection>` using CSS-columns masonry, and reuses the existing Radix Dialog as a navigation-capable lightbox. Cloudinary credentials never ship to the client.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript 5, Tailwind v3, shadcn/Radix UI, `next-cloudinary`, `cloudinary` (Admin API, dev-time only), Vitest + jsdom + React Testing Library (unit), Playwright (e2e), `serve` (static server for e2e).

**Spec:** `docs/superpowers/specs/2026-04-23-photo-gallery-design.md`.

---

## File Map

**New files:**

- `lib/photos.ts` — shared types (`Photo`, `PhotoSection`, `CloudinaryResource`).
- `lib/photos-build.ts` — pure logic: `humanizeSlug`, `groupResources`, `MAX_RESOURCES`.
- `lib/photos-build.test.ts` — Vitest unit tests for pure logic.
- `scripts/fetch-photos.mjs` — Node prebuild script; fetch Cloudinary OR copy fixture; writes `lib/photos.generated.ts`.
- `components/gallery/masonry-grid.tsx` — CSS-columns wrapper.
- `components/gallery/photo-tile.tsx` — clickable `<CldImage>` tile.
- `components/gallery/photo-section.tsx` — section heading + grid + modal state.
- `components/gallery/photo-section.test.tsx` — Vitest component tests.
- `components/ui/image-modal.test.tsx` — Vitest tests for new modal behavior.
- `test/setup.ts` — Vitest setup (RTL matchers + `CldImage` mock).
- `test/fixtures/photos.generated.ts` — deterministic fixture (three sections).
- `vitest.config.ts`, `playwright.config.ts`.
- `e2e/auth.spec.ts`, `e2e/gallery.spec.ts`, `e2e/modal.spec.ts`, `e2e/mobile.spec.ts`.

**Modified files:**

- `app/page.tsx` — remove hardcoded `travelCards` and old `ImageModal` use; render `SECTIONS.map(...)`.
- `components/ui/image-modal.tsx` — new props shape (`photos`, `index`, `onIndexChange`, `onClose`), prev/next, keyboard, swipe.
- `package.json` — add `cloudinary` dep and dev test deps; extend `build`, add `predev`, `test`, `test:watch`, `test:e2e`, `test:e2e:ui`.
- `.env` — add `CLOUDINARY_*` vars.
- `.gitignore` — add `lib/photos.generated.ts`.
- `eslint.config.mjs` — extend ignores/file globs so `test/**` and `e2e/**` lint.
- `CLAUDE.md` — document new data flow, env vars, and test commands.

---

## Task 1: Install test tooling and add Vitest config

**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `test/setup.ts`

- [ ] **Step 1.1: Install Vitest + RTL + jsdom**

Run:

```bash
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: packages installed; `pnpm-lock.yaml` updated.

- [ ] **Step 1.2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**', 'out/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 1.3: Create `test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

vi.mock('next-cloudinary', () => ({
  CldImage: (props: Record<string, unknown>) => {
    const { src, alt = '', width, height, className } = props as {
      src: string;
      alt?: string;
      width?: number;
      height?: number;
      className?: string;
    };
    return React.createElement('img', {
      src,
      alt,
      width,
      height,
      className,
      'data-testid': 'cld-image',
    });
  },
}));
```

- [ ] **Step 1.4: Add test scripts to `package.json`**

Edit the `scripts` block so it contains (keep existing scripts, add these):

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 1.5: Verify Vitest runs (no tests yet)**

Run:

```bash
pnpm test
```

Expected: Vitest starts, reports "No test files found" (or "0 passed"), exit code 0 or 1 — either is OK as long as Vitest itself launches without error. If it errors about config, fix before proceeding.

- [ ] **Step 1.6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts test/setup.ts
git commit -m "chore: add Vitest + RTL test tooling"
```

---

## Task 2: Define shared photo types

**Files:**

- Create: `lib/photos.ts`

- [ ] **Step 2.1: Write `lib/photos.ts`**

```ts
export interface CloudinaryResource {
  public_id: string;
  width: number;
  height: number;
  created_at: string;
  folder: string;
}

export interface Photo {
  publicId: string;
  width: number;
  height: number;
  folder: string;
}

export interface PhotoSection {
  slug: string;
  title: string;
  photos: Photo[];
}
```

- [ ] **Step 2.2: Commit**

```bash
git add lib/photos.ts
git commit -m "feat(photos): add shared photo gallery types"
```

---

## Task 3: Write failing tests for `humanizeSlug`

**Files:**

- Create: `lib/photos-build.test.ts`

- [ ] **Step 3.1: Create the failing test file**

```ts
import { describe, it, expect } from 'vitest';
import { humanizeSlug } from './photos-build';

describe('humanizeSlug', () => {
  it('capitalizes a single word', () => {
    expect(humanizeSlug('santorini')).toBe('Santorini');
  });

  it('replaces dashes with spaces and title-cases each word', () => {
    expect(humanizeSlug('santorini-greece')).toBe('Santorini Greece');
  });

  it('replaces underscores with spaces and title-cases each word', () => {
    expect(humanizeSlug('machu_picchu')).toBe('Machu Picchu');
  });

  it('returns empty string for empty input', () => {
    expect(humanizeSlug('')).toBe('');
  });

  it('collapses repeated separators', () => {
    expect(humanizeSlug('bali--ubud')).toBe('Bali Ubud');
  });
});
```

- [ ] **Step 3.2: Run the tests (expect failure)**

Run:

```bash
pnpm test
```

Expected: Vitest fails because `./photos-build` has no `humanizeSlug` export (module not found or named export missing).

---

## Task 4: Implement `humanizeSlug`

**Files:**

- Create: `lib/photos-build.ts`

- [ ] **Step 4.1: Implement the function**

```ts
export const MAX_RESOURCES = 5000;

export function humanizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
```

- [ ] **Step 4.2: Run the tests (expect pass)**

Run:

```bash
pnpm test
```

Expected: all `humanizeSlug` tests pass.

- [ ] **Step 4.3: Commit**

```bash
git add lib/photos-build.ts lib/photos-build.test.ts
git commit -m "feat(photos): add humanizeSlug helper with tests"
```

---

## Task 5: Write failing tests for `groupResources`

**Files:**

- Modify: `lib/photos-build.test.ts`

- [ ] **Step 5.1: Append the `groupResources` test suite**

Append to `lib/photos-build.test.ts`:

```ts
import { groupResources, MAX_RESOURCES } from './photos-build';
import type { CloudinaryResource } from './photos';

function resource(overrides: Partial<CloudinaryResource> = {}): CloudinaryResource {
  return {
    public_id: 'travel-taste/santorini/default',
    width: 1000,
    height: 800,
    created_at: '2024-01-01T00:00:00Z',
    folder: 'travel-taste/santorini',
    ...overrides,
  };
}

describe('groupResources', () => {
  it('returns empty array for no resources', () => {
    expect(groupResources([], 'travel-taste')).toEqual([]);
  });

  it('groups resources by first path segment under root', () => {
    const input = [
      resource({ public_id: 'travel-taste/santorini/a', folder: 'travel-taste/santorini' }),
      resource({ public_id: 'travel-taste/kyoto/b', folder: 'travel-taste/kyoto' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['kyoto', 'santorini']);
    expect(result.find(s => s.slug === 'kyoto')!.photos).toHaveLength(1);
  });

  it('flattens nested subfolders into their top-level section', () => {
    const input = [
      resource({
        public_id: 'travel-taste/santorini/sunset/a',
        folder: 'travel-taste/santorini/sunset',
      }),
      resource({
        public_id: 'travel-taste/santorini/b',
        folder: 'travel-taste/santorini',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('santorini');
    expect(result[0].photos).toHaveLength(2);
  });

  it('skips resources directly under root', () => {
    const input = [
      resource({ public_id: 'travel-taste/top-level', folder: 'travel-taste' }),
      resource({ public_id: 'travel-taste/bali/x', folder: 'travel-taste/bali' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['bali']);
  });

  it('skips resources missing width or height', () => {
    const input = [
      resource({ public_id: 'travel-taste/bali/a', folder: 'travel-taste/bali', width: 0 }),
      resource({ public_id: 'travel-taste/bali/b', folder: 'travel-taste/bali' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos.map(p => p.publicId)).toEqual(['travel-taste/bali/b']);
  });

  it('sorts sections alphabetically by slug', () => {
    const input = [
      resource({ public_id: 'travel-taste/zebra/a', folder: 'travel-taste/zebra' }),
      resource({ public_id: 'travel-taste/alpha/b', folder: 'travel-taste/alpha' }),
      resource({ public_id: 'travel-taste/mango/c', folder: 'travel-taste/mango' }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result.map(s => s.slug)).toEqual(['alpha', 'mango', 'zebra']);
  });

  it('sorts photos within a section by created_at descending', () => {
    const input = [
      resource({
        public_id: 'travel-taste/bali/old',
        folder: 'travel-taste/bali',
        created_at: '2020-01-01T00:00:00Z',
      }),
      resource({
        public_id: 'travel-taste/bali/new',
        folder: 'travel-taste/bali',
        created_at: '2024-06-01T00:00:00Z',
      }),
      resource({
        public_id: 'travel-taste/bali/mid',
        folder: 'travel-taste/bali',
        created_at: '2022-03-01T00:00:00Z',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos.map(p => p.publicId)).toEqual([
      'travel-taste/bali/new',
      'travel-taste/bali/mid',
      'travel-taste/bali/old',
    ]);
  });

  it('humanizes slugs into section titles', () => {
    const input = [
      resource({
        public_id: 'travel-taste/machu-picchu/a',
        folder: 'travel-taste/machu-picchu',
      }),
    ];
    const result = groupResources(input, 'travel-taste');
    expect(result[0].title).toBe('Machu Picchu');
  });

  it('respects the MAX_RESOURCES hard cap', () => {
    const input: CloudinaryResource[] = Array.from({ length: MAX_RESOURCES + 100 }, (_, i) =>
      resource({
        public_id: `travel-taste/bali/${i}`,
        folder: 'travel-taste/bali',
      }),
    );
    const result = groupResources(input, 'travel-taste');
    expect(result[0].photos).toHaveLength(MAX_RESOURCES);
  });

  it('normalizes a root folder with a trailing slash', () => {
    const input = [
      resource({ public_id: 'travel-taste/bali/a', folder: 'travel-taste/bali' }),
    ];
    const result = groupResources(input, 'travel-taste/');
    expect(result.map(s => s.slug)).toEqual(['bali']);
  });
});
```

- [ ] **Step 5.2: Run tests (expect failure for `groupResources` only)**

Run:

```bash
pnpm test
```

Expected: new `groupResources` tests fail (no export); prior `humanizeSlug` tests still pass.

---

## Task 6: Implement `groupResources`

**Files:**

- Modify: `lib/photos-build.ts`

- [ ] **Step 6.1: Append `groupResources` to `lib/photos-build.ts`**

Replace the file contents with:

```ts
import type { CloudinaryResource, Photo, PhotoSection } from './photos';

export const MAX_RESOURCES = 5000;

export function humanizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function stripRoot(folder: string, rootFolder: string): string {
  const normalizedRoot = rootFolder.replace(/\/+$/, '');
  if (!folder.startsWith(normalizedRoot)) return '';
  const rest = folder.slice(normalizedRoot.length);
  return rest.replace(/^\/+/, '');
}

export function groupResources(
  resources: CloudinaryResource[],
  rootFolder: string,
): PhotoSection[] {
  const capped = resources.slice(0, MAX_RESOURCES);
  const buckets = new Map<string, Photo[]>();

  for (const r of capped) {
    if (!r.width || !r.height) continue;
    const stripped = stripRoot(r.folder, rootFolder);
    if (!stripped) continue;
    const slug = stripped.split('/')[0];
    if (!slug) continue;

    const photo: Photo = {
      publicId: r.public_id,
      width: r.width,
      height: r.height,
      folder: slug,
    };

    const existing = buckets.get(slug);
    if (existing) {
      existing.push(photo);
    } else {
      buckets.set(slug, [photo]);
    }
  }

  const byCreatedAt = new Map<string, string>();
  for (const r of capped) byCreatedAt.set(r.public_id, r.created_at);

  const sections: PhotoSection[] = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, photos]) => ({
      slug,
      title: humanizeSlug(slug),
      photos: photos.slice().sort((a, b) => {
        const ca = byCreatedAt.get(a.publicId) ?? '';
        const cb = byCreatedAt.get(b.publicId) ?? '';
        return cb.localeCompare(ca);
      }),
    }));

  return sections;
}
```

- [ ] **Step 6.2: Run tests (expect all pass)**

Run:

```bash
pnpm test
```

Expected: all `humanizeSlug` and `groupResources` tests pass.

- [ ] **Step 6.3: Commit**

```bash
git add lib/photos-build.ts lib/photos-build.test.ts
git commit -m "feat(photos): group Cloudinary resources into sections"
```

---

## Task 7: Add e2e fixture and gitignore the generated file

**Files:**

- Create: `test/fixtures/photos.generated.ts`
- Modify: `.gitignore`

- [ ] **Step 7.1: Create the fixture**

```ts
import type { PhotoSection } from '../../lib/photos';

export const SECTIONS: PhotoSection[] = [
  {
    slug: 'bali',
    title: 'Bali',
    photos: [
      { publicId: 'travel-taste/bali/beach-01', width: 1200, height: 800, folder: 'bali' },
      { publicId: 'travel-taste/bali/temple-02', width: 900, height: 1200, folder: 'bali' },
    ],
  },
  {
    slug: 'kyoto',
    title: 'Kyoto',
    photos: [
      { publicId: 'travel-taste/kyoto/torii-01', width: 1600, height: 1000, folder: 'kyoto' },
      { publicId: 'travel-taste/kyoto/shrine-02', width: 800, height: 1200, folder: 'kyoto' },
      { publicId: 'travel-taste/kyoto/zen-garden-03', width: 1400, height: 900, folder: 'kyoto' },
    ],
  },
  {
    slug: 'santorini',
    title: 'Santorini',
    photos: [
      { publicId: 'travel-taste/santorini/sunset-01', width: 1500, height: 1000, folder: 'santorini' },
      { publicId: 'travel-taste/santorini/blue-dome-02', width: 1200, height: 1600, folder: 'santorini' },
      { publicId: 'travel-taste/santorini/cliff-03', width: 1600, height: 900, folder: 'santorini' },
      { publicId: 'travel-taste/santorini/alley-04', width: 900, height: 1200, folder: 'santorini' },
    ],
  },
];
```

- [ ] **Step 7.2: Add generated file to `.gitignore`**

Append to `.gitignore` (end of file):

```gitignore

# generated Cloudinary photo manifest
lib/photos.generated.ts
```

- [ ] **Step 7.3: Commit**

```bash
git add test/fixtures/photos.generated.ts .gitignore
git commit -m "test: add e2e photo fixture; gitignore generated manifest"
```

---

## Task 8: Write the prebuild Cloudinary script

**Files:**

- Modify: `package.json`
- Create: `scripts/fetch-photos.mjs`
- Modify: `.env`

- [ ] **Step 8.1: Install `cloudinary` dependency**

Run:

```bash
pnpm add cloudinary
```

Expected: `cloudinary` added to `dependencies` (runtime dep — but used only by the build script; Next's static export will not bundle it because nothing client-side imports it).

- [ ] **Step 8.2: Add Cloudinary env vars to `.env`**

Current `.env` is:

```env
NEXT_PUBLIC_APP_PASSWORD=travel123
```

Replace with:

```env
NEXT_PUBLIC_APP_PASSWORD=travel123

# Cloudinary Admin API (server-side only; do not prefix with NEXT_PUBLIC_)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_ROOT_FOLDER=travel-taste
```

Developers fill in their own values.

- [ ] **Step 8.3: Create `scripts/fetch-photos.mjs`**

```js
#!/usr/bin/env node
// Prebuild script: populate lib/photos.generated.ts from Cloudinary.
// If PHOTOS_FIXTURE_PATH is set, copy that fixture instead (used by tests/CI).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const OUTPUT_PATH = path.resolve('lib/photos.generated.ts');
const ENV_FILE = path.resolve('.env');

async function loadDotenv() {
  if (!existsSync(ENV_FILE)) return;
  const raw = await readFile(ENV_FILE, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Strip trailing inline comments (after whitespace + #)
    const hashIdx = value.search(/\s+#/);
    if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function copyFixture(fixturePath) {
  const absolute = path.resolve(fixturePath);
  if (!existsSync(absolute)) {
    console.error(`[fetch-photos] PHOTOS_FIXTURE_PATH not found: ${absolute}`);
    process.exit(1);
  }
  const contents = await readFile(absolute, 'utf8');
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, contents, 'utf8');
  console.log(`[fetch-photos] Copied fixture from ${fixturePath} to ${OUTPUT_PATH}`);
}

async function fetchFromCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const rootFolder = process.env.CLOUDINARY_ROOT_FOLDER;

  const missing = [];
  if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!apiKey) missing.push('CLOUDINARY_API_KEY');
  if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');
  if (!rootFolder) missing.push('CLOUDINARY_ROOT_FOLDER');

  if (missing.length) {
    console.error(
      `[fetch-photos] Missing required env vars: ${missing.join(', ')}`,
    );
    console.error(
      '[fetch-photos] Set them in .env or export them, or set PHOTOS_FIXTURE_PATH to use a fixture.',
    );
    process.exit(1);
  }

  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  // photos-build.ts is TypeScript. Compile it to ESM in-memory with esbuild,
  // then import the result via a data: URL. esbuild is a devDependency.
  const esbuild = await import('esbuild');
  const result = await esbuild.build({
    entryPoints: [path.resolve('lib/photos-build.ts')],
    bundle: false,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
  });
  const code = result.outputFiles[0].text;
  const dataUrl = 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const { groupResources } = await import(dataUrl);

  const all = [];
  let nextCursor;
  let pageCount = 0;
  const HARD_CAP = 5000;

  do {
    const params = {
      type: 'upload',
      prefix: rootFolder.replace(/\/+$/, '') + '/',
      max_results: 500,
    };
    if (nextCursor) params.next_cursor = nextCursor;
    let response;
    try {
      response = await cloudinary.api.resources(params);
    } catch (err) {
      const status = err?.error?.http_code ?? err?.http_code ?? 'unknown';
      const message = err?.error?.message ?? err?.message ?? String(err);
      console.error(`[fetch-photos] Cloudinary API error (status ${status}): ${message}`);
      process.exit(1);
    }
    all.push(...response.resources);
    nextCursor = response.next_cursor;
    pageCount += 1;
    if (all.length >= HARD_CAP) {
      console.warn(`[fetch-photos] Reached hard cap of ${HARD_CAP}; stopping pagination.`);
      break;
    }
  } while (nextCursor);

  console.log(`[fetch-photos] Fetched ${all.length} resources in ${pageCount} page(s).`);

  const sections = groupResources(all, rootFolder);

  if (sections.length === 0) {
    console.warn('[fetch-photos] No sections produced (empty folder or all resources skipped).');
  }

  const body =
    '// GENERATED — do not edit. Produced by scripts/fetch-photos.mjs.\n' +
    "import type { PhotoSection } from './photos';\n\n" +
    `export const SECTIONS: PhotoSection[] = ${JSON.stringify(sections, null, 2)};\n`;

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, body, 'utf8');
  console.log(`[fetch-photos] Wrote ${sections.length} section(s) to ${OUTPUT_PATH}`);
}

async function main() {
  await loadDotenv();
  const fixture = process.env.PHOTOS_FIXTURE_PATH;
  if (fixture) {
    await copyFixture(fixture);
    return;
  }
  await fetchFromCloudinary();
}

main().catch(err => {
  console.error('[fetch-photos] Unexpected error:', err);
  process.exit(1);
});
```

- [ ] **Step 8.4: Install `esbuild` as a dev dep (for TS transpile in the script)**

Run:

```bash
pnpm add -D esbuild
```

Expected: `esbuild` added to devDependencies.

- [ ] **Step 8.5: Wire up `predev` and `build` scripts**

In `package.json`, change `scripts` so `dev` and `build` pull the photos manifest first. Replace:

```json
    "dev": "next dev",
    "build": "next build",
```

with:

```json
    "predev": "node scripts/fetch-photos.mjs",
    "dev": "next dev",
    "prebuild": "node scripts/fetch-photos.mjs",
    "build": "next build",
```

- [ ] **Step 8.6: Verify the script via fixture**

Run:

```bash
PHOTOS_FIXTURE_PATH=test/fixtures/photos.generated.ts node scripts/fetch-photos.mjs
```

Expected: logs `Copied fixture ...`; `lib/photos.generated.ts` exists and matches fixture contents.

- [ ] **Step 8.7: Commit**

```bash
git add package.json pnpm-lock.yaml scripts/fetch-photos.mjs .env
git commit -m "feat(photos): add prebuild script (Cloudinary + fixture path)"
```

Note: `.env` is already gitignored — git will refuse to add it. That is expected; skip it in the `git add` line if so. The commit is still valid.

Actual command (safe):

```bash
git add package.json pnpm-lock.yaml scripts/fetch-photos.mjs
git commit -m "feat(photos): add prebuild script (Cloudinary + fixture path)"
```

---

## Task 9: Write failing tests for the new `ImageModal`

**Files:**

- Create: `components/ui/image-modal.test.tsx`

- [ ] **Step 9.1: Inspect current modal to know what will change**

Run:

```bash
cat components/ui/image-modal.tsx
```

Expected: view the current `ImageModal` (`imageUrl`/`title`/`description` prop shape). Note existing imports and structure; the refactor preserves the Radix Dialog but changes props.

- [ ] **Step 9.2: Create the failing test file**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageModal } from './image-modal';
import type { Photo } from '@/lib/photos';

const photos: Photo[] = [
  { publicId: 'a', width: 100, height: 100, folder: 's' },
  { publicId: 'b', width: 100, height: 100, folder: 's' },
  { publicId: 'c', width: 100, height: 100, folder: 's' },
];

function setup(indexStart: number | null) {
  const onIndexChange = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ImageModal
      photos={photos}
      index={indexStart}
      onIndexChange={onIndexChange}
      onClose={onClose}
    />,
  );
  return { onIndexChange, onClose, ...utils };
}

afterEach(() => cleanup());

describe('ImageModal', () => {
  it('renders nothing when index is null', () => {
    setup(null);
    expect(screen.queryByTestId('cld-image')).toBeNull();
  });

  it('renders the image for the current index with its public_id caption', () => {
    setup(1);
    const img = screen.getByTestId('cld-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('b');
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('ArrowRight advances to next image and wraps at end', async () => {
    const { onIndexChange } = setup(2);
    await userEvent.keyboard('{ArrowRight}');
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('ArrowLeft goes to previous image and wraps at start', async () => {
    const { onIndexChange } = setup(0);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('Escape calls onClose', async () => {
    const { onClose } = setup(0);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('attaches no keydown listener while closed', async () => {
    const { onIndexChange } = setup(null);
    await userEvent.keyboard('{ArrowRight}');
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('swipe right (deltaX > 50) navigates to previous', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 200, clientY: 110, pointerId: 1 });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('swipe left (deltaX < -50) navigates to next', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 110, pointerId: 1 });
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('ignores vertical-dominant swipes', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 140, clientY: 300, pointerId: 1 });
    expect(onIndexChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 9.3: Run tests (expect failure)**

Run:

```bash
pnpm test
```

Expected: modal tests fail because the current `ImageModal` uses the old props.

---

## Task 10: Refactor `ImageModal` to the new props shape

**Files:**

- Modify: `components/ui/image-modal.tsx`

- [ ] **Step 10.1: Replace the file with the new implementation**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { CldImage } from 'next-cloudinary';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Photo } from '@/lib/photos';

interface ImageModalProps {
  photos: Photo[];
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD = 50;

export function ImageModal({ photos, index, onIndexChange, onClose }: ImageModalProps) {
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const isOpen = index !== null && photos.length > 0;

  useEffect(() => {
    if (!isOpen || index === null) return;
    const total = photos.length;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onIndexChange((index! + 1) % total);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onIndexChange((index! - 1 + total) % total);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, index, photos.length, onIndexChange, onClose]);

  if (!isOpen || index === null) return null;
  const current = photos[index];
  const total = photos.length;

  const go = (delta: number) => {
    onIndexChange((index + delta + total) % total);
  };

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-5xl p-0 bg-background overflow-hidden"
        aria-describedby={undefined}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <div
          data-testid="modal-swipe-surface"
          className="relative flex items-center justify-center bg-black/95"
          onPointerDown={e => {
            pointerStart.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={e => {
            const start = pointerStart.current;
            pointerStart.current = null;
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.abs(dx) <= Math.abs(dy)) return;
            if (dx > SWIPE_THRESHOLD) go(-1);
            else if (dx < -SWIPE_THRESHOLD) go(1);
          }}
        >
          <CldImage
            src={current.publicId}
            width={current.width}
            height={current.height}
            alt=""
            className="max-h-[80vh] w-auto h-auto object-contain"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 hover:bg-background"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-2 hover:bg-background"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-2 top-2 rounded-full bg-background/70 p-2 hover:bg-background"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="px-4 py-2 text-center text-xs text-muted-foreground truncate">
          {current.publicId}
        </p>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 10.2: Check the current modal's imports still resolve**

Run:

```bash
ls components/ui/dialog.tsx
```

Expected: file exists (shadcn `Dialog`). If `DialogContent` doesn't exist, inspect `dialog.tsx` and adjust imports accordingly — do not invent missing components.

- [ ] **Step 10.3: Run unit tests (expect pass)**

Run:

```bash
pnpm test
```

Expected: all `image-modal.test.tsx` tests pass. If the `userEvent.keyboard` calls don't trigger listeners, check that the test calls are awaited and that the `useEffect` depends on `isOpen` and `index`.

- [ ] **Step 10.4: Commit**

```bash
git add components/ui/image-modal.tsx components/ui/image-modal.test.tsx
git commit -m "feat(modal): array+index nav, keyboard, swipe"
```

---

## Task 11: Build `MasonryGrid` and `PhotoTile`

**Files:**

- Create: `components/gallery/masonry-grid.tsx`
- Create: `components/gallery/photo-tile.tsx`

- [ ] **Step 11.1: Write `components/gallery/masonry-grid.tsx`**

```tsx
import { ReactNode } from 'react';

export function MasonryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
      {children}
    </div>
  );
}
```

- [ ] **Step 11.2: Write `components/gallery/photo-tile.tsx`**

```tsx
'use client';

import { CldImage } from 'next-cloudinary';
import type { Photo } from '@/lib/photos';

interface PhotoTileProps {
  photo: Photo;
  index: number;
  onOpen: (index: number) => void;
}

export function PhotoTile({ photo, index, onOpen }: PhotoTileProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      className="break-inside-avoid mb-4 block w-full cursor-pointer rounded-md overflow-hidden hover:opacity-90 transition"
      aria-label={`Open photo ${photo.publicId}`}
    >
      <CldImage
        src={photo.publicId}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        alt=""
        className="w-full h-auto"
      />
    </button>
  );
}
```

- [ ] **Step 11.3: Commit**

```bash
git add components/gallery/masonry-grid.tsx components/gallery/photo-tile.tsx
git commit -m "feat(gallery): add MasonryGrid and PhotoTile"
```

---

## Task 12: Write failing tests for `PhotoSection`

**Files:**

- Create: `components/gallery/photo-section.test.tsx`

- [ ] **Step 12.1: Write the test file**

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoSection } from './photo-section';
import type { Photo } from '@/lib/photos';

const photos: Photo[] = [
  { publicId: 'travel-taste/bali/a', width: 100, height: 100, folder: 'bali' },
  { publicId: 'travel-taste/bali/b', width: 100, height: 100, folder: 'bali' },
  { publicId: 'travel-taste/bali/c', width: 100, height: 100, folder: 'bali' },
];

afterEach(() => cleanup());

describe('PhotoSection', () => {
  it('renders the humanized title as an h2', () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Bali');
  });

  it('renders one tile per photo', () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const imgs = screen.getAllByTestId('cld-image');
    expect(imgs).toHaveLength(3);
  });

  it('opens the modal at the clicked index', async () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const buttons = screen.getAllByRole('button', { name: /Open photo/ });
    await userEvent.click(buttons[2]);
    const modalImg = screen.getAllByTestId('cld-image').find(
      el => (el as HTMLImageElement).getAttribute('src') === 'travel-taste/bali/c',
    );
    expect(modalImg).toBeTruthy();
    expect(screen.getByText('travel-taste/bali/c')).toBeInTheDocument();
  });
});
```

- [ ] **Step 12.2: Run tests (expect failure)**

Run:

```bash
pnpm test
```

Expected: test file fails (no `PhotoSection` module yet).

---

## Task 13: Implement `PhotoSection`

**Files:**

- Create: `components/gallery/photo-section.tsx`

- [ ] **Step 13.1: Write `components/gallery/photo-section.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { MasonryGrid } from './masonry-grid';
import { PhotoTile } from './photo-tile';
import { ImageModal } from '@/components/ui/image-modal';
import type { PhotoSection as PhotoSectionType } from '@/lib/photos';

export function PhotoSection({ slug, title, photos }: PhotoSectionType) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <section aria-labelledby={`section-${slug}`}>
      <h2 id={`section-${slug}`} className="text-2xl font-semibold mb-4">
        {title}
      </h2>
      <MasonryGrid>
        {photos.map((photo, i) => (
          <PhotoTile key={photo.publicId} photo={photo} index={i} onOpen={setOpenIdx} />
        ))}
      </MasonryGrid>
      <ImageModal
        photos={photos}
        index={openIdx}
        onIndexChange={setOpenIdx}
        onClose={() => setOpenIdx(null)}
      />
    </section>
  );
}
```

- [ ] **Step 13.2: Run tests (expect pass)**

Run:

```bash
pnpm test
```

Expected: `PhotoSection` tests pass; all prior tests still pass.

- [ ] **Step 13.3: Commit**

```bash
git add components/gallery/photo-section.tsx components/gallery/photo-section.test.tsx
git commit -m "feat(gallery): add PhotoSection with modal state"
```

---

## Task 14: Wire `app/page.tsx` to `SECTIONS`

**Files:**

- Modify: `app/page.tsx`

- [ ] **Step 14.1: Refresh the generated manifest from fixture**

Run:

```bash
PHOTOS_FIXTURE_PATH=test/fixtures/photos.generated.ts node scripts/fetch-photos.mjs
```

Expected: `lib/photos.generated.ts` present.

- [ ] **Step 14.2: Replace `app/page.tsx`**

```tsx
/* eslint-disable no-undef */
'use client';

import { useEffect, useState } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { PhotoSection } from '@/components/gallery/photo-section';
import { SESSION_KEY } from '@/lib/constants';
import { SECTIONS } from '@/lib/photos.generated';

export default function Home() {
  const [hasSession, setHasSession] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const session = window.localStorage.getItem(SESSION_KEY);
      setHasSession(session === 'authenticated');
    }
  }, []);

  if (!mounted) return null;

  if (!hasSession) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Travel Taste</h1>
            <p className="text-sm text-muted-foreground">
              Enter your password to access the dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-12">
      <div className="text-center">
        <p className="text-muted-foreground">Discover amazing destinations around the world</p>
      </div>
      {SECTIONS.length === 0 ? (
        <p className="text-center text-muted-foreground">No photos yet.</p>
      ) : (
        SECTIONS.map(section => <PhotoSection key={section.slug} {...section} />)
      )}
    </div>
  );
}
```

- [ ] **Step 14.3: Run lint to catch unused imports**

Run:

```bash
pnpm lint
```

Expected: clean (no new errors). If there are any, fix them before proceeding.

- [ ] **Step 14.4: Run unit tests (regression check)**

Run:

```bash
pnpm test
```

Expected: all tests still pass.

- [ ] **Step 14.5: Commit**

```bash
git add app/page.tsx
git commit -m "feat(home): render photo gallery from SECTIONS"
```

---

## Task 15: Install Playwright and write base config

**Files:**

- Modify: `package.json`
- Create: `playwright.config.ts`

- [ ] **Step 15.1: Install Playwright and `serve`**

Run:

```bash
pnpm add -D @playwright/test serve
pnpm exec playwright install chromium
```

Expected: Playwright installed; Chromium browser downloaded.

- [ ] **Step 15.2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command:
      'PHOTOS_FIXTURE_PATH=test/fixtures/photos.generated.ts pnpm build && pnpm exec serve -s out -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_APP_PASSWORD: 'travel123',
    },
  },
});
```

- [ ] **Step 15.3: Add e2e scripts**

In `package.json` `scripts`, add:

```json
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 15.4: Commit (before specs)**

```bash
git add package.json pnpm-lock.yaml playwright.config.ts
git commit -m "chore(e2e): add Playwright tooling and config"
```

---

## Task 16: Write Playwright auth specs

**Files:**

- Create: `e2e/auth.spec.ts`

- [ ] **Step 16.1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test.describe('auth gate', () => {
  test('rejects wrong password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password').fill('nope');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid password')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('accepts correct password and reveals gallery', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password').fill('travel123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
  });
});
```

- [ ] **Step 16.2: Run the auth specs**

Run:

```bash
pnpm test:e2e --project=chromium e2e/auth.spec.ts
```

Expected: both tests pass. If the `webServer` build fails, first verify `pnpm build` works with the fixture locally.

---

## Task 17: Write Playwright gallery specs

**Files:**

- Create: `e2e/gallery.spec.ts`

- [ ] **Step 17.1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

test.describe('gallery layout', () => {
  test('renders sections alphabetically', async ({ page }) => {
    await login(page);
    const headings = await page.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(['Bali', 'Kyoto', 'Santorini']);
  });

  test('renders expected tile counts per section', async ({ page }) => {
    await login(page);
    const counts: Record<string, number> = { bali: 2, kyoto: 3, santorini: 4 };
    for (const [slug, count] of Object.entries(counts)) {
      const section = page.locator(`section[aria-labelledby="section-${slug}"]`);
      await expect(section.getByRole('button', { name: /Open photo/ })).toHaveCount(count);
    }
  });
});
```

- [ ] **Step 17.2: Run**

Run:

```bash
pnpm test:e2e --project=chromium e2e/gallery.spec.ts
```

Expected: both tests pass.

---

## Task 18: Write Playwright modal specs

**Files:**

- Create: `e2e/modal.spec.ts`

- [ ] **Step 18.1: Write the spec**

```ts
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

test.describe('modal navigation', () => {
  test('opens modal showing the clicked photo public_id', async ({ page }) => {
    await login(page);
    const firstTile = page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ })
      .first();
    await firstTile.click();
    await expect(page.getByText('travel-taste/bali/beach-01')).toBeVisible();
  });

  test('ArrowRight wraps within section', async ({ page }) => {
    await login(page);
    // Santorini has 4 photos; pressing ArrowRight 4 times returns to the first.
    await page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    const first = 'travel-taste/santorini/sunset-01';
    await expect(page.getByText(first)).toBeVisible();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText(first)).toBeVisible();
  });

  test('Escape closes the modal', async ({ page }) => {
    await login(page);
    await page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    await expect(page.getByText('travel-taste/bali/beach-01')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('travel-taste/bali/beach-01')).toBeHidden();
  });

  test('modal scope stays within its section when navigating', async ({ page }) => {
    await login(page);
    // Open the LAST photo of section Bali (index 1 of 2), press ArrowRight, expect to wrap to Bali's first photo (not Kyoto's).
    const baliButtons = page
      .locator('section[aria-labelledby="section-bali"]')
      .getByRole('button', { name: /Open photo/ });
    await baliButtons.nth(1).click();
    await expect(page.getByText('travel-taste/bali/temple-02')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('travel-taste/bali/beach-01')).toBeVisible();
  });
});
```

- [ ] **Step 18.2: Run**

Run:

```bash
pnpm test:e2e --project=chromium e2e/modal.spec.ts
```

Expected: all four tests pass.

---

## Task 19: Write Playwright mobile specs

**Files:**

- Create: `e2e/mobile.spec.ts`

- [ ] **Step 19.1: Write the spec**

```ts
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

async function login(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('Password').fill('travel123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Bali' })).toBeVisible();
}

test.describe('mobile gallery (mobile-chrome only)', () => {
  test.skip(({ browserName }, testInfo) => testInfo.project.name !== 'mobile-chrome', 'mobile only');

  test('swipe left advances to next image', async ({ page }) => {
    await login(page);
    await page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ })
      .first()
      .click();
    await expect(page.getByText('travel-taste/santorini/sunset-01')).toBeVisible();

    const surface = page.getByTestId('modal-swipe-surface');
    const box = (await surface.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx + 120, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 120, cy, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByText('travel-taste/santorini/blue-dome-02')).toBeVisible();
  });

  test('swipe right returns to previous image', async ({ page }) => {
    await login(page);
    const tiles = page
      .locator('section[aria-labelledby="section-santorini"]')
      .getByRole('button', { name: /Open photo/ });
    await tiles.nth(1).click();
    await expect(page.getByText('travel-taste/santorini/blue-dome-02')).toBeVisible();

    const surface = page.getByTestId('modal-swipe-surface');
    const box = (await surface.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 120, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 120, cy, { steps: 10 });
    await page.mouse.up();

    await expect(page.getByText('travel-taste/santorini/sunset-01')).toBeVisible();
  });

  test('masonry renders two columns at mobile width', async ({ page }) => {
    await login(page);
    const section = page.locator('section[aria-labelledby="section-kyoto"]');
    const grid = section.locator('> div').first(); // MasonryGrid wrapper
    const columnCount = await grid.evaluate(el => getComputedStyle(el).columnCount);
    expect(columnCount).toBe('2');
  });
});
```

- [ ] **Step 19.2: Run mobile specs**

Run:

```bash
pnpm test:e2e --project=mobile-chrome e2e/mobile.spec.ts
```

Expected: all three tests pass. Swipe synthesized via mouse events works because Playwright dispatches pointer events for mouse too.

- [ ] **Step 19.3: Commit all e2e specs**

```bash
git add e2e/auth.spec.ts e2e/gallery.spec.ts e2e/modal.spec.ts e2e/mobile.spec.ts
git commit -m "test(e2e): add auth, gallery, modal, and mobile specs"
```

---

## Task 20: ESLint coverage for `test/**` and `e2e/**`

**Files:**

- Modify: `eslint.config.mjs`

- [ ] **Step 20.1: Update the config's ignores**

Current `ignores`:

```js
    ignores: ["**/out/**", "**/.next/**", "**/node_modules/**", "next.config.js", "postcss.config.js", "tailwind.config.ts"]
```

No change needed — `test/` and `e2e/` aren't in the ignores. Confirm by running lint.

- [ ] **Step 20.2: Confirm lint passes over new test files**

Run:

```bash
pnpm lint
```

Expected: clean. If Playwright specs trigger unused-import or `no-undef` errors, add a `files` block for them inside `eslint.config.mjs` relaxing `no-undef` (Playwright provides its own globals via imports, so `no-undef` should already pass).

- [ ] **Step 20.3: Commit if any config tweaks**

If you edited `eslint.config.mjs`:

```bash
git add eslint.config.mjs
git commit -m "chore(lint): include test and e2e files"
```

Otherwise skip.

---

## Task 21: Update `CLAUDE.md`

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 21.1: Rewrite the Commands and Architecture sections**

Open `CLAUDE.md` and make these changes:

Under **Commands**, add:

```markdown
- `pnpm test` / `pnpm test:watch` — Vitest unit tests (jsdom)
- `pnpm test:e2e` / `pnpm test:e2e:ui` — Playwright end-to-end tests
- `node scripts/fetch-photos.mjs` — manual regeneration of `lib/photos.generated.ts` (also runs via `predev` / `prebuild`)
```

Under **Environment**, add below the existing `NEXT_PUBLIC_APP_PASSWORD` bullet:

```markdown
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_ROOT_FOLDER` — read only by the prebuild script (`scripts/fetch-photos.mjs`). Never prefix with `NEXT_PUBLIC_`. If `PHOTOS_FIXTURE_PATH` is set, the script copies that fixture instead (used by e2e tests/CI).
```

Under **Architecture**, add a subsection:

```markdown
### Photo gallery data flow

`scripts/fetch-photos.mjs` runs before `next dev` and `next build`. It calls Cloudinary's Admin API (or copies a fixture if `PHOTOS_FIXTURE_PATH` is set), passes resources through the pure `groupResources` function in `lib/photos-build.ts`, and writes the result to `lib/photos.generated.ts` (gitignored). `app/page.tsx` imports `SECTIONS` from that generated file. Each section renders via `components/gallery/photo-section.tsx`, which owns its own modal state. `components/ui/image-modal.tsx` is a Radix Dialog driven by an array + index with wrap-around prev/next, keyboard navigation, and pointer-based swipe.
```

- [ ] **Step 21.2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): document photo gallery pipeline and test commands"
```

---

## Task 22: Final verification

**Files:** none (verification only).

- [ ] **Step 22.1: Lint everything**

Run:

```bash
pnpm lint
```

Expected: clean.

- [ ] **Step 22.2: Unit tests**

Run:

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 22.3: Full e2e suite**

Run:

```bash
pnpm test:e2e
```

Expected: both `chromium` and `mobile-chrome` projects pass.

- [ ] **Step 22.4: Full build with fixture**

Run:

```bash
PHOTOS_FIXTURE_PATH=test/fixtures/photos.generated.ts pnpm build
```

Expected: build succeeds; `out/` contains the static export with the three sections visible after auth.

- [ ] **Step 22.5: Manual smoke (real Cloudinary, optional here)**

With real `CLOUDINARY_*` vars in `.env`:

```bash
pnpm build
pnpm exec serve -s out
```

Then in a browser: sign in, confirm real photos render, click a tile, use arrows, press Escape.

- [ ] **Step 22.6: Final commit if any fixups were required**

If verification required any small fixups:

```bash
git add -A
git commit -m "chore: final fixups from verification"
```

---

## Followups (not in this plan)

- GitHub Actions workflow for lint + unit + e2e on PR.
- Visual regression snapshots (Playwright `toHaveScreenshot`).
- Per-photo `alt` text and captions via Cloudinary `context` metadata.
- Blur-up placeholders using Cloudinary `b_auto:predominant` or LQIP.
- Filter/search UI over sections.
- Replace `NEXT_PUBLIC_APP_PASSWORD` cosmetic gate with a real auth system.
