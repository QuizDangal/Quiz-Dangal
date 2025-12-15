/// <reference path="../deno-edge.d.ts" />
// Tick Slots Edge Function: flips slot statuses based on current time.
// Scheduled to run every minute via Supabase cron.
// Transitions:
//   scheduled -> active  when start_timestamp <= now() AND status='scheduled'
//   active    -> finished when end_timestamp   <= now() AND status='active'
// Returns counts of changed rows.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.log('Missing SUPABASE_URL or SERVICE_ROLE key');
  Deno.exit(1);
}
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

function isoNow() { return new Date().toISOString(); }

export default async function handler(req: Request) {
  const now = isoNow();
  const client = supabase; // reuse
  // Use RPC via SQL if needed; direct update with PostgREST filters.
  // First: scheduled -> active
  const { error: err1 } = await client
    .from('quiz_slots')
    .update({ status: 'active' })
    .lte('start_timestamp', now)
    .eq('status', 'scheduled');
  // Second: active -> finished
  const { error: err2 } = await client
    .from('quiz_slots')
    .update({ status: 'finished' })
    .lte('end_timestamp', now)
    .eq('status', 'active');

  // We cannot get affected row counts directly via supabase-js update; fetch counts separately.
  // @ts-ignore - Deno runtime handles this correctly
  const { count: activeCount } = await client
    .from('quiz_slots')
    .select('id', { head: true, count: 'exact' })
    .eq('status', 'active');
  // @ts-ignore - Deno runtime handles this correctly
  const { count: finishedCount } = await client
    .from('quiz_slots')
    .select('id', { head: true, count: 'exact' })
    .eq('status', 'finished');

  const body = {
    ok: true,
    time: now,
    errors: [err1?.message, err2?.message].filter(Boolean),
    active_now: activeCount,
    finished_now: finishedCount,
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}

// Enable invoke (GET for simple check)
if (import.meta.main) {
  handler(new Request('http://local/invoke')).then(r => r.text().then(t => console.log(t)));
}
