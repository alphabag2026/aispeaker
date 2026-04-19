// Generate sample audio for missing voices using Gemini TTS API directly
// with retry logic and rate limit handling
import mysql from 'mysql2/promise';
import { writeFile, readFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

// Load env from the project
const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;

console.log('ENV check:');
console.log('  DATABASE_URL:', DATABASE_URL ? 'set' : 'MISSING');
console.log('  GEMINI_API_KEY:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) + '...' : 'MISSING');
console.log('  FORGE_API_URL:', FORGE_API_URL ? FORGE_API_URL.substring(0, 40) + '...' : 'MISSING');
console.log('  FORGE_API_KEY:', FORGE_API_KEY ? FORGE_API_KEY.substring(0, 10) + '...' : 'MISSING');

// Sample texts per language
const SAMPLE_TEXTS = {
  zh: "大家好，欢迎来到AI互动讲座平台。今天我们将探讨Web3技术的最新发展趋势，以及它如何改变我们的数字生活。",
  en: "Hello everyone, welcome to the AI Interactive Lecture Platform. Today we'll explore the latest trends in Web3 technology and how it's transforming our digital lives.",
  ar: "مرحباً بالجميع، أهلاً بكم في منصة المحاضرات التفاعلية بالذكاء الاصطناعي. سنستكشف اليوم أحدث اتجاهات تقنية الويب 3.",
  hi: "सभी को नमस्कार, AI इंटरैक्टिव लेक्चर प्लेटफॉर्म में आपका स्वागत है। आज हम Web3 तकनीक के नवीनतम रुझानों का पता लगाएंगे।",
  id: "Halo semuanya, selamat datang di Platform Kuliah Interaktif AI. Hari ini kita akan menjelajahi tren terbaru teknologi Web3 dan bagaimana hal itu mengubah kehidupan digital kita.",
};

async function uploadToS3(buffer, fileKey, contentType) {
  const url = new URL('v1/storage/upload', FORGE_API_URL.endsWith('/') ? FORGE_API_URL : FORGE_API_URL + '/');
  url.searchParams.set('path', fileKey);
  
  const blob = new Blob([buffer], { type: contentType });
  const form = new FormData();
  form.append('file', blob, fileKey.split('/').pop());
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${FORGE_API_KEY}` },
    body: form,
  });
  
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`S3 upload failed: ${resp.status} ${errText.substring(0, 200)}`);
  }
  
  const result = await resp.json();
  return result.url;
}

async function generateTts(text, voiceId) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceId },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    throw new Error(`TTS API error ${response.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error('No audio data in response');

  const pcmBuffer = Buffer.from(audioData, 'base64');
  
  const tmpPcm = join(tmpdir(), `tts-${Date.now()}.pcm`);
  const tmpMp3 = join(tmpdir(), `tts-${Date.now()}.mp3`);
  
  await writeFile(tmpPcm, pcmBuffer);
  await execAsync(`ffmpeg -y -f s16le -ar 24000 -ac 1 -i "${tmpPcm}" -codec:a libmp3lame -b:a 128k "${tmpMp3}" 2>/dev/null`);
  
  const mp3Buffer = await readFile(tmpMp3);
  await unlink(tmpPcm).catch(() => {});
  await unlink(tmpMp3).catch(() => {});
  
  return mp3Buffer;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!DATABASE_URL || !GEMINI_API_KEY) {
    console.error('Missing required env vars');
    process.exit(1);
  }

  const conn = await mysql.createConnection(DATABASE_URL);
  
  const [voices] = await conn.execute(
    "SELECT id, name, language, ttsVoiceId FROM sampleVoices WHERE isActive = 1 AND (sampleAudioUrl IS NULL OR sampleAudioUrl = '') ORDER BY id"
  );
  
  console.log(`\nMissing audio voices: ${voices.length}`);
  if (voices.length === 0) {
    console.log('All voices have audio!');
    await conn.end();
    return;
  }

  let success = 0;
  let failed = 0;
  const MAX_RETRIES = 5;
  
  for (let i = 0; i < voices.length; i++) {
    const voice = voices[i];
    const lang = voice.language;
    const text = SAMPLE_TEXTS[lang] || SAMPLE_TEXTS.en;
    
    console.log(`\n[${i+1}/${voices.length}] ${voice.name} (${lang}, voice: ${voice.ttsVoiceId})`);
    
    let retries = 0;
    let done = false;
    
    while (retries < MAX_RETRIES && !done) {
      try {
        const mp3Buffer = await generateTts(text, voice.ttsVoiceId);
        console.log(`  Audio generated: ${(mp3Buffer.length / 1024).toFixed(1)}KB`);
        
        // Upload to S3
        const fileKey = `voice-demos/${voice.ttsVoiceId.toLowerCase()}-${lang}-${Date.now()}.mp3`;
        const audioUrl = await uploadToS3(mp3Buffer, fileKey, 'audio/mpeg');
        
        // Update DB
        await conn.execute(
          'UPDATE sampleVoices SET sampleAudioUrl = ? WHERE id = ?',
          [audioUrl, voice.id]
        );
        
        console.log(`  ✓ Uploaded: ${audioUrl.substring(0, 80)}...`);
        success++;
        done = true;
        
        // Wait between requests to avoid rate limit
        if (i < voices.length - 1) {
          console.log(`  Waiting 5s...`);
          await sleep(5000);
        }
        
      } catch (err) {
        if (err.message === 'RATE_LIMIT') {
          retries++;
          const waitTime = 30 + (30 * retries); // 60s, 90s, 120s, 150s, 180s
          console.log(`  ⏳ Rate limited, waiting ${waitTime}s (retry ${retries}/${MAX_RETRIES})...`);
          await sleep(waitTime * 1000);
        } else {
          console.log(`  ✗ Error: ${err.message}`);
          failed++;
          done = true;
        }
      }
    }
    
    if (!done) {
      console.log(`  ✗ Max retries exceeded`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Success: ${success}, Failed: ${failed}`);
  
  const [total] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM sampleVoices WHERE isActive = 1"
  );
  const [withAudio] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM sampleVoices WHERE isActive = 1 AND sampleAudioUrl IS NOT NULL AND sampleAudioUrl != ''"
  );
  console.log(`Total voices: ${total[0].cnt}, With audio: ${withAudio[0].cnt}`);
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
