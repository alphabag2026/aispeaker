// Add Vietnamese, Thai, Spanish, French, German, Portuguese, Russian, Arabic, Hindi, Indonesian voices
// Run: node seed-extra-languages.mjs

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// 10 additional languages x 5 voices each = 50 new voices
// Using voices known to work well with Gemini TTS
const EXTRA_VOICES = [
  // ===== Vietnamese (vi) - 5 voices =====
  { name: "Puck", desc: "Giọng sôi nổi và năng động", gender: "male", tone: "energetic", lang: "vi" },
  { name: "Charon", desc: "Giọng chuyên nghiệp và rõ ràng", gender: "male", tone: "professional", lang: "vi" },
  { name: "Fenrir", desc: "Giọng nhiệt huyết và đam mê", gender: "male", tone: "energetic", lang: "vi" },
  { name: "Callirrhoe", desc: "Giọng tự nhiên và dễ chịu", gender: "female", tone: "warm", lang: "vi" },
  { name: "Iapetus", desc: "Giọng trong trẻo và sạch sẽ", gender: "male", tone: "professional", lang: "vi" },

  // ===== Thai (th) - 5 voices =====
  { name: "Puck", desc: "น้ำเสียงสดใสและกระตือรือร้น", gender: "male", tone: "energetic", lang: "th" },
  { name: "Charon", desc: "น้ำเสียงมืออาชีพและชัดเจน", gender: "male", tone: "professional", lang: "th" },
  { name: "Fenrir", desc: "น้ำเสียงกระตือรือร้นและหลงใหล", gender: "male", tone: "energetic", lang: "th" },
  { name: "Callirrhoe", desc: "น้ำเสียงเป็นธรรมชาติและสบาย", gender: "female", tone: "warm", lang: "th" },
  { name: "Iapetus", desc: "น้ำเสียงใสและสะอาด", gender: "male", tone: "professional", lang: "th" },

  // ===== Spanish (es) - 5 voices =====
  { name: "Puck", desc: "Tono animado y activo", gender: "male", tone: "energetic", lang: "es" },
  { name: "Charon", desc: "Tono profesional e informativo", gender: "male", tone: "professional", lang: "es" },
  { name: "Fenrir", desc: "Tono apasionado y entusiasta", gender: "male", tone: "energetic", lang: "es" },
  { name: "Callirrhoe", desc: "Tono natural y cálido", gender: "female", tone: "warm", lang: "es" },
  { name: "Iapetus", desc: "Tono claro y limpio", gender: "male", tone: "professional", lang: "es" },

  // ===== French (fr) - 5 voices =====
  { name: "Puck", desc: "Ton vif et dynamique", gender: "male", tone: "energetic", lang: "fr" },
  { name: "Charon", desc: "Ton professionnel et informatif", gender: "male", tone: "professional", lang: "fr" },
  { name: "Fenrir", desc: "Ton passionné et enthousiaste", gender: "male", tone: "energetic", lang: "fr" },
  { name: "Callirrhoe", desc: "Ton naturel et chaleureux", gender: "female", tone: "warm", lang: "fr" },
  { name: "Iapetus", desc: "Ton clair et net", gender: "male", tone: "professional", lang: "fr" },

  // ===== German (de) - 5 voices =====
  { name: "Puck", desc: "Lebhafter und aktiver Ton", gender: "male", tone: "energetic", lang: "de" },
  { name: "Charon", desc: "Professioneller und informativer Ton", gender: "male", tone: "professional", lang: "de" },
  { name: "Fenrir", desc: "Leidenschaftlicher und begeisterter Ton", gender: "male", tone: "energetic", lang: "de" },
  { name: "Callirrhoe", desc: "Natürlicher und warmer Ton", gender: "female", tone: "warm", lang: "de" },
  { name: "Iapetus", desc: "Klarer und sauberer Ton", gender: "male", tone: "professional", lang: "de" },

  // ===== Portuguese (pt) - 5 voices =====
  { name: "Puck", desc: "Tom animado e ativo", gender: "male", tone: "energetic", lang: "pt" },
  { name: "Charon", desc: "Tom profissional e informativo", gender: "male", tone: "professional", lang: "pt" },
  { name: "Fenrir", desc: "Tom apaixonado e entusiasmado", gender: "male", tone: "energetic", lang: "pt" },
  { name: "Callirrhoe", desc: "Tom natural e caloroso", gender: "female", tone: "warm", lang: "pt" },
  { name: "Iapetus", desc: "Tom claro e limpo", gender: "male", tone: "professional", lang: "pt" },

  // ===== Russian (ru) - 5 voices =====
  { name: "Puck", desc: "Живой и активный тон", gender: "male", tone: "energetic", lang: "ru" },
  { name: "Charon", desc: "Профессиональный и информативный тон", gender: "male", tone: "professional", lang: "ru" },
  { name: "Fenrir", desc: "Страстный и восторженный тон", gender: "male", tone: "energetic", lang: "ru" },
  { name: "Callirrhoe", desc: "Естественный и тёплый тон", gender: "female", tone: "warm", lang: "ru" },
  { name: "Iapetus", desc: "Чистый и ясный тон", gender: "male", tone: "professional", lang: "ru" },

  // ===== Arabic (ar) - 5 voices =====
  { name: "Puck", desc: "نبرة حيوية ونشطة", gender: "male", tone: "energetic", lang: "ar" },
  { name: "Charon", desc: "نبرة مهنية وإعلامية", gender: "male", tone: "professional", lang: "ar" },
  { name: "Fenrir", desc: "نبرة شغوفة ومتحمسة", gender: "male", tone: "energetic", lang: "ar" },
  { name: "Callirrhoe", desc: "نبرة طبيعية ودافئة", gender: "female", tone: "warm", lang: "ar" },
  { name: "Iapetus", desc: "نبرة واضحة ونقية", gender: "male", tone: "professional", lang: "ar" },

  // ===== Hindi (hi) - 5 voices =====
  { name: "Puck", desc: "जीवंत और सक्रिय स्वर", gender: "male", tone: "energetic", lang: "hi" },
  { name: "Charon", desc: "पेशेवर और जानकारीपूर्ण स्वर", gender: "male", tone: "professional", lang: "hi" },
  { name: "Fenrir", desc: "उत्साही और भावुक स्वर", gender: "male", tone: "energetic", lang: "hi" },
  { name: "Callirrhoe", desc: "प्राकृतिक और गर्म स्वर", gender: "female", tone: "warm", lang: "hi" },
  { name: "Iapetus", desc: "स्पष्ट और साफ स्वर", gender: "male", tone: "professional", lang: "hi" },

  // ===== Indonesian (id) - 5 voices =====
  { name: "Puck", desc: "Nada ceria dan aktif", gender: "male", tone: "energetic", lang: "id" },
  { name: "Charon", desc: "Nada profesional dan informatif", gender: "male", tone: "professional", lang: "id" },
  { name: "Fenrir", desc: "Nada bersemangat dan antusias", gender: "male", tone: "energetic", lang: "id" },
  { name: "Callirrhoe", desc: "Nada alami dan hangat", gender: "female", tone: "warm", lang: "id" },
  { name: "Iapetus", desc: "Nada jernih dan bersih", gender: "male", tone: "professional", lang: "id" },
];

