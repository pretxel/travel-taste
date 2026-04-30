import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyViewerJwt } from '@/lib/auth/viewer';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET, SIGNED_URL_TTL_SEC, VIEWER_COOKIE } from '@/lib/constants';

const PAGE = 20;

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (!c) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await verifyViewerJwt(c);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor');

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

  const posts = await Promise.all(
    page.map(async row => {
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
    })
  );

  return NextResponse.json({
    posts,
    next_cursor: hasMore ? page[page.length - 1].created_at : null,
  });
}
