import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using secret key (replaces service_role)
// Only use this in API routes / server-side code — never expose to client
let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables');
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabase;
}
