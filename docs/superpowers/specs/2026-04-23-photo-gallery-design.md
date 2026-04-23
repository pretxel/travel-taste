# Photo Gallery — Design Spec

**Date:** 2026-04-23
**Status:** Approved (design phase)
**Scope:** Replace the hardcoded 3-card home page with a Cloudinary-driven, section-based masonry photo gallery with an enhanced lightbox modal.

---

## 1. Context

Current state (`app/page.tsx`):

- Three hardcoded `TravelCard` objects render as uniform `Card`s in a 1/2/3-column grid.
- Clicking a card opens `components/ui/image-modal.tsx` (a Radix Dialog) showing the image plus static title/description.
- Images come from a mix of Cloudinary (`CldImage` with `public_id`) and raw Unsplash URLs.
- Session gate in `app/page.tsx` and `components/client-layout.tsx` reads `localStorage['session']` after mount.
- The app is a Next.js 16 App Router project, statically exported (`output: 'export'` in `next.config.js`), pnpm-managed, no tests configured.

The user's requirements (resolved during brainstorming):

1. Masonry layout (Q1 → B).
2. Photo list populated from Cloudinary at build time via API listing (Q2 → D).
3. No per-image captions (Q3 → D) — modal shows `public_id` only.
4. Multiple folders grouped as sections with folder-name headings, no filter UI (Q4 → B).
5. Modal: prev/next + keyboard + swipe (Q5 → C).
6. Build-time fetch via prebuild script (Q6 → A).
7. Testing stack: Vitest + React Testing Library (unit) + Playwright (e2e) (Q7 → A).

## 2. Goals / Non-goals

**Goals**

- Replace static card array with dynamic gallery sourced from Cloudinary folders.
- Masonry rendering that preserves native aspect ratios without layout shift.
- Section-per-folder presentation with humanized headings, ordered alphabetically.
- Lightbox modal with prev/next, keyboard, and touch-swipe navigation, scoped to the current section.
- Unit and e2e test coverage for new code paths.
- Preserve existing password gate behavior unchanged.

**Non-goals**

- Per-image human-readable captions, alt text, or custom titles (intentionally deferred). The modal does display each photo's `public_id` as a muted reference string, but this is a technical identifier, not a caption system.
- Filter/search UI.
- Cloudinary uploads from the app.
- Visual regression snapshots, bundle-size budgets, CI workflow files.
- Blur placeholders, progressive loading refinements.

## 3. Architecture

### 3.1 Files added

- `scripts/fetch-photos.mjs` — Node prebuild script; calls Cloudinary Admin API, invokes pure grouping logic, writes generated TS file. Also honors `PHOTOS_FIXTURE_PATH` (copies fixture instead of fetching).
- `lib/photos.ts` — Shared types (`Photo`, `PhotoSection`, `CloudinaryResource`) and type-only helpers.
- `lib/photos-build.ts` — Pure, unit-testable logic: `humanizeSlug`, `groupResources`.
- `lib/photos.generated.ts` — **Gitignored.** Emitted by script. Exports `SECTIONS: PhotoSection[]`.
- `components/gallery/masonry-grid.tsx` — CSS-columns wrapper.
- `components/gallery/photo-section.tsx` — Section heading + grid, owns modal state per section.
- `components/gallery/photo-tile.tsx` — Clickable `CldImage` tile with reserved aspect ratio.
- `test/setup.ts` — Vitest setup (RTL matchers + `CldImage` mock).
- `test/fixtures/photos.generated.ts` — Deterministic section fixture for e2e/Vitest.
- `lib/photos-build.test.ts`, `components/ui/image-modal.test.tsx`, `components/gallery/photo-section.test.tsx` — unit tests.
- `e2e/auth.spec.ts`, `e2e/gallery.spec.ts`, `e2e/modal.spec.ts`, `e2e/mobile.spec.ts` — Playwright specs.
- `vitest.config.ts`, `playwright.config.ts`.

### 3.2 Files modified

