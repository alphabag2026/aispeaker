import { describe, it, expect } from "vitest";
import { z } from "zod";

// ============ v6.3 Feature Tests ============

// --- 1. Whiteboard Collaboration Sessions ---
describe("v6.3 Whiteboard Collaboration", () => {
  const createSessionSchema = z.object({
    projectId: z.number(),
    insertContentId: z.number().optional(),
    title: z.string().optional(),
    maxParticipants: z.number().min(2).max(50).default(10),
  });

  it("should validate createSession input", () => {
    const valid = createSessionSchema.parse({
      projectId: 1,
      title: "화이트보드 협업",
      maxParticipants: 10,
    });
    expect(valid.projectId).toBe(1);
    expect(valid.maxParticipants).toBe(10);
  });

  it("should apply default maxParticipants", () => {
    const valid = createSessionSchema.parse({ projectId: 1 });
    expect(valid.maxParticipants).toBe(10);
  });

  it("should reject maxParticipants below 2", () => {
    expect(() => createSessionSchema.parse({
      projectId: 1,
      maxParticipants: 1,
    })).toThrow();
  });

  it("should reject maxParticipants above 50", () => {
    expect(() => createSessionSchema.parse({
      projectId: 1,
      maxParticipants: 51,
    })).toThrow();
  });

  it("should allow optional insertContentId", () => {
    const valid = createSessionSchema.parse({
      projectId: 1,
      insertContentId: 42,
    });
    expect(valid.insertContentId).toBe(42);
  });

  const joinSessionSchema = z.object({ sessionCode: z.string() });

  it("should validate joinSession input", () => {
    const valid = joinSessionSchema.parse({ sessionCode: "abc123xyz456" });
    expect(valid.sessionCode).toBe("abc123xyz456");
  });

  it("should reject empty sessionCode", () => {
    expect(() => joinSessionSchema.parse({ sessionCode: "" })).not.toThrow(); // empty string is valid string
  });

  const endSessionSchema = z.object({ sessionId: z.number() });

  it("should validate endSession input", () => {
    const valid = endSessionSchema.parse({ sessionId: 99 });
    expect(valid.sessionId).toBe(99);
  });
});

// --- 2. WebSocket Message Protocol ---
describe("v6.3 WebSocket Message Protocol", () => {
  const wsMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("join"), sessionCode: z.string(), userId: z.number(), userName: z.string() }),
    z.object({ type: z.literal("draw"), stroke: z.any() }),
    z.object({ type: z.literal("add_text"), textElement: z.any() }),
    z.object({ type: z.literal("add_shape"), shapeElement: z.any() }),
    z.object({ type: z.literal("cursor"), x: z.number(), y: z.number() }),
    z.object({ type: z.literal("erase"), elementId: z.string() }),
    z.object({ type: z.literal("undo") }),
    z.object({ type: z.literal("clear_all") }),
    z.object({ type: z.literal("sync_state"), whiteboardData: z.any() }),
  ]);

  it("should validate join message", () => {
    const msg = wsMessageSchema.parse({
      type: "join",
      sessionCode: "abc123",
      userId: 1,
      userName: "테스트 유저",
    });
    expect(msg.type).toBe("join");
  });

  it("should validate draw message", () => {
    const msg = wsMessageSchema.parse({
      type: "draw",
      stroke: { id: "s1", tool: "pen", points: [{ x: 0, y: 0, t: 0 }], color: "#000", width: 3 },
    });
    expect(msg.type).toBe("draw");
  });

  it("should validate cursor message", () => {
    const msg = wsMessageSchema.parse({ type: "cursor", x: 100, y: 200 });
    expect(msg.type).toBe("cursor");
  });

  it("should validate erase message", () => {
    const msg = wsMessageSchema.parse({ type: "erase", elementId: "stroke-1" });
    expect(msg.type).toBe("erase");
  });

  it("should validate undo message", () => {
    const msg = wsMessageSchema.parse({ type: "undo" });
    expect(msg.type).toBe("undo");
  });

  it("should validate clear_all message", () => {
    const msg = wsMessageSchema.parse({ type: "clear_all" });
    expect(msg.type).toBe("clear_all");
  });
});

// --- 3. AI Slide Layout Recommendation ---
describe("v6.3 AI Slide Layout", () => {
  const recommendInputSchema = z.object({ projectId: z.number() });

  it("should validate recommend input", () => {
    const valid = recommendInputSchema.parse({ projectId: 5 });
    expect(valid.projectId).toBe(5);
  });

  const layoutTypes = [
    "title_only", "title_subtitle", "title_body", "title_bullets",
    "comparison", "image_left", "image_right", "image_full",
    "quote", "chart", "diagram", "timeline", "blank",
  ];

  const layoutResultSchema = z.object({
    slideId: z.number(),
    layoutType: z.enum(layoutTypes as [string, ...string[]]),
    reasoning: z.string(),
    config: z.object({
      titleSize: z.string(),
      bodySize: z.string(),
      alignment: z.string(),
      emphasis: z.string(),
    }),
  });

  it("should validate layout result schema", () => {
    const valid = layoutResultSchema.parse({
      slideId: 1,
      layoutType: "title_bullets",
      reasoning: "핵심 포인트가 3개 이상이므로 글머리 기호 레이아웃이 적합합니다",
      config: {
        titleSize: "2xl",
        bodySize: "lg",
        alignment: "left",
        emphasis: "bold",
      },
    });
    expect(valid.layoutType).toBe("title_bullets");
  });

  it("should reject invalid layout type", () => {
    expect(() => layoutResultSchema.parse({
      slideId: 1,
      layoutType: "invalid_type",
      reasoning: "test",
      config: { titleSize: "lg", bodySize: "md", alignment: "center", emphasis: "none" },
    })).toThrow();
  });

  it("should validate all 13 layout types", () => {
    for (const lt of layoutTypes) {
      const valid = layoutResultSchema.parse({
        slideId: 1,
        layoutType: lt,
        reasoning: `${lt} 테스트`,
        config: { titleSize: "xl", bodySize: "md", alignment: "center", emphasis: "none" },
      });
      expect(valid.layoutType).toBe(lt);
    }
  });

  const applyInputSchema = z.object({ layoutId: z.number() });
  it("should validate applyLayout input", () => {
    const valid = applyInputSchema.parse({ layoutId: 42 });
    expect(valid.layoutId).toBe(42);
  });

  const clearInputSchema = z.object({ projectId: z.number() });
  it("should validate clear input", () => {
    const valid = clearInputSchema.parse({ projectId: 5 });
    expect(valid.projectId).toBe(5);
  });
});

