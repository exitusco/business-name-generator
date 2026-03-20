import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSearch, getMostRecentSearch } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// POST /api/searches — create a new search
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const anonymousId = req.cookies.get('nc_anon_id')?.value || null;
    const { projectId, config } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }

    const search = await createSearch(projectId, userId, anonymousId, config || {});
    return NextResponse.json({ search });
  } catch (err: any) {
    console.error('Create search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/searches?recent=true&projectId=xxx — get most recent search
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const anonymousId = req.cookies.get('nc_anon_id')?.value || null;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const search = await getMostRecentSearch(userId, anonymousId, projectId);
    return NextResponse.json({ search });
  } catch (err: any) {
    console.error('Get recent search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
