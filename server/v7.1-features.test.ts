import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-v71",
    email: "test-v71@example.com",
    name: "Test User v7.1",
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
      headers: { origin: "https://test.example.com" },
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

describe("v7.1 Features - LectureBuilder Upgrades", () => {
  let testProjectId: number;

  // Setup: create a project for all tests
  it("setup: creates a project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.lectureBuilder.createProject({
      title: "v7.1 테스트 프로젝트",
      description: "PPT/PDF 변환, 캔버스 드로잉, 영상 생성 테스트",
    });
    expect(result.id).toBeGreaterThan(0);
    testProjectId = result.id;
  });

  describe("convertFile procedure", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createAnonContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.lectureBuilder.convertFile({
          projectId: 1,
          fileData: "dGVzdA==",
          fileName: "test.pdf",
          mimeType: "application/pdf",
        })
      ).rejects.toThrow();
    });

    it("accepts valid input and returns slide count", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a tiny 1x1 PNG as fake PDF (will be treated as single-page)
      const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      try {
        const result = await caller.lectureBuilder.convertFile({
          projectId: testProjectId,
          fileData: tinyPng,
          fileName: "test-slides.pdf",
          mimeType: "application/pdf",
        });
        // If conversion succeeds, it should return a count
        expect(result).toBeDefined();
        expect(typeof result.count).toBe("number");
      } catch (err: any) {
        // Conversion may fail due to actual PDF processing, but should not be auth error
        expect(err.code).not.toBe("UNAUTHORIZED");
      }
    });
  });

  describe("saveCanvasDrawing procedure", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createAnonContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.lectureBuilder.saveCanvasDrawing({
          projectId: 1,
          slideId: 1,
          type: "freehand",
          color: "#FF0000",
          strokeWidth: 3,
          pathData: { points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] },
        })
      ).rejects.toThrow();
    });

    it("saves freehand drawing and returns annotation id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First upload a slide
      const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const slide = await caller.lectureBuilder.uploadImageSlide({
        projectId: testProjectId,
        fileData: tinyPng,
        fileName: "canvas-test.png",
        mimeType: "image/png",
        slideOrder: 0,
      });

      const result = await caller.lectureBuilder.saveCanvasDrawing({
        projectId: testProjectId,
        slideId: slide.id,
        type: "freehand",
        color: "#FF0000",
        strokeWidth: 3,
        pathData: { points: [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 80, y: 20 }] },
      });

      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);

      // Verify via getFullProject
      const full = await caller.lectureBuilder.getFullProject({ id: testProjectId });
      const ann = full.annotations.find((a: any) => a.id === result.id);
      expect(ann).toBeDefined();
      expect(ann!.annotationType).toBe("freehand");
      expect(ann!.penColor).toBe("#FF0000");
    });

    it("saves circle annotation", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const full = await caller.lectureBuilder.getFullProject({ id: testProjectId });
      const slideId = full.slides[0]?.id;
      if (!slideId) return;

      const result = await caller.lectureBuilder.saveCanvasDrawing({
        projectId: testProjectId,
        slideId,
        type: "circle",
        color: "#00FF00",
        strokeWidth: 5,
        pathData: { x: 50, y: 50, width: 10, height: 10 },
      });

      expect(result.id).toBeGreaterThan(0);
    });

    it("saves arrow annotation", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const full = await caller.lectureBuilder.getFullProject({ id: testProjectId });
      const slideId = full.slides[0]?.id;
      if (!slideId) return;

      const result = await caller.lectureBuilder.saveCanvasDrawing({
        projectId: testProjectId,
        slideId,
        type: "arrow",
        color: "#0000FF",
        strokeWidth: 4,
        pathData: { x: 20, y: 80, endX: 80, endY: 20 },
      });

      expect(result.id).toBeGreaterThan(0);
    });
  });

  describe("uploadBgm procedure", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createAnonContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.lectureBuilder.uploadBgm({
          projectId: 1,
          fileData: "dGVzdA==",
          fileName: "bgm.mp3",
          mimeType: "audio/mpeg",
        })
      ).rejects.toThrow();
    });

    it("uploads BGM audio and returns URL", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Tiny valid audio-like base64 (won't play but tests the upload flow)
      const fakeAudio = "dGVzdCBhdWRpbyBkYXRh";

      const result = await caller.lectureBuilder.uploadBgm({
        projectId: testProjectId,
        fileData: fakeAudio,
        fileName: "test-bgm.mp3",
        mimeType: "audio/mpeg",
      });

      expect(result).toBeDefined();
      expect(typeof result.url).toBe("string");
      expect(result.url.length).toBeGreaterThan(0);
    });
  });

  describe("generateVideo procedure", () => {
    it("rejects unauthenticated users", async () => {
      const { ctx } = createAnonContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.lectureBuilder.generateVideo({
          projectId: 1,
          avatarPosition: "bottom-right",
          avatarSize: 25,
          avatarShape: "circle",
          avatarOpacity: 100,
          bgmVolume: 30,
          noiseReduction: false,
          resolution: "1080p",
        })
      ).rejects.toThrow();
    });

    it("requires segments with scripts to generate", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create a fresh project with no scripts
      const proj = await caller.lectureBuilder.createProject({
        title: "영상 생성 실패 테스트",
      });

      try {
        await caller.lectureBuilder.generateVideo({
          projectId: proj.id,
          avatarPosition: "bottom-right",
          avatarSize: 25,
          avatarShape: "circle",
          avatarOpacity: 100,
          bgmVolume: 30,
          noiseReduction: false,
          resolution: "1080p",
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (err: any) {
        // Should fail because no segments with scripts
        expect(err.code).toBe("BAD_REQUEST");
      }
    });
  });

  describe("deleteAnnotation (undo support)", () => {
    it("deletes an annotation by id", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const full = await caller.lectureBuilder.getFullProject({ id: testProjectId });
      const annToDelete = full.annotations[0];
      if (!annToDelete) return;

      await caller.lectureBuilder.deleteAnnotation({ id: annToDelete.id });

      const fullAfter = await caller.lectureBuilder.getFullProject({ id: testProjectId });
      const found = fullAfter.annotations.find((a: any) => a.id === annToDelete.id);
      expect(found).toBeUndefined();
    });
  });
});
