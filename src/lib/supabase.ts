import { createClient } from '@supabase/supabase-js';
import { REACT_APP_SUPABASE_ANON_KEY, REACT_APP_SUPABASE_URL } from '@env';

const supabaseUrl = REACT_APP_SUPABASE_URL?.trim();
const supabaseAnonKey = REACT_APP_SUPABASE_ANON_KEY?.trim();

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      })
    : null;

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
};
