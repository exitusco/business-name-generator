import { NextRequest, NextResponse } from 'next/server';
import { chooseResult, getSearch, updateProject, updateComponentStatus } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// POST /api/searches/[id]/choose — choose a name and domain
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { resultId, domain } = await req.json();

    if (!resultId) {
      return NextResponse.json({ error: 'resultId required' }, { status: 400 });
    }

    // Mark the result as chosen
    const result = await chooseResult(resultId, params.id);

    // Get the search to find the project
    const search = await getSearch(params.id);

    // Update the project with the chosen name and domain
    await updateProject(search.project_id, {
      chosen_name: result.name,
      chosen_domain: domain || null,
      name: result.name, // update project name to the chosen business name
    });

    // Mark the business_name component as complete
    await updateComponentStatus(search.project_id, 'business_name', 'complete', {
      chosen_name: result.name,
      chosen_domain: domain || null,
      search_id: params.id,
      result_id: resultId,
    });

    return NextResponse.json({ result, projectName: result.name });
  } catch (err: any) {
    console.error('Choose name error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
