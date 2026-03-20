import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createProject, listProjects } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// GET /api/projects — list all projects for current user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const anonymousId = req.cookies.get('nc_anon_id')?.value || null;
    const projects = await listProjects(userId, anonymousId);
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error('List projects error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const anonymousId = req.cookies.get('nc_anon_id')?.value || null;
    const { name } = await req.json().catch(() => ({ name: 'Untitled Project' }));
    const project = await createProject(userId, anonymousId, name);
    return NextResponse.json({ project });
  } catch (err: any) {
    console.error('Create project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
