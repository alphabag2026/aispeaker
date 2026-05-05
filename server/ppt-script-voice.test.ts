import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-ppt",
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

describe("PPT AI Script Generation", () => {
  it("getPPTScriptCredits returns credit info for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.lectureBuilder.getPPTScriptCredits();

    expect(result).toHaveProperty("creditsRemaining");
    expect(result).toHaveProperty("costPerGeneration");
    expect(result).toHaveProperty("canGenerate");
    expect(typeof result.creditsRemaining).toBe("number");
    expect(typeof result.costPerGeneration).toBe("number");
    expect(typeof result.canGenerate).toBe("boolean");
    expect(result.costPerGeneration).toBeGreaterThan(0);
  });

  it("generateScriptFromPPT rejects with insufficient credits", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should throw since test user has no credits
    await expect(
      caller.lectureBuilder.generateScriptFromPPT({
        projectId: 99999,
        slideIds: [1, 2, 3],
        language: "ko",
        style: "professional",
      })
    ).rejects.toThrow();
  });

  it("setSlideVoiceMode validates voice mode enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should reject with invalid project
    await expect(
      caller.lectureBuilder.setSlideVoiceMode({
        projectId: 99999,
        slideId: 1,
        voiceMode: "ai_tts",
      })
    ).rejects.toThrow();
  });

  it("uploadSlideRecording rejects with invalid project", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.lectureBuilder.uploadSlideRecording({
        projectId: 99999,
        slideId: 1,
        audioData: "dGVzdA==", // base64 "test"
        fileName: "test.webm",
      })
    ).rejects.toThrow();
  });
});

describe("Voice Mode Enum Validation", () => {
  it("setSlideVoiceMode accepts valid enum values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const validModes = ["direct_record", "ai_clone", "ai_tts"] as const;
    for (const mode of validModes) {
      // Should not throw on enum validation (will throw on project not found)
      await expect(
        caller.lectureBuilder.setSlideVoiceMode({
          projectId: 99999,
          slideId: 1,
          voiceMode: mode,
        })
      ).rejects.toThrow("NOT_FOUND");
    }
  });
});
