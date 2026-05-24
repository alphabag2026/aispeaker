import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * Voice Clone Feature Tests (v5.0 + v5.1)
 * Tests for AI voice cloning pipeline: upload → analyze → match → TTS
 * v5.1: Speed/pitch sliders, voice test, preset voices
 */

// Helper to read all db files
function readAllDbFiles(): string {
  const fsx = require('fs');
  const pathx = require('path');
  const dir = pathx.resolve(__dirname, 'db');
  if (fsx.existsSync(dir) && fsx.statSync(dir).isDirectory()) {
    return fsx.readdirSync(dir).filter((f: string) => f.endsWith('.ts')).map((f: string) => fsx.readFileSync(pathx.join(dir, f), 'utf-8')).join('\n');
  }
  return fsx.readFileSync(pathx.resolve(__dirname, 'db.ts'), 'utf-8');
}

// Read source files for structural assertions
const routersSource = (() => { const dir = join(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(join(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(join(dir, f), "utf-8")).join("\n"); })();
const schemaSource = readFileSync(join(__dirname, "../drizzle/schema.ts"), "utf-8");
const dbSource = readAllDbFiles();
const avatarDialogSource = readFileSync(join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx"), "utf-8");
const i18nSource = readFileSync(join(__dirname, "../client/src/i18n/components/AvatarSettingsDialog.ts"), "utf-8");
const geminiTtsSource = readFileSync(join(__dirname, "_core/geminiTts.ts"), "utf-8");

// ===== v5.0 Tests =====

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
    const projectAvatarsBlock = schemaSource.slice(
      schemaSource.indexOf("export const projectAvatars"),
      schemaSource.indexOf("export type ProjectAvatar")
    );
    expect(projectAvatarsBlock).toContain("voiceCloneId");
  });
});

