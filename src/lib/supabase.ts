import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Only the publishable (anon) key may ship to the browser. Every table needs
// row-level security enabled. The service-role key must never be in this repo.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseStatus: string = supabase
  ? 'Supabase: connected'
  : 'Supabase: not configured (no anon key at build time)';
