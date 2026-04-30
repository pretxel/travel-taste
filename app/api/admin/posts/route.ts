import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { processUpload } from '@/lib/photos/process';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, POSTS_BUCKET, SIGNED_URL_TTL_SEC } from '@/lib/constants';

export const runtime = 'nodejs';

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
    })
  );
  return NextResponse.json({ posts: out });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Bad form data' }, { status: 400 });

  const file = form.get('file');
  if (!(file instanceof File))
    return NextResponse.json({ error: 'file required' }, { status: 400 });

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
  } catch {
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
    await sb.storage
      .from(POSTS_BUCKET)
      .remove([path])
      .catch(() => {});
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ post: ins.data });
}
