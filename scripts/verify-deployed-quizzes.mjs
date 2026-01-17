#!/usr/bin/env node
// ============================================================
// Verify deployed quiz slots in Supabase backend
//
// Usage:
//   node ./scripts/verify-deployed-quizzes.mjs --dates=2026-01-16,2026-01-17,2026-01-18,2026-01-19
//   node ./scripts/verify-deployed-quizzes.mjs --date=2026-01-16
//   node ./scripts/verify-deployed-quizzes.mjs --all
//
// Checks:
// - Slot count per category per date
// - Question count per slot
// - Title sanity (not empty, bilingual format)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

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

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

const CATEGORIES = ['gk', 'sports', 'movies', 'opinion'];
const EXPECTED_SLOTS = 144;
const EXPECTED_QUESTIONS = 10;

async function main() {
  const env = loadEnv();
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL in .env or .env.local');
    process.exit(2);
  }

  let dates = [];

  const datesArg = getArg('dates');
  const singleDate = getArg('date');
  const showAll = hasFlag('all');

  if (datesArg) {
    dates = datesArg.split(',').map((d) => d.trim()).filter(Boolean);
  } else if (singleDate) {
    dates = [singleDate];
  } else if (showAll) {
    // Will query distinct dates from DB
  } else {
    console.error('Provide --date=YYYY-MM-DD, --dates=..., or --all');
    process.exit(2);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // If --all, get distinct dates
    if (showAll && dates.length === 0) {
      const res = await client.query(
        `SELECT DISTINCT target_date FROM public.quiz_slots ORDER BY target_date`
      );
      dates = res.rows.map((r) => r.target_date.toISOString().slice(0, 10));
    }

    if (dates.length === 0) {
      console.log('No dates found in quiz_slots.');
      return;
    }

    console.log(`\n📊 Verifying ${dates.length} date(s): ${dates.join(', ')}\n`);

    let totalSlots = 0;
    let totalIssues = 0;

    for (const date of dates) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📅 ${date}`);

      for (const cat of CATEGORIES) {
        // Count slots
        const countRes = await client.query(
          `SELECT COUNT(*) as cnt FROM public.quiz_slots WHERE target_date = $1 AND category = $2`,
          [date, cat]
        );
        const slotCount = parseInt(countRes.rows[0].cnt, 10);
        totalSlots += slotCount;

        // Check questions per slot (sample)
        const sampleRes = await client.query(
          `SELECT id, quiz_title, questions FROM public.quiz_slots
           WHERE target_date = $1 AND category = $2
           ORDER BY slot_time
           LIMIT 5`,
          [date, cat]
        );

        let issues = [];

        if (slotCount !== EXPECTED_SLOTS) {
          issues.push(`expected ${EXPECTED_SLOTS} slots, found ${slotCount}`);
        }

        for (const row of sampleRes.rows) {
          const title = row.quiz_title || '';
          const questions = row.questions || [];

          if (!title.trim()) {
            issues.push(`slot ${row.id}: empty title`);
          } else if (!title.includes(' / ')) {
            issues.push(`slot ${row.id}: title not bilingual`);
          }

          if (questions.length !== EXPECTED_QUESTIONS) {
            issues.push(`slot ${row.id}: expected ${EXPECTED_QUESTIONS} questions, found ${questions.length}`);
          }
        }

        const status = issues.length === 0 ? '✅' : '⚠️';
        console.log(`  ${status} ${cat.toUpperCase().padEnd(8)} : ${slotCount} slots`);
        
        if (issues.length > 0) {
          totalIssues += issues.length;
          for (const issue of issues.slice(0, 3)) {
            console.log(`     ↳ ${issue}`);
          }
          if (issues.length > 3) {
            console.log(`     ↳ ...and ${issues.length - 3} more issues`);
          }
        }
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 SUMMARY`);
    console.log(`   Total slots: ${totalSlots}`);
    console.log(`   Total issues: ${totalIssues}`);
    
    if (totalIssues === 0) {
      console.log(`\n🎉 All checks passed!`);
    } else {
      console.log(`\n⚠️  Some issues found. Review above.`);
      process.exitCode = 1;
    }

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
