import { describe, it, expect } from "vitest";
import { CREDIT_COSTS } from "./stripe";

describe("v8.1 - Credit System", () => {
  it("should have all v8.1 AI Studio features defined in CREDIT_COSTS", () => {
    const v81Features = [
      "image_generation",
      "bg_remove",
      "voice_clone",
      "voice_change",
      "video_effects",
      "image_to_video",
      "face_swap",
      "talking_avatar",
      "video_translate",
    ];
    for (const feature of v81Features) {
      expect(CREDIT_COSTS).toHaveProperty(feature);
      expect((CREDIT_COSTS as any)[feature]).toBeGreaterThan(0);
    }
  });

  it("should have correct credit costs for each feature", () => {
    expect(CREDIT_COSTS.image_generation).toBe(5);
    expect(CREDIT_COSTS.bg_remove).toBe(3);
    expect(CREDIT_COSTS.voice_clone).toBe(5);
    expect(CREDIT_COSTS.voice_change).toBe(3);
    expect(CREDIT_COSTS.video_effects).toBe(15);
    expect(CREDIT_COSTS.image_to_video).toBe(20);
    expect(CREDIT_COSTS.face_swap).toBe(25);
    expect(CREDIT_COSTS.talking_avatar).toBe(20);
    expect(CREDIT_COSTS.video_translate).toBe(30);
  });

  it("should have original features still defined", () => {
    expect(CREDIT_COSTS.script_generation).toBe(5);
    expect(CREDIT_COSTS.tts_conversion).toBe(3);
    expect(CREDIT_COSTS.avatar_video).toBe(20);
    expect(CREDIT_COSTS.deepfake_transform).toBe(30);
    expect(CREDIT_COSTS.thumbnail_generation).toBe(2);
    expect(CREDIT_COSTS.subtitle_generation).toBe(3);
    expect(CREDIT_COSTS.voice_modulation).toBe(5);
    expect(CREDIT_COSTS.live_broadcast).toBe(10);
  });

  it("should have all features as positive integers", () => {
    for (const [key, value] of Object.entries(CREDIT_COSTS)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe("v8.1 - Video Effects (V2V)", () => {
  it("should import kling module without errors", async () => {
    const kling = await import("./kling");
    expect(kling).toHaveProperty("createVideoEffect");
    expect(kling).toHaveProperty("getVideoEffectStatus");
    expect(typeof kling.createVideoEffect).toBe("function");
    expect(typeof kling.getVideoEffectStatus).toBe("function");
  });

  it("should have VIDEO_EFFECT_CATEGORIES defined", async () => {
    const kling = await import("./kling");
    expect(kling).toHaveProperty("VIDEO_EFFECT_CATEGORIES");
    const cats = (kling as any).VIDEO_EFFECT_CATEGORIES;
    expect(cats).toHaveProperty("style");
    expect(cats).toHaveProperty("fun");
    expect(cats).toHaveProperty("transform");
    expect(cats).toHaveProperty("dance");
    expect(cats).toHaveProperty("dual");
    // Each category should have items
    expect(cats.style.length).toBeGreaterThan(0);
    expect(cats.fun.length).toBeGreaterThan(0);
  });
});

describe("v8.1 - Community Gallery DB helpers", () => {
  it("should import gallery db helpers without errors", async () => {
    const dbModule = await import("./db");
    expect(dbModule).toHaveProperty("createGalleryPost");
    expect(dbModule).toHaveProperty("listGalleryPosts");
    expect(dbModule).toHaveProperty("getGalleryPostById");
    expect(dbModule).toHaveProperty("toggleGalleryPostLike");
    expect(dbModule).toHaveProperty("addGalleryPostComment");
    expect(dbModule).toHaveProperty("getGalleryPostComments");
    expect(dbModule).toHaveProperty("incrementGalleryPostView");
  });
});

describe("v8.1 - Route structure", () => {
  it("should have VideoEffectsStudio page component", async () => {
    // Check file exists
    const fs = await import("fs");
    const path = "/home/ubuntu/ai-lecture-platform/client/src/pages/VideoEffectsStudio.tsx";
    expect(fs.existsSync(path)).toBe(true);
    const content = fs.readFileSync(path, "utf-8");
    expect(content).toContain("export default function VideoEffectsStudio");
    expect(content).toContain("trpc.videoEffects");
  });

  it("should have CommunityGallery page component", async () => {
    const fs = await import("fs");
    const path = "/home/ubuntu/ai-lecture-platform/client/src/pages/CommunityGallery.tsx";
    expect(fs.existsSync(path)).toBe(true);
    const content = fs.readFileSync(path, "utf-8");
    expect(content).toContain("export default");
    expect(content).toContain("trpc.community");
  });

  it("should have routes registered in App.tsx", async () => {
    const fs = await import("fs");
    const path = "/home/ubuntu/ai-lecture-platform/client/src/App.tsx";
    const content = fs.readFileSync(path, "utf-8");
    expect(content).toContain("/ai-studio/video-effects");
    expect(content).toContain("/community");
    expect(content).toContain("VideoEffectsStudio");
    expect(content).toContain("CommunityGallery");
  });
});

describe("v8.1 - Pricing page updates", () => {
  it("should include v8.1 features in pricing page", async () => {
    const fs = await import("fs");
    const path = "/home/ubuntu/ai-lecture-platform/client/src/pages/Pricing.tsx";
    const content = fs.readFileSync(path, "utf-8");
    expect(content).toContain("pricing.credit.image");
    expect(content).toContain("pricing.credit.background");
    expect(content).toContain("pricing.credit.voice_clone");
    expect(content).toContain("pricing.credit.video_effect");
    expect(content).toContain("pricing.credit.face_swap");
    expect(content).toContain("pricing.credit.video_translate");
  });
});
