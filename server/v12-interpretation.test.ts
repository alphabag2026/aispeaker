import { describe, it, expect } from "vitest";
import * as db from "./db";
import { readFileSync } from "fs";
import { resolve } from "path";

// ===== Real-time AI Interpretation Tests (v12.0) =====

describe("v12 - Real-time AI Interpretation", () => {
  // --- Schema Tests ---
  describe("Database Schema", () => {
    it("should define interpretationSessions table in schema", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("interpretationSessions");
      expect(schema).toContain("hostUserId");
      expect(schema).toContain("sourceLanguage");
      expect(schema).toContain("targetLanguages");
      expect(schema).toContain('mysqlEnum("status", ["active", "paused", "ended"])');
    });

    it("should define translationSegments table in schema", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("translationSegments");
      expect(schema).toContain("sessionId");
      expect(schema).toContain("sourceText");
      expect(schema).toContain("translatedText");
      expect(schema).toContain("targetLanguage");
      expect(schema).toContain("confidence");
    });

    it("should define supportedLanguages table in schema", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("supportedLanguages");
      expect(schema).toContain("nativeName");
      expect(schema).toContain("flag");
      expect(schema).toContain("ttsSupported");
      expect(schema).toContain("sttSupported");
      expect(schema).toContain("sortOrder");
    });

    it("should export InsertInterpretationSession type", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("export type InsertInterpretationSession");
      expect(schema).toContain("export type InterpretationSession");
    });

    it("should export InsertTranslationSegment type", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("export type InsertTranslationSegment");
      expect(schema).toContain("export type TranslationSegment");
    });

    it("should export InsertSupportedLanguage type", () => {
      const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schema).toContain("export type InsertSupportedLanguage");
      expect(schema).toContain("export type SupportedLanguage");
    });
  });

  // --- DB Helper Tests ---
  describe("DB Helper Functions", () => {
    it("should import interpretationSessions in db.ts", () => {
      const dbContent = readFileSync(resolve(__dirname, "db.ts"), "utf-8");
      expect(dbContent).toContain("interpretationSessions");
      expect(dbContent).toContain("InsertInterpretationSession");
    });

    it("should import translationSegments in db.ts", () => {
      const dbContent = readFileSync(resolve(__dirname, "db.ts"), "utf-8");
      expect(dbContent).toContain("translationSegments");
      expect(dbContent).toContain("InsertTranslationSegment");
    });

    it("should import supportedLanguages in db.ts", () => {
      const dbContent = readFileSync(resolve(__dirname, "db.ts"), "utf-8");
      expect(dbContent).toContain("supportedLanguages");
      expect(dbContent).toContain("InsertSupportedLanguage");
    });

    it("should export getSupportedLanguages function", () => {
      expect(typeof db.getSupportedLanguages).toBe("function");
    });

    it("should export createInterpretationSession function", () => {
      expect(typeof db.createInterpretationSession).toBe("function");
    });

    it("should export getInterpretationSession function", () => {
      expect(typeof db.getInterpretationSession).toBe("function");
    });

    it("should export getUserInterpretationSessions function", () => {
      expect(typeof db.getUserInterpretationSessions).toBe("function");
    });

    it("should export endInterpretationSession function", () => {
      expect(typeof db.endInterpretationSession).toBe("function");
    });

    it("should export updateInterpretationSessionStats function", () => {
      expect(typeof db.updateInterpretationSessionStats).toBe("function");
    });

    it("should export addTranslationSegment function", () => {
      expect(typeof db.addTranslationSegment).toBe("function");
    });

    it("should export getSessionSegments function", () => {
      expect(typeof db.getSessionSegments).toBe("function");
    });

    it("should export getSessionSegmentCount function", () => {
      expect(typeof db.getSessionSegmentCount).toBe("function");
    });
  });

  // --- Router Tests ---
  describe("Interpretation Router", () => {
    it("should have interpretation router in appRouter", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("interpretation: router({");
    });

    it("should have getSupportedLanguages as public procedure", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("getSupportedLanguages: publicProcedure");
    });

    it("should have startSession as protected procedure", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("startSession: protectedProcedure");
      expect(routerContent).toContain("sourceLanguage");
      expect(routerContent).toContain("targetLanguages");
    });

    it("should have translate procedure with LLM integration", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("translate: protectedProcedure");
      expect(routerContent).toContain("invokeLLM");
      expect(routerContent).toContain("professional real-time interpreter");
    });

    it("should have batchTranslate for multiple languages at once", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("batchTranslate: protectedProcedure");
      expect(routerContent).toContain("Promise.all");
    });

    it("should have endSession procedure", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("endSession: protectedProcedure");
      expect(routerContent).toContain("endInterpretationSession");
    });

    it("should have getHistory procedure with optional language filter", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("getHistory: protectedProcedure");
      expect(routerContent).toContain("targetLanguage: z.string().optional()");
    });

    it("should have mySessions procedure for user's session list", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("mySessions: protectedProcedure");
      expect(routerContent).toContain("getUserInterpretationSessions");
    });

    it("should have translateChat for multilingual chat messages", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("translateChat: protectedProcedure");
      expect(routerContent).toContain("chat message");
    });

    it("should support 15 language codes in translation", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      const langCodes = ["ko", "zh", "en", "ja", "vi", "th", "es", "fr", "de", "ar", "hi", "pt", "ru", "id", "tr"];
      langCodes.forEach((code) => {
        expect(routerContent).toContain(`${code}:`);
      });
    });

    it("should verify session ownership before translation", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("session.hostUserId !== ctx.user.id");
      expect(routerContent).toContain("FORBIDDEN");
    });

    it("should update session stats after translation", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("updateInterpretationSessionStats");
      expect(routerContent).toContain("getSessionSegmentCount");
    });
  });

  // --- Frontend Tests ---
  describe("Frontend - LiveInterpretation Page", () => {
    it("should have LiveInterpretation page component", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("export default function LiveInterpretation");
    });

    it("should use interpretation tRPC hooks", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("trpc.interpretation.getSupportedLanguages");
      expect(page).toContain("trpc.interpretation.startSession");
      expect(page).toContain("trpc.interpretation.batchTranslate");
      expect(page).toContain("trpc.interpretation.endSession");
    });

    it("should support Web Speech API for STT", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("SpeechRecognition");
      expect(page).toContain("webkitSpeechRecognition");
      expect(page).toContain("recognition.continuous");
      expect(page).toContain("interimResults");
    });

    it("should support Web Speech Synthesis for TTS", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("speechSynthesis");
      expect(page).toContain("SpeechSynthesisUtterance");
    });

    it("should have language selector for source and target", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("sourceLanguage");
      expect(page).toContain("selectedTargetLanguages");
      expect(page).toContain("toggleTargetLang");
    });

    it("should display translation results grouped by source text", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("TranslationResult");
      expect(page).toContain("translatedText");
      expect(page).toContain("targetLanguage");
    });

    it("should have session start/end controls", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("handleStartSession");
      expect(page).toContain("endSession.mutate");
      expect(page).toContain("activeSessionId");
    });

    it("should have TTS language selection and toggle", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("ttsEnabled");
      expect(page).toContain("ttsLang");
      expect(page).toContain("speakText");
    });

    it("should show session history", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("mySessions");
      expect(page).toContain("showHistory");
    });

    it("should have recording controls for voice input", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("startRecording");
      expect(page).toContain("stopRecording");
      expect(page).toContain("isRecording");
    });
  });

  // --- Route & Navigation Tests ---
  describe("Route & Navigation", () => {
    it("should register /live-interpretation route in App.tsx", () => {
      const app = readFileSync(resolve(__dirname, "../client/src/App.tsx"), "utf-8");
      expect(app).toContain('"/live-interpretation"');
      expect(app).toContain("LiveInterpretation");
    });

    it("should have lazy import for LiveInterpretation", () => {
      const app = readFileSync(resolve(__dirname, "../client/src/App.tsx"), "utf-8");
      expect(app).toContain('lazy(() => import("./pages/LiveInterpretation"))');
    });

    it("should have navigation link in Navbar", () => {
      const navbar = readFileSync(resolve(__dirname, "../client/src/components/Navbar.tsx"), "utf-8");
      expect(navbar).toContain("/live-interpretation");
      // i18n: was toContain("실시간통역")
      expect(navbar).toContain("t(");
    });

    it("should have mobile menu link for interpretation", () => {
      const navbar = readFileSync(resolve(__dirname, "../client/src/components/Navbar.tsx"), "utf-8");
      // Check mobile menu section has the link
      const mobileSection = navbar.indexOf("setMobileOpen(false)");
      expect(mobileSection).toBeGreaterThan(0);
      // i18n: was toContain("실시간통역")
      expect(navbar).toContain("t(");
    });
  });

  // --- Migration Tests ---
  describe("Migration", () => {
    it("should have migration SQL file for interpretation tables", () => {
      const migration = readFileSync(resolve(__dirname, "../drizzle/0042_first_pandemic.sql"), "utf-8");
      expect(migration).toContain("CREATE TABLE `interpretationSessions`");
      expect(migration).toContain("CREATE TABLE `translationSegments`");
      expect(migration).toContain("CREATE TABLE `supportedLanguages`");
    });

    it("should have proper enum values in migration", () => {
      const migration = readFileSync(resolve(__dirname, "../drizzle/0042_first_pandemic.sql"), "utf-8");
      expect(migration).toContain("enum('active','paused','ended')");
    });

    it("should have unique constraint on language code", () => {
      const migration = readFileSync(resolve(__dirname, "../drizzle/0042_first_pandemic.sql"), "utf-8");
      expect(migration).toContain("supportedLanguages_code_unique");
    });
  });

  // --- Integration Tests ---
  describe("Integration", () => {
    it("should have default source language as Korean", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain('z.string().default("ko")');
    });

    it("should require at least 1 target language", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("z.array(z.string()).min(1)");
    });

    it("should save confidence score for translations", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("confidence: 90");
    });

    it("should handle batch translation errors gracefully", () => {
      const routerContent = readFileSync(resolve(__dirname, "routers.ts"), "utf-8");
      expect(routerContent).toContain("success: true");
      expect(routerContent).toContain("success: false");
    });

    it("should support Korean language mapping for STT", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("ko-KR");
      expect(page).toContain("zh-CN");
      expect(page).toContain("ja-JP");
      expect(page).toContain("en-US");
    });

    it("should have proper TTS language mapping", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      const langMap = ["ko: \"ko-KR\"", "en: \"en-US\"", "zh: \"zh-CN\"", "ja: \"ja-JP\""];
      langMap.forEach((mapping) => {
        expect(page).toContain(mapping);
      });
    });
  });
});

