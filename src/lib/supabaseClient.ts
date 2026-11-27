import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://raeydbmvlzacilshsnbj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_e0RRULsyOQAJPe6_LRZ7YA_iPEzadx-';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Validates whether the developer has configured valid Supabase credentials
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('seu-projeto')
);

// Fallback placeholder URL and key to avoid runtime crashes during initialization if unconfigured
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

if (!isSupabaseConfigured) {
  console.info(
    '%c[BiblIA Supabase]%c Modo local offline ativo (sem credenciais de nuvem configuradas).',
    'color: #2d7a7c; font-weight: bold;',
    'color: inherit;'
  );
}
