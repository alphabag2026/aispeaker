// Seed script: Insert 30 Gemini TTS voices into sampleVoices table
// Run: node seed-voices.mjs

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load env from .env file
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// Gemini voice data with gender/tone mapping
const VOICES = [
  { name: "Zephyr", desc: "밝고 활기찬 톤", style: "Bright", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Puck", desc: "경쾌하고 활발한 톤", style: "Upbeat", gender: "male", tone: "energetic", lang: "ko" },
  { name: "Charon", desc: "정보 전달에 적합한 톤", style: "Informative", gender: "male", tone: "professional", lang: "ko" },
  { name: "Kore", desc: "단단하고 확신 있는 톤", style: "Firm", gender: "female", tone: "authoritative", lang: "ko" },
  { name: "Fenrir", desc: "흥분되고 열정적인 톤", style: "Excitable", gender: "male", tone: "energetic", lang: "ko" },
  { name: "Leda", desc: "젊고 생동감 있는 톤", style: "Youthful", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Orus", desc: "단단하고 안정적인 톤", style: "Firm", gender: "male", tone: "authoritative", lang: "ko" },
  { name: "Aoede", desc: "산뜻하고 가벼운 톤", style: "Breezy", gender: "female", tone: "calm", lang: "ko" },
  { name: "Callirrhoe", desc: "편안하고 자연스러운 톤", style: "Easy-going", gender: "female", tone: "warm", lang: "ko" },
  { name: "Autonoe", desc: "밝고 명랑한 톤", style: "Bright", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Enceladus", desc: "숨결이 느껴지는 톤", style: "Breathy", gender: "male", tone: "calm", lang: "ko" },
  { name: "Iapetus", desc: "맑고 깨끗한 톤", style: "Clear", gender: "male", tone: "professional", lang: "ko" },
  { name: "Umbriel", desc: "편안하고 여유로운 톤", style: "Easy-going", gender: "male", tone: "calm", lang: "ko" },
  { name: "Algieba", desc: "부드럽고 매끄러운 톤", style: "Smooth", gender: "male", tone: "warm", lang: "ko" },
  { name: "Despina", desc: "부드럽고 매끄러운 톤", style: "Smooth", gender: "female", tone: "warm", lang: "ko" },
  { name: "Erinome", desc: "맑고 선명한 톤", style: "Clear", gender: "female", tone: "professional", lang: "ko" },
  { name: "Algenib", desc: "거친 느낌의 톤", style: "Gravelly", gender: "male", tone: "authoritative", lang: "ko" },
  { name: "Rasalgethi", desc: "정보 전달에 적합한 톤", style: "Informative", gender: "male", tone: "professional", lang: "ko" },
  { name: "Laomedeia", desc: "경쾌하고 활발한 톤", style: "Upbeat", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Achernar", desc: "부드럽고 차분한 톤", style: "Soft", gender: "female", tone: "calm", lang: "ko" },
  { name: "Alnilam", desc: "단단하고 권위 있는 톤", style: "Firm", gender: "male", tone: "authoritative", lang: "ko" },
  { name: "Schedar", desc: "균일하고 안정적인 톤", style: "Even", gender: "female", tone: "professional", lang: "ko" },
  { name: "Gacrux", desc: "성숙하고 깊은 톤", style: "Mature", gender: "male", tone: "warm", lang: "ko" },
  { name: "Pulcherrima", desc: "적극적이고 앞선 톤", style: "Forward", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Achird", desc: "친근하고 다정한 톤", style: "Friendly", gender: "female", tone: "warm", lang: "ko" },
  { name: "Zubenelgenubi", desc: "캐주얼하고 편한 톤", style: "Casual", gender: "male", tone: "warm", lang: "ko" },
  { name: "Vindemiatrix", desc: "부드럽고 온화한 톤", style: "Gentle", gender: "female", tone: "calm", lang: "ko" },
  { name: "Sadachbia", desc: "활기차고 생동감 있는 톤", style: "Lively", gender: "female", tone: "energetic", lang: "ko" },
  { name: "Sadaltager", desc: "지식이 풍부한 톤", style: "Knowledgeable", gender: "male", tone: "professional", lang: "ko" },
  { name: "Sulafat", desc: "따뜻하고 포근한 톤", style: "Warm", gender: "male", tone: "warm", lang: "ko" },
];

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Clear old OpenAI voices and replace with Gemini voices
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM sampleVoices');
  console.log(`Found ${existing[0].cnt} existing voices. Replacing with 30 Gemini voices...`);
  await conn.execute('DELETE FROM sampleVoices');

  console.log('Inserting 30 Gemini TTS voices...');
  
  for (let i = 0; i < VOICES.length; i++) {
    const v = VOICES[i];
    await conn.execute(
      `INSERT INTO sampleVoices (name, language, gender, tone, ttsVoiceId, description, speed, pitch, isPremium, sortOrder, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.name, v.lang, v.gender, v.tone, v.name, v.desc, "1.0", "0", i >= 20 ? 1 : 0, i + 1, 1]
    );
    console.log(`  [${i+1}/30] ${v.name} (${v.gender}, ${v.tone})`);
  }
  
  console.log('Done! 30 voices inserted.');
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