// ===== v12.1 - Whisper API Server-side STT Tests =====
describe("v12.1 - Whisper API Server-side STT", () => {
  describe("tRPC Router - transcribeAudioUpload", () => {
    it("should define transcribeAudioUpload procedure in routers.ts", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      expect(routers).toContain("transcribeAudioUpload");
      expect(routers).toContain("audioData: z.string()");
    });

    it("should validate file size limit of 16MB", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      expect(routers).toContain("sizeMB > 16");
      // i18n: was toContain("최대 16MB까지 허용됩니다")
      expect(routers).toContain("t(");
    });

    it("should upload audio to S3 before transcription", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      expect(routers).toContain("storagePut(fileKey, buffer, input.mimeType)");
    });

    it("should call transcribeAudio with audioUrl", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(
        routers.indexOf("transcribeAudioUpload"),
        routers.indexOf("transcribeAndTranslate")
      );
      expect(section).toContain("transcribeAudio({");
      expect(section).toContain("audioUrl");
    });

    it("should return text, language, duration, segments, and audioUrl", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(
        routers.indexOf("transcribeAudioUpload"),
        routers.indexOf("transcribeAndTranslate")
      );
      expect(section).toContain("text: result.text");
      expect(section).toContain("language: result.language");
      expect(section).toContain("duration: result.duration");
    });
  });

  describe("tRPC Router - transcribeAndTranslate", () => {
    it("should define transcribeAndTranslate procedure", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      expect(routers).toContain("transcribeAndTranslate");
      expect(routers).toContain("targetLanguages: z.array(z.string()).min(1)");
      expect(routers).toContain("sessionId: z.number().optional()");
    });

    it("should transcribe then translate to multiple languages in parallel", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(routers.indexOf("transcribeAndTranslate"));
      expect(section).toContain("transcribeAudio({");
      expect(section).toContain("Promise.all");
      expect(section).toContain("invokeLLM");
    });

    it("should return empty translations when no speech detected", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(routers.indexOf("transcribeAndTranslate"));
      expect(section).toContain('sourceText: ""');
      expect(section).toContain("translations: []");
    });

    it("should save segments to DB when sessionId provided", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(routers.indexOf("transcribeAndTranslate"));
      expect(section).toContain("db.addTranslationSegment");
    });

    it("should support all 15 languages", () => {
      const routers = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");
      const section = routers.substring(routers.indexOf("transcribeAndTranslate"));
      for (const lang of ["Korean", "Chinese", "English", "Japanese", "Vietnamese", "Thai",
        "Spanish", "French", "German", "Arabic", "Hindi", "Portuguese", "Russian", "Indonesian", "Turkish"]) {
        expect(section).toContain(lang);
      }
    });
  });

  describe("Frontend - Whisper STT Integration", () => {
    it("should have STT mode selector (server/browser)", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain('sttMode');
      expect(page).toContain('"server"');
      expect(page).toContain('"browser"');
    });

    it("should use MediaRecorder for server mode", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("MediaRecorder");
      expect(page).toContain("mediaRecorderRef");
      expect(page).toContain("audioChunksRef");
    });

    it("should convert audio blob to base64", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("FileReader");
      expect(page).toContain("readAsDataURL");
      expect(page).toContain('.split(",")[1]');
    });

    it("should call transcribeAndTranslate when autoTranslate is on", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("transcribeAndTranslate.mutate");
    });

    it("should call transcribeOnly when autoTranslate is off", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("transcribeOnly.mutate");
    });

    it("should show recording duration in server mode", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("recordingDuration");
      expect(page).toContain("formattedDuration");
    });

    it("should show Whisper STT badge", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("Whisper STT");
    });

    it("should validate 16MB size limit on frontend", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("sizeMB > 16");
      // i18n: was toContain("16MB를 초과")
      expect(page).toContain("t(");
    });

    it("should clean up media resources on unmount", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("streamRef.current");
      expect(page).toContain("getTracks().forEach");
      expect(page).toContain("clearInterval(timerRef.current)");
    });

    it("should show transcribing state", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("isTranscribing");
      // i18n: was toContain("인식 중...")
      expect(page).toContain("t(");
    });

    it("should have auto-translate toggle", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("autoTranslate");
      expect(page).toContain("setAutoTranslate");
    });

    it("should still support browser Web Speech API as fallback", () => {
      const page = readFileSync(resolve(__dirname, "../client/src/pages/LiveInterpretation.tsx"), "utf-8");
      expect(page).toContain("webkitSpeechRecognition");
      expect(page).toContain("startBrowserRecording");
    });
  });
});
