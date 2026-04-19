import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT * FROM sampleVoices WHERE language != "ko"');
console.log('Total non-ko voices:', rows.length);

let sql = '';
for (const r of rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return 'NULL';
    return "'" + String(v).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
  };
  
  sql += `INSERT INTO sampleVoices (name, voiceId, language, gender, tone, speed, description, sampleText, sampleAudioUrl, provider, isActive, sortOrder) VALUES (${esc(r.name)}, ${esc(r.voiceId)}, ${esc(r.language)}, ${esc(r.gender)}, ${esc(r.tone)}, ${esc(r.speed)}, ${esc(r.description)}, ${esc(r.sampleText)}, ${esc(r.sampleAudioUrl)}, ${esc(r.provider)}, ${r.isActive ? 1 : 0}, ${r.sortOrder || 0}) ON DUPLICATE KEY UPDATE name=VALUES(name), sampleAudioUrl=VALUES(sampleAudioUrl);\n`;
}

fs.writeFileSync('/tmp/voices_insert.sql', sql);
console.log('SQL file written, size:', sql.length, 'bytes');
await conn.end();
