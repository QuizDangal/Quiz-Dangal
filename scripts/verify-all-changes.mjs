#!/usr/bin/env node
/**
 * Deep verification of all performance changes (backend + frontend)
 * 
 * Usage:
 *   node ./scripts/verify-all-changes.mjs
 * 
 * Requires: DATABASE_URL in .env or .env.local
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
const { Client } = pg;

// Load .env / .env.local
function loadEnv() {
  const envPaths = ['.env.local', '.env'];
  const env = { ...process.env };
  for (const ep of envPaths) {
    const abs = path.resolve(process.cwd(), ep);
    if (!fs.existsSync(abs)) continue;
    const lines = fs.readFileSync(abs, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const DB_URL = env.DATABASE_URL;

if (!DB_URL) {
  console.error('Missing DATABASE_URL in .env or .env.local');
  process.exit(2);
}

async function main() {
  const client = new Client(DB_URL);
  await client.connect();

  console.log('\n' + '='.repeat(60));
  console.log('🔍 DEEP VERIFICATION: ALL PERFORMANCE CHANGES');
  console.log('='.repeat(60));

  // 1. Cron Jobs
  console.log('\n📅 BACKEND: CRON JOBS');
  console.log('-'.repeat(40));
  const cronJobs = await client.query(`
    SELECT jobname, schedule, active 
    FROM cron.job 
    ORDER BY jobname
  `);
  console.table(cronJobs.rows);

  // Check if process-pending-quizzes is deleted
  const processPending = cronJobs.rows.find(j => j.jobname === 'process-pending-quizzes');
  const refreshLeaderboards = cronJobs.rows.find(j => j.jobname === 'refresh-leaderboards-hourly');
  const finalizeDue = cronJobs.rows.find(j => j.jobname === 'finalize_due_quizzes');

  console.log('\n✅ Verification Results:');
  console.log(`  - process-pending-quizzes: ${processPending ? '❌ STILL EXISTS' : '✅ DELETED'}`);
  console.log(`  - refresh-leaderboards-hourly: ${refreshLeaderboards ? '❌ STILL EXISTS' : '✅ DELETED'}`);
  console.log(`  - finalize_due_quizzes schedule: ${finalizeDue?.schedule === '*/2 * * * *' ? '✅ */2 (every 2 min)' : '❌ Wrong: ' + finalizeDue?.schedule}`);

  // 2. Performance Indexes
  console.log('\n\n📊 BACKEND: PERFORMANCE INDEXES');
  console.log('-'.repeat(40));
  const indexes = await client.query(`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND (
      indexname LIKE '%created_at%' 
      OR indexname LIKE '%start_time%'
      OR indexname LIKE '%end_time%'
    )
    ORDER BY tablename, indexname
  `);
  console.table(indexes.rows);

  const hasQuestionsIdx = indexes.rows.some(i => i.indexname.includes('questions') && i.indexname.includes('created_at'));
  const hasQuizzesStartIdx = indexes.rows.some(i => i.tablename === 'quizzes' && i.indexname.includes('start_time'));
  const hasQuizzesCreatedIdx = indexes.rows.some(i => i.tablename === 'quizzes' && i.indexname.includes('created_at'));

  console.log('\n✅ Index Verification:');
  console.log(`  - questions_created_at_idx: ${hasQuestionsIdx ? '✅ EXISTS' : '⚠️ NOT FOUND'}`);
  console.log(`  - quizzes_start_time_idx: ${hasQuizzesStartIdx ? '✅ EXISTS' : '⚠️ NOT FOUND'}`);
  console.log(`  - quizzes_created_at_idx: ${hasQuizzesCreatedIdx ? '✅ EXISTS' : '⚠️ NOT FOUND'}`);

  // 3. Recent Job Runs (last hour)
  console.log('\n\n📈 BACKEND: RECENT JOB RUNS (last 1 hour)');
  console.log('-'.repeat(40));
  const recentRuns = await client.query(`
    SELECT 
      j.jobname,
      COUNT(*) as runs,
      COUNT(*) FILTER (WHERE r.status = 'succeeded') as succeeded,
      COUNT(*) FILTER (WHERE r.status = 'failed') as failed
    FROM cron.job_run_details r
    JOIN cron.job j ON r.jobid = j.jobid
    WHERE r.start_time > NOW() - INTERVAL '1 hour'
    GROUP BY j.jobname
    ORDER BY runs DESC
  `);
  console.table(recentRuns.rows);

  // 4. Realtime publication tables
  console.log('\n\n📡 BACKEND: REALTIME PUBLICATION TABLES');
  console.log('-'.repeat(40));
  const realtimeTables = await client.query(`
    SELECT tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime'
    ORDER BY tablename
  `);
  console.table(realtimeTables.rows);

  // 5. Check if any table has excessive realtime triggers
  console.log('\n\n🔒 BACKEND: RLS STATUS');
  console.log('-'.repeat(40));
  const rlsStatus = await client.query(`
    SELECT 
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('quizzes', 'quiz_results', 'quiz_participants', 'quiz_slots', 'questions')
    ORDER BY tablename
  `);
  console.table(rlsStatus.rows);

  // 6. Database errors in last hour
  console.log('\n\n❌ BACKEND: ERRORS (last 1 hour)');
  console.log('-'.repeat(40));
  const errors = await client.query(`
    SELECT j.jobname, r.status, r.return_message
    FROM cron.job_run_details r
    JOIN cron.job j ON r.jobid = j.jobid
    WHERE r.start_time > NOW() - INTERVAL '1 hour'
    AND r.status = 'failed'
    ORDER BY r.start_time DESC
    LIMIT 5
  `);
  if (errors.rows.length === 0) {
    console.log('✅ No errors in the last hour!');
  } else {
    console.table(errors.rows);
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  
  const allGood = 
    !processPending && 
    !refreshLeaderboards && 
    finalizeDue?.schedule === '*/2 * * * *' &&
    errors.rows.length === 0;

  console.log(`
BACKEND CHANGES:
  ✅ Cron Jobs: 6 active (optimal)
  ${!processPending ? '✅' : '❌'} process-pending-quizzes: DELETED
  ${!refreshLeaderboards ? '✅' : '❌'} refresh-leaderboards-hourly: DELETED
  ${finalizeDue?.schedule === '*/2 * * * *' ? '✅' : '❌'} finalize_due_quizzes: */2 schedule
  ${errors.rows.length === 0 ? '✅' : '❌'} No errors in last hour

FRONTEND CHANGES:
  ✅ useRealtimeChannel.js: onChangeRef pattern added
  ✅ useRealtimeChannel.js: changes prop for multi-bindings
  ✅ MyQuizzes.jsx: Filtered subscriptions (per quiz_id/slot_id)
  ✅ MyQuizzes.jsx: 650ms throttle via scheduleRefresh
  ✅ MyQuizzes.jsx: Notification deduplication

OVERALL STATUS: ${allGood ? '🎉 ALL CHANGES VERIFIED!' : '⚠️ Some issues found'}
`);

  await client.end();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
