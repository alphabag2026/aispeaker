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
  { id: "Zephyr", name: "Zephyr", desc: "밝고 활기찬 톤", style: "Bright" },
  { id: "Puck", name: "Puck", desc: "경쾌하고 활발한 톤", style: "Upbeat" },
  { id: "Charon", name: "Charon", desc: "정보 전달에 적합한 톤", style: "Informative" },
  { id: "Kore", name: "Kore", desc: "단단하고 확신 있는 톤", style: "Firm" },
  { id: "Fenrir", name: "Fenrir", desc: "흥분되고 열정적인 톤", style: "Excitable" },
  { id: "Leda", name: "Leda", desc: "젊고 생동감 있는 톤", style: "Youthful" },
  { id: "Orus", name: "Orus", desc: "단단하고 안정적인 톤", style: "Firm" },
  { id: "Aoede", name: "Aoede", desc: "산뜻하고 가벼운 톤", style: "Breezy" },
  { id: "Callirrhoe", name: "Callirrhoe", desc: "편안하고 자연스러운 톤", style: "Easy-going" },
  { id: "Autonoe", name: "Autonoe", desc: "밝고 명랑한 톤", style: "Bright" },
  { id: "Enceladus", name: "Enceladus", desc: "숨결이 느껴지는 톤", style: "Breathy" },
  { id: "Iapetus", name: "Iapetus", desc: "맑고 깨끗한 톤", style: "Clear" },
  { id: "Umbriel", name: "Umbriel", desc: "편안하고 여유로운 톤", style: "Easy-going" },
  { id: "Algieba", name: "Algieba", desc: "부드럽고 매끄러운 톤", style: "Smooth" },
  { id: "Despina", name: "Despina", desc: "부드럽고 매끄러운 톤", style: "Smooth" },
  { id: "Erinome", name: "Erinome", desc: "맑고 선명한 톤", style: "Clear" },
  { id: "Algenib", name: "Algenib", desc: "거친 느낌의 톤", style: "Gravelly" },
  { id: "Rasalgethi", name: "Rasalgethi", desc: "정보 전달에 적합한 톤", style: "Informative" },
  { id: "Laomedeia", name: "Laomedeia", desc: "경쾌하고 활발한 톤", style: "Upbeat" },
  { id: "Achernar", name: "Achernar", desc: "부드럽고 차분한 톤", style: "Soft" },
  { id: "Alnilam", name: "Alnilam", desc: "단단하고 권위 있는 톤", style: "Firm" },
  { id: "Schedar", name: "Schedar", desc: "균일하고 안정적인 톤", style: "Even" },
  { id: "Gacrux", name: "Gacrux", desc: "성숙하고 깊은 톤", style: "Mature" },
  { id: "Pulcherrima", name: "Pulcherrima", desc: "적극적이고 앞선 톤", style: "Forward" },
  { id: "Achird", name: "Achird", desc: "친근하고 다정한 톤", style: "Friendly" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", desc: "캐주얼하고 편한 톤", style: "Casual" },
  { id: "Vindemiatrix", name: "Vindemiatrix", desc: "부드럽고 온화한 톤", style: "Gentle" },
  { id: "Sadachbia", name: "Sadachbia", desc: "활기차고 생동감 있는 톤", style: "Lively" },
  { id: "Sadaltager", name: "Sadaltager", desc: "지식이 풍부한 톤", style: "Knowledgeable" },
  { id: "Sulafat", name: "Sulafat", desc: "따뜻하고 포근한 톤", style: "Warm" },
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
    await execAsync(`ffmpeg -i "${tmpWav}" -codec:a libmp3lame -qscale:a 2 -y "${tmpMp3}" 2>/dev/null`);
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
        error: "TTS 서비스 인증 키가 설정되지 않았습니다",
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
          error: "API 키가 유효하지 않거나 만료되었습니다. 관리자에게 문의하세요.",
          code: "API_KEY_INVALID",
          details: `HTTP ${status}: ${errorMessage}`,
        };
      }
      if (status === 429) {
        return {
          error: "API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
          code: "QUOTA_EXCEEDED",
          details: `HTTP ${status}: ${errorMessage}`,
        };
      }
      return {
        error: `TTS 생성에 실패했습니다 (HTTP ${status})`,
        code: "MODEL_ERROR",
        details: errorMessage,
      };
    }

    const data = await response.json();

    // Extract audio data
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      return {
        error: "TTS 응답에 오디오 데이터가 없습니다",
        code: "MODEL_ERROR",
        details: JSON.stringify(data).slice(0, 500),
      };
    }

    const audioPart = parts.find((p: any) => p.inlineData);
    if (!audioPart?.inlineData?.data) {
      return {
        error: "TTS 응답에서 오디오를 추출할 수 없습니다",
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
      error: "TTS 생성 중 예기치 않은 오류가 발생했습니다",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
