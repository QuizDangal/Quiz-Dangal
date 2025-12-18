const runtimeEnv =
  typeof window !== 'undefined' && window.__QUIZ_DANGAL_ENV__ ? window.__QUIZ_DANGAL_ENV__ : {};

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || runtimeEnv.SUPABASE_URL;

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  runtimeEnv.VITE_SUPABASE_ANON_KEY ||
  runtimeEnv.SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

// Lazy-loaded Supabase client (keeps initial bundle smaller for anonymous home page / mobile PSI).
export let supabase = null;

let initPromise = null;

export async function getSupabase() {
  if (!hasSupabaseConfig) return null;
  if (supabase) return supabase;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await import('@supabase/supabase-js');
    const createClient = mod?.createClient;
    if (typeof createClient !== 'function') return null;
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    return supabase;
  })();

  try {
    return await initPromise;
  } finally {
    // keep initPromise for dedupe; supabase becomes non-null after init
  }
}

// Optional: warm init without awaiting (best-effort)
export function warmSupabase() {
  void getSupabase();
}
