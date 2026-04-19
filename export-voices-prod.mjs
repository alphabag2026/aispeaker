import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT * FROM sampleVoices WHERE language != "ko"');
console.log('Total non-ko voices:', rows.length);

// Production DB has different column names:
// voiceId -> ttsVoiceId, provider -> (not in prod), sampleText -> (not in prod)
// prod has: name, language, gender, tone, ttsVoiceId, sampleAudioUrl, description, speed, pitch, isPremium, sortOrder, isActive

let sql = '';
for (const r of rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return 'NULL';
    return "'" + String(v).replace(/'/g, "''").replace(/\\/g, "\\\\") + "'";
  };
  
  // Map voiceId to ttsVoiceId
  const ttsVoiceId = r.voiceId || r.ttsVoiceId || '';
  
  sql += `INSERT INTO sampleVoices (name, language, gender, tone, ttsVoiceId, sampleAudioUrl, description, speed, pitch, isPremium, sortOrder, isActive) VALUES (${esc(r.name)}, ${esc(r.language)}, ${esc(r.gender)}, ${esc(r.tone)}, ${esc(ttsVoiceId)}, ${esc(r.sampleAudioUrl)}, ${esc(r.description)}, ${esc(r.speed || '1.0')}, ${esc(r.pitch || '0')}, ${r.isPremium ? 1 : 0}, ${r.sortOrder || 0}, ${r.isActive ? 1 : 0}) ON DUPLICATE KEY UPDATE name=VALUES(name), sampleAudioUrl=VALUES(sampleAudioUrl);\n`;
}

fs.writeFileSync('/tmp/voices_insert_prod.sql', sql);
console.log('SQL file written, size:', sql.length, 'bytes');
await conn.end();
