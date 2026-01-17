#!/usr/bin/env node
// ============================================================
// Deploy bulk quiz JSON from ./bulk/* to Supabase backend
// Uses service_role key to call admin_seed_quiz_day_multi RPC
//
// Usage:
//   node ./scripts/deploy-bulk-quizzes.mjs --date=2026-01-16 --category=gk --file=bulk/gk_144_bilingual_16.json
//   node ./scripts/deploy-bulk-quizzes.mjs --date=2026-01-16 --all
//   node ./scripts/deploy-bulk-quizzes.mjs --date=2026-01-16 --all --dry=1
//
// Environment:
//   SUPABASE_URL (or VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE)
//
// Reads from .env or .env.local if present.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

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
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times; // 144 slots
}

// -------------------- Main --------------------
async function main() {
  const env = loadEnv();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in env/.env/.env.local');
    process.exit(2);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const targetDate = getArg('date');
  const singleCategory = getArg('category');
  const singleFile = getArg('file');
  const deployAll = hasFlag('all');
  const dry = getArg('dry') === '1';

  if (!targetDate) {
    console.error('--date=YYYY-MM-DD is required');
    process.exit(2);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error('--date must be YYYY-MM-DD format');
    process.exit(2);
  }

  // Determine which files to deploy
  const bulkDir = path.join(process.cwd(), 'bulk');
  let filesToDeploy = [];

  if (singleFile) {
    filesToDeploy.push({ file: singleFile, category: singleCategory || inferCategory(singleFile) });
  } else if (deployAll) {
    // Find all *_144_bilingual_*.json matching day suffix from date
    const daySuffix = String(parseInt(targetDate.split('-')[2], 10));
    const entries = fs.readdirSync(bulkDir);
    const pattern = new RegExp(`^(gk|sports|movies|opinion)_144_bilingual_${daySuffix}\\.json$`, 'i');
    for (const e of entries) {
      if (pattern.test(e)) {
        const cat = e.match(/^(gk|sports|movies|opinion)/i)?.[1]?.toLowerCase();
        filesToDeploy.push({ file: path.join('bulk', e), category: cat });
      }
    }
  } else if (singleCategory) {
    // Infer file from category + date
    const daySuffix = String(parseInt(targetDate.split('-')[2], 10));
    const fileName = `${singleCategory}_144_bilingual_${daySuffix}.json`;
    const fullPath = path.join(bulkDir, fileName);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(2);
    }
    filesToDeploy.push({ file: path.join('bulk', fileName), category: singleCategory });
  } else {
    console.error('Provide --file=..., --category=..., or --all');
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
  const PRIZES = [121, 71, 51];

  for (const { file, category } of filesToDeploy) {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      console.error(`File not found: ${abs}`);
      process.exit(2);
    }

    const raw = fs.readFileSync(abs, 'utf8');
    const quizzes = JSON.parse(raw);

    if (!Array.isArray(quizzes)) {
      console.error(`Expected array in ${file}`);
      process.exit(2);
    }

    if (quizzes.length > 144) {
      console.error(`Too many quizzes in ${file}: ${quizzes.length} (max 144)`);
      process.exit(2);
    }

    console.log(`\n📦 ${category.toUpperCase()}: ${file} (${quizzes.length} quizzes)`);

    // Build payload
    const quizzesPayload = quizzes.map((qz, i) => ({
      time: autoTimes[i],
      title: String(qz.title || `Quiz ${i + 1}`).trim(),
      prizes: PRIZES,
      questions: (qz.questions || []).map((qq) => ({
        question_text: String(qq.question_text || '').trim(),
        options: (qq.options || []).slice(0, 4).map((op) => ({
          option_text: String(op.option_text || '').trim(),
          is_correct: category === 'opinion' ? false : !!op.is_correct,
        })),
      })),
    }));

    const payload = {
      target_date: targetDate,
      categories: {
        [category]: quizzesPayload,
      },
    };

    if (dry) {
      console.log(`  [dry] Would call admin_seed_quiz_day_multi with ${quizzesPayload.length} quizzes`);
      continue;
    }

    // Call RPC
    const { data, error } = await supabase.rpc('admin_seed_quiz_day_multi', { p_payload: payload });
    if (error) {
      console.error(`  ❌ Deploy failed: ${error.message}`);
      process.exit(2);
    }

    console.log(`  ✅ Deployed! Response:`, data);
  }

  console.log('\n🎉 All done!');
}

function inferCategory(filePath) {
  const base = path.basename(filePath).toLowerCase();
  const m = base.match(/^(gk|sports|movies|opinion)/);
  if (!m) throw new Error(`Cannot infer category from: ${filePath}`);
  return m[1];
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
