import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-lb",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createAnonContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("lectureBuilder", () => {
  let testProjectId: number;

  describe("createProject", () => {
    it("creates a new lecture project and returns id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lectureBuilder.createProject({
        title: "테스트 강의",
        description: "블록체인 기초 강의",
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      testProjectId = result.id;
    });

    it("rejects unauthenticated users", async () => {
      const { ctx } = createAnonContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.lectureBuilder.createProject({
          title: "Unauthorized",
        })
      ).rejects.toThrow();
    });
  });

  describe("listProjects", () => {
    it("returns projects for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.lectureBuilder.listProjects();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getProject", () => {
    it("returns basic project details", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const created = await caller.lectureBuilder.createProject({
        title: "상세 조회 테스트",
      });

      const result = await caller.lectureBuilder.getProject({ id: created.id });

      expect(result).toBeDefined();
      expect(result!.id).toBe(created.id);
      expect(result!.title).toBe("상세 조회 테스트");
    });
  });

  describe("getFullProject", () => {
    it("returns project with avatars, scripts, slides, annotations", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const created = await caller.lectureBuilder.createProject({
        title: "풀 프로젝트 테스트",
      });

      const result = await caller.lectureBuilder.getFullProject({ id: created.id });

      expect(result).toBeDefined();
      expect(result.project.id).toBe(created.id);
      expect(result.project.title).toBe("풀 프로젝트 테스트");
      expect(Array.isArray(result.avatars)).toBe(true);
      expect(Array.isArray(result.scripts)).toBe(true);
      expect(Array.isArray(result.slides)).toBe(true);
      expect(Array.isArray(result.annotations)).toBe(true);
    });
  });

  describe("updateProject", () => {
    it("updates project step", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const created = await caller.lectureBuilder.createProject({
        title: "업데이트 테스트",
      });

      // Should not throw
      await caller.lectureBuilder.updateProject({
        id: created.id,
        currentStep: 3,
      });

      // Verify update
      const updated = await caller.lectureBuilder.getProject({ id: created.id });
      expect(updated!.currentStep).toBe(3);
    });
  });

  describe("addAvatar", () => {
    it("adds avatar to project", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const project = await caller.lectureBuilder.createProject({
        title: "아바타 테스트",
      });

      const avatar = await caller.lectureBuilder.addAvatar({
        projectId: project.id,
        name: "Dr. Kim",
        role: "instructor",
        faceId: 1,
        voiceId: "Kore",
      });

      expect(avatar).toBeDefined();
      expect(avatar.id).toBeGreaterThan(0);

      // Verify via getFullProject
      const full = await caller.lectureBuilder.getFullProject({ id: project.id });
      expect(full.avatars.length).toBe(1);
    });
  });

  describe("uploadImageSlide", () => {
    it("uploads a base64 image as slide", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const project = await caller.lectureBuilder.createProject({
        title: "슬라이드 테스트",
      });

      // Create a tiny 1x1 pixel PNG as base64
      const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const slide = await caller.lectureBuilder.uploadImageSlide({
        projectId: project.id,
        fileData: tinyPng,
        fileName: "slide-01.png",
        mimeType: "image/png",
        slideOrder: 0,
      });

      expect(slide).toBeDefined();
      expect(slide.id).toBeGreaterThan(0);

      // Verify via getFullProject
      const full = await caller.lectureBuilder.getFullProject({ id: project.id });
      expect(full.slides.length).toBe(1);
    });
  });
});
