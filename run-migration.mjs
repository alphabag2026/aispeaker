import mysql from 'mysql2/promise';

const statements = [
  "ALTER TABLE `pipSettings` MODIFY COLUMN `position` enum('bottom-right','bottom-left','top-right','top-left','custom') NOT NULL DEFAULT 'bottom-right'",
  "ALTER TABLE `pipSettings` ADD `customX` int DEFAULT 75",
  "ALTER TABLE `pipSettings` ADD `customY` int DEFAULT 75",
];

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  for (const sql of statements) {
    try {
      await conn.execute(sql);
      console.log('OK:', sql.substring(0, 60));
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('SKIP (already exists):', sql.substring(0, 60));
      } else {
        console.error('ERR:', e.message);
      }
    }
  }
  await conn.end();
}
run();
