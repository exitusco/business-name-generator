import { NextRequest, NextResponse } from 'next/server';
import { saveSearchResults, getSearchResults, toggleSaveResult, updateResultDomainChecks } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// GET /api/searches/[id]/results — get all results for a search
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const results = await getSearchResults(params.id);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error('Get results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/searches/[id]/results — save a batch of results
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { results } = await req.json();
    const saved = await saveSearchResults(params.id, results);
    return NextResponse.json({ results: saved });
  } catch (err: any) {
    console.error('Save results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/searches/[id]/results — toggle save or update domain checks
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { resultId, action, isSaved, domainChecks } = await req.json();

    if (action === 'toggleSave' && resultId !== undefined) {
      await toggleSaveResult(resultId, isSaved);
      return NextResponse.json({ ok: true });
    }

    if (action === 'updateDomainChecks' && resultId && domainChecks) {
      await updateResultDomainChecks(resultId, domainChecks);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Patch results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
