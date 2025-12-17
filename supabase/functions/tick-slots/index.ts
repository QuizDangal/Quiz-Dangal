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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (err) {
    console.error('tick-slots error', { errorId, error: err });
    return new Response(
      JSON.stringify({ ok: false, error: 'internal_error', errorId, durationMs: Date.now() - start }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