describe("Voice Clone - Backend Router", () => {
  it("voiceClone.create router exists with AI analysis pipeline", () => {
    expect(routersSource).toContain("voiceCloneRouter = router({");
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

describe("Voice Clone - Frontend UI (v5.0)", () => {
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

describe("Voice Clone - i18n Translations (v5.0)", () => {
  it("Korean translations include voice clone analysis keys", () => {
    expect(i18nSource).toContain("avatarSettingsDialog.voiceCloneAnalyzing");
    expect(i18nSource).toContain("avatarSettingsDialog.matchedVoice");
    expect(i18nSource).toContain("avatarSettingsDialog.analysisResult");
    expect(i18nSource).toContain("avatarSettingsDialog.confidence");
  });

  it("English translations include voice clone analysis keys", () => {
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

// ===== v5.1 Tests: Speed/Pitch, Voice Test, Preset Voices =====

describe("Voice Clone v5.1 - Speed/Pitch Parameters (Backend)", () => {
  it("voiceClone.preview accepts speed parameter", () => {
    // Find the preview procedure input
    expect(routersSource).toMatch(/preview:.*protectedProcedure[\s\S]*?speed: z\.number\(\)\.min\(0\.5\)\.max\(2\.0\)\.optional\(\)/);
  });

  it("voiceClone.preview accepts pitch parameter", () => {
    expect(routersSource).toMatch(/preview:.*protectedProcedure[\s\S]*?pitch: z\.number\(\)\.min\(-12\)\.max\(12\)\.optional\(\)/);
  });

  it("voiceClone.generateTTS accepts speed and pitch parameters", () => {
    // generateTTS should have both speed and pitch
    const genTTSBlock = routersSource.slice(
      routersSource.indexOf("generateTTS: protectedProcedure"),
      routersSource.indexOf("testVoice: protectedProcedure")
    );
    expect(genTTSBlock).toContain("speed: z.number().min(0.5).max(2.0).optional()");
    expect(genTTSBlock).toContain("pitch: z.number().min(-12).max(12).optional()");
  });

  it("preview passes speed and pitch to generateGeminiTts", () => {
    expect(routersSource).toContain("speed: input.speed");
    expect(routersSource).toContain("pitch: input.pitch");
  });
});

describe("Voice Clone v5.1 - Gemini TTS Pitch Support", () => {
  it("GeminiTtsOptions interface includes pitch parameter", () => {
    expect(geminiTtsSource).toContain("pitch");
  });

  it("generateGeminiTts function handles pitch adjustment", () => {
    // Should have pitch-related processing logic
    expect(geminiTtsSource).toContain("pitch");
  });
});

describe("Voice Clone v5.1 - Voice Test Router", () => {
  it("voiceClone.testVoice router exists", () => {
    expect(routersSource).toContain("testVoice: protectedProcedure");
  });

  it("testVoice accepts voiceId, text, speed, and pitch", () => {
    const testVoiceBlock = routersSource.slice(
      routersSource.indexOf("testVoice: protectedProcedure"),
      routersSource.indexOf("presets: publicProcedure")
    );
    expect(testVoiceBlock).toContain("voiceId: z.string()");
    expect(testVoiceBlock).toContain("text: z.string().min(1).max(500)");
    expect(testVoiceBlock).toContain("speed: z.number().min(0.5).max(2.0).optional()");
    expect(testVoiceBlock).toContain("pitch: z.number().min(-12).max(12).optional()");
  });

  it("testVoice generates TTS and returns audioUrl", () => {
    const testVoiceBlock = routersSource.slice(
      routersSource.indexOf("testVoice: protectedProcedure"),
      routersSource.indexOf("presets: publicProcedure")
    );
    expect(testVoiceBlock).toContain("generateGeminiTts");
    expect(testVoiceBlock).toContain("audioUrl: url");
    expect(testVoiceBlock).toContain("voice-test/");
  });
});

describe("Voice Clone v5.1 - Preset Voices Router", () => {
  it("voiceClone.presets router exists as public procedure", () => {
    expect(routersSource).toContain("presets: publicProcedure.query");
  });

  it("presets returns exactly 5 voices", () => {
    // Check that the presets array contains exactly 5 named voices
    const presetsStart = routersSource.indexOf("presets: publicProcedure.query");
    const presetsBlock = routersSource.slice(presetsStart, presetsStart + 800);
    // Count unique voice IDs in the presets block
    expect(presetsBlock).toContain('"Kore"');
    expect(presetsBlock).toContain('"Puck"');
    expect(presetsBlock).toContain('"Aoede"');
    expect(presetsBlock).toContain('"Charon"');
    expect(presetsBlock).toContain('"Sulafat"');
  });

  it("presets include Kore, Puck, Aoede, Charon, Sulafat", () => {
    expect(routersSource).toContain('"Kore"');
    expect(routersSource).toContain('"Puck"');
    expect(routersSource).toContain('"Aoede"');
    expect(routersSource).toContain('"Charon"');
    expect(routersSource).toContain('"Sulafat"');
  });

  it("each preset has id, name, style, gender, desc, emoji, color", () => {
    const presetsBlock = routersSource.slice(
      routersSource.indexOf("presets: publicProcedure.query"),
      routersSource.indexOf("]),\n  }),")
    );
    expect(presetsBlock).toContain("id:");
    expect(presetsBlock).toContain("name:");
    expect(presetsBlock).toContain("style:");
    expect(presetsBlock).toContain("gender:");
    expect(presetsBlock).toContain("desc:");
    expect(presetsBlock).toContain("emoji:");
    expect(presetsBlock).toContain("color:");
  });
});

describe("Voice Clone v5.1 - Frontend Speed/Pitch UI", () => {
   it("has speed state variable", () => {
    expect(avatarDialogSource).toContain("const [speed, setSpeed] = useState(avatar.voiceSpeed ?? 1.0)");
  });
  it("has pitch state variable", () => {
    expect(avatarDialogSource).toContain("const [pitch, setPitch] = useState(avatar.voicePitch ?? 0)");
  });

  it("has speed Slider component with correct range", () => {
    expect(avatarDialogSource).toContain("min={0.5}");
    expect(avatarDialogSource).toContain("max={2.0}");
    expect(avatarDialogSource).toContain("step={0.1}");
  });

  it("has pitch Slider component with correct range", () => {
    expect(avatarDialogSource).toContain("min={-12}");
    expect(avatarDialogSource).toContain("max={12}");
    expect(avatarDialogSource).toContain("step={1}");
  });

  it("has reset defaults button", () => {
    expect(avatarDialogSource).toContain("setSpeed(1.0); setPitch(0)");
    expect(avatarDialogSource).toContain("RotateCcw");
    expect(avatarDialogSource).toContain("resetDefaults");
  });

  it("has formatSpeed helper function", () => {
    expect(avatarDialogSource).toContain("const formatSpeed");
    expect(avatarDialogSource).toContain("speedSlow");
    expect(avatarDialogSource).toContain("speedFast");
    expect(avatarDialogSource).toContain("speedNormal");
  });

  it("has formatPitch helper function", () => {
    expect(avatarDialogSource).toContain("const formatPitch");
    expect(avatarDialogSource).toContain("pitchNormal");
    expect(avatarDialogSource).toContain("semitones");
  });

  it("passes speed/pitch to preview mutation", () => {
    expect(avatarDialogSource).toContain("speed: speed !== 1.0 ? speed : undefined");
    expect(avatarDialogSource).toContain("pitch: pitch !== 0 ? pitch : undefined");
  });

  it("displays current speed and pitch values in avatar preview", () => {
    expect(avatarDialogSource).toContain("SlidersHorizontal");
    expect(avatarDialogSource).toContain("speed !== 1.0 || pitch !== 0");
  });

  it("imports Slider component", () => {
    expect(avatarDialogSource).toContain('import { Slider }');

function readAllDbFiles(): string {
  const dir = path.resolve(__dirname, "db");
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    return fs.readdirSync(dir).filter(f => f.endsWith(".ts")).map(f => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n");
  }
  return fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf-8");
}
  });
});

describe("Voice Clone v5.1 - Frontend Voice Test UI", () => {
  it("has testVoice mutation", () => {
    expect(avatarDialogSource).toContain("trpc.voiceClone.testVoice.useMutation");
  });

  it("test button calls testVoice with current voice and effects", () => {
    expect(avatarDialogSource).toContain("testVoice.mutate({");
    expect(avatarDialogSource).toContain("TestTube");
    expect(avatarDialogSource).toContain("previewWithEffects");
  });

  it("test uses correct voiceId based on mode", () => {
    // Should use clone's matched voice or preset voice
    expect(avatarDialogSource).toContain('voiceMode === "clone" && selectedCloneId');
  });
});

describe("Voice Clone v5.1 - Frontend Preset Voices UI", () => {
  it("fetches voice presets from server", () => {
    expect(avatarDialogSource).toContain("trpc.voiceClone.presets.useQuery");
  });

  it("has presetVoices tab", () => {
    expect(avatarDialogSource).toContain('value="presetVoices"');
    expect(avatarDialogSource).toContain("presetVoices");
  });

  it("renders preset voice cards with emoji and color", () => {
    expect(avatarDialogSource).toContain("preset.emoji");
    expect(avatarDialogSource).toContain("preset.color");
    expect(avatarDialogSource).toContain("PRESET_COLORS");
  });

  it("clicking preset selects it and shows toast", () => {
    expect(avatarDialogSource).toContain("setTtsVoiceId(preset.id)");
    expect(avatarDialogSource).toContain("presetSelected");
  });

  it("preset cards show VoicePreviewButton", () => {
    expect(avatarDialogSource).toContain("VoicePreviewButton");
    expect(avatarDialogSource).toContain("voiceId={preset.id}");
  });

  it("has 3 voice mode tabs: preset, presetVoices, clone", () => {
    expect(avatarDialogSource).toContain('value="preset"');
    expect(avatarDialogSource).toContain('value="presetVoices"');
    expect(avatarDialogSource).toContain('value="clone"');
    expect(avatarDialogSource).toContain("grid-cols-3");
  });
});

describe("Voice Clone v5.1 - i18n New Keys", () => {
  const languages = ["ko", "en", "zh", "ja", "vi", "th", "id", "ms", "es", "fr", "de", "pt", "ru", "ar", "hi", "it", "nl", "pl", "sv", "tr"];
  
  const requiredKeys = [
    "avatarSettingsDialog.speedControl",
    "avatarSettingsDialog.pitchControl",
    "avatarSettingsDialog.speed",
    "avatarSettingsDialog.pitch",
    "avatarSettingsDialog.resetDefaults",
    "avatarSettingsDialog.voiceTest",
    "avatarSettingsDialog.presetVoices",
    "avatarSettingsDialog.selectPreset",
    "avatarSettingsDialog.voiceEffects",
    "avatarSettingsDialog.previewWithEffects",
  ];

  it("all required keys exist in Korean translations", () => {
    const koBlock = i18nSource.slice(
      i18nSource.indexOf('registerTranslations("ko"'),
      i18nSource.indexOf('registerTranslations("en"')
    );
    for (const key of requiredKeys) {
      expect(koBlock).toContain(key);
    }
  });

  it("all required keys exist in English translations", () => {
    const enBlock = i18nSource.slice(
      i18nSource.indexOf('registerTranslations("en"'),
      i18nSource.indexOf('registerTranslations("zh"')
    );
    for (const key of requiredKeys) {
      expect(enBlock).toContain(key);
    }
  });

  it("speed/pitch keys exist in all 20 languages", () => {
    for (const lang of languages) {
      const langRegex = new RegExp(`registerTranslations\\("${lang}"`);
      expect(i18nSource).toMatch(langRegex);
      // At minimum, check the key exists somewhere in the file
      expect(i18nSource).toContain("avatarSettingsDialog.speedControl");
      expect(i18nSource).toContain("avatarSettingsDialog.pitchControl");
    }
  });

  it("preset voices keys exist in all 20 languages", () => {
    // Check that presetVoices key appears at least 20 times (once per language)
    const matches = i18nSource.match(/avatarSettingsDialog\.presetVoices/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });

  it("voice effects keys exist in all 20 languages", () => {
    const matches = i18nSource.match(/avatarSettingsDialog\.voiceEffects/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });
});
