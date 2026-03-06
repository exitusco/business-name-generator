import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Minimal database type definitions so TypeScript doesn't infer 'never'
interface Database {
  public: {
    Tables: {
      usage_events: {
        Row: {
          id: string;
          user_id: string | null;
          anonymous_id: string | null;
          metric: string;
          count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          metric: string;
          count?: number;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          anonymous_id?: string | null;
          metric?: string;
          count?: number;
        };
      };
      user_meta: {
        Row: {
          id: string;
          clerk_user_id: string | null;
          anonymous_id: string | null;
          first_seen_at: string;
          period_start: string;
          period_end: string;
          selected_model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id?: string | null;
          anonymous_id?: string | null;
          first_seen_at?: string;
          period_start?: string;
          period_end?: string;
          selected_model?: string | null;
        };
        Update: {
          clerk_user_id?: string | null;
          anonymous_id?: string | null;
          period_start?: string;
          period_end?: string;
          selected_model?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

let supabase: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
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
