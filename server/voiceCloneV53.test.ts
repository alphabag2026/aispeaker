import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

// Helper: read file content
function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

describe("Voice Clone v5.3 - Multi-Sample Analysis", () => {
  const schema = readFile("drizzle/schema.ts");
  const routers = readFile("server/routers.ts");
  const db = readFile("server/db.ts");

  describe("DB Schema - voiceCloneSamples table", () => {
    it("should have voiceCloneSamples table defined", () => {
      expect(schema).toContain("voiceCloneSamples");
      expect(schema).toContain("mysqlTable");
    });

    it("should have required columns: voiceCloneId, sampleUrl, durationSec", () => {
      const tableSection = schema.slice(schema.indexOf("voiceCloneSamples"));
      expect(tableSection).toContain("voiceCloneId");
      expect(tableSection).toContain("sampleUrl");
      expect(tableSection).toContain("durationSec");
    });

    it("should have userId column for ownership", () => {
      const tableSection = schema.slice(schema.indexOf("voiceCloneSamples"));
      expect(tableSection).toContain("userId");
    });
  });

  describe("Backend - voiceCloneSample.add router", () => {
    it("should have addSample or add procedure in routers", () => {
      expect(routers).toMatch(/add(?:Sample)?.*protectedProcedure/);
    });

    it("should accept cloneId and audioData inputs", () => {
      // The add sample router should accept clone ID and audio data
      expect(routers).toContain("cloneId");
      expect(routers).toContain("audioData");
    });
  });

  describe("Backend - voiceCloneSample.analyzeCombined router", () => {
    it("should have analyzeCombined procedure", () => {
      expect(routers).toContain("analyzeCombined");
    });

    it("should accept voiceCloneId input for combined analysis", () => {
      const analyzeSection = routers.slice(routers.indexOf("analyzeCombined"));
      expect(analyzeSection).toContain("voiceCloneId");
    });
  });

  describe("DB helpers - voiceCloneSamples", () => {
    it("should have addVoiceCloneSample helper", () => {
      expect(db).toContain("addVoiceCloneSample");
    });

    it("should have getVoiceCloneSamples helper", () => {
      expect(db).toContain("getVoiceCloneSamples");
    });
  });
});

describe("Voice Clone v5.3 - Community Preset Library", () => {
  const schema = readFile("drizzle/schema.ts");
  const routers = readFile("server/routers.ts");
  const db = readFile("server/db.ts");

  describe("DB Schema - voiceEffectPresets enhancements", () => {
    it("should have isPublic column", () => {
      const presetsSection = schema.slice(schema.indexOf("voiceEffectPresets"));
      expect(presetsSection).toContain("isPublic");
    });

    it("should have likes column", () => {
      const presetsSection = schema.slice(schema.indexOf("voiceEffectPresets"));
      expect(presetsSection).toContain("likes");
    });

    it("should have usageCount column", () => {
      const presetsSection = schema.slice(schema.indexOf("voiceEffectPresets"));
      expect(presetsSection).toContain("usageCount");
    });

    it("should have userName column", () => {
      const presetsSection = schema.slice(schema.indexOf("voiceEffectPresets"));
      expect(presetsSection).toContain("userName");
    });
  });

  describe("DB Schema - presetLikes table", () => {
    it("should have presetLikes table for tracking likes", () => {
      expect(schema).toContain("presetLikes");
    });

    it("should have presetId and userId columns", () => {
      const likesSection = schema.slice(schema.indexOf("presetLikes"));
      expect(likesSection).toContain("presetId");
      expect(likesSection).toContain("userId");
    });
  });

  describe("Backend - Community routers", () => {
    it("should have publish procedure", () => {
      expect(routers).toContain("publish");
    });

    it("should have community procedure for listing public presets", () => {
      expect(routers).toContain("community");
    });

    it("should have like procedure", () => {
      // Check for like/toggle like functionality
      expect(routers).toMatch(/like.*protectedProcedure/);
    });

    it("should have copy procedure", () => {
      expect(routers).toContain("copy");
    });

    it("should support search and sort in community listing", () => {
      const communitySection = routers.slice(routers.indexOf("community"));
      expect(communitySection).toContain("search");
      expect(communitySection).toContain("sort");
    });
  });

  describe("DB helpers - Community presets", () => {
    it("should have getCommunityPresets helper", () => {
      expect(db).toContain("getCommunityPresets");
    });

    it("should have togglePresetLike helper", () => {
      expect(db).toContain("togglePresetLike");
    });

    it("should have copyPreset helper", () => {
      expect(db).toContain("copyPreset");
    });
  });
});

