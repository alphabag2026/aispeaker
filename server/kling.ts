import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

const KLING_API_BASE = "https://api.klingai.com";

/**
 * Generate a JWT token for KLING API authentication
 * Uses HS256 algorithm with access_key as header kid and secret_key for signing
 */
function generateKlingToken(): string {
  const accessKey = ENV.klingAccessKey;
  const secretKey = ENV.klingSecretKey;

  if (!accessKey || !secretKey) {
    throw new Error("KLING_ACCESS_KEY or KLING_SECRET_KEY is not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,
    iat: now,
  };

  const token = jwt.sign(payload, secretKey, {
    algorithm: "HS256",
    header: {
      alg: "HS256",
      typ: "JWT",
    },
  });

  return token;
}

/**
 * Make an authenticated request to the KLING API
 */
async function klingRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const token = generateKlingToken();
  const url = `${KLING_API_BASE}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[KLING] API error ${response.status}: ${errorText}`);
    throw new Error(`KLING API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Create an Image-to-Video task
 * @param imageUrl - URL of the source image
 * @param prompt - Optional text prompt to guide the video generation
 * @param duration - Video duration: "5" or "10" seconds
 * @param mode - Generation mode: "std" (standard) or "pro" (professional)
 * @param model - Model name: "kling-v1" or "kling-v1-6" etc.
 */
export async function createImageToVideo(params: {
  imageUrl: string;
  prompt?: string;
  duration?: string;
  mode?: string;
  model?: string;
  aspectRatio?: string;
}): Promise<{
  taskId: string;
  taskStatus: string;
}> {
  const {
    imageUrl,
    prompt = "",
    duration = "5",
    mode = "std",
    model = "kling-v1-6",
    aspectRatio = "16:9",
  } = params;

  const result = await klingRequest("POST", "/v1/videos/image2video", {
    model_name: model,
    image: imageUrl,
    prompt: prompt || undefined,
    negative_prompt: "blurry, distorted face, low quality, deformed",
    cfg_scale: 0.5,
    mode: mode,
    duration: duration,
    aspect_ratio: aspectRatio,
  });

  console.log("[KLING] Image-to-Video task created:", JSON.stringify(result));

  // KLING API returns { code: 0, message: "...", request_id: "...", data: { task_id: "...", task_status: "..." } }
  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  return {
    taskId: result.data.task_id,
    taskStatus: result.data.task_status,
  };
}

/**
 * Query the status of an Image-to-Video task
 */
export async function getImageToVideoStatus(taskId: string): Promise<{
  taskId: string;
  taskStatus: string;
  taskStatusMsg?: string;
  videoUrl?: string;
  videoDuration?: number;
  createdAt?: number;
  updatedAt?: number;
}> {
  const result = await klingRequest(
    "GET",
    `/v1/videos/image2video/${taskId}`
  );

  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  const data = result.data;
  const videoUrl =
    data.task_result?.videos?.[0]?.url || null;

  return {
    taskId: data.task_id,
    taskStatus: data.task_status,
    taskStatusMsg: data.task_status_msg,
    videoUrl: videoUrl,
    videoDuration: data.task_result?.videos?.[0]?.duration,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Create a Text-to-Video task
 */
export async function createTextToVideo(params: {
  prompt: string;
  duration?: string;
  mode?: string;
  model?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}): Promise<{
  taskId: string;
  taskStatus: string;
}> {
  const {
    prompt,
    duration = "5",
    mode = "std",
    model = "kling-v1-6",
    aspectRatio = "16:9",
    negativePrompt = "blurry, distorted, low quality",
  } = params;

  const result = await klingRequest("POST", "/v1/videos/text2video", {
    model_name: model,
    prompt,
    negative_prompt: negativePrompt,
    cfg_scale: 0.5,
    mode: mode,
    duration: duration,
    aspect_ratio: aspectRatio,
  });

  console.log("[KLING] Text-to-Video task created:", JSON.stringify(result));

  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  return {
    taskId: result.data.task_id,
    taskStatus: result.data.task_status,
  };
}

/**
 * Query the status of a Text-to-Video task
 */
export async function getTextToVideoStatus(taskId: string): Promise<{
  taskId: string;
  taskStatus: string;
  taskStatusMsg?: string;
  videoUrl?: string;
  videoDuration?: number;
}> {
  const result = await klingRequest(
    "GET",
    `/v1/videos/text2video/${taskId}`
  );

  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  const data = result.data;
  const videoUrl =
    data.task_result?.videos?.[0]?.url || null;

  return {
    taskId: data.task_id,
    taskStatus: data.task_status,
    taskStatusMsg: data.task_status_msg,
    videoUrl: videoUrl,
    videoDuration: data.task_result?.videos?.[0]?.duration,
  };
}

/**
 * Check if KLING API is configured
 */
export function isKlingConfigured(): boolean {
  return !!(ENV.klingAccessKey && ENV.klingSecretKey);
}

/**
 * ═══════════════════════════════════════════════════════════
 * v8.1 - Video Effects (V2V Style Transfer)
 * POST /v1/videos/effects
 * ═══════════════════════════════════════════════════════════
 */

/** Popular video effects categories for UI */
export const VIDEO_EFFECT_CATEGORIES = {
  style: [
    { id: "japanese_anime_1", label: "일본 애니메이션", emoji: "🎌" },
    { id: "american_comics", label: "미국 코믹스", emoji: "🦸" },
    { id: "3d_cartoon_2", label: "3D 카툰", emoji: "🧸" },
    { id: "c4d_cartoon_pro", label: "C4D 카툰 Pro", emoji: "✨" },
    { id: "steampunk", label: "스팀펑크", emoji: "⚙️" },
    { id: "mythic_style", label: "신화 스타일", emoji: "🏛️" },
    { id: "anime_figure", label: "애니메 피규어", emoji: "🎎" },
    { id: "yearbook", label: "졸업앨범", emoji: "📸" },
    { id: "instant_film", label: "인스턴트 필름", emoji: "🎞️" },
    { id: "pixelpixel", label: "픽셀 아트", emoji: "👾" },
  ],
  fun: [
    { id: "color_mixing", label: "컬러 믹싱", emoji: "🎨" },
    { id: "bullet_time", label: "불릿 타임", emoji: "🔫" },
    { id: "bullet_time_360", label: "360° 불릿 타임", emoji: "🌀" },
    { id: "zoom_out", label: "줌 아웃", emoji: "🔍" },
    { id: "phantom_jewel", label: "팬텀 주얼", emoji: "💎" },
    { id: "guardian_spirit", label: "수호 정령", emoji: "🐉" },
    { id: "magic_fireball", label: "매직 파이어볼", emoji: "🔥" },
    { id: "lightning_power", label: "라이트닝 파워", emoji: "⚡" },
  ],
  transform: [
    { id: "pure_white_wings", label: "화이트 윙", emoji: "🕊️" },
    { id: "black_wings", label: "블랙 윙", emoji: "🦇" },
    { id: "golden_wing", label: "골든 윙", emoji: "✨" },
    { id: "fairy_wing", label: "페어리 윙", emoji: "🧚" },
    { id: "angel_wing", label: "엔젤 윙", emoji: "👼" },
    { id: "dark_wing", label: "다크 윙", emoji: "🖤" },
    { id: "throne_of_king", label: "왕좌", emoji: "👑" },
    { id: "luminous_elf", label: "빛나는 엘프", emoji: "🌟" },
  ],
  dance: [
    { id: "swag_dance", label: "스웨그 댄스", emoji: "💃" },
    { id: "cute_dance", label: "큐트 댄스", emoji: "🎀" },
    { id: "ghost_step_dance", label: "고스트 스텝", emoji: "👻" },
    { id: "poping", label: "팝핑", emoji: "🤖" },
    { id: "heart_gesture_dance", label: "하트 제스처", emoji: "💕" },
    { id: "motorcycle_dance", label: "모터사이클 댄스", emoji: "🏍️" },
    { id: "subject_3_dance", label: "과목3 댄스", emoji: "🎶" },
    { id: "bouncy_dance", label: "바운시 댄스", emoji: "🦘" },
  ],
  dual: [
    { id: "fight_pro", label: "파이트", emoji: "🥊", dual: true },
    { id: "hug_pro", label: "허그", emoji: "🤗", dual: true },
    { id: "heart_gesture_pro", label: "하트 제스처", emoji: "💕", dual: true },
    { id: "kiss_pro", label: "키스", emoji: "💋", dual: true },
    { id: "cheers_2026", label: "건배", emoji: "🥂", dual: true },
  ],
};

/**
 * Create a Video Effects task
 */
export async function createVideoEffect(params: {
  effectScene: string;
  imageUrl?: string;
  imageUrls?: string[];
}): Promise<{ taskId: string; taskStatus: string }> {
  const { effectScene, imageUrl, imageUrls } = params;

  const input: any = {};
  if (imageUrls && imageUrls.length === 2) {
    input.images = imageUrls;
  } else if (imageUrl) {
    input.image = imageUrl;
  } else {
    throw new Error("imageUrl or imageUrls is required");
  }

  const result = await klingRequest("POST", "/v1/videos/effects", {
    effect_scene: effectScene,
    input,
  });

  console.log("[KLING] Video Effect task created:", JSON.stringify(result));

  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  return {
    taskId: result.data.task_id,
    taskStatus: result.data.task_status,
  };
}

/**
 * Query the status of a Video Effects task
 */
export async function getVideoEffectStatus(taskId: string): Promise<{
  taskId: string;
  taskStatus: string;
  taskStatusMsg?: string;
  videoUrl?: string;
}> {
  const result = await klingRequest("GET", `/v1/videos/effects/${taskId}`);

  if (result.code !== 0) {
    throw new Error(`KLING API error: ${result.message}`);
  }

  const data = result.data;
  const videoUrl = data.task_result?.videos?.[0]?.url || null;

  return {
    taskId: data.task_id,
    taskStatus: data.task_status,
    taskStatusMsg: data.task_status_msg,
    videoUrl,
  };
}
