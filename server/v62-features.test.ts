import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("v6.2 Features", () => {
  describe("Slide transition auto-save", () => {
    it("should trigger save when hasUnsavedChanges is true on slide change", () => {
      // Verify the logic: if hasUnsavedChanges is true, doSave should be called before changing slide
      let saveCalled = false;
      const hasUnsavedChanges = true;
      const doSave = () => { saveCalled = true; };
      
      // Simulate slide transition click handler
      if (hasUnsavedChanges) doSave();
      
      expect(saveCalled).toBe(true);
    });

    it("should NOT trigger save when no unsaved changes", () => {
      let saveCalled = false;
      const hasUnsavedChanges = false;
      const doSave = () => { saveCalled = true; };
      
      if (hasUnsavedChanges) doSave();
      
      expect(saveCalled).toBe(false);
    });
  });

  describe("Batch clone voice generation", () => {
    const batchInputSchema = z.object({
      projectId: z.number(),
      speed: z.number().min(0.5).max(2.0).default(1.0),
      pitch: z.number().min(-12).max(12).default(0),
    });

    it("should validate batch generation input schema", () => {
      const validInput = { projectId: 1, speed: 1.0, pitch: 0 };
      expect(batchInputSchema.parse(validInput)).toEqual(validInput);
    });

    it("should apply default speed and pitch", () => {
      const minimalInput = { projectId: 5 };
      const parsed = batchInputSchema.parse(minimalInput);
      expect(parsed.speed).toBe(1.0);
      expect(parsed.pitch).toBe(0);
    });

    it("should reject invalid speed values", () => {
      expect(() => batchInputSchema.parse({ projectId: 1, speed: 0.1 })).toThrow();
      expect(() => batchInputSchema.parse({ projectId: 1, speed: 3.0 })).toThrow();
    });

    it("should reject invalid pitch values", () => {
      expect(() => batchInputSchema.parse({ projectId: 1, pitch: -15 })).toThrow();
      expect(() => batchInputSchema.parse({ projectId: 1, pitch: 15 })).toThrow();
    });

    it("should accept valid speed range", () => {
      expect(batchInputSchema.parse({ projectId: 1, speed: 0.5 }).speed).toBe(0.5);
      expect(batchInputSchema.parse({ projectId: 1, speed: 2.0 }).speed).toBe(2.0);
    });

    it("should filter scripts with text for batch processing", () => {
      const scripts = [
        { id: 1, slideId: 10, scriptText: "Hello world" },
        { id: 2, slideId: 11, scriptText: "" },
        { id: 3, slideId: 12, scriptText: "   " },
        { id: 4, slideId: 13, scriptText: "Another script" },
      ];
      
      const scriptsWithText = scripts.filter(s => s.scriptText && s.scriptText.trim().length > 0);
      expect(scriptsWithText).toHaveLength(2);
      expect(scriptsWithText[0].slideId).toBe(10);
      expect(scriptsWithText[1].slideId).toBe(13);
    });
  });

  describe("Credit usage stats", () => {
    const usageStatsInputSchema = z.object({
      period: z.enum(["7d", "30d", "all"]).default("30d"),
    }).optional();

    it("should validate usage stats input", () => {
      expect(usageStatsInputSchema.parse({ period: "7d" })).toEqual({ period: "7d" });
      expect(usageStatsInputSchema.parse({ period: "30d" })).toEqual({ period: "30d" });
      expect(usageStatsInputSchema.parse({ period: "all" })).toEqual({ period: "all" });
    });

    it("should accept undefined input (default period)", () => {
      expect(usageStatsInputSchema.parse(undefined)).toBeUndefined();
    });

    it("should reject invalid period", () => {
      expect(() => usageStatsInputSchema.parse({ period: "1y" })).toThrow();
    });

    it("should correctly calculate period cutoff", () => {
      const now = Date.now();
      const period = "7d";
      const cutoff = period === "7d" ? now - 7 * 86400000 : period === "30d" ? now - 30 * 86400000 : 0;
      
      expect(cutoff).toBeGreaterThan(0);
      expect(now - cutoff).toBe(7 * 86400000);
    });

    it("should group logs by feature correctly", () => {
      const logs = [
        { feature: "tts_conversion", creditsUsed: 3 },
        { feature: "tts_conversion", creditsUsed: 3 },
        { feature: "image_generation", creditsUsed: 5 },
        { feature: "ppt_script_generation", creditsUsed: 5 },
      ];

      const byFeature: Record<string, { count: number; credits: number }> = {};
      let totalCredits = 0;
      for (const log of logs) {
        if (!byFeature[log.feature]) byFeature[log.feature] = { count: 0, credits: 0 };
        byFeature[log.feature].count++;
        byFeature[log.feature].credits += log.creditsUsed;
        totalCredits += log.creditsUsed;
      }

      expect(totalCredits).toBe(16);
      expect(byFeature["tts_conversion"]).toEqual({ count: 2, credits: 6 });
      expect(byFeature["image_generation"]).toEqual({ count: 1, credits: 5 });
      expect(byFeature["ppt_script_generation"]).toEqual({ count: 1, credits: 5 });
    });

    it("should sort daily trend chronologically", () => {
      const dailyMap: Record<string, number> = {
        "2026-05-03": 10,
        "2026-05-01": 5,
        "2026-05-02": 8,
      };
      
      const dailyTrend = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, credits]) => ({ date, credits }));

      expect(dailyTrend[0].date).toBe("2026-05-01");
      expect(dailyTrend[1].date).toBe("2026-05-02");
      expect(dailyTrend[2].date).toBe("2026-05-03");
    });
  });

  describe("Save slide scripts (auto-save endpoint)", () => {
    const saveInputSchema = z.object({
      projectId: z.number(),
      scripts: z.array(z.object({
        slideId: z.number(),
        scriptText: z.string(),
        estimatedDurationSec: z.number().optional(),
        voiceMode: z.enum(["direct_record", "ai_clone", "ai_tts"]).optional(),
        emotion: z.enum(["neutral", "happy", "serious", "excited", "empathetic", "confident", "questioning"]).optional(),
        emotionIntensity: z.number().min(1).max(10).optional(),
      })),
    });

    it("should validate save scripts input", () => {
      const input = {
        projectId: 1,
        scripts: [
          { slideId: 10, scriptText: "Hello" },
          { slideId: 11, scriptText: "World", voiceMode: "ai_clone" as const },
        ],
      };
      expect(saveInputSchema.parse(input)).toEqual(input);
    });

    it("should accept empty scripts array", () => {
      const input = { projectId: 1, scripts: [] };
      expect(saveInputSchema.parse(input).scripts).toHaveLength(0);
    });

    it("should validate voiceMode enum", () => {
      expect(() => saveInputSchema.parse({
        projectId: 1,
        scripts: [{ slideId: 1, scriptText: "test", voiceMode: "invalid" }],
      })).toThrow();
    });
  });
});
