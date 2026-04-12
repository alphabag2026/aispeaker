// Generate demo audio for all sample voices by calling the running server's tRPC endpoint
// Run: node scripts/seed-voice-demos.mjs
import 'dotenv/config';
import mysql from 'mysql2/promise';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all voices without demo audio
  const [voices] = await conn.execute(
    'SELECT id, name, ttsVoiceId, language FROM sampleVoices WHERE isActive = 1 AND sampleAudioUrl IS NULL ORDER BY id'
  );
  
  console.log(`Found ${voices.length} voices without demo audio`);
  
  let success = 0;
  let failed = 0;
  
  for (const voice of voices) {
    console.log(`\n[${success + failed + 1}/${voices.length}] Generating demo for: ${voice.name} (${voice.ttsVoiceId})...`);
    
    try {
      // Call the tRPC mutation endpoint directly
      const response = await fetch(`${SERVER_URL}/api/trpc/sampleVoice.preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: { id: voice.id }
        }),
      });
      
      const data = await response.json();
      
      if (data.result?.data?.json?.audioUrl) {
        console.log(`  ✅ Success: ${data.result.data.json.audioUrl.substring(0, 80)}...`);
        success++;
      } else if (data.error) {
        console.log(`  ❌ Error: ${JSON.stringify(data.error).substring(0, 200)}`);
        failed++;
      } else {
        console.log(`  ❌ Unexpected response: ${JSON.stringify(data).substring(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.log(`  ❌ Request failed: ${err.message}`);
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\n========================================`);
  console.log(`Done! Success: ${success}, Failed: ${failed}, Total: ${voices.length}`);
  
  // Verify final state
  const [updated] = await conn.execute(
    'SELECT COUNT(*) as count FROM sampleVoices WHERE isActive = 1 AND sampleAudioUrl IS NOT NULL'
  );
  console.log(`Voices with demo audio: ${updated[0].count}`);
  
  await conn.end();
}

main().catch(console.error);
