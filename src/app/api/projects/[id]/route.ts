import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = await getProject(params.id);
    return NextResponse.json({ project });
  } catch (err: any) {
    console.error('Get project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await req.json();
    const project = await updateProject(params.id, updates);
    return NextResponse.json({ project });
  } catch (err: any) {
    console.error('Update project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
