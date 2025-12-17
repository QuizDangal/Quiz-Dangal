// Edge Function: cleanup_slots
// Deletes data older than configurable days (default 3) by calling purge_old_slots(date)
// Schedule daily via external cron (e.g., GitHub Actions, Cloud Scheduler) hitting this endpoint.

/// <reference path="../deno-edge.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RETENTION_DAYS = parseInt(Deno.env.get('CLEANUP_RETENTION_DAYS') || '3', 10);

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE key');
  Deno.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  // Allow both GET and POST for flexibility
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ ok: false, error: 'GET or POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
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
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data: deleted, error } = await supabase.rpc('purge_old_slots', {
      p_cutoff: cutoffStr,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        cutoff: cutoffStr,
        retentionDays: RETENTION_DAYS,
        deleted,
        durationMs: Date.now() - start,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: unknown) {
    // Do not leak stack traces or internal error details to the caller.
    console.error('cleanup_slots error', { errorId, error: e });
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error', errorId, durationMs: Date.now() - start }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
