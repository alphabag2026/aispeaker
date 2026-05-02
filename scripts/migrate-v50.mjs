import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const statements = [
  "ALTER TABLE `projectAvatars` ADD COLUMN IF NOT EXISTS `voiceCloneId` int",
  "ALTER TABLE `voiceClones` ADD COLUMN IF NOT EXISTS `matchedVoiceId` varchar(128)",
  "ALTER TABLE `voiceClones` ADD COLUMN IF NOT EXISTS `voiceAnalysis` text",
];

async function main() {
  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  const conn = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  for (const sql of statements) {
    try {
      await conn.execute(sql);
      console.log(`✅ ${sql.slice(0, 80)}...`);
    } catch (err) {
      // Column already exists is OK
      if (err.code === 'ER_DUP_FIELDNAME' || err.message?.includes('Duplicate column')) {
        console.log(`⏭️  Column already exists: ${sql.slice(0, 60)}...`);
      } else {
        console.error(`❌ ${sql.slice(0, 60)}... ERROR:`, err.message);
      }
    }
  }

  await conn.end();
  console.log('Migration complete!');
}

main().catch(console.error);
