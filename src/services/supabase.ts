import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Reject missing or placeholder values (prevents crash when .env has defaults)
  if (!supabaseUrl || !supabaseAnonKey ||
      supabaseUrl.startsWith('your_') || supabaseAnonKey.startsWith('your_') ||
      !supabaseUrl.startsWith('https://')) {
    console.warn('Supabase credentials not configured. Cloud features (sessions, notes) will be disabled.');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn('Failed to initialize Supabase:', e);
    return null;
  }
  return supabaseInstance;
};

export const supabase = getSupabase();
