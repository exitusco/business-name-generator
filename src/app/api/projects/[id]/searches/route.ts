import { NextRequest, NextResponse } from 'next/server';
import { listSearches } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const searches = await listSearches(params.id);
    return NextResponse.json({ searches }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err: any) {
    console.error('List searches error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
