/**
 * Akool API Integration Module
 * Provides wrappers for Akool's AI services:
 * - Image to Video (I2V)
 * - Face Swap (Pro & Plus)
 * - Talking Avatar
 * - Video Translation
 * - Voice Lab (TTS + Voice Clone)
 * - Image Generation
 * - AI Model listing
 */

const AKOOL_BASE = "https://openapi.akool.com";

function getApiKey(): string {
  const key = process.env.AKOOL_API_KEY;
  if (!key) throw new Error("AKOOL_API_KEY is not configured");
  return key;
}

function headers(): Record<string, string> {
  return {
    "x-api-key": getApiKey(),
    "Content-Type": "application/json",
  };
}

async function akoolFetch(path: string, options?: RequestInit) {
  const url = `${AKOOL_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(), ...(options?.headers as Record<string, string>) },
  });
  const json = await res.json();
  if (json.code !== 1000) {
    throw new Error(`Akool API error: ${json.msg || JSON.stringify(json)}`);
  }
  return json;
}

// ==================== Image to Video ====================

export interface I2VCreateParams {
  image_url: string;
  prompt: string;
  negative_prompt?: string;
  extend_prompt?: boolean;
  resolution?: "720p" | "1080p" | "4k";
  audio_url?: string;
  audio_type?: number;
  video_length?: 5 | 10;
  is_premium_model?: boolean;
  effect_code?: string;
  webhookurl?: string;
}

export async function createImageToVideo(params: I2VCreateParams) {
  return akoolFetch("/api/open/v4/image2Video/createBySourcePrompt", {
    method: "POST",
    body: JSON.stringify({
      extend_prompt: true,
      resolution: "1080p",
      video_length: 5,
      ...params,
    }),
  });
}

export async function getImageToVideoResult(id: string) {
  return akoolFetch(`/api/open/v4/image2Video/result?_id=${id}`);
}

export async function getI2VEffects() {
  return akoolFetch("/api/open/v4/image2Video/effects");
}

export async function deleteImageToVideo(id: string) {
  return akoolFetch(`/api/open/v4/image2Video?_id=${id}`, { method: "DELETE" });
}

// ==================== Face Swap ====================

export interface FaceSwapProParams {
  sourceImage: { path: string }[];
  targetImage: { path: string }[];
  model_name?: string;
  face_enhance?: boolean;
  webhookUrl?: string;
}

export async function faceSwapPro(params: FaceSwapProParams) {
  return akoolFetch("/api/open/v4/faceswap/faceswapByImage", {
    method: "POST",
    body: JSON.stringify({
      model_name: "akool_faceswap_image_hq",
      face_enhance: false,
      ...params,
    }),
  });
}

export interface FaceSwapPlusParams {
  source_url: string;
  target_url: string;
  model_style?: string;
  face_enhance?: boolean;
  single_face_mode?: boolean;
  face_mapping?: {
    source_face_info: { face_url: string };
    target_face_info: { face_url: string };
  }[];
  webhookUrl?: string;
}

export async function faceSwapPlus(params: FaceSwapPlusParams) {
  return akoolFetch("/api/open/v4/faceswap/faceswapPlusByImage", {
    method: "POST",
    body: JSON.stringify({
      model_style: "realistic",
      face_enhance: false,
      single_face_mode: true,
      ...params,
    }),
  });
}

export async function getFaceSwapResult(id: string) {
  return akoolFetch(`/api/open/v3/faceswap/result?_id=${id}`);
}

// ==================== Talking Avatar ====================

export async function getAvatarList(page = 1, size = 100) {
  return akoolFetch(`/api/open/v3/avatar/list?from=2&page=${page}&size=${size}`);
}

export interface TalkingAvatarElement {
  type: "avatar" | "image" | "audio";
  url?: string;
  scale_x?: number;
  scale_y?: number;
  offset_x?: number;
  offset_y?: number;
  width?: number;
  height?: number;
  avatar_id?: string;
  input_text?: string;
  voice_id?: string;
}

export interface CreateTalkingAvatarParams {
  width?: number;
  height?: number;
  avatar_from?: number;
  elements: TalkingAvatarElement[];
  webhookUrl?: string;
}

export async function createTalkingAvatar(params: CreateTalkingAvatarParams) {
  return akoolFetch("/api/open/v3/talkingavatar/create", {
    method: "POST",
    body: JSON.stringify({
      width: 3840,
      height: 2160,
      avatar_from: 2,
      ...params,
    }),
  });
}

export async function getTalkingAvatarResult(videoId: string) {
  return akoolFetch(`/api/open/v3/talkingavatar/videoinfo?video_id=${videoId}`);
}

// ==================== Video Translation ====================

export interface VideoTranslationParams {
  video_url: string;
  target_language: string;
  webhookUrl?: string;
}

export async function createVideoTranslation(params: VideoTranslationParams) {
  return akoolFetch("/api/open/v3/videotranslation/create", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getVideoTranslationResult(id: string) {
  return akoolFetch(`/api/open/v3/videotranslation/result?_id=${id}`);
}

// ==================== AI Models ====================

export async function getAIModels() {
  return akoolFetch("/api/open/v4/image2Video/models");
}

// ==================== User Credits ====================

export async function getUserCredits() {
  return akoolFetch("/api/open/v3/faceswap/user/creditInfo");
}

// ==================== Polling Helper ====================

export type AkoolStatus = 1 | 2 | 3 | 4; // 1=pending, 2=processing, 3=completed, 4=failed

export async function pollResult(
  fetcher: () => Promise<any>,
  opts: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<any> {
  const { maxAttempts = 60, intervalMs = 5000 } = opts;
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fetcher();
    const status = result?.data?.status ?? result?.data?.faceswap_status;
    if (status === 3) return result; // completed
    if (status === 4) throw new Error("Akool processing failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Akool polling timeout");
}
