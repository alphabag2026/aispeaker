import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const conn = await mysql.createConnection(url);
  const sql = fs.readFileSync(path.join(__dirname, '../drizzle/0055_tiresome_jasper_sitwell.sql'), 'utf-8');
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    console.log('Executing:', stmt.substring(0, 80) + '...');
    await conn.execute(stmt);
  }
  console.log('Migration v5.3 complete!');
  await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });
