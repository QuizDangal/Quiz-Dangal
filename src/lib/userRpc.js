import { supabase } from '@/lib/customSupabaseClient';

export async function callUserRpc(action, params = {}) {
  if (!supabase) throw new Error('No Supabase client');

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Authentication required');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const fnUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/user-rpc` : '/functions/v1/user-rpc';

  const response = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, params }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    throw new Error(body?.error || `User RPC failed (${response.status})`);
  }
  return body?.data ?? null;
}
