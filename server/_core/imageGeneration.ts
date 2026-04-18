/**
 * Image generation helper with Gemini Imagen fallback
 *
 * - If BUILT_IN_FORGE_API_URL is set, use Forge ImageService
 * - Otherwise, if GEMINI_API_KEY is set, use Gemini Imagen API
 * - If neither is available, throw a descriptive error
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

/**
 * Generate image using Gemini Imagen API (fallback when Forge is unavailable)
 */
async function generateWithGemini(prompt: string): Promise<Buffer> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured for image generation");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate an image: ${prompt}. Create a visually appealing, professional thumbnail image.`
        }]
      }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini image generation failed (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();
  
  // Extract image from Gemini response
  const candidates = result.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64");
      }
    }
  }

  throw new Error("Gemini did not return an image in the response");
}

/**
 * Generate image using Forge ImageService
 */
async function generateWithForge(options: GenerateImageOptions): Promise<{ buffer: Buffer; mimeType: string }> {
  const baseUrl = ENV.forgeApiUrl!.endsWith("/")
    ? ENV.forgeApiUrl!
    : `${ENV.forgeApiUrl!}/`;
  const fullUrl = new URL(
    "images.v1.ImageService/GenerateImage",
    baseUrl
  ).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };
  return {
    buffer: Buffer.from(result.image.b64Json, "base64"),
    mimeType: result.image.mimeType,
  };
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  let buffer: Buffer;
  let mimeType = "image/png";

  // Try Forge first, then Gemini fallback
  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    const result = await generateWithForge(options);
    buffer = result.buffer;
    mimeType = result.mimeType;
  } else if (ENV.geminiApiKey) {
    console.log("[ImageGen] Forge not available, using Gemini Imagen fallback");
    buffer = await generateWithGemini(options.prompt);
  } else {
    throw new Error(
      "이미지 생성 서비스를 사용할 수 없습니다. BUILT_IN_FORGE_API_URL 또는 GEMINI_API_KEY를 설정해주세요."
    );
  }

  // Save to storage
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    mimeType
  );
  return { url };
}
