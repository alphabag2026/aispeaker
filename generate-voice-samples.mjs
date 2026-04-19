// Generate sample audio for all voices that don't have sampleAudioUrl yet
// Uses the app's tRPC sampleVoice.preview endpoint internally
// Run: node generate-voice-samples.mjs

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = 'http://localhost:3000';

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Get all voices without sample audio
  const [voices] = await conn.execute(
    'SELECT id, name, language, ttsVoiceId, sampleAudioUrl FROM sampleVoices WHERE isActive = 1 ORDER BY id'
  );
  
  const needAudio = voices.filter(v => !v.sampleAudioUrl);
  console.log(`Total voices: ${voices.length}, Need audio: ${needAudio.length}`);
  
  if (needAudio.length === 0) {
    console.log('All voices already have sample audio!');
    await conn.end();
    return;
  }

  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < needAudio.length; i++) {
    const voice = needAudio[i];
    console.log(`[${i+1}/${needAudio.length}] Generating audio for: ${voice.name} (${voice.language}, voice: ${voice.ttsVoiceId})`);
    
    try {
      // Call the tRPC preview endpoint which generates TTS and uploads to S3
      const resp = await fetch(`${BASE_URL}/api/trpc/sampleVoice.preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { id: voice.id } }),
      });
      
      const data = await resp.json();
      
      if (data.result?.data?.json?.audioUrl) {
        console.log(`  ✓ Audio URL: ${data.result.data.json.audioUrl.substring(0, 80)}...`);
        success++;
      } else if (data.error) {
        console.log(`  ✗ Error: ${JSON.stringify(data.error).substring(0, 100)}`);
        failed++;
      } else {
        console.log(`  ? Unexpected response: ${JSON.stringify(data).substring(0, 100)}`);
        failed++;
      }
      
      // Rate limit - wait 2 seconds between requests
      if (i < needAudio.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.log(`  ✗ Request failed: ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  
  // Verify results
  const [updated] = await conn.execute(
    'SELECT COUNT(*) as cnt FROM sampleVoices WHERE isActive = 1 AND sampleAudioUrl IS NOT NULL'
  );
  console.log(`Voices with audio: ${updated[0].cnt} / ${voices.length}`);
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
