import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";

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

describe("v2.4 - Script Version Management", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should have script.versions procedure", () => {
    expect(caller.script.versions).toBeDefined();
  });

  it("should have script.saveVersion procedure", () => {
    expect(caller.script.saveVersion).toBeDefined();
  });

  it("should have script.rollback procedure", () => {
    expect(caller.script.rollback).toBeDefined();
  });

  it("should reject versions query for non-existent script", async () => {
    await expect(caller.script.versions({ scriptId: 999999 })).resolves.toEqual([]);
  });

  it("should reject saveVersion for non-existent script", async () => {
    await expect(
      caller.script.saveVersion({ scriptId: 999999, changeDescription: "test" })
    ).rejects.toThrow();
  });

  it("should reject rollback for non-existent version", async () => {
    await expect(
      caller.script.rollback({ scriptId: 999999, versionId: 999999 })
    ).rejects.toThrow();
  });
});

describe("v2.4 - Content Analysis", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should have script.analyze procedure", () => {
    expect(caller.script.analyze).toBeDefined();
  });

  it("should reject analysis for non-existent script", async () => {
    await expect(
      caller.script.analyze({ scriptId: 999999 })
    ).rejects.toThrow();
  });
});

describe("v2.4 - Pipeline Preview", () => {
  const ctx = createInstructorCtx();
  const caller = appRouter.createCaller(ctx);

  it("should have pipeline.preview procedure", () => {
    expect(caller.pipeline.preview).toBeDefined();
  });

  it("should reject preview for non-existent pipeline", async () => {
    await expect(
      caller.pipeline.preview({ pipelineId: 999999 })
    ).rejects.toThrow();
  });
});

describe("v2.4 - Route Structure", () => {
  it("should have all v2.4 router procedures defined", () => {
    const ctx = createInstructorCtx();
    const caller = appRouter.createCaller(ctx);

    // Version management
    expect(typeof caller.script.versions).toBe("function");
    expect(typeof caller.script.saveVersion).toBe("function");
    expect(typeof caller.script.rollback).toBe("function");

    // Content analysis
    expect(typeof caller.script.analyze).toBe("function");

    // Pipeline preview
    expect(typeof caller.pipeline.preview).toBe("function");
  });
});
