import { describe, it, expect } from "vitest";

/* ═══════════ v7.1 UI Component Data Tests ═══════════ */

describe("v7.1 - Multi-Model Carousel & Effects Gallery", () => {
  
  /* ── AI Model Data Tests ── */
  describe("AI Model Data", () => {
    it("should have at least 8 AI models defined", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      expect(AI_MODELS.length).toBeGreaterThanOrEqual(8);
    });

    it("each model should have required fields", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      for (const model of AI_MODELS) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
        expect(model.logo).toBeTruthy();
        expect(model.gradient).toBeTruthy();
        expect(model.maxResolution).toBeTruthy();
        expect(model.maxDuration).toBeTruthy();
        expect(model.speed).toBeTruthy();
        expect(model.pricing).toBeTruthy();
        expect(model.features.length).toBeGreaterThan(0);
        expect(model.strengths.length).toBeGreaterThan(0);
        expect(["video", "image", "avatar", "audio"]).toContain(model.category);
      }
    });

    it("should have unique model IDs", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      const ids = AI_MODELS.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should include Akool model with Integrated badge", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      const akool = AI_MODELS.find((m) => m.id === "akool-i2v");
      expect(akool).toBeDefined();
      expect(akool!.badge).toBe("Integrated");
      expect(akool!.provider).toBe("Akool");
    });

    it("should include major providers", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      const providers = AI_MODELS.map((m) => m.provider);
      expect(providers).toContain("Kuaishou");
      expect(providers).toContain("Alibaba");
      expect(providers).toContain("ByteDance");
      expect(providers).toContain("OpenAI");
      expect(providers).toContain("Google");
    });

    it("should have both video and image category models", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      const categories = new Set(AI_MODELS.map((m) => m.category));
      expect(categories.has("video")).toBe(true);
      expect(categories.has("image")).toBe(true);
    });

    it("speed values should be Fast, Medium, or Slow", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      for (const model of AI_MODELS) {
        expect(["Fast", "Medium", "Slow"]).toContain(model.speed);
      }
    });
  });

  /* ── Effect Preset Data Tests ── */
  describe("Effect Presets", () => {
    it("should have at least 12 effect presets", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      expect(EFFECT_PRESETS.length).toBeGreaterThanOrEqual(12);
    });

    it("each preset should have required fields", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      for (const effect of EFFECT_PRESETS) {
        expect(effect.id).toBeTruthy();
        expect(effect.name).toBeTruthy();
        expect(effect.description).toBeTruthy();
        expect(["motion", "camera", "style", "special"]).toContain(effect.category);
        expect(effect.gradient).toBeTruthy();
        expect(effect.parameters.length).toBeGreaterThan(0);
        expect(effect.tags.length).toBeGreaterThan(0);
        expect(effect.popularity).toBeGreaterThanOrEqual(1);
        expect(effect.popularity).toBeLessThanOrEqual(5);
        expect(["Easy", "Medium", "Advanced"]).toContain(effect.difficulty);
      }
    });

    it("should have unique effect IDs", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      const ids = EFFECT_PRESETS.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should include signature effects: Kiss Screen, Catwalk, 360 Orbit", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      const names = EFFECT_PRESETS.map((e) => e.name);
      expect(names).toContain("Kiss Screen");
      expect(names).toContain("Catwalk");
      expect(names).toContain("360° Orbit");
    });

    it("should have all four categories represented", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      const categories = new Set(EFFECT_PRESETS.map((e) => e.category));
      expect(categories.has("motion")).toBe(true);
      expect(categories.has("camera")).toBe(true);
      expect(categories.has("style")).toBe(true);
      expect(categories.has("special")).toBe(true);
    });

    it("each parameter should have name, range, and default", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      for (const effect of EFFECT_PRESETS) {
        for (const param of effect.parameters) {
          expect(param.name).toBeTruthy();
          expect(param.range).toBeTruthy();
          expect(param.default).toBeTruthy();
        }
      }
    });

    it("should have difficulty distribution across Easy, Medium, Advanced", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      const difficulties = EFFECT_PRESETS.map((e) => e.difficulty);
      expect(difficulties).toContain("Easy");
      expect(difficulties).toContain("Medium");
      expect(difficulties).toContain("Advanced");
    });
  });

  /* ── Integration Tests ── */
  describe("Integration", () => {
    it("ModelCarousel component should be importable", async () => {
      const mod = await import("../client/src/components/ModelCarousel");
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });

    it("EffectsGallery component should be importable", async () => {
      const mod = await import("../client/src/components/EffectsGallery");
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });

    it("model filtering by category should work correctly", async () => {
      const { AI_MODELS } = await import("../client/src/components/ModelCarousel");
      const videoModels = AI_MODELS.filter((m) => m.category === "video");
      const imageModels = AI_MODELS.filter((m) => m.category === "image");
      expect(videoModels.length).toBeGreaterThan(0);
      expect(imageModels.length).toBeGreaterThan(0);
      expect(videoModels.length + imageModels.length).toBeLessThanOrEqual(AI_MODELS.length);
    });

    it("effect filtering by category should work correctly", async () => {
      const { EFFECT_PRESETS } = await import("../client/src/components/EffectsGallery");
      const motionEffects = EFFECT_PRESETS.filter((e) => e.category === "motion");
      const cameraEffects = EFFECT_PRESETS.filter((e) => e.category === "camera");
      expect(motionEffects.length).toBeGreaterThan(0);
      expect(cameraEffects.length).toBeGreaterThan(0);
    });
  });
});
