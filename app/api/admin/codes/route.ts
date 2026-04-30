import { NextResponse } from 'next/server';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { generateCode, groupCode } from '@/lib/codes/format';
import { hashCode } from '@/lib/codes/hash';

export async function GET() {
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('viewer_codes')
    .select('id, label, created_at, revoked_at, last_used_at')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data });
}

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
