import { APIRequestContext } from '@playwright/test';
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

export const OWNER_PWD = 'e2e-owner-pwd';

export async function ownerLogin(ctx: APIRequestContext) {
  const r = await ctx.post('/api/admin/login', { data: { password: OWNER_PWD } });
  if (!r.ok()) throw new Error(`owner login failed: ${r.status()}`);
  return r;
}

export async function createCode(ctx: APIRequestContext, label: string): Promise<string> {
  const r = await ctx.post('/api/admin/codes', { data: { label } });
  if (!r.ok()) throw new Error(`create code failed: ${r.status()}`);
  const j = await r.json();
  return j.code as string;
}

export async function uploadPost(
  ctx: APIRequestContext,
  filePath: string,
  caption: string
): Promise<void> {
  const buf = await readFile(filePath);
  const r = await ctx.post('/api/admin/posts', {
    multipart: {
      file: { name: 'test.jpg', mimeType: 'image/jpeg', buffer: buf },
      caption,
    },
  });
  if (!r.ok()) throw new Error(`upload failed: ${r.status()} ${await r.text()}`);
}

export function resetDb() {
  execSync(
    'PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f e2e/seed.sql',
    { stdio: 'pipe' }
  );
}
