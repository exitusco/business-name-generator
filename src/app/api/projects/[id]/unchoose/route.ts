import { NextRequest, NextResponse } from 'next/server';
import { unchooseName } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await unchooseName(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Unchoose name error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