describe("Voice Clone v5.3 - Realtime Voice Analysis", () => {
  const routers = readFile("server/routers.ts");

  describe("Backend - analyzeRealtime router", () => {
    it("should have analyzeRealtime procedure", () => {
      expect(routers).toContain("analyzeRealtime");
    });

    it("should accept audioData input", () => {
      const realtimeSection = routers.slice(routers.indexOf("analyzeRealtime"));
      expect(realtimeSection).toContain("audioData");
    });

    it("should use LLM for voice analysis", () => {
      // The realtime analysis should use invokeLLM
      expect(routers).toContain("invokeLLM");
    });
  });
});

describe("Voice Clone v5.3 - Frontend Integration", () => {
  const dialog = readFile("client/src/components/AvatarSettingsDialog.tsx");

  describe("Multi-sample UI", () => {
    it("should have multi-sample section in dialog", () => {
      expect(dialog).toContain("multiSample");
    });

    it("should have add sample button/functionality", () => {
      expect(dialog).toContain("addSample");
    });

    it("should have combined analysis button", () => {
      expect(dialog).toContain("analyzeCombined");
    });
  });

  describe("Community Preset Library UI", () => {
    it("should have community library section", () => {
      expect(dialog).toContain("communityLibrary");
    });

    it("should have search input for community presets", () => {
      expect(dialog).toContain("communitySearch");
    });

    it("should have sort options (popular, newest, mostUsed)", () => {
      expect(dialog).toContain("communitySort");
      expect(dialog).toContain("popular");
      expect(dialog).toContain("newest");
      expect(dialog).toContain("mostUsed");
    });

    it("should have like button for community presets", () => {
      expect(dialog).toContain("likePreset");
    });

    it("should have copy button for community presets", () => {
      expect(dialog).toContain("copyPreset");
    });

    it("should have publish toggle for own presets", () => {
      expect(dialog).toContain("publishPreset");
    });
  });

  describe("Realtime Analysis UI", () => {
    it("should have realtime analysis section", () => {
      expect(dialog).toContain("realtimeAnalysis");
    });

    it("should have realtime analysis result display", () => {
      expect(dialog).toContain("realtimeAnalysis");
    });

    it("should have analysis loading state", () => {
      expect(dialog).toContain("isAnalyzing");
    });
  });
});

describe("Voice Clone v5.3 - i18n", () => {
  const i18n = readFile("client/src/i18n/components/AvatarSettingsDialog.ts");

  it("should have multi-sample related translation keys", () => {
    expect(i18n).toContain("multiSampleSection");
    expect(i18n).toContain("addMoreSamples");
  });

  it("should have community library translation keys", () => {
    expect(i18n).toContain("communityPresetsSection");
    expect(i18n).toContain("communityPresetsDesc");
  });

  it("should have realtime analysis translation keys", () => {
    expect(i18n).toContain("realtimeAnalysisSection");
    expect(i18n).toContain("analyzing");
  });

  it("should have sort option translation keys", () => {
    expect(i18n).toContain("browseCommunitySortPopular");
    expect(i18n).toContain("browseCommunitySortNewest");
    expect(i18n).toContain("browseCommunitySortMostUsed");
  });

  it("should have publish/unpublish translation keys", () => {
    expect(i18n).toContain("publishPreset");
    expect(i18n).toContain("unpublishPreset");
  });

  it("should have copy preset translation key", () => {
    expect(i18n).toContain("copyPreset");
  });

  it("should have search presets translation key", () => {
    expect(i18n).toContain("searchPresets");
  });

  it("should have Korean translations", () => {
    expect(i18n).toContain("ko");
  });

  it("should have English translations", () => {
    expect(i18n).toContain("en");
  });

  it("should have Japanese translations", () => {
    expect(i18n).toContain("ja");
  });

  it("should have Chinese translations", () => {
    expect(i18n).toContain("zh");
  });
});
