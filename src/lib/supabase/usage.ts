import { getSupabase } from './server';

type Metric = 'generation' | 'domain_check' | 'saved_name';

/**
 * Record a usage event
 */
export async function trackUsage(
  userId: string | null,
  anonymousId: string | null,
  metric: Metric,
  count: number = 1
) {
  const supabase = getSupabase();
  const identifier = userId || anonymousId;
  if (!identifier) return;

  const { error } = await supabase.from('usage_events' as any).insert({
    user_id: userId,
    anonymous_id: anonymousId,
    metric,
    count,
  });

  if (error) console.error('Failed to track usage:', error);
}

/**
 * Get usage for a user in their current billing period
 */
export async function getUsage(
  userId: string | null,
  anonymousId: string | null,
  periodStart: string
): Promise<Record<Metric, number>> {
  const supabase = getSupabase();

  let query = supabase
    .from('usage_events')
    .select('metric, count')
    .gte('created_at', periodStart);

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    return { generation: 0, domain_check: 0, saved_name: 0 };
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get usage:', error);
    return { generation: 0, domain_check: 0, saved_name: 0 };
  }

  const totals: Record<Metric, number> = { generation: 0, domain_check: 0, saved_name: 0 };
  for (const row of data || []) {
    if (row.metric in totals) {
      totals[row.metric as Metric] += row.count;
    }
  }

  return totals;
}

/**
 * Ensure a user_meta record exists, return it
 */
export async function ensureUserMeta(
  userId: string | null,
  anonymousId: string | null
): Promise<{ period_start: string; period_end: string; selected_model: string | null; [key: string]: any } | null> {
  const supabase = getSupabase();

  // Try to find existing
  let query = supabase.from('user_meta' as any).select('*');
  if (userId) {
    query = query.eq('clerk_user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    return null;
  }

  const { data: existing } = await query.maybeSingle();
  if (existing) return existing as any;

  // Create new
  const now = new Date().toISOString();
  const periodStart = new Date();
  periodStart.setDate(1); // first of current month
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: created, error } = await supabase.from('user_meta' as any).insert({
    clerk_user_id: userId,
    anonymous_id: anonymousId,
    first_seen_at: now,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  }).select().single();

  if (error) console.error('Failed to create user_meta:', error);
  return created as any;
}
