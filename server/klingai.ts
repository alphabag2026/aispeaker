/**
 * Kling AI API Helper
 * - JWT authentication with HMAC-SHA256
 * - Avatar image-to-video API (talking head)
 * - Task polling
 */
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

const KLING_API_BASE = "https://api-singapore.klingai.com";

/**
 * Generate JWT token for Kling AI API authentication
 */
async function generateKlingJWT(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(ENV.klingSecretKey);
  return new SignJWT({
    iss: ENV.klingAccessKey,
    exp: now + 1800,
    nbf: now - 5,
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(secret);
}

/**
 * Make authenticated request to Kling AI API
 */
async function klingRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<any> {
  const token = await generateKlingJWT();
  const url = `${KLING_API_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Kling API error ${response.status}: ${errText}`);
  }
  return response.json();
}

/**
 * Create Kling AI Avatar video from image + audio
 * Returns task_id for polling
 */
export async function createKlingAvatarVideo(params: {
  imageUrl: string;
  audioUrl: string;
  prompt?: string;
  mode?: "std" | "pro";
  callbackUrl?: string;
}): Promise<{ taskId: string; status: string }> {
  const body: Record<string, unknown> = {
    image: params.imageUrl,
    sound_file: params.audioUrl,
    mode: params.mode || "std",
  };
  if (params.prompt) body.prompt = params.prompt;
  if (params.callbackUrl) body.callback_url = params.callbackUrl;

  const result = await klingRequest("POST", "/v1/videos/avatar/image2video", body);
  if (result.code !== 0) {
    throw new Error(`Kling Avatar API error: ${result.message}`);
  }
  return {
    taskId: result.data.task_id,
    status: result.data.task_status,
  };
}

/**
 * Poll Kling AI Avatar task until completion
 * Returns video URL or null on failure
 */
export async function pollKlingAvatarTask(
  taskId: string,
  maxAttempts = 120,
  intervalMs = 3000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const result = await klingRequest(
      "GET",
      `/v1/videos/avatar/image2video/${taskId}`
    );
    if (result.code !== 0) {
      console.error(`[Kling] Poll error for task ${taskId}:`, result.message);
      continue;
    }
    const status = result.data.task_status;
    if (status === "succeed") {
      const videos = result.data.task_result?.videos;
      if (videos && videos.length > 0) {
        return videos[0].url;
      }
      return null;
    }
    if (status === "failed") {
      console.error(
        `[Kling] Task ${taskId} failed:`,
        result.data.task_status_msg
      );
      return null;
    }
    // still processing, continue polling
  }
  console.error(`[Kling] Task ${taskId} timed out after ${maxAttempts} attempts`);
  return null;
}

/**
 * Kling AI Text-to-Speech API
 * Returns audio_id for use with avatar API
 */
export async function createKlingTTS(params: {
  text: string;
  voiceId?: string;
}): Promise<{ taskId: string; audioId?: string }> {
  const body: Record<string, unknown> = {
    text: params.text,
  };
  if (params.voiceId) body.voice_id = params.voiceId;

  const result = await klingRequest("POST", "/v1/audio/tts", body);
  if (result.code !== 0) {
    throw new Error(`Kling TTS API error: ${result.message}`);
  }
  return {
    taskId: result.data.task_id,
    audioId: result.data.audio_id,
  };
}

/**
 * Check if Kling AI is configured
 */
export function isKlingConfigured(): boolean {
  return !!(ENV.klingAccessKey && ENV.klingSecretKey);
}