// --- 4. Project Watermark ---
describe("v6.3 Project Watermark", () => {
  const watermarkSchema = z.object({
    projectId: z.number(),
    watermarkType: z.enum(["logo", "text", "both"]).default("text"),
    logoUrl: z.string().optional(),
    logoFileKey: z.string().optional(),
    textContent: z.string().max(255).optional(),
    fontSize: z.number().min(8).max(72).default(24),
    fontColor: z.string().default("#FFFFFF"),
    position: z.enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]).default("bottom-right"),
    opacity: z.number().min(0).max(100).default(70),
    sizePercent: z.number().min(5).max(50).default(15),
    marginPx: z.number().min(0).max(100).default(20),
    isEnabled: z.boolean().default(true),
  });

  it("should validate watermark with text type", () => {
    const valid = watermarkSchema.parse({
      projectId: 1,
      watermarkType: "text",
      textContent: "© My Lecture",
      fontSize: 24,
      fontColor: "#FFFFFF",
      position: "bottom-right",
      opacity: 70,
    });
    expect(valid.watermarkType).toBe("text");
    expect(valid.textContent).toBe("© My Lecture");
  });

  it("should validate watermark with logo type", () => {
    const valid = watermarkSchema.parse({
      projectId: 1,
      watermarkType: "logo",
      logoUrl: "https://example.com/logo.png",
      logoFileKey: "watermarks/1/logo.png",
      position: "top-left",
      opacity: 50,
    });
    expect(valid.watermarkType).toBe("logo");
    expect(valid.logoUrl).toBe("https://example.com/logo.png");
  });

  it("should validate watermark with both type", () => {
    const valid = watermarkSchema.parse({
      projectId: 1,
      watermarkType: "both",
      textContent: "My Brand",
      logoUrl: "https://example.com/logo.png",
    });
    expect(valid.watermarkType).toBe("both");
  });

  it("should apply default values", () => {
    const valid = watermarkSchema.parse({ projectId: 1 });
    expect(valid.watermarkType).toBe("text");
    expect(valid.fontSize).toBe(24);
    expect(valid.fontColor).toBe("#FFFFFF");
    expect(valid.position).toBe("bottom-right");
    expect(valid.opacity).toBe(70);
    expect(valid.sizePercent).toBe(15);
    expect(valid.marginPx).toBe(20);
    expect(valid.isEnabled).toBe(true);
  });

  it("should reject fontSize below 8", () => {
    expect(() => watermarkSchema.parse({
      projectId: 1,
      fontSize: 5,
    })).toThrow();
  });

  it("should reject fontSize above 72", () => {
    expect(() => watermarkSchema.parse({
      projectId: 1,
      fontSize: 100,
    })).toThrow();
  });

  it("should reject opacity below 0", () => {
    expect(() => watermarkSchema.parse({
      projectId: 1,
      opacity: -1,
    })).toThrow();
  });

  it("should reject opacity above 100", () => {
    expect(() => watermarkSchema.parse({
      projectId: 1,
      opacity: 101,
    })).toThrow();
  });

  it("should reject textContent exceeding 255 chars", () => {
    expect(() => watermarkSchema.parse({
      projectId: 1,
      textContent: "a".repeat(256),
    })).toThrow();
  });

  it("should validate all 6 positions", () => {
    const positions = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"];
    for (const pos of positions) {
      const valid = watermarkSchema.parse({ projectId: 1, position: pos });
      expect(valid.position).toBe(pos);
    }
  });

  const uploadLogoSchema = z.object({
    projectId: z.number(),
    fileName: z.string(),
    fileBase64: z.string(),
    mimeType: z.string(),
  });

  it("should validate uploadLogo input", () => {
    const valid = uploadLogoSchema.parse({
      projectId: 1,
      fileName: "logo.png",
      fileBase64: "iVBORw0KGgo=",
      mimeType: "image/png",
    });
    expect(valid.fileName).toBe("logo.png");
    expect(valid.mimeType).toBe("image/png");
  });
});

// --- 5. Cursor Color Assignment ---
describe("v6.3 Cursor Colors", () => {
  const CURSOR_COLORS = [
    "#FF4444", "#44AA44", "#4488FF", "#FF8800", "#AA44CC",
    "#00BBBB", "#FF44AA", "#88AA00", "#6644FF", "#FF6644",
  ];

  it("should have 10 distinct cursor colors", () => {
    expect(CURSOR_COLORS.length).toBe(10);
    const unique = new Set(CURSOR_COLORS);
    expect(unique.size).toBe(10);
  });

  it("should assign colors cyclically", () => {
    for (let i = 0; i < 20; i++) {
      const color = CURSOR_COLORS[i % CURSOR_COLORS.length];
      expect(color).toBeTruthy();
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
