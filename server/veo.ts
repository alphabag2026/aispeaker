/**
 * Google Veo 3.1 API Helper
 * - Text-to-video and image-to-video generation
 * - Async operation polling
 * - Uses Gemini API key for authentication
 */
import { ENV } from "./_core/env";

const VEO_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-3.1-generate-preview";

/**
 * Make authenticated request to Google Veo API
 */
async function veoRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<any> {
  const url = `${VEO_API_BASE}${path}`;
  const headers: Record<string, string> = {
    "x-goog-api-key": ENV.geminiApiKey,
    "Content-Type": "application/json",
  };
  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Veo API error ${response.status}: ${errText}`);
  }
  return response.json();
}

/**
 * Generate video from text prompt using Veo 3.1
 * Returns operation name for polling
 */
export async function createVeoTextToVideo(params: {
  prompt: string;
  aspectRatio?: "16:9" | "9:16";
  resolution?: "720p" | "1080p" | "4k";
}): Promise<{ operationName: string }> {
  const body: Record<string, unknown> = {
    instances: [{ prompt: params.prompt }],
    parameters: {} as Record<string, string>,
  };
  const parameters = body.parameters as Record<string, string>;
  if (params.aspectRatio) parameters.aspectRatio = params.aspectRatio;
  if (params.resolution) parameters.resolution = params.resolution;

  const result = await veoRequest(
    "POST",
    `/models/${VEO_MODEL}:generateVideos`,
    body
  );
  return { operationName: result.name };
}

/**
 * Generate video from image + prompt using Veo 3.1
 * Returns operation name for polling
 */
export async function createVeoImageToVideo(params: {
  prompt: string;
  imageUrl: string;
  aspectRatio?: "16:9" | "9:16";
  resolution?: "720p" | "1080p" | "4k";
}): Promise<{ operationName: string }> {
  // Download image and convert to base64
  const imageResponse = await fetch(params.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64Image = imageBuffer.toString("base64");
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  const body: Record<string, unknown> = {
    instances: [{
      prompt: params.prompt,
      image: {
        bytesBase64Encoded: base64Image,
        mimeType: contentType,
      },
    }],
    parameters: {} as Record<string, string>,
  };
  const parameters = body.parameters as Record<string, string>;
  if (params.aspectRatio) parameters.aspectRatio = params.aspectRatio;
  if (params.resolution) parameters.resolution = params.resolution;

  const result = await veoRequest(
    "POST",
    `/models/${VEO_MODEL}:generateVideos`,
    body
  );
  return { operationName: result.name };
}

/**
 * Poll Veo operation until completion
 * Returns video URL or null on failure
 */
export async function pollVeoOperation(
  operationName: string,
  maxAttempts = 120,
  intervalMs = 5000
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const result = await veoRequest("GET", `/${operationName}`);
      if (result.done) {
        const videos = result.response?.generatedVideos;
        if (videos && videos.length > 0) {
          const videoUri = videos[0].video?.uri;
          if (videoUri) {
            // Download the video using the URI with API key
            return videoUri;
          }
        }
        console.error(`[Veo] Operation completed but no video found:`, JSON.stringify(result));
        return null;
      }
      // still processing
    } catch (error) {
      console.error(`[Veo] Poll error for ${operationName}:`, error);
    }
  }
  console.error(`[Veo] Operation ${operationName} timed out after ${maxAttempts} attempts`);
  return null;
}

/**
 * Download Veo video from URI (requires API key auth)
 * Returns Buffer of video data
 */
export async function downloadVeoVideo(videoUri: string): Promise<Buffer | null> {
  try {
    const response = await fetch(videoUri, {
      headers: { "x-goog-api-key": ENV.geminiApiKey },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`[Veo] Download failed: ${response.status}`);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error(`[Veo] Download error:`, error);
    return null;
  }
}

/**
 * Check if Veo is configured
 */
export function isVeoConfigured(): boolean {
  return !!ENV.geminiApiKey;
}
