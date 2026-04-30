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
