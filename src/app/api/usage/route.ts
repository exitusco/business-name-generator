import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUsage, ensureUserMeta } from '@/lib/supabase/usage';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const anonymousId = req.cookies.get('nc_anon_id')?.value || null;

    if (!userId && !anonymousId) {
      return NextResponse.json({ usage: { generation: 0, domain_check: 0, saved_name: 0 }, limits: null, periodStart: null, periodEnd: null });
    }

    const meta = await ensureUserMeta(userId, anonymousId);
    const periodStart = meta?.period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const periodEnd = meta?.period_end || null;

    const usage = await getUsage(userId, anonymousId, periodStart);

    return NextResponse.json({ usage, periodStart, periodEnd });
  } catch (err) {
    console.error('Usage API error:', err);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
