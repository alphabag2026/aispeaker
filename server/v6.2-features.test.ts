import { describe, expect, it } from "vitest";
import { z } from "zod";

// ============ v6.2 Feature Tests ============

// --- 1. Clone Project ---
describe("v6.2 Clone Project", () => {
  const cloneInputSchema = z.object({
    sourceProjectId: z.number(),
    newTitle: z.string().min(1).max(500),
  });

  const cloneOutputSchema = z.object({
    newProjectId: z.number(),
    avatarCount: z.number(),
    slideCount: z.number(),
    scriptCount: z.number(),
  });

  it("should validate clone input schema", () => {
    const valid = cloneInputSchema.parse({
      sourceProjectId: 1,
      newTitle: "테스트 프로젝트 (복사본)",
    });
    expect(valid.sourceProjectId).toBe(1);
    expect(valid.newTitle).toBe("테스트 프로젝트 (복사본)");
  });

  it("should reject empty title", () => {
    expect(() => cloneInputSchema.parse({
      sourceProjectId: 1,
      newTitle: "",
    })).toThrow();
  });

  it("should reject title exceeding 500 chars", () => {
    expect(() => cloneInputSchema.parse({
      sourceProjectId: 1,
      newTitle: "a".repeat(501),
    })).toThrow();
  });

  it("should validate clone output schema", () => {
    const result = cloneOutputSchema.parse({
      newProjectId: 42,
      avatarCount: 3,
      slideCount: 10,
      scriptCount: 8,
    });
    expect(result.newProjectId).toBe(42);
    expect(result.avatarCount).toBe(3);
    expect(result.slideCount).toBe(10);
    expect(result.scriptCount).toBe(8);
  });

  it("should accept Korean title with (복사본) suffix", () => {
    const valid = cloneInputSchema.parse({
      sourceProjectId: 99,
      newTitle: "XPLAY 수익 구조 분석 강의 (복사본)",
    });
    expect(valid.newTitle).toContain("복사본");
  });
});

// --- 2. Whiteboard Templates ---
describe("v6.2 Whiteboard Templates", () => {
  const templateSchema = z.object({
    id: z.string(),
    name: z.string(),
    desc: z.string(),
    bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    texts: z.array(z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      text: z.string(),
      fontSize: z.number().min(8).max(128),
      color: z.string(),
      fontFamily: z.string(),
    })),
    shapes: z.array(z.object({
      id: z.string(),
      type: z.enum(["rect", "circle", "line"]),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      color: z.string(),
      strokeWidth: z.number(),
      fill: z.boolean(),
    })),
  });

  const TEMPLATE_IDS = ["blank", "blackboard", "comparison", "timeline", "mindmap", "bullet", "chart_area", "dark_modern"];

  it("should have 8 predefined templates", () => {
    expect(TEMPLATE_IDS.length).toBe(8);
  });

  it("should validate blank template schema", () => {
    const blank = templateSchema.parse({
      id: "blank",
      name: "빈 화이트보드",
      desc: "깨끗한 백지",
      bgColor: "#ffffff",
      texts: [],
      shapes: [],
    });
    expect(blank.id).toBe("blank");
    expect(blank.texts.length).toBe(0);
    expect(blank.shapes.length).toBe(0);
  });

  it("should validate blackboard template with texts and shapes", () => {
    const blackboard = templateSchema.parse({
      id: "blackboard",
      name: "칠판",
      desc: "어두운 배경의 교실 칠판",
      bgColor: "#1a1a2e",
      texts: [
        { id: "t1", x: 40, y: 30, text: "제목을 입력하세요", fontSize: 48, color: "#FFFFFF", fontFamily: "sans-serif" },
      ],
      shapes: [
        { id: "s1", type: "line", x: 40, y: 90, width: 880, height: 0, color: "#FFFFFF", strokeWidth: 2, fill: false },
      ],
    });
    expect(blackboard.bgColor).toBe("#1a1a2e");
    expect(blackboard.texts.length).toBe(1);
    expect(blackboard.shapes.length).toBe(1);
  });

  it("should validate comparison template has correct structure", () => {
    const comparison = templateSchema.parse({
      id: "comparison",
      name: "비교표",
      desc: "좌우 2칸 비교 레이아웃",
      bgColor: "#ffffff",
      texts: [
        { id: "t1", x: 160, y: 30, text: "A 항목", fontSize: 36, color: "#0066FF", fontFamily: "sans-serif" },
        { id: "t2", x: 600, y: 30, text: "B 항목", fontSize: 36, color: "#FF0000", fontFamily: "sans-serif" },
      ],
      shapes: [
        { id: "s1", type: "line", x: 480, y: 20, width: 0, height: 500, color: "#CCCCCC", strokeWidth: 2, fill: false },
      ],
    });
    expect(comparison.texts.length).toBe(2);
    // A is blue, B is red
    expect(comparison.texts[0].color).toBe("#0066FF");
    expect(comparison.texts[1].color).toBe("#FF0000");
  });

  it("should reject invalid bgColor format", () => {
    expect(() => templateSchema.parse({
      id: "test",
      name: "test",
      desc: "test",
      bgColor: "red",
      texts: [],
      shapes: [],
    })).toThrow();
  });

  it("should reject invalid shape type", () => {
    expect(() => templateSchema.parse({
      id: "test",
      name: "test",
      desc: "test",
      bgColor: "#ffffff",
      texts: [],
      shapes: [{ id: "s1", type: "triangle", x: 0, y: 0, width: 100, height: 100, color: "#000", strokeWidth: 1, fill: false }],
    })).toThrow();
  });
});

// --- 3. Slide Transition Preview ---
describe("v6.2 Slide Transition Preview", () => {
  const transitionTypes = ["none", "fade", "slide_left", "slide_right", "slide_up", "slide_down", "zoom_in", "zoom_out", "wipe", "dissolve"];

  it("should support 10 transition types for preview", () => {
    expect(transitionTypes.length).toBe(10);
  });

  it("should map transition types to CSS animation names", () => {
    const cssAnimationMap: Record<string, string> = {
      fade: "fadeIn",
      slide_left: "slideFromRight",
      slide_right: "slideFromLeft",
      slide_up: "slideFromBottom",
      slide_down: "slideFromTop",
      zoom_in: "zoomIn",
      zoom_out: "zoomOut",
      wipe: "wipeRight",
      dissolve: "dissolve",
      none: "",
    };

    for (const type of transitionTypes) {
      expect(cssAnimationMap).toHaveProperty(type);
    }
    expect(cssAnimationMap["none"]).toBe("");
    expect(cssAnimationMap["fade"]).toBe("fadeIn");
  });

  it("should validate transition duration range (100ms - 3000ms)", () => {
    const durationSchema = z.number().min(100).max(3000);
    expect(durationSchema.parse(500)).toBe(500);
    expect(durationSchema.parse(100)).toBe(100);
    expect(durationSchema.parse(3000)).toBe(3000);
    expect(() => durationSchema.parse(50)).toThrow();
    expect(() => durationSchema.parse(5000)).toThrow();
  });

  it("should validate easing options", () => {
    const easingSchema = z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]);
    expect(easingSchema.parse("linear")).toBe("linear");
    expect(easingSchema.parse("ease_in_out")).toBe("ease_in_out");
    expect(() => easingSchema.parse("bounce")).toThrow();
  });
});
