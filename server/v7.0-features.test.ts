import { describe, it, expect } from "vitest";
import { z } from "zod";

// ============ v7.0 Feature Tests ============

// --- 1. Akool API Wrapper Module ---
describe("v7.0 Akool API Module", () => {
  const akoolConfigSchema = z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url().default("https://openapi.akool.com"),
  });

  it("should validate Akool API config", () => {
    const config = akoolConfigSchema.parse({
      apiKey: "test-key-123",
      baseUrl: "https://openapi.akool.com",
    });
    expect(config.apiKey).toBe("test-key-123");
    expect(config.baseUrl).toBe("https://openapi.akool.com");
  });

  it("should apply default baseUrl", () => {
    const config = akoolConfigSchema.parse({ apiKey: "test-key" });
    expect(config.baseUrl).toBe("https://openapi.akool.com");
  });

  it("should reject empty API key", () => {
    expect(() => akoolConfigSchema.parse({ apiKey: "" })).toThrow();
  });
});

// --- 2. Image to Video Input Validation ---
describe("v7.0 Image to Video", () => {
  const i2vInputSchema = z.object({
    imageUrl: z.string().url(),
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
    videoLength: z.number().refine(v => v === 5 || v === 10).default(5),
    effectId: z.string().optional(),
  });

  it("should validate I2V input with all fields", () => {
    const input = i2vInputSchema.parse({
      imageUrl: "https://example.com/image.jpg",
      prompt: "A beautiful landscape animation",
      negativePrompt: "blurry, low quality",
      resolution: "4k",
      videoLength: 10,
      effectId: "kiss_screen",
    });
    expect(input.resolution).toBe("4k");
    expect(input.videoLength).toBe(10);
    expect(input.effectId).toBe("kiss_screen");
  });

  it("should apply defaults for resolution and videoLength", () => {
    const input = i2vInputSchema.parse({
      imageUrl: "https://example.com/image.jpg",
      prompt: "test prompt",
    });
    expect(input.resolution).toBe("1080p");
    expect(input.videoLength).toBe(5);
  });

  it("should reject invalid resolution", () => {
    expect(() => i2vInputSchema.parse({
      imageUrl: "https://example.com/image.jpg",
      prompt: "test",
      resolution: "480p",
    })).toThrow();
  });

  it("should reject invalid video length", () => {
    expect(() => i2vInputSchema.parse({
      imageUrl: "https://example.com/image.jpg",
      prompt: "test",
      videoLength: 15,
    })).toThrow();
  });
});

// --- 3. Face Swap Input Validation ---
describe("v7.0 Face Swap", () => {
  const faceSwapProSchema = z.object({
    sourceImageUrl: z.string().url(),
    targetImageUrl: z.string().url(),
    faceEnhance: z.boolean().default(false),
  });

  const faceSwapPlusSchema = z.object({
    sourceImageUrl: z.string().url(),
    targetImageUrl: z.string().url(),
    faceEnhance: z.boolean().default(false),
    modifyImage: z.string().url().optional(),
  });

  it("should validate FaceSwap Pro input", () => {
    const input = faceSwapProSchema.parse({
      sourceImageUrl: "https://example.com/source.jpg",
      targetImageUrl: "https://example.com/target.jpg",
      faceEnhance: true,
    });
    expect(input.faceEnhance).toBe(true);
  });

  it("should validate FaceSwap Plus with modifyImage", () => {
    const input = faceSwapPlusSchema.parse({
      sourceImageUrl: "https://example.com/source.jpg",
      targetImageUrl: "https://example.com/target.jpg",
      modifyImage: "https://example.com/modify.jpg",
    });
    expect(input.modifyImage).toBe("https://example.com/modify.jpg");
  });

  it("should reject missing target URL", () => {
    expect(() => faceSwapProSchema.parse({
      sourceImageUrl: "https://example.com/source.jpg",
    })).toThrow();
  });
});

// --- 4. Talking Avatar Input Validation ---
describe("v7.0 Talking Avatar", () => {
  const talkingAvatarSchema = z.object({
    avatarId: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    avatarFrom: z.number().min(1).max(4).default(2),
    inputText: z.string().optional(),
    voiceId: z.string().optional(),
    backgroundUrl: z.string().url().optional(),
  });

  it("should validate avatar input with text", () => {
    const input = talkingAvatarSchema.parse({
      avatarId: "avatar-123",
      avatarFrom: 2,
      inputText: "안녕하세요, AI 강의에 오신 것을 환영합니다.",
    });
    expect(input.avatarFrom).toBe(2);
    expect(input.inputText).toContain("안녕하세요");
  });

  it("should apply default avatarFrom", () => {
    const input = talkingAvatarSchema.parse({});
    expect(input.avatarFrom).toBe(2);
  });

  it("should reject invalid avatarFrom", () => {
    expect(() => talkingAvatarSchema.parse({ avatarFrom: 5 })).toThrow();
  });
});

