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
