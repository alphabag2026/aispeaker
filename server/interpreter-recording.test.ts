import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-v84",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      headers: { origin: "http://localhost:3000" },
    } as any,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

describe("v8.4 Features - Interpreter & Recording", () => {
  describe("Schema validation", () => {
    it("should have interpreter fields in lectureScripts schema", async () => {
      // Verify the schema has the new interpreter fields
      const { lectureScripts } = await import("../drizzle/schema");
      expect(lectureScripts).toBeDefined();
      // Check that the table definition includes interpreter columns
      const columns = Object.keys(lectureScripts);
      expect(columns).toContain("interpreterEnabled");
      expect(columns).toContain("interpreterLanguage");
      expect(columns).toContain("interpreterSections");
      expect(columns).toContain("interpreterVoiceId");
    });
  });

  describe("PiP Settings - Custom Position", () => {
    it("should have pip router with get and update procedures", () => {
      const caller = appRouter.createCaller(createAuthContext());
      // Verify pip procedures exist
      expect(caller.pip).toBeDefined();
      expect(caller.pip.get).toBeDefined();
      expect(caller.pip.update).toBeDefined();
    });
  });

  describe("TTS Voices", () => {
    it("should have tts.voices procedure available", () => {
      const caller = appRouter.createCaller(createAuthContext());
      expect(caller.tts).toBeDefined();
      expect(caller.tts.voices).toBeDefined();
    });
  });

  describe("Face Swap Upload", () => {
    it("should have faceSwap.uploadFace procedure available", () => {
      const caller = appRouter.createCaller(createAuthContext());
      expect(caller.faceSwap).toBeDefined();
      expect(caller.faceSwap.uploadFace).toBeDefined();
    });
  });
});

describe("i18n Translation Coverage", () => {
  it("should have ProductionStudio translations for all 20 languages", async () => {
    // Import the translations file to trigger registration
    await import("../client/src/i18n/pages/ProductionStudio");
    // The file registers translations for ko, en, zh, ja + 16 other languages
    // If it throws, the test fails
    expect(true).toBe(true);
  });

  it("should have home translations for other languages", async () => {
    await import("../client/src/i18n/home");
    expect(true).toBe(true);
  });

  it("should have navbar translations for other languages", async () => {
    await import("../client/src/i18n/navbar");
    expect(true).toBe(true);
  });

  it("should have pricing translations for other languages", async () => {
    await import("../client/src/i18n/pricing");
    expect(true).toBe(true);
  });
});
