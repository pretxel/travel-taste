# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (lockfile is `pnpm-lock.yaml`).

- `pnpm dev` — start Next.js dev server
- `pnpm build` — produce static export into `out/` (Next config sets `output: 'export'`)
- `pnpm start` — serve built app
- `pnpm lint` / `pnpm lint:fix` — ESLint (flat config in `eslint.config.mjs`)
- `pnpm test` / `pnpm test:watch` — Vitest unit tests (jsdom)
- `pnpm test:e2e` / `pnpm test:e2e:ui` — Playwright end-to-end tests
- `node scripts/fetch-photos.mjs` — manual regeneration of `lib/photos.generated.ts` (also runs via `predev` / `prebuild`)

Husky + `lint-staged` run `eslint --fix` and `prettier --write` on staged `*.{js,jsx,ts,tsx}` via the `pre-commit` hook.

## Environment

- `NEXT_PUBLIC_APP_PASSWORD` — gate password checked client-side in `components/auth/login-form.tsx`. Default in `.env` is `travel123`. Because it's `NEXT_PUBLIC_*`, it ships to the browser — this auth is purely cosmetic.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_ROOT_FOLDER` — read only by the prebuild script (`scripts/fetch-photos.mjs`). Never prefix with `NEXT_PUBLIC_`. If `PHOTOS_FIXTURE_PATH` is set, the script copies that fixture instead (used by e2e tests/CI).

## Architecture

Next.js 16 App Router + React 19, exported as a **static site** (`next.config.js` → `output: 'export'`, `images.unoptimized: true`). No server runtime at deploy time; everything runs client-side.

- `app/layout.tsx` — Root server component; delegates rendering to `components/client-layout.tsx`.
- `components/client-layout.tsx` — Client component. Gates the entire app on a `mounted` flag (returns `null` until `useEffect` fires) to avoid hydration mismatch from `localStorage`/`next-themes`. Wraps children in `ThemeProvider` + `Toaster` and renders `<Navigation>`. `handleLogout` clears the session and hard-navigates to `/`.
- `app/page.tsx` — Single route. Reads `localStorage[SESSION_KEY]` after mount; shows `LoginForm` when unauthenticated, a card grid otherwise. Cloudinary images render via `<CldImage>` from `next-cloudinary` (public IDs) alongside `unsplash` remote URLs allowlisted in `next.config.js`.
- `lib/constants.ts` — Exports `SESSION_KEY = 'session'`. Note: `components/auth/login-form.tsx` currently **redeclares** this constant locally instead of importing it; keep both in sync or refactor.
- `components/ui/*` — shadcn/ui components (config in `components.json`, baseColor `neutral`, CSS vars enabled). Add new ones via the shadcn CLI; they land here.

### Auth flow (client-only)

1. `LoginForm` compares the input against `process.env.NEXT_PUBLIC_APP_PASSWORD`, sets `localStorage['session'] = 'authenticated'`, hard-navigates to `/`.
2. `Home` and `Navigation` each mount, read the session key, and conditionally render.
3. Logout clears the key and hard-navigates.

Any page/component needing session state must follow the same **mount-then-read** pattern to stay hydration-safe under static export.

### Path aliases

`@/*` maps to the repo root (see `tsconfig.json` and `components.json` aliases: `components`, `utils`, `ui`, `lib`, `hooks`).

### Styling

Tailwind v3 (`tailwind.config.ts`) + CSS variables from `app/globals.css`. Theme handled by `next-themes` via `ThemeProvider` (`attribute="class"`, system default). Use `cn()` from `lib/utils.ts` for class merging.

### Photo gallery data flow

`scripts/fetch-photos.mjs` runs before `next dev` and `next build`. It calls Cloudinary's Admin API (or copies a fixture if `PHOTOS_FIXTURE_PATH` is set), passes resources through the pure `groupResources` function in `lib/photos-build.ts`, and writes the result to `lib/photos.generated.ts` (gitignored). `app/page.tsx` imports `SECTIONS` from that generated file. Each section renders via `components/gallery/photo-section.tsx`, which owns its own modal state. `components/ui/image-modal.tsx` is a Radix Dialog driven by an array + index with wrap-around prev/next, keyboard navigation, and pointer-based swipe.

## Notable constraints

- Static export: no API routes, no server actions, no middleware at runtime. Images must be `unoptimized` or go through a remote loader (Cloudinary).
- Files that touch `window`/`localStorage`/`process.env` at render time carry `/* eslint-disable no-undef */` and gate on a `mounted` state. Preserve this pattern for any new client-only logic.
