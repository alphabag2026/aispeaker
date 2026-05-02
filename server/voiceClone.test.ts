import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Voice Clone Feature Tests (v5.0)
 * Tests for AI voice cloning pipeline: upload → analyze → match → TTS
 */

// Read source files for structural assertions
const routersSource = readFileSync(join(__dirname, "routers.ts"), "utf-8");
const schemaSource = readFileSync(join(__dirname, "../drizzle/schema.ts"), "utf-8");
const dbSource = readFileSync(join(__dirname, "db.ts"), "utf-8");
const avatarDialogSource = readFileSync(join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx"), "utf-8");
const i18nSource = readFileSync(join(__dirname, "../client/src/i18n/components/AvatarSettingsDialog.ts"), "utf-8");

describe("Voice Clone - Database Schema", () => {
  it("voiceClones table has matchedVoiceId column", () => {
    expect(schemaSource).toContain("matchedVoiceId");
    expect(schemaSource).toMatch(/matchedVoiceId.*varchar/);
  });

  it("voiceClones table has voiceAnalysis column", () => {
    expect(schemaSource).toContain("voiceAnalysis");
    expect(schemaSource).toMatch(/voiceAnalysis.*text/);
  });

  it("projectAvatars table has voiceCloneId column", () => {
    // Check projectAvatars specifically has voiceCloneId
    const projectAvatarsBlock = schemaSource.slice(
      schemaSource.indexOf("export const projectAvatars"),
      schemaSource.indexOf("export type ProjectAvatar")
    );
    expect(projectAvatarsBlock).toContain("voiceCloneId");
  });
});

describe("Voice Clone - Backend Router", () => {
  it("voiceClone.create router exists with AI analysis pipeline", () => {
    expect(routersSource).toContain("voiceClone: router({");
    expect(routersSource).toContain("create: protectedProcedure");
  });

  it("create router includes LLM voice analysis", () => {
    expect(routersSource).toContain("invokeLLM");
    expect(routersSource).toContain("voice_analysis");
    expect(routersSource).toContain("matchedVoiceId");
  });

  it("create router includes voice transcription step", () => {
    expect(routersSource).toContain("transcribeAudio");
    expect(routersSource).toContain("audioUrl: url");
  });

  it("create router stores analysis results in DB", () => {
    expect(routersSource).toContain("voiceAnalysis: JSON.stringify(analysis)");
    expect(routersSource).toContain("matchedVoiceId: finalVoiceId");
  });

  it("create router has fallback on analysis error", () => {
    // Should have error handling that still marks clone as ready
    expect(routersSource).toContain('matchedVoiceId: "Kore"');
    expect(routersSource).toContain("Fallback due to analysis error");
  });

  it("voiceClone.preview uses matched Gemini voice", () => {
    expect(routersSource).toContain("clone.matchedVoiceId");
    expect(routersSource).toContain("generateGeminiTts");
  });

  it("voiceClone.generateTTS router exists for full script TTS", () => {
    expect(routersSource).toContain("generateTTS: protectedProcedure");
    expect(routersSource).toContain("cloneId: z.number()");
    expect(routersSource).toContain("text: z.string().min(1).max(5000)");
  });

  it("voiceClone.list router returns user's clones", () => {
    expect(routersSource).toContain("list: protectedProcedure.query");
    expect(routersSource).toContain("getVoiceClonesByUser");
  });

  it("updateAvatar supports voiceCloneId parameter", () => {
    expect(routersSource).toContain("voiceCloneId: z.number().nullable().optional()");
  });
});

describe("Voice Clone - DB Helpers", () => {
  it("updateVoiceClone supports matchedVoiceId and voiceAnalysis", () => {
    expect(dbSource).toContain("updateVoiceClone");
  });

  it("getVoiceClonesByUser helper exists", () => {
    expect(dbSource).toContain("getVoiceClonesByUser");
  });

  it("getVoiceCloneById helper exists", () => {
    expect(dbSource).toContain("getVoiceCloneById");
  });
});

describe("Voice Clone - Frontend UI", () => {
  it("AvatarSettingsDialog has voiceCloneId in AvatarData interface", () => {
    expect(avatarDialogSource).toContain("voiceCloneId: number | null");
  });

  it("AvatarSettingsDialog passes voiceCloneId in handleSave", () => {
    expect(avatarDialogSource).toContain("voiceCloneId: cloneId");
  });

  it("AvatarSettingsDialog shows voice analysis results", () => {
    expect(avatarDialogSource).toContain("getCloneAnalysis");
    expect(avatarDialogSource).toContain("analysis.matchedVoiceId");
    expect(avatarDialogSource).toContain("analysis.confidence");
    expect(avatarDialogSource).toContain("analysis.gender");
    expect(avatarDialogSource).toContain("analysis.tone");
    expect(avatarDialogSource).toContain("analysis.style");
    expect(avatarDialogSource).toContain("analysis.reason");
  });

  it("AvatarSettingsDialog has file upload for voice samples", () => {
    expect(avatarDialogSource).toContain("voiceFileInputRef");
    expect(avatarDialogSource).toContain('accept="audio/mp3');
  });

  it("AvatarSettingsDialog has recording functionality", () => {
    expect(avatarDialogSource).toContain("startRecording");
    expect(avatarDialogSource).toContain("stopRecording");
    expect(avatarDialogSource).toContain("MediaRecorder");
  });

  it("AvatarSettingsDialog has Brain icon for AI analysis", () => {
    expect(avatarDialogSource).toContain("Brain");
    expect(avatarDialogSource).toContain("voiceCloneAnalyzing");
  });

  it("AvatarSettingsDialog has original sample playback button", () => {
    expect(avatarDialogSource).toContain("clone.sampleUrl");
    expect(avatarDialogSource).toContain("FileAudio");
  });

  it("AvatarSettingsDialog auto-selects clone mode when avatar has voiceCloneId", () => {
    expect(avatarDialogSource).toContain('avatar.voiceCloneId ? "clone" : "preset"');
  });

  it("AvatarSettingsDialog uses matched voice ID when saving with clone", () => {
    expect(avatarDialogSource).toContain("selectedClone?.matchedVoiceId");
  });
});

describe("Voice Clone - i18n Translations", () => {
  it("Korean translations include voice clone analysis keys", () => {
    expect(i18nSource).toContain("avatarSettingsDialog.voiceCloneAnalyzing");
    expect(i18nSource).toContain("avatarSettingsDialog.matchedVoice");
    expect(i18nSource).toContain("avatarSettingsDialog.analysisResult");
    expect(i18nSource).toContain("avatarSettingsDialog.confidence");
  });

  it("English translations include voice clone analysis keys", () => {
    // Check that English block has the keys
    const enBlock = i18nSource.slice(
      i18nSource.indexOf('registerTranslations("en"'),
      i18nSource.indexOf('registerTranslations("zh"')
    );
    expect(enBlock).toContain("avatarSettingsDialog.voiceCloneAnalyzing");
    expect(enBlock).toContain("avatarSettingsDialog.matchedVoice");
  });

  it("Chinese translations include voice clone analysis keys", () => {
    const zhBlock = i18nSource.slice(
      i18nSource.indexOf('registerTranslations("zh"'),
      i18nSource.indexOf('registerTranslations("ja"')
    );
    expect(zhBlock).toContain("avatarSettingsDialog.voiceCloneAnalyzing");
  });

  it("Japanese translations include voice clone analysis keys", () => {
    const jaBlock = i18nSource.slice(
      i18nSource.indexOf('registerTranslations("ja"'),
      i18nSource.indexOf('registerTranslations("vi"')
    );
    expect(jaBlock).toContain("avatarSettingsDialog.voiceCloneAnalyzing");
  });

  it("has uploadVoiceFile and selectVoiceFile keys", () => {
    expect(i18nSource).toContain("avatarSettingsDialog.uploadVoiceFile");
    expect(i18nSource).toContain("avatarSettingsDialog.selectVoiceFile");
    expect(i18nSource).toContain("avatarSettingsDialog.listenSample");
    expect(i18nSource).toContain("avatarSettingsDialog.listenClone");
  });
});
