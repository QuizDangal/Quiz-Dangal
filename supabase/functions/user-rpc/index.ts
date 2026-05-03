// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type UserRpcBody = {
  action?: string;
  params?: Record<string, unknown>;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE') ?? '';
const DEFAULT_ORIGINS = 'https://quizdangal.com,http://localhost:5173,http://localhost:5174';
const ALLOWED_ORIGINS = (
  Deno.env.get('ALLOWED_ORIGINS') ??
  Deno.env.get('ALLOWED_ORIGIN') ??
  DEFAULT_ORIGINS
)
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

function makeCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const isLocal = origin.startsWith('http://localhost');
  const allowed =
    ALLOWED_ORIGINS.includes('*') ||
    ALLOWED_ORIGINS.includes(origin) ||
    (isLocal && ALLOWED_ORIGINS.some((value) => value.startsWith('http://localhost')));
  return {
    'Access-Control-Allow-Origin': allowed
      ? origin
      : (ALLOWED_ORIGINS[0] ?? 'https://quizdangal.com'),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function getUser(authHeader: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY)
    return { ok: false as const, status: 500, error: 'server_not_configured' };
  if (!authHeader) return { ok: false as const, status: 401, error: 'missing_authorization' };

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return { ok: false as const, status: 401, error: 'missing_token' };

  // Single service role client handles both JWT verification and DB queries.
  // Pass JWT explicitly - supabase-js v2's getUser() does not reliably read it
  // from a globally-set Authorization header.
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await serviceClient.auth.getUser(jwt);
  if (error || !data?.user?.id)
    return { ok: false as const, status: 401, error: error?.message || 'unauthorized' };

  return { ok: true as const, user: data.user, serviceClient };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = makeCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, corsHeaders);

  try {
    const auth = await getUser(req.headers.get('Authorization') ?? '');
    if (!auth.ok) return json({ error: auth.error }, auth.status, corsHeaders);

    const body = (await req.json().catch(() => ({}))) as UserRpcBody;
    const action = String(body.action || '');
    const params = body.params && typeof body.params === 'object' ? body.params : {};

    if (action === 'isUsernameAvailable') {
      const username = String(params.p_username ?? params.username ?? '').trim();
      const exclude = String(params.p_exclude ?? params.exclude ?? auth.user.id);
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
        return json({ ok: true, data: false }, 200, corsHeaders);
      if (exclude !== auth.user.id) return json({ error: 'invalid_exclude' }, 403, corsHeaders);
      const { data, error } = await auth.serviceClient
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .neq('id', auth.user.id)
        .limit(1);
      if (error) throw error;
      return json({ ok: true, data: !data?.length }, 200, corsHeaders);
    }

    if (action === 'handleReferralBonus') {
      const referralCode = String(params.referrer_code ?? params.referralCode ?? '').trim();
      if (!referralCode)
        return json({ ok: true, data: { ok: false, reason: 'empty_code' } }, 200, corsHeaders);
      const { data, error } = await auth.serviceClient.rpc('handle_referral_bonus', {
        referred_user_uuid: auth.user.id,
        referrer_code: referralCode,
      });
      if (error) throw error;
      return json({ ok: true, data }, 200, corsHeaders);
    }

    if (action === 'redeemFromCatalogWithDetails') {
      const catalogId = String(params.p_catalog_id ?? params.catalogId ?? '').trim();
      const payoutIdentifier = String(
        params.p_payout_identifier ?? params.payoutIdentifier ?? '',
      ).trim();
      const payoutChannel = String(params.p_payout_channel ?? params.payoutChannel ?? 'upi')
        .trim()
        .toLowerCase();
      if (!catalogId) return json({ error: 'missing_catalog_id' }, 400, corsHeaders);
      if (!payoutIdentifier) return json({ error: 'missing_payout_identifier' }, 400, corsHeaders);
      const { data, error } = await auth.serviceClient.rpc('redeem_from_catalog_service', {
        p_user_id: auth.user.id,
        p_catalog_id: catalogId,
        p_payout_identifier: payoutIdentifier,
        p_payout_channel: payoutChannel,
      });
      if (error) throw error;
      return json({ ok: true, data }, 200, corsHeaders);
    }

    return json({ error: 'invalid_action' }, 400, corsHeaders);
  } catch (error) {
    console.error('user-rpc error', error instanceof Error ? error.message : String(error));
    return json({ error: 'internal_error' }, 500, corsHeaders);
  }
});
