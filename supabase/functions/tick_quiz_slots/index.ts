// Edge Function: tick_quiz_slots
// Runs every minute (invoke via external cron) to activate upcoming slots or send notifications
// NOTE: This is a skeleton; fill in push/activation logic when participant & notification tables exist.

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
    const now = new Date();
    const isoMinuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0).toISOString();
    // Fetch slots starting in this minute window (start_timestamp_utc == current minute)
    const res = await fetch(`${url}/rest/v1/quiz_slots?select=id,category,start_timestamp,quiz_title&start_timestamp=eq.${isoMinuteStart}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const slots = await res.json();
    // Placeholder: log; real logic could enqueue notifications, mark status, etc.
    return new Response(JSON.stringify({ ok: true, count: slots.length, minute: isoMinuteStart }), { headers:{'content-type':'application/json'} });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok:false, error: msg }), { status: 500, headers:{'content-type':'application/json'} });
  }
});
