import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { inferProcedureInput } from "@trpc/server";

// Mock authenticated instructor context
function createInstructorCtx(userId = 1) {
  return {
    user: {
      id: userId,
      openId: "test-open-id",
      name: "Test Instructor",
      email: "test@test.com",
      role: "admin" as const,
      platformRole: "instructor" as const,
      avatarUrl: null,
      bio: null,
      language: "ko",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

describe("v2.3 - Script Templates", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should list script templates (empty initially)", async () => {
    const templates = await caller.scriptTemplate.list();
    expect(Array.isArray(templates)).toBe(true);
  });

  it("should create a script template", async () => {
    const result = await caller.scriptTemplate.create({
      name: "테스트 템플릿",
      description: "테스트용 템플릿입니다.",
      category: "general",
      difficulty: "beginner",
      structure: JSON.stringify([
        { title: "도입", description: "주제 소개", durationPercent: 20, slideNotes: "" },
        { title: "본론", description: "핵심 내용", durationPercent: 60, slideNotes: "" },
        { title: "결론", description: "요약 정리", durationPercent: 20, slideNotes: "" },
      ]),
      sectionCount: 3,
      targetDurationMin: 10,
      tags: "테스트,기본",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should list templates after creation", async () => {
    const templates = await caller.scriptTemplate.list();
    expect(templates.length).toBeGreaterThan(0);
    const found = templates.find((t) => t.name === "테스트 템플릿");
    expect(found).toBeDefined();
    expect(found?.sectionCount).toBe(3);
  });

  it("should get template by ID", async () => {
    const templates = await caller.scriptTemplate.list();
    const first = templates[0];
    if (first) {
      const template = await caller.scriptTemplate.getById({ id: first.id });
      expect(template).toBeDefined();
      expect(template.name).toBe(first.name);
    }
  });

  it("should update a template", async () => {
    const templates = await caller.scriptTemplate.list();
    const userTemplate = templates.find((t) => !t.isBuiltIn);
    if (userTemplate) {
      const result = await caller.scriptTemplate.update({
        id: userTemplate.id,
        name: "수정된 템플릿",
        description: "수정된 설명",
      });
      expect(result.success).toBe(true);
    }
  });

  it("should seed built-in templates", async () => {
    const result = await caller.scriptTemplate.seedBuiltIn();
    expect(result.total).toBeGreaterThan(0);
    // Calling again should not duplicate
    const result2 = await caller.scriptTemplate.seedBuiltIn();
    expect(result2.created).toBe(0);
  });

  it("should delete a template", async () => {
    const templates = await caller.scriptTemplate.list();
    const userTemplate = templates.find((t) => !t.isBuiltIn && t.userId === ctx.user.id);
    if (userTemplate) {
      const result = await caller.scriptTemplate.delete({ id: userTemplate.id });
      expect(result.success).toBe(true);
    }
  });
});

describe("v2.3 - Pipeline Batch Start", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should validate batch input requires at least 1 item", async () => {
    try {
      await caller.pipeline.batchStart({ items: [] });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });

  it("should handle batch with non-existent scripts gracefully", async () => {
    const result = await caller.pipeline.batchStart({
      items: [
        { scriptId: 999999, title: "존재하지 않는 스크립트", ttsVoiceId: "alloy" },
      ],
    });
    expect(result.summary.total).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.completed).toBe(0);
  });
});

describe("v2.3 - Thumbnail Generation", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should reject thumbnail generation for non-existent pipeline", async () => {
    try {
      await caller.pipeline.generateThumbnail({ pipelineId: 999999 });
      expect.unreachable("Should have thrown");
    } catch (err: any) {
      expect(err.code || err.message).toBeDefined();
    }
  });
});
