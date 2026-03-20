import { NextRequest, NextResponse } from 'next/server';
import { getSavedResults } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const results = await getSavedResults(params.id);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Get saved results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
