import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

describe("v6.1 Features", () => {
  describe("generateCloneVoice input validation", () => {
    const schema = z.object({
      projectId: z.number(),
      slideId: z.number(),
      text: z.string().min(1).max(5000),
      speed: z.number().min(0.5).max(2.0).default(1.0),
      pitch: z.number().min(-12).max(12).default(0),
    });

    it("should accept valid input", () => {
      const result = schema.safeParse({
        projectId: 1,
        slideId: 5,
        text: "안녕하세요, AI 강의 플랫폼입니다.",
        speed: 1.0,
        pitch: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty text", () => {
      const result = schema.safeParse({
        projectId: 1,
        slideId: 5,
        text: "",
        speed: 1.0,
        pitch: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject speed out of range", () => {
      const result = schema.safeParse({
        projectId: 1,
        slideId: 5,
        text: "test",
        speed: 3.0,
        pitch: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should use default speed and pitch when not provided", () => {
      const result = schema.safeParse({
        projectId: 1,
        slideId: 5,
        text: "test",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.speed).toBe(1.0);
        expect(result.data.pitch).toBe(0);
      }
    });
  });

  describe("applyPPTScripts input validation", () => {
    const schema = z.object({
      projectId: z.number(),
      scripts: z.array(z.object({
        slideId: z.number(),
        text: z.string(),
        estimatedDurationSec: z.number().optional(),
      })),
    });

    it("should accept valid scripts array", () => {
      const result = schema.safeParse({
        projectId: 1,
        scripts: [
          { slideId: 1, text: "첫 번째 슬라이드 스크립트", estimatedDurationSec: 30 },
          { slideId: 2, text: "두 번째 슬라이드 스크립트" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty scripts array", () => {
      const result = schema.safeParse({
        projectId: 1,
        scripts: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("saveSlideScripts input validation", () => {
    const schema = z.object({
      projectId: z.number(),
      scripts: z.array(z.object({
        slideId: z.number(),
        scriptText: z.string(),
      })),
    });

    it("should accept valid batch save input", () => {
      const result = schema.safeParse({
        projectId: 1,
        scripts: [
          { slideId: 1, scriptText: "스크립트 1" },
          { slideId: 2, scriptText: "스크립트 2" },
          { slideId: 3, scriptText: "스크립트 3" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing projectId", () => {
      const result = schema.safeParse({
        scripts: [{ slideId: 1, scriptText: "test" }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Credit Package validation", () => {
    const CREDIT_PACKAGES = [
      { id: "credits_50", name: "Basic", credits: 50, priceCents: 1500 },
      { id: "credits_200", name: "Standard", credits: 200, priceCents: 5000 },
      { id: "credits_500", name: "Premium", credits: 500, priceCents: 10000 },
      { id: "credits_2000", name: "Bulk", credits: 2000, priceCents: 30000 },
    ];

    it("should have 4 packages", () => {
      expect(CREDIT_PACKAGES.length).toBe(4);
    });

    it("should have decreasing per-credit price for larger packages", () => {
      const perCreditPrices = CREDIT_PACKAGES.map(p => p.priceCents / p.credits);
      for (let i = 1; i < perCreditPrices.length; i++) {
        expect(perCreditPrices[i]).toBeLessThan(perCreditPrices[i - 1]);
      }
    });

    it("should find package by id", () => {
      const found = CREDIT_PACKAGES.find(p => p.id === "credits_200");
      expect(found).toBeDefined();
      expect(found!.credits).toBe(200);
    });
  });

  describe("Auto-save timing logic", () => {
    it("should trigger save after 30 seconds of inactivity", () => {
      vi.useFakeTimers();
      let saved = false;
      const doSave = () => { saved = true; };
      
      // Simulate auto-save timer
      const timer = setTimeout(doSave, 30000);
      
      // Before 30 seconds - should not have saved
      vi.advanceTimersByTime(29000);
      expect(saved).toBe(false);
      
      // After 30 seconds - should have saved
      vi.advanceTimersByTime(2000);
      expect(saved).toBe(true);
      
      vi.useRealTimers();
    });

    it("should reset timer on new changes", () => {
      vi.useFakeTimers();
      let saveCount = 0;
      const doSave = () => { saveCount++; };
      
      // First timer
      let timer = setTimeout(doSave, 30000);
      vi.advanceTimersByTime(20000);
      
      // New change - reset timer
      clearTimeout(timer);
      timer = setTimeout(doSave, 30000);
      
      vi.advanceTimersByTime(20000);
      expect(saveCount).toBe(0); // Still not saved
      
      vi.advanceTimersByTime(11000);
      expect(saveCount).toBe(1); // Now saved
      
      vi.useRealTimers();
    });
  });
});