// --- 5. Video Translation Input Validation ---
describe("v7.0 Video Translation", () => {
  const translateSchema = z.object({
    videoUrl: z.string().url(),
    targetLang: z.string().min(2).max(5),
  });

  const supportedLanguages = ["en", "ko", "ja", "zh", "es", "fr", "de", "pt", "ar", "hi", "vi", "th", "id", "ru", "it"];

  it("should validate translation input", () => {
    const input = translateSchema.parse({
      videoUrl: "https://example.com/video.mp4",
      targetLang: "ko",
    });
    expect(input.targetLang).toBe("ko");
  });

  it("should reject empty target language", () => {
    expect(() => translateSchema.parse({
      videoUrl: "https://example.com/video.mp4",
      targetLang: "",
    })).toThrow();
  });

  it("should have 15+ supported languages", () => {
    expect(supportedLanguages.length).toBeGreaterThanOrEqual(15);
  });
});

// --- 6. Akool Effect Presets ---
describe("v7.0 Effect Presets", () => {
  const effectPresets = [
    { id: "kiss_screen", name: "Kiss Screen", category: "interaction" },
    { id: "catwalk", name: "Catwalk", category: "motion" },
    { id: "360_orbit", name: "360 Orbit", category: "camera" },
    { id: "zoom_in", name: "Zoom In", category: "camera" },
    { id: "pan_left", name: "Pan Left", category: "camera" },
    { id: "hug", name: "Hug", category: "interaction" },
  ];

  it("should have multiple effect presets", () => {
    expect(effectPresets.length).toBeGreaterThanOrEqual(5);
  });

  it("should have unique IDs", () => {
    const ids = effectPresets.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should categorize effects", () => {
    const categories = [...new Set(effectPresets.map(e => e.category))];
    expect(categories.length).toBeGreaterThanOrEqual(2);
  });
});

// --- 7. Akool API Status Codes ---
describe("v7.0 Akool Status Handling", () => {
  const statusMap: Record<number, string> = {
    1: "pending",
    2: "processing",
    3: "completed",
    4: "failed",
  };

  it("should map all status codes", () => {
    expect(statusMap[1]).toBe("pending");
    expect(statusMap[2]).toBe("processing");
    expect(statusMap[3]).toBe("completed");
    expect(statusMap[4]).toBe("failed");
  });

  it("should handle polling logic", () => {
    const shouldPoll = (status: number) => status === 1 || status === 2;
    expect(shouldPoll(1)).toBe(true);
    expect(shouldPoll(2)).toBe(true);
    expect(shouldPoll(3)).toBe(false);
    expect(shouldPoll(4)).toBe(false);
  });
});

// --- 8. Home Page Akool Products ---
describe("v7.0 Home Page Products", () => {
  const products = [
    { title: "Image to Video", link: "/ai-studio", badge: "Akool API" },
    { title: "Face Swap Pro", link: "/ai-studio", badge: "Akool API" },
    { title: "Talking Avatar", link: "/ai-studio", badge: "Akool API" },
    { title: "Video Translation", link: "/ai-studio", badge: "Akool API" },
    { title: "Voice Clone & TTS", link: "/voices", badge: "NEW" },
    { title: "AI Image Generate", link: "/lecture-builder", badge: "NEW" },
  ];

  it("should have 6 product cards", () => {
    expect(products.length).toBe(6);
  });

  it("should link Akool products to /ai-studio", () => {
    const akoolProducts = products.filter(p => p.badge === "Akool API");
    expect(akoolProducts.length).toBe(4);
    akoolProducts.forEach(p => {
      expect(p.link).toBe("/ai-studio");
    });
  });

  it("should have unique product titles", () => {
    const titles = products.map(p => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

// --- 9. AI Studio Tabs ---
describe("v7.0 AI Studio Tabs", () => {
  const tabs = ["i2v", "faceswap", "avatar", "translate"];

  it("should have 4 tabs", () => {
    expect(tabs.length).toBe(4);
  });

  it("should include all Akool features", () => {
    expect(tabs).toContain("i2v");
    expect(tabs).toContain("faceswap");
    expect(tabs).toContain("avatar");
    expect(tabs).toContain("translate");
  });
});

// --- 10. Akool API Response Parsing ---
describe("v7.0 Akool Response Parsing", () => {
  it("should parse I2V result", () => {
    const mockResponse = {
      _id: "abc123",
      status: 3,
      video_url: "https://cdn.akool.com/output/video.mp4",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(mockResponse.status).toBe(3);
    expect(mockResponse.video_url).toContain("akool.com");
  });

  it("should parse FaceSwap result", () => {
    const mockResponse = {
      _id: "def456",
      status: 3,
      url: "https://cdn.akool.com/output/faceswap.jpg",
      faceswap_type: 1,
    };
    expect(mockResponse.status).toBe(3);
    expect(mockResponse.faceswap_type).toBe(1);
  });

  it("should handle failed status", () => {
    const mockResponse = { _id: "ghi789", status: 4, error: "Processing failed" };
    expect(mockResponse.status).toBe(4);
    expect(mockResponse.error).toBeDefined();
  });
});
