import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using service role key
// Only use this in API routes / server-side code — never expose to client
let supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  return supabase;
}
