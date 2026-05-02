/**
 * Gemini Text-to-Speech helper using Gemini 2.5 Flash TTS model
 *
 * Uses the native Gemini generateContent API with AUDIO response modality.
 * Returns PCM audio (24000Hz, 16-bit, mono) which is converted to WAV format.
 *
 * Supported voices (30 options):
 * Zephyr(Bright), Puck(Upbeat), Charon(Informative), Kore(Firm), Fenrir(Excitable),
 * Leda(Youthful), Orus(Firm), Aoede(Breezy), Callirrhoe(Easy-going), Autonoe(Bright),
 * Enceladus(Breathy), Iapetus(Clear), Umbriel(Easy-going), Algieba(Smooth), Despina(Smooth),
 * Erinome(Clear), Algenib(Gravelly), Rasalgethi(Informative), Laomedeia(Upbeat), Achernar(Soft),
 * Alnilam(Firm), Schedar(Even), Gacrux(Mature), Pulcherrima(Forward), Achird(Friendly),
 * Zubenelgenubi(Casual), Vindemiatrix(Gentle), Sadachbia(Lively), Sadaltager(Knowledgeable), Sulafat(Warm)
 */
import { ENV } from "./env";
import { logApiUsage } from "../db";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

// OpenAI voice ID → Gemini voice name mapping
const OPENAI_TO_GEMINI_VOICE: Record<string, string> = {
  alloy: "Kore",       // neutral/balanced → Firm
  echo: "Charon",      // male/deep → Informative
  fable: "Sulafat",    // warm/british → Warm
  onyx: "Alnilam",     // male/authoritative → Firm
  nova: "Zephyr",      // female/bright → Bright
  shimmer: "Achernar",  // female/soft → Soft
};

