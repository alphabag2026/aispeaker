// Seed script: Add Chinese, English, Japanese voices to sampleVoices table
// Run: node seed-multilang-voices.mjs

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Gemini TTS voices support multiple languages with the same voice names
// Adding zh, en, ja versions of popular voices
const NEW_VOICES = [
  // ===== Chinese (zh) - 10 voices =====
  { name: "Zephyr", desc: "明亮活泼的语调", gender: "female", tone: "energetic", lang: "zh" },
  { name: "Puck", desc: "轻快活跃的语调", gender: "male", tone: "energetic", lang: "zh" },
  { name: "Charon", desc: "适合信息传达的语调", gender: "male", tone: "professional", lang: "zh" },
  { name: "Kore", desc: "坚定自信的语调", gender: "female", tone: "authoritative", lang: "zh" },
  { name: "Fenrir", desc: "兴奋热情的语调", gender: "male", tone: "energetic", lang: "zh" },
  { name: "Aoede", desc: "清新轻柔的语调", gender: "female", tone: "calm", lang: "zh" },
  { name: "Callirrhoe", desc: "舒适自然的语调", gender: "female", tone: "warm", lang: "zh" },
  { name: "Iapetus", desc: "清晰干净的语调", gender: "male", tone: "professional", lang: "zh" },
  { name: "Algieba", desc: "柔和顺滑的语调", gender: "male", tone: "warm", lang: "zh" },
  { name: "Despina", desc: "柔和顺滑的语调", gender: "female", tone: "warm", lang: "zh" },

  // ===== English (en) - 10 voices =====
  { name: "Zephyr", desc: "Bright and lively tone", gender: "female", tone: "energetic", lang: "en" },
  { name: "Puck", desc: "Upbeat and active tone", gender: "male", tone: "energetic", lang: "en" },
  { name: "Charon", desc: "Informative and clear tone", gender: "male", tone: "professional", lang: "en" },
  { name: "Kore", desc: "Firm and confident tone", gender: "female", tone: "authoritative", lang: "en" },
  { name: "Fenrir", desc: "Excitable and passionate tone", gender: "male", tone: "energetic", lang: "en" },
  { name: "Aoede", desc: "Breezy and light tone", gender: "female", tone: "calm", lang: "en" },
  { name: "Callirrhoe", desc: "Easy-going and natural tone", gender: "female", tone: "warm", lang: "en" },
  { name: "Iapetus", desc: "Clear and clean tone", gender: "male", tone: "professional", lang: "en" },
  { name: "Algieba", desc: "Smooth and mellow tone", gender: "male", tone: "warm", lang: "en" },
  { name: "Despina", desc: "Smooth and gentle tone", gender: "female", tone: "warm", lang: "en" },

  // ===== Japanese (ja) - 10 voices =====
  { name: "Zephyr", desc: "明るく活発なトーン", gender: "female", tone: "energetic", lang: "ja" },
  { name: "Puck", desc: "軽快で活発なトーン", gender: "male", tone: "energetic", lang: "ja" },
  { name: "Charon", desc: "情報伝達に適したトーン", gender: "male", tone: "professional", lang: "ja" },
  { name: "Kore", desc: "しっかりとした自信のあるトーン", gender: "female", tone: "authoritative", lang: "ja" },
  { name: "Fenrir", desc: "興奮した情熱的なトーン", gender: "male", tone: "energetic", lang: "ja" },
  { name: "Aoede", desc: "爽やかで軽いトーン", gender: "female", tone: "calm", lang: "ja" },
  { name: "Callirrhoe", desc: "リラックスした自然なトーン", gender: "female", tone: "warm", lang: "ja" },
  { name: "Iapetus", desc: "クリアできれいなトーン", gender: "male", tone: "professional", lang: "ja" },
  { name: "Algieba", desc: "滑らかで柔らかいトーン", gender: "male", tone: "warm", lang: "ja" },
  { name: "Despina", desc: "柔らかくスムーズなトーン", gender: "female", tone: "warm", lang: "ja" },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Check existing voices
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM sampleVoices');
  console.log(`Found ${existing[0].cnt} existing voices.`);
  
  // Get max sortOrder
  const [maxOrder] = await conn.execute('SELECT MAX(sortOrder) as maxOrder FROM sampleVoices');
  let startOrder = (maxOrder[0].maxOrder || 0) + 1;

  console.log(`Adding ${NEW_VOICES.length} multilingual voices (zh/en/ja)...`);
  
  for (let i = 0; i < NEW_VOICES.length; i++) {
    const v = NEW_VOICES[i];
    const langLabel = { zh: "CN", en: "EN", ja: "JP" }[v.lang] || v.lang.toUpperCase();
    const displayName = `${v.name} (${langLabel})`;
    await conn.execute(
      `INSERT INTO sampleVoices (name, language, gender, tone, ttsVoiceId, description, speed, pitch, isPremium, sortOrder, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [displayName, v.lang, v.gender, v.tone, v.name, v.desc, "1.0", "0", 0, startOrder + i, 1]
    );
    console.log(`  [${i+1}/${NEW_VOICES.length}] ${displayName} (${v.lang}, ${v.gender}, ${v.tone})`);
  }
  
  const [total] = await conn.execute('SELECT COUNT(*) as cnt FROM sampleVoices WHERE isActive = 1');
  console.log(`Done! Total active voices: ${total[0].cnt}`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
