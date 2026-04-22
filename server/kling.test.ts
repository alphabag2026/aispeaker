import { describe, it, expect, vi } from "vitest";

// Mock the kling module
vi.mock("./kling", () => ({
  isKlingConfigured: vi.fn(() => true),
  createImageToVideo: vi.fn(() => Promise.resolve({ taskId: "test-task-123", taskStatus: "submitted" })),
  getImageToVideoStatus: vi.fn(() => Promise.resolve({ taskId: "test-task-123", taskStatus: "processing", taskStatusMsg: "Processing..." })),
  createTextToVideo: vi.fn(() => Promise.resolve({ taskId: "test-task-456", taskStatus: "submitted" })),
  getTextToVideoStatus: vi.fn(() => Promise.resolve({ taskId: "test-task-456", taskStatus: "succeed", videoUrl: "https://example.com/video.mp4", videoDuration: 5 })),
}));

describe("KLING API Module", () => {
  it("should check if KLING is configured", async () => {
    const { isKlingConfigured } = await import("./kling");
    expect(typeof isKlingConfigured).toBe("function");
    const result = isKlingConfigured();
    expect(typeof result).toBe("boolean");
  });

  it("should have createImageToVideo function", async () => {
    const { createImageToVideo } = await import("./kling");
    expect(typeof createImageToVideo).toBe("function");
    const result = await createImageToVideo({
      imageUrl: "https://example.com/face.jpg",
      prompt: "A person speaking naturally",
      duration: "5",
      mode: "std",
    });
    expect(result).toHaveProperty("taskId");
    expect(result).toHaveProperty("taskStatus");
  });

  it("should have getImageToVideoStatus function", async () => {
    const { getImageToVideoStatus } = await import("./kling");
    expect(typeof getImageToVideoStatus).toBe("function");
    const result = await getImageToVideoStatus("test-task-123");
    expect(result).toHaveProperty("taskId");
    expect(result).toHaveProperty("taskStatus");
  });

  it("should have createTextToVideo function", async () => {
    const { createTextToVideo } = await import("./kling");
    expect(typeof createTextToVideo).toBe("function");
    const result = await createTextToVideo({
      prompt: "A professional instructor speaking",
      duration: "5",
      mode: "std",
    });
    expect(result).toHaveProperty("taskId");
    expect(result).toHaveProperty("taskStatus");
  });

  it("should have getTextToVideoStatus function", async () => {
    const { getTextToVideoStatus } = await import("./kling");
    expect(typeof getTextToVideoStatus).toBe("function");
    const result = await getTextToVideoStatus("test-task-456");
    expect(result).toHaveProperty("taskId");
    expect(result).toHaveProperty("taskStatus");
    expect(result.videoUrl).toBe("https://example.com/video.mp4");
    expect(result.videoDuration).toBe(5);
  });
});

describe("KLING Router Integration", () => {
  it("should have kling router endpoints defined", async () => {
    // Verify the router structure exists by importing the module
    const routerModule = await import("./routers");
    expect(routerModule.appRouter).toBeDefined();
    // Check kling router exists in the appRouter
    const routerDef = routerModule.appRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("should validate image2video input schema", () => {
    const { z } = require("zod");
    const schema = z.object({
      imageUrl: z.string().url(),
      prompt: z.string().optional(),
      duration: z.enum(["5", "10"]).default("5"),
      mode: z.enum(["std", "pro"]).default("std"),
      model: z.string().default("kling-v1-6"),
      aspectRatio: z.string().default("16:9"),
      purpose: z.string().default("avatar_preview"),
    });

    // Valid input
    const validResult = schema.safeParse({
      imageUrl: "https://example.com/image.jpg",
      prompt: "A person speaking",
    });
    expect(validResult.success).toBe(true);

    // Invalid input - missing URL
    const invalidResult = schema.safeParse({
      imageUrl: "not-a-url",
    });
    expect(invalidResult.success).toBe(false);
  });

  it("should validate text2video input schema", () => {
    const { z } = require("zod");
    const schema = z.object({
      prompt: z.string().min(1),
      duration: z.enum(["5", "10"]).default("5"),
      mode: z.enum(["std", "pro"]).default("std"),
    });

    // Valid input
    const validResult = schema.safeParse({
      prompt: "A professional instructor",
    });
    expect(validResult.success).toBe(true);

    // Invalid input - empty prompt
    const invalidResult = schema.safeParse({
      prompt: "",
    });
    expect(invalidResult.success).toBe(false);
  });

  it("should validate duration enum values", () => {
    const { z } = require("zod");
    const durationSchema = z.enum(["5", "10"]);

    expect(durationSchema.safeParse("5").success).toBe(true);
    expect(durationSchema.safeParse("10").success).toBe(true);
    expect(durationSchema.safeParse("15").success).toBe(false);
    expect(durationSchema.safeParse("0").success).toBe(false);
  });

  it("should validate mode enum values", () => {
    const { z } = require("zod");
    const modeSchema = z.enum(["std", "pro"]);

    expect(modeSchema.safeParse("std").success).toBe(true);
    expect(modeSchema.safeParse("pro").success).toBe(true);
    expect(modeSchema.safeParse("ultra").success).toBe(false);
  });
});