// All available Gemini voices
export const GEMINI_VOICES = [
  { id: "Zephyr", name: "Zephyr", desc: "Bright and energetic tone", style: "Bright", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Puck", name: "Puck", desc: "Cheerful and lively tone", style: "Upbeat", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Charon", name: "Charon", desc: "Suitable for informational delivery", style: "Informative", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Kore", name: "Kore", desc: "Firm and confident tone", style: "Firm", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Fenrir", name: "Fenrir", desc: "Excited and passionate tone", style: "Excitable", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Leda", name: "Leda", desc: "Youthful and vibrant tone", style: "Youthful", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Orus", name: "Orus", desc: "Firm and stable tone", style: "Firm", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Aoede", name: "Aoede", desc: "Fresh and light tone", style: "Breezy", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Callirrhoe", name: "Callirrhoe", desc: "Relaxed and natural tone", style: "Easy-going", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Autonoe", name: "Autonoe", desc: "Bright and cheerful tone", style: "Bright", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Enceladus", name: "Enceladus", desc: "Breathy and airy tone", style: "Breathy", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Iapetus", name: "Iapetus", desc: "Clear and crisp tone", style: "Clear", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Umbriel", name: "Umbriel", desc: "Comfortable and relaxed tone", style: "Easy-going", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Algieba", name: "Algieba", desc: "Soft and smooth tone", style: "Smooth", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Despina", name: "Despina", desc: "Soft and smooth tone", style: "Smooth", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Erinome", name: "Erinome", desc: "Clear and vivid tone", style: "Clear", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Algenib", name: "Algenib", desc: "Rough and gravelly tone", style: "Gravelly", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Rasalgethi", name: "Rasalgethi", desc: "Suitable for informational delivery", style: "Informative", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Laomedeia", name: "Laomedeia", desc: "Cheerful and lively tone", style: "Upbeat", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Achernar", name: "Achernar", desc: "Soft and calm tone", style: "Soft", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Alnilam", name: "Alnilam", desc: "Firm and authoritative tone", style: "Firm", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Schedar", name: "Schedar", desc: "Even and stable tone", style: "Even", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Gacrux", name: "Gacrux", desc: "Mature and deep tone", style: "Mature", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Pulcherrima", name: "Pulcherrima", desc: "Proactive and forward tone", style: "Forward", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Achird", name: "Achird", desc: "Friendly and warm tone", style: "Friendly", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", desc: "Casual and relaxed tone", style: "Casual", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Vindemiatrix", name: "Vindemiatrix", desc: "Soft and gentle tone", style: "Gentle", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Sadachbia", name: "Sadachbia", desc: "Energetic and vibrant tone", style: "Lively", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Sadaltager", name: "Sadaltager", desc: "Knowledgeable and informed tone", style: "Knowledgeable", gender: "male" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
  { id: "Sulafat", name: "Sulafat", desc: "Warm and cozy tone", style: "Warm", gender: "female" as const, languages: ["en","ko","ja","zh","es","fr","de","pt","it","nl","ru","ar","hi","th","vi","id","tr","pl"] },
];

export type GeminiTtsOptions = {
  text: string;
  voiceId?: string;  // OpenAI voice ID (alloy, echo, etc.) or Gemini voice name
  speed?: number;    // Speed multiplier (0.5 - 2.0), applied via prompt
};

export type GeminiTtsResponse = {
  audioBuffer: Buffer;
  mimeType: string;
  voiceName: string;
};

export type GeminiTtsError = {
  error: string;
  code: "API_KEY_INVALID" | "QUOTA_EXCEEDED" | "MODEL_ERROR" | "CONVERSION_ERROR" | "SERVICE_ERROR";
  details?: string;
};

/**
 * Resolve voice name: if it's an OpenAI voice ID, map to Gemini; otherwise use as-is
 */
function resolveVoiceName(voiceId: string): string {
  // Check if it's an OpenAI voice ID
  const mapped = OPENAI_TO_GEMINI_VOICE[voiceId.toLowerCase()];
  if (mapped) return mapped;

  // Check if it's already a valid Gemini voice name
  const geminiVoice = GEMINI_VOICES.find(v => v.id.toLowerCase() === voiceId.toLowerCase());
  if (geminiVoice) return geminiVoice.id;

  // Default fallback
  return "Kore";
}

/**
 * Create WAV header for PCM audio data
 */
function createWavHeader(dataLength: number, sampleRate = 24000, bitsPerSample = 16, channels = 1): Buffer {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);       // PCM format chunk size
  header.writeUInt16LE(1, 20);        // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Convert WAV buffer to MP3 using ffmpeg
 */
async function wavToMp3(wavBuffer: Buffer): Promise<Buffer> {
  const tmpWav = join(tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  const tmpMp3 = tmpWav.replace(".wav", ".mp3");

  try {
    await writeFile(tmpWav, wavBuffer);
    // High-quality MP3 conversion with:
    // -b:a 192k: 192kbps constant bitrate for clear speech
    // -af loudnorm: EBU R128 loudness normalization for consistent volume
    // -ar 44100: Standard sample rate for broad compatibility
    // -ac 1: Mono channel (speech doesn't need stereo)
    await execAsync(
      `ffmpeg -i "${tmpWav}" -codec:a libmp3lame -b:a 192k -ar 44100 -ac 1 ` +
      `-af "loudnorm=I=-16:TP=-1.5:LRA=11" -y "${tmpMp3}" 2>/dev/null`
    );
    const mp3Buffer = await readFile(tmpMp3);
    return mp3Buffer;
  } finally {
    // Cleanup temp files
    await unlink(tmpWav).catch(() => {});
    await unlink(tmpMp3).catch(() => {});
  }
}

/**
 * Generate speech audio using Gemini TTS API
 */
export async function generateGeminiTts(
  options: GeminiTtsOptions & { _userId?: number }
): Promise<GeminiTtsResponse | GeminiTtsError> {
  const startTime = Date.now();
  const model = "gemini-2.5-flash-preview-tts";
  try {
    // Validate environment - prefer GEMINI_API_KEY, fallback to BUILT_IN_FORGE_API_KEY
    const apiKey = ENV.geminiApiKey || ENV.forgeApiKey;
    if (!apiKey) {
      return {
        error: "TTS service authentication key is not configured",
        code: "SERVICE_ERROR",
        details: "GEMINI_API_KEY or BUILT_IN_FORGE_API_KEY is not set",
      };
    }

    const voiceName = resolveVoiceName(options.voiceId || "alloy");

    // Build prompt with optional speed instruction
    let prompt = options.text;
    if (options.speed && options.speed !== 1) {
      if (options.speed < 0.8) {
        prompt = `Please speak slowly and deliberately: ${options.text}`;
      } else if (options.speed > 1.3) {
        prompt = `Please speak quickly and energetically: ${options.text}`;
      }
    }

    // Call Gemini TTS API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      let parsedError: any = {};
      try { parsedError = JSON.parse(errorBody); } catch {}

      const status = response.status;
      const errorMessage = parsedError?.error?.message || errorBody;

      // Log error
      logApiUsage({
        userId: options._userId,
        apiType: "tts",
        model,
        durationMs: Date.now() - startTime,
        status: "error",
        errorCode: `HTTP_${status}`,
        errorMessage: (errorMessage || "").slice(0, 500),
      });

      // Classify error
      if (status === 401 || status === 403) {
        return {
          error: "API key is invalid or expired. Please contact administrator.",
          code: "API_KEY_INVALID",
          details: `HTTP ${status}: ${errorMessage}`,
        };
      }
      if (status === 429) {
        return {
          error: "API usage limit exceeded. Please try again later.",
          code: "QUOTA_EXCEEDED",
          details: `HTTP ${status}: ${errorMessage}`,
        };
      }
      return {
        error: `TTS generation failed (HTTP ${status})`,
        code: "MODEL_ERROR",
        details: errorMessage,
      };
    }

    const data = await response.json();

    // Extract audio data
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      return {
        error: "No audio data in TTS response",
        code: "MODEL_ERROR",
        details: JSON.stringify(data).slice(0, 500),
      };
    }

    const audioPart = parts.find((p: any) => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      return {
        error: "Cannot extract audio from TTS response",
        code: "MODEL_ERROR",
        details: "No inlineData found in response parts",
      };
    }

    // Decode base64 PCM audio
    const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");

    // Create WAV from PCM
    const wavHeader = createWavHeader(pcmBuffer.length);
    const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);

    // Convert WAV to MP3
    let mp3Buffer: Buffer;
    try {
      mp3Buffer = await wavToMp3(wavBuffer);
    } catch (convErr) {
      // If ffmpeg fails, return WAV instead
      console.warn("[GeminiTTS] ffmpeg conversion failed, returning WAV:", convErr);
      return {
        audioBuffer: wavBuffer,
        mimeType: "audio/wav",
        voiceName,
      };
    }

    // Log success
    logApiUsage({
      userId: options._userId,
      apiType: "tts",
      model,
      durationMs: Date.now() - startTime,
      status: "success",
      metadata: JSON.stringify({ voiceName, textLength: options.text.length }),
    });

    return {
      audioBuffer: mp3Buffer,
      mimeType: "audio/mpeg",
      voiceName,
    };
  } catch (error) {
    logApiUsage({
      userId: options._userId,
      apiType: "tts",
      model,
      durationMs: Date.now() - startTime,
      status: "error",
      errorCode: "UNEXPECTED",
      errorMessage: error instanceof Error ? error.message?.slice(0, 500) : "Unknown error",
    });
    return {
      error: "Unexpected error during TTS generation",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