- `app/page.tsx` — Remove hardcoded `travelCards` array, `selectedCard` state, and direct `ImageModal` invocation. Render `SECTIONS.map(s => <PhotoSection {...s} />)` within the authenticated branch.
- `components/ui/image-modal.tsx` — Convert from single-image (`imageUrl`/`title`/`description`) to array+index (`photos`, `index`, `onIndexChange`). Add prev/next buttons, keyboard listeners (`ArrowLeft`/`ArrowRight`/`Escape`), swipe handling.
- `package.json` — Add `cloudinary` dependency; devDependencies for test stack; `build` becomes `node scripts/fetch-photos.mjs && next build`; add `predev`, `test`, `test:watch`, `test:e2e`, `test:e2e:ui` scripts.
- `.env` — Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_ROOT_FOLDER` (server-only, no `NEXT_PUBLIC_` prefix).
- `.gitignore` — Add `lib/photos.generated.ts`.
- `eslint.config.mjs` — Extend `files` glob to lint `test/**` and `e2e/**`.
- `CLAUDE.md` — Update architecture notes to reflect new data flow and test scripts.

### 3.3 Technology choices

- **Masonry:** CSS `columns-2 md:columns-3 lg:columns-4` plus `break-inside-avoid` on tiles. No runtime layout library. Tiles render with explicit `width`/`height` to reserve space and avoid layout shift.
- **Swipe:** Native `pointerdown` / `pointerup` handlers on the modal image container. No dependency added.
- **Modal:** Existing Radix Dialog (`components/ui/image-modal.tsx`) is extended in place; no replacement.
- **Cloudinary SDK:** Official `cloudinary` package (`v2.api.resources`). Admin API runs only in the prebuild script, never in client bundles.

## 4. Data model

```ts
// lib/photos.ts
export interface CloudinaryResource {
  public_id: string;
  width: number;
  height: number;
  created_at: string; // ISO-8601
  folder: string;     // full path, e.g. "travel-taste/santorini"
}

export interface Photo {
  publicId: string;   // e.g. "travel-taste/santorini/sunset-01"
  width: number;
  height: number;
  folder: string;     // section slug, e.g. "santorini"
}

export interface PhotoSection {
  slug: string;       // "santorini"
  title: string;      // "Santorini" (humanized)
  photos: Photo[];
}
```

```ts
// lib/photos.generated.ts (emitted)
// GENERATED — do not edit. Produced by scripts/fetch-photos.mjs.
import type { PhotoSection } from './photos';
export const SECTIONS: PhotoSection[] = [ /* … */ ];
```

## 5. Data flow

### 5.1 Build time

1. `scripts/fetch-photos.mjs` loads `.env` (via `dotenv` or Node 20+ `--env-file`).
2. Validates required env vars; exits 1 with a clear message if any are missing.
3. If `PHOTOS_FIXTURE_PATH` is set, copies that file to `lib/photos.generated.ts` and exits 0 (test/CI path).
4. Otherwise paginates `cloudinary.v2.api.resources({ type: 'upload', prefix: ROOT, max_results: 500 })` via `next_cursor` until exhausted. Hard cap at 5000 resources.
5. Passes raw resources plus `ROOT` into `groupResources` (pure) which:
   - Strips `ROOT/` prefix from each resource's folder.
   - Skips resources whose stripped folder is empty (directly under root).
   - Skips resources missing `width`/`height`.
   - Groups by **first path segment** of the stripped folder. Nested subfolders (e.g. `travel-taste/santorini/sunset/` or `travel-taste/santorini/2024/`) are flattened: all their photos roll up into the top-level section (`santorini`). No nested section UI.
   - Sorts sections alphabetically by slug.
   - Sorts each section's photos by `created_at` descending.
   - Applies `humanizeSlug` to produce each section's `title`.
6. Serializes the resulting `SECTIONS` array to TypeScript and writes `lib/photos.generated.ts` with a generated-file banner.

### 5.2 Runtime (static)

1. `app/page.tsx` imports `SECTIONS` at module load; the import is resolved at build time and inlined into the static export.
2. On mount, the existing auth gate reads `localStorage['session']`. Unauthenticated → `LoginForm`. Authenticated → gallery.
3. Authenticated branch renders `SECTIONS.map(section => <PhotoSection key={section.slug} {...section} />)` inside a vertically spaced container.
4. Each `PhotoSection` owns its modal state. Clicking a tile calls `setOpenIdx(index)`; the modal receives that section's `photos` array and the current index.
5. Inside the modal, prev/next mutate index via `(index + N ± 1) % N`. Navigation wraps and is scoped to the current section.

## 6. Components

### 6.1 `MasonryGrid`

```tsx
export function MasonryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
      {children}
    </div>
  );
}
```

Children (tiles) must carry `break-inside-avoid mb-4` to prevent column-break orphans and produce vertical rhythm.

### 6.2 `PhotoTile`

```tsx
<button
  type="button"
  onClick={() => onOpen(index)}
  className="break-inside-avoid mb-4 block w-full cursor-pointer rounded-md overflow-hidden hover:opacity-90 transition"
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
```

Reserves correct aspect ratio before the image loads; eliminates layout shift.

### 6.3 `PhotoSection`

- `'use client'` — owns modal state.
- Renders `<h2 className="text-2xl font-semibold mb-4">{title}</h2>`.
- Wraps tiles in `<MasonryGrid>`.
- State: `const [openIdx, setOpenIdx] = useState<number | null>(null)`.
- Renders `<ImageModal photos={photos} index={openIdx} onIndexChange={setOpenIdx} onClose={() => setOpenIdx(null)} />` when `openIdx !== null`.

### 6.4 `ImageModal` (revised)

Props:

```ts
interface ImageModalProps {
  photos: Photo[];
  index: number | null;         // null = closed
  onIndexChange: (i: number) => void;
  onClose: () => void;
}
```

Behavior:

- When `index === null` or `photos.length === 0`, returns `null` (no-op).
- Renders `<CldImage>` for `photos[index]`, plus prev/next buttons (Lucide `ChevronLeft`/`ChevronRight`).
- Caption area below image shows muted `photos[index].publicId` text.
- `useEffect` attaches a `keydown` listener on `document` while open; cleans up on close.
  - `ArrowLeft` → `onIndexChange((index - 1 + N) % N)`.
  - `ArrowRight` → `onIndexChange((index + 1) % N)`.
  - `Escape` → `onClose()`.
- Pointer handlers on the image container track `startX` on `pointerdown`, compute `deltaX` on `pointerup`. If `|deltaX| > 50` and `|deltaX| > |deltaY|`, navigate prev/next accordingly.

### 6.5 `app/page.tsx`

Authenticated branch becomes:

```tsx
<div className="container mx-auto p-4 space-y-12">
  {SECTIONS.length === 0 ? (
    <p className="text-center text-muted-foreground">No photos yet.</p>
  ) : (
    SECTIONS.map(section => <PhotoSection key={section.slug} {...section} />)
  )}
