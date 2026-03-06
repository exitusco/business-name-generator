import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Server-side Supabase client using secret key
let supabase: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables');
  }

  supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });

  return supabase;
}
