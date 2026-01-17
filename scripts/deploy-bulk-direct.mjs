#!/usr/bin/env node
// ============================================================
// Deploy bulk quiz JSON DIRECTLY to Supabase PostgreSQL
// Bypasses RPC is_admin() check by using DATABASE_URL with psql
//
// Usage:
//   node ./scripts/deploy-bulk-direct.mjs --date=2026-01-16 --all
//   node ./scripts/deploy-bulk-direct.mjs --date=2026-01-16 --category=gk
//   node ./scripts/deploy-bulk-direct.mjs --date=2026-01-16 --all --dry=1
//
// Requires: DATABASE_URL in .env or .env.local
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

// -------------------- Helpers --------------------
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

// -------------------- Quiz slot times (00:00 - 23:50, every 10 min) --------------------
function generateDaySchedule() {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 10) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    }
  }
  return times; // 144 slots
}

const PRIZES = [121, 71, 51];
const CATEGORIES = ['gk', 'sports', 'movies', 'opinion'];

// -------------------- Main --------------------
async function main() {
  const env = loadEnv();
  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('Missing DATABASE_URL in .env or .env.local');
    process.exit(2);
  }

  const targetDate = getArg('date');
  const singleCategory = getArg('category');
  const deployAll = hasFlag('all');
  const dry = getArg('dry') === '1';

  if (!targetDate) {
    console.error('--date=YYYY-MM-DD is required');
    process.exit(2);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error('--date must be YYYY-MM-DD format');
    process.exit(2);
  }

  // Determine which files to deploy
  const bulkDir = path.join(process.cwd(), 'bulk');
  let filesToDeploy = [];

  const daySuffix = String(parseInt(targetDate.split('-')[2], 10));

  if (deployAll) {
    for (const cat of CATEGORIES) {
      const fileName = `${cat}_144_bilingual_${daySuffix}.json`;
      const fullPath = path.join(bulkDir, fileName);
      if (fs.existsSync(fullPath)) {
        filesToDeploy.push({ file: fullPath, category: cat });
      }
    }
  } else if (singleCategory) {
    const fileName = `${singleCategory}_144_bilingual_${daySuffix}.json`;
    const fullPath = path.join(bulkDir, fileName);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(2);
    }
    filesToDeploy.push({ file: fullPath, category: singleCategory });
  } else {
    console.error('Provide --category=... or --all');
    process.exit(2);
  }

  if (filesToDeploy.length === 0) {
    console.error('No matching bulk files found for this date.');
    process.exit(2);
  }

  console.log(`Target date: ${targetDate}`);
  console.log(`Files to deploy: ${filesToDeploy.length}`);
  if (dry) console.log('(DRY RUN - no actual deployment)');

  const autoTimes = generateDaySchedule();

  // Connect to PostgreSQL
  const client = new Client({ connectionString: databaseUrl });
  
  if (!dry) {
    await client.connect();
    console.log('Connected to database.');
  }

  try {
    for (const { file, category } of filesToDeploy) {
      const raw = fs.readFileSync(file, 'utf8');
      const quizzes = JSON.parse(raw);

      if (!Array.isArray(quizzes)) {
        console.error(`Expected array in ${file}`);
        process.exit(2);
      }

      if (quizzes.length > 144) {
        console.error(`Too many quizzes in ${file}: ${quizzes.length} (max 144)`);
        process.exit(2);
      }

      console.log(`\n📦 ${category.toUpperCase()}: ${path.basename(file)} (${quizzes.length} quizzes)`);

      if (dry) {
        console.log(`  [dry] Would insert ${quizzes.length} slots for ${category} on ${targetDate}`);
        continue;
      }

      // Start transaction
      await client.query('BEGIN');

      try {
        // Create or update batch record
        const batchResult = await client.query(
          `INSERT INTO public.quiz_day_batches(target_date, category, seed_source)
           VALUES ($1, $2, 'bulk')
           ON CONFLICT (target_date, category) DO UPDATE SET status='reseeded', updated_at = now()
           RETURNING id`,
          [targetDate, category]
        );
        const batchId = batchResult.rows[0].id;

        // Clear existing slots for this date/category
        await client.query(
          `DELETE FROM public.quiz_slots WHERE target_date = $1 AND category = $2`,
          [targetDate, category]
        );

        // Insert new slots
        let inserted = 0;
        for (let i = 0; i < quizzes.length; i++) {
          const qz = quizzes[i];
          const slotTime = autoTimes[i];
          const title = String(qz.title || `Quiz ${i + 1}`).trim();

          const questionsJson = (qz.questions || []).map((qq) => ({
            question_text: String(qq.question_text || '').trim(),
            options: (qq.options || []).slice(0, 4).map((op) => ({
              option_text: String(op.option_text || '').trim(),
              is_correct: category === 'opinion' ? false : !!op.is_correct,
            })),
          }));

          await client.query(
            `INSERT INTO public.quiz_slots(
               batch_id, category, target_date, slot_time, quiz_title, prizes, questions, status
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled')`,
            [
              batchId,
              category,
              targetDate,
              slotTime,
              title,
              JSON.stringify(PRIZES),
              JSON.stringify(questionsJson),
            ]
          );
          inserted++;
        }

        // Ensure category auto is enabled
        await client.query(
          `INSERT INTO public.category_runtime_overrides(category, is_auto)
           VALUES ($1, true)
           ON CONFLICT (category) DO NOTHING`,
          [category]
        );

        await client.query('COMMIT');
        console.log(`  ✅ Inserted ${inserted} slots for ${category}`);

      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed for ${category}: ${err.message}`);
        throw err;
      }
    }

    console.log('\n🎉 All deployments complete!');

  } finally {
    if (!dry) {
      await client.end();
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