</div>
```

Remove unused imports (`Card`, `CardHeader`, `CardTitle`, local `travelCards` array, old `ImageModal` import shape).

## 7. Error handling

### 7.1 Prebuild script

- Missing env var → `console.error` with the variable name, `process.exit(1)`.
- Cloudinary 4xx/5xx → surface status and body, `process.exit(1)`.
- Network error → log and exit 1.
- Zero resources under root → log warning, write `SECTIONS = []`, exit 0 (build proceeds with empty gallery).
- Hard cap (5000 resources) hit → log warning, use what was fetched, exit 0.
- Resource missing `width`/`height` → drop with per-resource warning, continue.

### 7.2 Runtime

- `SECTIONS = []` → page shows "No photos yet." placeholder.
- Section with zero photos after filtering → omitted during generation (never reaches runtime).
- Modal with `photos.length === 0` or `index === null` → renders `null`.
- Broken Cloudinary URL → `CldImage` surfaces Cloudinary's standard error asset; acceptable.
- Hydration: `PhotoSection` is `'use client'` (owns modal state) but does not touch `localStorage` or `window`, so it does not need a mount gate. The existing auth gate in `app/page.tsx` continues to mount-gate the entire authenticated branch.

### 7.3 Developer ergonomics

- `.env` (already gitignored) documents required Cloudinary vars.
- `lib/photos.generated.ts` is gitignored so every build regenerates. If a developer wants to deploy without Cloudinary creds, they may commit the generated file manually as an escape hatch; this is documented but not recommended.
- `predev` script runs the prebuild on first `pnpm dev` so `lib/photos.generated.ts` exists before Next starts.

## 8. Testing strategy

### 8.1 Testability refactor

- `scripts/fetch-photos.mjs` delegates all logic to pure functions in `lib/photos-build.ts`:
  - `humanizeSlug(slug: string): string`
  - `groupResources(resources: CloudinaryResource[], rootFolder: string): PhotoSection[]`
- The script itself contains only I/O: env loading, Cloudinary calls, file write, fixture-copy branch.

### 8.2 Unit tests (Vitest + jsdom + RTL)

**`lib/photos-build.test.ts`**

- `humanizeSlug`: `"santorini"` → `"Santorini"`; `"santorini-greece"` → `"Santorini Greece"`; `"machu_picchu"` → `"Machu Picchu"`; `""` → `""`.
- `groupResources`:
  - Empty input → `[]`.
  - Resources directly under `ROOT` (no subfolder) are skipped.
  - Resources missing `width` or `height` are skipped.
  - Multi-folder input → one `PhotoSection` per folder, sorted alphabetically by slug.
  - Photos within a section sorted by `created_at` descending.
  - 6000-resource input respects hard cap of 5000.

**`components/ui/image-modal.test.tsx`**

- Renders the image for the current `index`.
- Arrow-right calls `onIndexChange` with `(index + 1) % N`; wraps `N-1` → `0`.
- Arrow-left calls `onIndexChange` with `(index - 1 + N) % N`; wraps `0` → `N-1`.
- `Escape` calls `onClose`.
- Pointer swipe with `deltaX > 50`, `|deltaX| > |deltaY|` calls prev; `< -50` calls next; vertical-dominant swipes are ignored.
- When `index === null`, renders nothing and attaches no listeners (cleanup check via `document.onkeydown` absence).

**`components/gallery/photo-section.test.tsx`**

- Renders an `h2` with the humanized title.
- Renders one tile per photo.
- Clicking the third tile opens the modal with `index === 2` and the full `photos` array.

`test/setup.ts`:

- Imports `@testing-library/jest-dom`.
- Mocks `next-cloudinary` so `CldImage` renders a plain `<img src={src} />` for test assertions.

### 8.3 End-to-end tests (Playwright)

`test/fixtures/photos.generated.ts` — A deterministic fixture with three sections (`bali`, `kyoto`, `santorini`), varying photo counts and known `public_id`s, committed to the repo.

`playwright.config.ts`:

- `webServer`: `PHOTOS_FIXTURE_PATH=test/fixtures/photos.generated.ts pnpm build && pnpm dlx serve -s out -l 3000`.
- `baseURL: 'http://localhost:3000'`.
- Two projects: `chromium` (desktop) and `mobile-chrome` (Pixel 5 device descriptor).
- `trace: 'on-first-retry'`.

**`e2e/auth.spec.ts`**

- Wrong password → inline error appears, stays on login.
- Correct password (fed via `NEXT_PUBLIC_APP_PASSWORD` in the build env) → gallery visible; first section heading renders.

**`e2e/gallery.spec.ts`**

- Three section headings present, in alphabetical order.
- Tile count per section matches fixture.

**`e2e/modal.spec.ts`**

- Click first tile → modal opens; caption shows that tile's `public_id`.
- `ArrowRight` pressed `N` times returns to the starting image (wrap behavior).
- `Escape` closes the modal.
- Modal scope: from section A's last photo, `ArrowRight` wraps back to section A's first, not section B's first.

**`e2e/mobile.spec.ts`** (mobile-chrome project only)

- Swipe left on modal → advances to next image.
- Swipe right → returns to previous image.
- At 375px viewport, masonry renders two columns.

### 8.4 Dependencies added (devDependencies)

`vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `serve`.

