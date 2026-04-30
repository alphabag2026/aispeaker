import jwt from "jsonwebtoken";

const KLING_API_BASE = "https://api.klingai.com";

/**
 * Get KLING keys from process.env directly (supports runtime updates from DB)
 */
function getKlingKeys() {
  return {
    accessKey: process.env.KLING_ACCESS_KEY || "",
    secretKey: process.env.KLING_SECRET_KEY || "",
  };
}

/**
 * Generate a JWT token for KLING API authentication
 * Uses HS256 algorithm with access_key as header kid and secret_key for signing
 */
function generateKlingToken(): string {
  const { accessKey, secretKey } = getKlingKeys();

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
 * Reads process.env directly to support runtime updates from DB
 */
export function isKlingConfigured(): boolean {
  const { accessKey, secretKey } = getKlingKeys();
  return !!(accessKey && secretKey);
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
    { id: "japanese_anime_1", label: "Japanese Anime", emoji: "🎌" },
    { id: "american_comics", label: "American Comics", emoji: "🦸" },
    { id: "3d_cartoon_2", label: "3D Cartoon", emoji: "🧸" },
    { id: "c4d_cartoon_pro", label: "C4D Cartoon Pro", emoji: "✨" },
    { id: "steampunk", label: "Steampunk", emoji: "⚙️" },
    { id: "mythic_style", label: "Mythic Style", emoji: "🏛️" },
    { id: "anime_figure", label: "Anime Figure", emoji: "🎎" },
    { id: "yearbook", label: "Yearbook", emoji: "📸" },
    { id: "instant_film", label: "Instant Film", emoji: "🎞️" },
    { id: "pixelpixel", label: "Pixel Art", emoji: "👾" },
  ],
  fun: [
    { id: "color_mixing", label: "Color Mixing", emoji: "🎨" },
    { id: "bullet_time", label: "Bullet Time", emoji: "🔫" },
    { id: "bullet_time_360", label: "360° Bullet Time", emoji: "🌀" },
    { id: "zoom_out", label: "Zoom Out", emoji: "🔍" },
    { id: "phantom_jewel", label: "Phantom Jewel", emoji: "💎" },
    { id: "guardian_spirit", label: "Guardian Spirit", emoji: "🐉" },
    { id: "magic_fireball", label: "Magic Fireball", emoji: "🔥" },
    { id: "lightning_power", label: "Lightning Power", emoji: "⚡" },
  ],
  transform: [
    { id: "pure_white_wings", label: "White Wings", emoji: "🕊️" },
    { id: "black_wings", label: "Black Wings", emoji: "🦇" },
    { id: "golden_wing", label: "Golden Wings", emoji: "✨" },
    { id: "fairy_wing", label: "Fairy Wings", emoji: "🧚" },
    { id: "angel_wing", label: "Angel Wings", emoji: "👼" },
    { id: "dark_wing", label: "Dark Wings", emoji: "🖤" },
    { id: "throne_of_king", label: "Throne of King", emoji: "👑" },
    { id: "luminous_elf", label: "Luminous Elf", emoji: "🌟" },
  ],
  dance: [
    { id: "swag_dance", label: "Swag Dance", emoji: "💃" },
    { id: "cute_dance", label: "Cute Dance", emoji: "🎀" },
    { id: "ghost_step_dance", label: "Ghost Step", emoji: "👻" },
    { id: "poping", label: "Popping", emoji: "🤖" },
    { id: "heart_gesture_dance", label: "Heart Gesture", emoji: "💕" },
    { id: "motorcycle_dance", label: "Motorcycle Dance", emoji: "🏍️" },
    { id: "subject_3_dance", label: "Subject 3 Dance", emoji: "🎶" },
    { id: "bouncy_dance", label: "Bouncy Dance", emoji: "🦘" },
  ],
  dual: [
    { id: "fight_pro", label: "Fight", emoji: "🥊", dual: true },
    { id: "hug_pro", label: "Hug", emoji: "🤗", dual: true },
    { id: "heart_gesture_pro", label: "Heart Gesture", emoji: "💕", dual: true },
    { id: "kiss_pro", label: "Kiss", emoji: "💋", dual: true },
    { id: "cheers_2026", label: "Cheers", emoji: "🥂", dual: true },
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
