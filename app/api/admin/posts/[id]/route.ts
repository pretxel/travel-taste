import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET } from '@/lib/constants';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = supabaseServiceRole();
  const { data, error } = await sb.from('posts').select('storage_path').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await sb.from('posts').delete().eq('id', id);
  await sb.storage
    .from(POSTS_BUCKET)
    .remove([data.storage_path])
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
