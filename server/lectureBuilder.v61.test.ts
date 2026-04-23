import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// Test schemas for v6.1 features

describe("v6.1 Slide Transitions", () => {
  const transitionSchema = z.object({
    projectId: z.number(),
    slideId: z.number(),
    transitionType: z.enum(["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"]),
    durationMs: z.number().min(100).max(3000).default(500),
    easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]).default("ease_in_out"),
  });

  it("should validate transition input schema", () => {
    const valid = transitionSchema.parse({
      projectId: 1,
      slideId: 1,
      transitionType: "fade",
      durationMs: 500,
      easing: "ease_in_out",
    });
    expect(valid.transitionType).toBe("fade");
    expect(valid.durationMs).toBe(500);
  });

  it("should reject invalid transition type", () => {
    expect(() => transitionSchema.parse({
      projectId: 1,
      slideId: 1,
      transitionType: "invalid_type",
    })).toThrow();
  });

  it("should reject duration out of range", () => {
    expect(() => transitionSchema.parse({
      projectId: 1,
      slideId: 1,
      transitionType: "fade",
      durationMs: 5000,
    })).toThrow();
  });

  it("should accept all 10 transition types", () => {
    const types = ["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"];
    for (const t of types) {
      const result = transitionSchema.parse({
        projectId: 1,
        slideId: 1,
        transitionType: t,
      });
      expect(result.transitionType).toBe(t);
    }
  });

  it("should use default values when optional fields omitted", () => {
    const result = transitionSchema.parse({
      projectId: 1,
      slideId: 1,
      transitionType: "fade",
    });
    expect(result.durationMs).toBe(500);
    expect(result.easing).toBe("ease_in_out");
  });
});

describe("v6.1 AI Image Generation for Whiteboard", () => {
  const imageGenSchema = z.object({
    prompt: z.string().min(1).max(1000),
    style: z.enum(["illustration", "diagram", "infographic", "sketch", "realistic", "cartoon", "minimalist"]).default("illustration"),
    language: z.string().default("ko"),
  });

  it("should validate image generation input", () => {
    const valid = imageGenSchema.parse({
      prompt: "블록체인 수익 구조 다이어그램",
      style: "diagram",
      language: "ko",
    });
    expect(valid.prompt).toBe("블록체인 수익 구조 다이어그램");
    expect(valid.style).toBe("diagram");
  });

  it("should accept all 7 styles", () => {
    const styles = ["illustration", "diagram", "infographic", "sketch", "realistic", "cartoon", "minimalist"];
    for (const s of styles) {
      const result = imageGenSchema.parse({ prompt: "test", style: s });
      expect(result.style).toBe(s);
    }
  });

  it("should reject empty prompt", () => {
    expect(() => imageGenSchema.parse({ prompt: "" })).toThrow();
  });

  it("should use default style and language", () => {
    const result = imageGenSchema.parse({ prompt: "test image" });
    expect(result.style).toBe("illustration");
    expect(result.language).toBe("ko");
  });
});

describe("v6.1 Whiteboard MP4 Rendering", () => {
  const whiteboardMp4Schema = z.object({
    projectId: z.number(),
    insertContentId: z.number(),
    whiteboardData: z.object({
      strokes: z.array(z.object({
        id: z.string(),
        points: z.array(z.object({ x: z.number(), y: z.number(), t: z.number() })),
        color: z.string(),
        width: z.number(),
        tool: z.string(),
      })),
      backgroundColor: z.string().default("#FFFFFF"),
      width: z.number().default(1280),
      height: z.number().default(720),
      durationMs: z.number().optional(),
    }),
    resolution: z.enum(["720p", "1080p"]).default("1080p"),
  });

  it("should validate whiteboard MP4 input", () => {
    const valid = whiteboardMp4Schema.parse({
      projectId: 1,
      insertContentId: 1,
      whiteboardData: {
        strokes: [{
          id: "stroke-1",
          points: [{ x: 0, y: 0, t: 0 }, { x: 100, y: 100, t: 500 }],
          color: "#000000",
          width: 3,
          tool: "pen",
        }],
        backgroundColor: "#FFFFFF",
        width: 1280,
        height: 720,
      },
      resolution: "1080p",
    });
    expect(valid.whiteboardData.strokes).toHaveLength(1);
    expect(valid.resolution).toBe("1080p");
  });

  it("should accept empty strokes array", () => {
    const valid = whiteboardMp4Schema.parse({
      projectId: 1,
      insertContentId: 1,
      whiteboardData: {
        strokes: [],
      },
    });
    expect(valid.whiteboardData.strokes).toHaveLength(0);
  });

  it("should use default resolution and dimensions", () => {
    const valid = whiteboardMp4Schema.parse({
      projectId: 1,
      insertContentId: 1,
      whiteboardData: {
        strokes: [],
      },
    });
    expect(valid.resolution).toBe("1080p");
    expect(valid.whiteboardData.width).toBe(1280);
    expect(valid.whiteboardData.height).toBe(720);
    expect(valid.whiteboardData.backgroundColor).toBe("#FFFFFF");
  });

  it("should validate stroke point timestamps", () => {
    const valid = whiteboardMp4Schema.parse({
      projectId: 1,
      insertContentId: 1,
      whiteboardData: {
        strokes: [{
          id: "s1",
          points: [
            { x: 10, y: 20, t: 0 },
            { x: 30, y: 40, t: 100 },
            { x: 50, y: 60, t: 200 },
          ],
          color: "#FF0000",
          width: 5,
          tool: "pen",
        }],
      },
    });
    expect(valid.whiteboardData.strokes[0].points).toHaveLength(3);
    expect(valid.whiteboardData.strokes[0].points[2].t).toBe(200);
  });
});

describe("v6.1 Set All Transitions", () => {
  const setAllSchema = z.object({
    projectId: z.number(),
    transitionType: z.enum(["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"]),
    durationMs: z.number().min(100).max(3000).default(500),
    easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]).default("ease_in_out"),
  });

  it("should validate set all transitions input", () => {
    const valid = setAllSchema.parse({
      projectId: 1,
      transitionType: "zoom_in",
      durationMs: 800,
      easing: "ease_out",
    });
    expect(valid.transitionType).toBe("zoom_in");
    expect(valid.durationMs).toBe(800);
    expect(valid.easing).toBe("ease_out");
  });
});
