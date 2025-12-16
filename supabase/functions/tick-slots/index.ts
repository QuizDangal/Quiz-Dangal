/// <reference path="../deno-edge.d.ts" />
// Tick Slots Edge Function: flips slot statuses based on current time.
// Scheduled to run every minute via Supabase cron.
// Transitions:
//   scheduled -> active  when start_timestamp <= now() AND status='scheduled'
//   active    -> finished when end_timestamp   <= now() AND status='active'
// Returns counts of changed rows.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE key');
  Deno.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default async function handler(_req: Request) {
  const start = Date.now();
  const now = new Date().toISOString();

  // Run both updates in parallel for speed
  const [res1, res2] = await Promise.all([
    // scheduled -> active
    supabase
      .from('quiz_slots')
      .update({ status: 'active' })
      .lte('start_timestamp', now)
      .eq('status', 'scheduled')
      .select('id'),
    // active -> finished
    supabase
      .from('quiz_slots')
      .update({ status: 'finished' })
      .lte('end_timestamp', now)
      .eq('status', 'active')
      .select('id'),
  ]);

  const activated = res1.data?.length ?? 0;
  const finished = res2.data?.length ?? 0;
  const errors = [res1.error?.message, res2.error?.message].filter(Boolean);

  const body = {
    ok: errors.length === 0,
    time: now,
    activated,
    finished,
    errors,
    durationMs: Date.now() - start,
  };

  return new Response(JSON.stringify(body), {
    status: errors.length ? 500 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Enable direct invoke for testing
if (import.meta.main) {
  handler(new Request('http://local/invoke')).then((r) =>
    r.text().then((t) => console.log(t))
  );
}
