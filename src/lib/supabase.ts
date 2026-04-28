import { createClient } from '@supabase/supabase-js';
import { REACT_APP_SUPABASE_ANON_KEY, REACT_APP_SUPABASE_URL } from '@env';

let cachedSupabaseClient: ReturnType<typeof createClient> | null = null;

const initializeSupabaseClient = () => {
  if (cachedSupabaseClient) return cachedSupabaseClient;

  try {
    const supabaseUrl = REACT_APP_SUPABASE_URL?.trim();
    const supabaseAnonKey = REACT_APP_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found. Using null client.');
      return null;
    }

    cachedSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

    return cachedSupabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
};

export const supabase = initializeSupabaseClient();

export const getSupabaseClient = () => {
  const client = initializeSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }
  return client;
};