const LANG_LABELS = {
  vi: "VN", th: "TH", es: "ES", fr: "FR", de: "DE",
  pt: "PT", ru: "RU", ar: "AR", hi: "HI", id: "ID",
};

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM sampleVoices');
  console.log(`Found ${existing[0].cnt} existing voices.`);
  
  const [maxOrder] = await conn.execute('SELECT MAX(sortOrder) as maxOrder FROM sampleVoices');
  let startOrder = (maxOrder[0].maxOrder || 0) + 1;

  console.log(`Adding ${EXTRA_VOICES.length} voices for 10 new languages...`);
  
  for (let i = 0; i < EXTRA_VOICES.length; i++) {
    const v = EXTRA_VOICES[i];
    const langLabel = LANG_LABELS[v.lang] || v.lang.toUpperCase();
    const displayName = `${v.name} (${langLabel})`;
    await conn.execute(
      `INSERT INTO sampleVoices (name, language, gender, tone, ttsVoiceId, description, speed, pitch, isPremium, sortOrder, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [displayName, v.lang, v.gender, v.tone, v.name, v.desc, "1.0", "0", 0, startOrder + i, 1]
    );
    console.log(`  [${i+1}/${EXTRA_VOICES.length}] ${displayName} (${v.lang})`);
  }
  
  const [total] = await conn.execute('SELECT COUNT(*) as cnt FROM sampleVoices WHERE isActive = 1');
  console.log(`\nDone! Total active voices: ${total[0].cnt}`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
