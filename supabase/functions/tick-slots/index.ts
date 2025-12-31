/// <reference path="../deno-edge.d.ts" />
// Tick Slots Edge Function: Updates slot and quiz statuses based on current time.
// Scheduled to run every minute via Supabase cron.
//
// FLOW (handled by tick_quiz_slots() database function):
//   1. Create quizzes + copy questions 5 minutes before start
//   2. Activate slots when start_timestamp is reached  
//   3. Finish slots when end_timestamp is passed
//   4. Auto-delete old quizzes (4 days old)

import { createClient } from 'jsr:@supabase/supabase-js@2';

function isAuthorizedCron(req: Request, serviceRoleKey: string | null): boolean {
  // Prefer a dedicated cron secret if configured.
  const cronSecret = Deno.env.get('CRON_SECRET') || Deno.env.get('EDGE_CRON_SECRET') || '';
  const authHeader = req.headers.get('Authorization') || '';
  const apiKeyHeader = req.headers.get('apikey') || req.headers.get('x-api-key') || '';
  const cronHeader = req.headers.get('x-cron-secret') || '';

  const normalizeBearer = (v: string) => v.replace(/^Bearer\s+/i, '').trim();
  const authToken = normalizeBearer(authHeader);

  if (cronSecret) {
    return authToken === cronSecret || cronHeader === cronSecret;
  }

  // Backward-compatible option: allow callers to authenticate using the service role key
  // WARNING: Set CRON_SECRET env var in production to avoid using service-role key for HTTP auth
  if (!serviceRoleKey) return false;
  return authToken === serviceRoleKey || apiKeyHeader === serviceRoleKey;
}

// Cron-only endpoints should not need browser CORS, but we allow internal/localhost for testing
const CRON_ALLOWED_ORIGINS = (Deno.env.get('CRON_ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function makeCronCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  // Only allow explicitly configured origins, or none if not configured
  const allowOrigin = CRON_ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req: Request) => {
  // Get dynamic CORS headers for this request
  const dynamicCors = makeCronCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCors });
  }

  const start = Date.now();

  // Correlation id to match client failures with server logs
  const errorId = (() => {
    try {
      return crypto.randomUUID();
    } catch {
      return String(Date.now());
    }
  })();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // This function performs privileged maintenance via service-role key.
    // It must not be callable by the public internet.
    if (!isAuthorizedCron(req, serviceRoleKey ?? null)) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized', errorId }), {
        status: 401,
        headers: { ...dynamicCors, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Call the database function that handles all the logic
    const { data, error } = await supabase.rpc('tick_quiz_slots');

    if (error) {
      console.error('tick_quiz_slots error', { errorId, error });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: 'internal_error',
          errorId,
          durationMs: Date.now() - start
        }),
        { 
          status: 500, 
          headers: { ...dynamicCors, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('tick_quiz_slots result:', data);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        ...data,
        durationMs: Date.now() - start
      }),
      { 
        headers: { ...dynamicCors, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    console.error('tick-slots error', { errorId, error: err });
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error', errorId, durationMs: Date.now() - start }),
      { 
        status: 500, 
        headers: { ...dynamicCors, 'Content-Type': 'application/json' } 
      }
    );
  }
});

