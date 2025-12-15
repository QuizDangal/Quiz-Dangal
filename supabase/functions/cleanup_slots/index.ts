// Edge Function: cleanup_slots
// Deletes data older than 3 days by calling purge_old_slots(date)
// Schedule daily via external cron (e.g., GitHub Actions, Cloud Scheduler) hitting this endpoint.

/// <reference path="../deno-edge.d.ts" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'POST only'}), { status: 405 });
  }
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Missing Supabase env vars');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    const rpcRes = await fetch(`${url}/rest/v1/rpc/purge_old_slots`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_cutoff: cutoffStr })
    });
    const deleted = await rpcRes.json();
    return new Response(JSON.stringify({ ok: true, cutoff: cutoffStr, deleted }), { headers:{'content-type':'application/json'} });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok:false, error: msg }), { status: 500, headers:{'content-type':'application/json'} });
  }
});
