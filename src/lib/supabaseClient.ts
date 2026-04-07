import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
        'Copy .env.example to .env and fill in your Supabase credentials.'
    );
}

export const supabase = createClient(
    supabaseUrl ?? '',
    supabaseAnonKey ?? ''
);

export const isSupabaseConfigured =
    Boolean(supabaseUrl) && Boolean(supabaseAnonKey);
