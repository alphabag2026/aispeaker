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
