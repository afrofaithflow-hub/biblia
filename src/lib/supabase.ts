// Supabase client configuration
// If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided in .env, connects directly.
// Otherwise, uses the built-in Sandbox Provider.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sandbox.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key-biblia';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
};
