import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";

/* ═══════════ v8.0 - Akool Studio Feature Expansion Tests ═══════════ */

function createUserContext() {
  return {
    user: { id: 1, name: "Test User", openId: "test-open-id", role: "user" as const },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

function createUnauthContext() {
  return {
    user: null,
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("v8.0 - Akool Studio Feature Expansion", () => {

  /* ── TTS Voices ── */
  describe("akool.ttsVoices", () => {
    it("should return voice list for authenticated user", async () => {
      const caller = appRouter.createCaller(createUserContext());
      const voices = await caller.akool.ttsVoices();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThanOrEqual(20);
    });

    it("each voice should have id, name, desc, style", async () => {
      const caller = appRouter.createCaller(createUserContext());
      const voices = await caller.akool.ttsVoices();
      for (const v of voices) {
        expect(v.id).toBeTruthy();
        expect(v.name).toBeTruthy();
        expect(v.desc).toBeTruthy();
        expect(v.style).toBeTruthy();
      }
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.akool.ttsVoices()).rejects.toThrow();
    });
  });

  /* ── TTS Generate - Input Validation ── */
  describe("akool.ttsGenerate", () => {
    it("should reject empty text", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.ttsGenerate({ text: "", voiceId: "Kore", speed: 1.0 })
      ).rejects.toThrow();
    });

    it("should reject speed out of range", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.ttsGenerate({ text: "hello", voiceId: "Kore", speed: 5.0 })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.akool.ttsGenerate({ text: "test", voiceId: "Kore", speed: 1.0 })
      ).rejects.toThrow();
    });
  });

  /* ── Voice Clone - Input Validation ── */
  describe("akool.voiceClone", () => {
    it("should reject invalid URL", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.voiceClone({ sampleAudioUrl: "not-a-url", text: "test" })
      ).rejects.toThrow();
    });

    it("should reject empty text", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.voiceClone({ sampleAudioUrl: "https://example.com/audio.mp3", text: "" })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.akool.voiceClone({ sampleAudioUrl: "https://example.com/audio.mp3", text: "test" })
      ).rejects.toThrow();
    });
  });

  /* ── Voice Change - Input Validation ── */
  describe("akool.voiceChange", () => {
    it("should reject invalid source URL", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.voiceChange({ sourceAudioUrl: "bad-url", targetVoiceId: "Kore" })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.akool.voiceChange({ sourceAudioUrl: "https://example.com/audio.mp3", targetVoiceId: "Kore" })
      ).rejects.toThrow();
    });
  });

  /* ── Image Generation - Input Validation ── */
  describe("akool.imageGen", () => {
    it("should reject empty prompt", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.imageGen({ prompt: "", style: "realistic" })
      ).rejects.toThrow();
    });

    it("should reject invalid style", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.imageGen({ prompt: "test", style: "invalid" as any })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.akool.imageGen({ prompt: "test", style: "realistic" })
      ).rejects.toThrow();
    });
  });

  /* ── Background Remove - Input Validation ── */
  describe("akool.bgRemove", () => {
    it("should reject invalid image URL", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.akool.bgRemove({ imageUrl: "not-a-url" })
      ).rejects.toThrow();
    });

    it("should reject unauthenticated access", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.akool.bgRemove({ imageUrl: "https://example.com/image.jpg" })
      ).rejects.toThrow();
    });
  });

  /* ── Router Structure ── */
  describe("Router structure", () => {
    it("akool router should have all v8.0 procedures", () => {
      const procedures = Object.keys((appRouter as any)._def.procedures);
      const akoolProcedures = procedures.filter(p => p.startsWith("akool."));
      
      // v8.0 new procedures
      expect(akoolProcedures).toContain("akool.ttsVoices");
      expect(akoolProcedures).toContain("akool.ttsGenerate");
      expect(akoolProcedures).toContain("akool.voiceClone");
      expect(akoolProcedures).toContain("akool.voiceChange");
      expect(akoolProcedures).toContain("akool.imageGen");
      expect(akoolProcedures).toContain("akool.bgRemove");
    });

    it("akool router should retain v7.0 procedures", () => {
      const procedures = Object.keys((appRouter as any)._def.procedures);
      const akoolProcedures = procedures.filter(p => p.startsWith("akool."));
      
      // v7.0 existing procedures
      expect(akoolProcedures).toContain("akool.getEffects");
      expect(akoolProcedures).toContain("akool.imageToVideo");
      expect(akoolProcedures).toContain("akool.faceSwapPro");
      expect(akoolProcedures).toContain("akool.createTalkingAvatar");
      expect(akoolProcedures).toContain("akool.translateVideo");
      expect(akoolProcedures).toContain("akool.getCredits");
    });
  });

  /* ── Gemini Voice Data ── */
  describe("Gemini Voice Data", () => {
    it("should have 30 voices", async () => {
      const { GEMINI_VOICES } = await import("./_core/geminiTts");
      expect(GEMINI_VOICES.length).toBe(30);
    });

    it("each voice should have unique id", async () => {
      const { GEMINI_VOICES } = await import("./_core/geminiTts");
      const ids = GEMINI_VOICES.map(v => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("should include well-known voices", async () => {
      const { GEMINI_VOICES } = await import("./_core/geminiTts");
      const names = GEMINI_VOICES.map(v => v.id);
      expect(names).toContain("Kore");
      expect(names).toContain("Zephyr");
      expect(names).toContain("Sulafat");
      expect(names).toContain("Charon");
    });
  });
});