### 8.5 Scripts added (package.json)

- `"predev": "node scripts/fetch-photos.mjs"`
- `"build": "node scripts/fetch-photos.mjs && next build"`
- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"test:e2e": "playwright test"`
- `"test:e2e:ui": "playwright test --ui"`

### 8.6 Manual smoke

Run once per release against real Cloudinary:

- `pnpm build` completes with live creds.
- Gallery renders correctly in `pnpm dlx serve -s out` with production data.
- Spot-check modal swipe on a physical touch device.

## 9. Implementation checklist

1. Extract pure grouping logic: add `lib/photos.ts` (types) and `lib/photos-build.ts` (pure fns).
2. Write `scripts/fetch-photos.mjs` using `cloudinary` SDK; honor `PHOTOS_FIXTURE_PATH`.
3. Add env vars to `.env` and update `.env` loading in the script.
4. Add `lib/photos.generated.ts` to `.gitignore`.
5. Add Vitest + Playwright configs and `test/setup.ts`.
6. Write unit tests for `photos-build` and commit the fixture at `test/fixtures/photos.generated.ts`.
7. Build `components/gallery/masonry-grid.tsx`, `photo-tile.tsx`, `photo-section.tsx`.
8. Rework `components/ui/image-modal.tsx` to the new props shape; write its unit test.
9. Update `app/page.tsx` to consume `SECTIONS`.
10. Write Playwright specs; add `webServer` config.
11. Update `package.json` scripts and dependencies.
12. Update `eslint.config.mjs` to lint `test/**` and `e2e/**`.
13. Update `CLAUDE.md` with the new build flow, env requirements, and test commands.
14. Run `pnpm lint`, `pnpm test`, `pnpm test:e2e`; fix failures; manual smoke against real Cloudinary.

## 10. Followups (out of scope)

- Automated CI workflow (GitHub Actions) running lint, unit, and e2e on PRs.
- Visual regression snapshots (Playwright screenshot assertions).
- Per-image `alt` text and captions via Cloudinary `context` metadata.
- Blur-up placeholders using Cloudinary `b_auto:predominant` or low-quality image previews.
- Filter/search UI over sections.
- Bundle-size budgets.
- Auth hardening (the current `NEXT_PUBLIC_APP_PASSWORD` gate is cosmetic; noted separately).
