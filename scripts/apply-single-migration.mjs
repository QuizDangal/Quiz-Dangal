// One-off: apply a single migration file and register it in schema_migrations.
// Usage: node scripts/apply-single-migration.mjs <version> <file>
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const version = process.argv[2];
const file = process.argv[3];
if (!version || !file) {
  console.error('Usage: node scripts/apply-single-migration.mjs <version> <migration_file>');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL in env');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');
const name = path.basename(file, '.sql').replace(/^\d+_/, '');

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  console.log('Connected to remote DB');
  await client.query('BEGIN');
  await client.query(sql);
  await client.query(
    `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
     VALUES ($1, $2, ARRAY[$3]::text[])
     ON CONFLICT (version) DO NOTHING`,
    [version, name, sql]
  );
  await client.query('COMMIT');
  console.log(`Applied migration ${version}_${name}`);
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('ERROR:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
