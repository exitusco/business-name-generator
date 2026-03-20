import { NextRequest, NextResponse } from 'next/server';
import { getSearch, updateSearchConfig } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// GET /api/searches/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const search = await getSearch(params.id);
    return NextResponse.json({ search });
  } catch (err: any) {
    console.error('Get search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/searches/[id] — update config
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { config } = await req.json();
    await updateSearchConfig(params.id, config);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Update search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
