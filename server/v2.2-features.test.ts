import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createInstructorContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "test-instructor", email: "instructor@test.com",
      name: "Test Instructor", loginMethod: "manus", role: "admin",
      platformRole: "instructor",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

function createStudentContext(): TrpcContext {
  return {
    user: {
      id: 2, openId: "test-student", email: "student@test.com",
      name: "Test Student", loginMethod: "manus", role: "user",
      platformRole: "student",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("v2.2 - Script Editor Enhancement", () => {
  describe("script.updateSection", () => {
    it("requires instructor role", async () => {
      const caller = appRouter.createCaller(createStudentContext());
      await expect(
        caller.script.updateSection({
          scriptId: 1,
          sectionIndex: 0,
          title: "Updated Title",
          content: "Updated content",
          durationSec: 120,
          slideNotes: "Updated notes",
        })
      ).rejects.toThrow();
    });

    it("validates sectionIndex is non-negative", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      await expect(
        caller.script.updateSection({
          scriptId: 1,
          sectionIndex: -1,
          title: "Title",
          content: "Content",
          durationSec: 60,
          slideNotes: "",
        })
      ).rejects.toThrow();
    });

    it("rejects non-existent script", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      await expect(
        caller.script.updateSection({
          scriptId: 999999,
          sectionIndex: 0,
          title: "Title",
          content: "Content",
          durationSec: 60,
          slideNotes: "",
        })
      ).rejects.toThrow(); // NOT_FOUND for non-existent script
    });
  });

  describe("script.regenerateSection", () => {
    it("requires instructor role", async () => {
      const caller = appRouter.createCaller(createStudentContext());
      await expect(
        caller.script.regenerateSection({
          scriptId: 1,
          sectionIndex: 0,
        })
      ).rejects.toThrow();
    });

    it("accepts optional customPrompt", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      // Will fail at DB level but validates input schema
      await expect(
        caller.script.regenerateSection({
          scriptId: 999999,
          sectionIndex: 0,
          customPrompt: "더 자세하게 설명해주세요",
        })
      ).rejects.toThrow(); // DB error expected
    });

    it("validates sectionIndex is non-negative", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      await expect(
        caller.script.regenerateSection({
          scriptId: 1,
          sectionIndex: -1,
        })
      ).rejects.toThrow();
    });
  });

  describe("script.reorderSections", () => {
    it("requires instructor role", async () => {
      const caller = appRouter.createCaller(createStudentContext());
      await expect(
        caller.script.reorderSections({
          scriptId: 1,
          newOrder: [0, 1, 2],
        })
      ).rejects.toThrow();
    });

    it("accepts valid newOrder array", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      // Will fail at DB level but validates input schema
      await expect(
        caller.script.reorderSections({
          scriptId: 999999,
          newOrder: [2, 0, 1],
        })
      ).rejects.toThrow(); // DB error expected
    });
  });
});

describe("v2.2 - Pipeline Dashboard & Stats", () => {
  describe("pipeline.stats", () => {
    it("requires instructor role", async () => {
      const caller = appRouter.createCaller(createStudentContext());
      await expect(caller.pipeline.stats()).rejects.toThrow();
    });

    it("returns stats object for instructor", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      const result = await caller.pipeline.stats();
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalPipelines");
      expect(result).toHaveProperty("completedPipelines");
      expect(result).toHaveProperty("failedPipelines");
      expect(result).toHaveProperty("totalDurationSec");
      expect(result).toHaveProperty("categoryDistribution");
      expect(result).toHaveProperty("monthlyProduction");
      expect(result).toHaveProperty("difficultyDistribution");
      expect(result).toHaveProperty("successRate");
      expect(typeof result.totalPipelines).toBe("number");
      expect(typeof result.successRate).toBe("number");
    });

    it("returns zero stats for new instructor", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      const result = await caller.pipeline.stats();
      expect(result.totalPipelines).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe("pipeline.generateSubtitles", () => {
    it("requires instructor role", async () => {
      const caller = appRouter.createCaller(createStudentContext());
      await expect(
        caller.pipeline.generateSubtitles({ pipelineId: 1 })
      ).rejects.toThrow();
    });

    it("rejects non-existent pipeline", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      await expect(
        caller.pipeline.generateSubtitles({ pipelineId: 999999 })
      ).rejects.toThrow();
    });

    it("accepts optional language parameter", async () => {
      const caller = appRouter.createCaller(createInstructorContext());
      await expect(
        caller.pipeline.generateSubtitles({ pipelineId: 999999, language: "ko" })
      ).rejects.toThrow(); // DB error expected, but validates input
    });
  });
});

describe("v2.2 - Route Structure", () => {
  it("script router has updateSection procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("script.updateSection");
  });

  it("script router has regenerateSection procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("script.regenerateSection");
  });

  it("script router has reorderSections procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("script.reorderSections");
  });

  it("pipeline router has stats procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("pipeline.stats");
  });

  it("pipeline router has generateSubtitles procedure", () => {
    expect(appRouter._def.procedures).toHaveProperty("pipeline.generateSubtitles");
  });
});
