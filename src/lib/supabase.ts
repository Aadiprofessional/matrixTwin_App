import { createClient } from '@supabase/supabase-js';
import { REACT_APP_SUPABASE_ANON_KEY, REACT_APP_SUPABASE_URL } from '@env';

const supabaseUrl = REACT_APP_SUPABASE_URL?.trim();
const supabaseAnonKey = REACT_APP_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration for MatrixTwinAPP.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
