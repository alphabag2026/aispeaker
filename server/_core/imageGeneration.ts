/**
 * Image generation helper using the direct Gemini Imagen API.
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

async function generateWithGemini(prompt: string): Promise<Buffer> {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured for image generation");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-image-generation:generateContent?key=${apiKey}`;

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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  const buffer = await generateWithGemini(options.prompt);
  const mimeType = "image/png";

  // Save to storage
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    mimeType
  );
  return { url };
}
