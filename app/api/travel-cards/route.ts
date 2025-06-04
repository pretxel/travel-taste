import { get } from '@vercel/edge-config';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const cards = await get('travelCards');
    return NextResponse.json(cards ?? []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch travel cards' }, { status: 500 });
  }
}
