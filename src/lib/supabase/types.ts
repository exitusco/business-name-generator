// Database types for usage tracking

export interface UsageRecord {
  id: string;
  user_id: string;          // Clerk user ID, or anonymous session ID
  metric: 'generation' | 'domain_check' | 'saved_name';
  count: number;            // how many in this event (e.g. 10 names generated = 10)
  created_at: string;
}

export interface UserMeta {
  id: string;
  clerk_user_id: string | null;   // null for anonymous
  anonymous_id: string | null;    // session-based ID for anonymous users
  first_seen_at: string;
  period_start: string;           // billing period start (from Clerk subscription or calculated)
  period_end: string;             // billing period end
  selected_model: string | null;  // user-level model preference
  created_at: string;
  updated_at: string;
}

// Usage limits per tier (for future gating)
export interface UsageLimits {
  generations_per_period: number | null;   // null = unlimited
  domain_checks_per_period: number | null;
  saved_names_per_period: number | null;
}

export const USAGE_LIMITS: Record<string, UsageLimits> = {
  anonymous: { generations_per_period: 20, domain_checks_per_period: null, saved_names_per_period: 10 },
  free: { generations_per_period: 100, domain_checks_per_period: null, saved_names_per_period: 50 },
  pro: { generations_per_period: 1000, domain_checks_per_period: null, saved_names_per_period: null },
};
