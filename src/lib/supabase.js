import { createClient } from '@supabase/supabase-js';

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lkhlfspdhsikfdwfxcgb.supabase.co';
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraGxmc3BkaHNpa2Zkd2Z4Y2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5ODUzNDYsImV4cCI6MjEwNTU2MTM0Nn0.xR-NyrBGuM3QhHIV4-amuU2mG5DLKa7VBtT4omDI3qM';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    !supabaseUrl.includes('placeholder') &&
    supabaseAnonKey &&
    !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
