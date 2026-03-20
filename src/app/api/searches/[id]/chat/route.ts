import { NextRequest, NextResponse } from 'next/server';
import { saveChatMessage, getChatMessages } from '@/lib/supabase/projects';

export const dynamic = 'force-dynamic';

// GET /api/searches/[id]/chat — get all chat messages
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messages = await getChatMessages(params.id);
    return NextResponse.json({ messages });
  } catch (err: any) {
    console.error('Get chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/searches/[id]/chat — save a chat message
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const message = await req.json();
    const saved = await saveChatMessage(params.id, message);
    return NextResponse.json({ message: saved });
  } catch (err: any) {
    console.error('Save chat error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
