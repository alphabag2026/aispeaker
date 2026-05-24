import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function readAllDbFiles(): string {
  const dir = path.resolve(__dirname, "db");
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    return fs.readdirSync(dir).filter(f => f.endsWith(".ts")).map(f => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n");
  }
  return fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf-8");
}

const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
const routersPath = path.join(__dirname, "routers");
const dbPath = path.join(__dirname, "db.ts");
const dialogPath = path.join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
const i18nPath = path.join(__dirname, "../client/src/i18n/components/AvatarSettingsDialog.ts");

const schema = fs.readFileSync(schemaPath, "utf-8");
const routers = (() => { if (fs.existsSync(routersPath) && fs.statSync(routersPath).isDirectory()) return fs.readdirSync(routersPath).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(routersPath, f), "utf-8")).join("\n"); return fs.readFileSync(routersPath, "utf-8"); })();
const dbHelpers = readAllDbFiles();
const dialog = fs.readFileSync(dialogPath, "utf-8");
const i18n = fs.readFileSync(i18nPath, "utf-8");

describe("v5.2 - Voice Speed/Pitch DB Storage", () => {
  it("projectAvatars schema has voiceSpeed column", () => {
    expect(schema).toContain("voiceSpeed");
  });

  it("projectAvatars schema has voicePitch column", () => {
    expect(schema).toContain("voicePitch");
  });

  it("voiceSpeed has float type with default 1.0", () => {
    const match = schema.match(/voiceSpeed.*float.*default\(1\.0?\)/s);
    expect(match).toBeTruthy();
  });

  it("voicePitch has float type with default 0", () => {
    const match = schema.match(/voicePitch.*float.*default\(0\)/s);
    expect(match).toBeTruthy();
  });

  it("updateAvatar router accepts voiceSpeed parameter", () => {
    expect(routers).toContain("voiceSpeed: z.number()");
  });

  it("updateAvatar router accepts voicePitch parameter", () => {
    expect(routers).toContain("voicePitch: z.number()");
  });
});

describe("v5.2 - Voice Effect Presets Table", () => {
  it("voiceEffectPresets table exists in schema", () => {
    expect(schema).toContain("voiceEffectPresets");
  });

  it("voiceEffectPresets has name column", () => {
    const idx = schema.indexOf('mysqlTable("voiceEffectPresets"');
    const presetSection = idx >= 0 ? schema.substring(idx, idx + 500) : "";
    expect(presetSection).toContain("name");
  });

  it("voiceEffectPresets has voiceId column", () => {
    const idx = schema.indexOf('mysqlTable("voiceEffectPresets"');
    const presetSection = idx >= 0 ? schema.substring(idx, idx + 500) : "";
    expect(presetSection).toContain("voiceId");
  });

  it("voiceEffectPresets has speed column", () => {
    // The table definition follows the second occurrence of voiceEffectPresets (the mysqlTable call)
    const idx = schema.indexOf('mysqlTable("voiceEffectPresets"');
    const presetSection = idx >= 0 ? schema.substring(idx, idx + 500) : "";
    expect(presetSection).toContain("speed");
  });

  it("voiceEffectPresets has pitch column", () => {
    const idx = schema.indexOf('mysqlTable("voiceEffectPresets"');
    const presetSection = idx >= 0 ? schema.substring(idx, idx + 500) : "";
    expect(presetSection).toContain("pitch");
  });
});

describe("v5.2 - Voice Effect Preset CRUD Router", () => {
  it("voiceEffectPreset router exists", () => {
    expect(routers).toContain("voiceEffectPresetRouter = router(");
  });

  it("voiceEffectPreset.create exists", () => {
    const section = routers.split("voiceEffectPresetRouter = router(")[1] || "";
    expect(section).toContain("create: protectedProcedure");
  });

  it("voiceEffectPreset.list exists", () => {
    const section = routers.split("voiceEffectPresetRouter = router(")[1] || "";
    expect(section).toContain("list: protectedProcedure");
  });

  it("voiceEffectPreset.delete exists", () => {
    const section = routers.split("voiceEffectPresetRouter = router(")[1] || "";
    expect(section).toContain("delete: protectedProcedure");
  });

  it("create preset validates name", () => {
    expect(routers).toContain("name: z.string().min(1)");
  });

  it("create preset validates speed range (0.5 to 2.0)", () => {
    expect(routers).toContain("speed: z.number().min(0.5).max(2.0)");
  });

  it("create preset validates pitch range (-12 to 12)", () => {
    expect(routers).toContain("pitch: z.number().min(-12).max(12)");
  });
});

describe("v5.2 - DB Helper Functions", () => {
  it("createVoiceEffectPreset function exists", () => {
    expect(dbHelpers).toContain("createVoiceEffectPreset");
  });

  it("listVoiceEffectPresets function exists", () => {
    expect(dbHelpers).toContain("listVoiceEffectPresets");
  });

  it("deleteVoiceEffectPreset function exists", () => {
    expect(dbHelpers).toContain("deleteVoiceEffectPreset");
  });
});

describe("v5.2 - Frontend AvatarSettingsDialog", () => {
  it("AvatarData interface has voiceSpeed field", () => {
    expect(dialog).toContain("voiceSpeed: number | null");
  });

  it("AvatarData interface has voicePitch field", () => {
    expect(dialog).toContain("voicePitch: number | null");
  });

  it("handleSave sends voiceSpeed", () => {
    expect(dialog).toContain("voiceSpeed:");
  });

  it("handleSave sends voicePitch", () => {
    expect(dialog).toContain("voicePitch:");
  });

  it("loads saved speed from avatar data", () => {
    expect(dialog).toContain("avatar.voiceSpeed");
  });

  it("loads saved pitch from avatar data", () => {
    expect(dialog).toContain("avatar.voicePitch");
  });

  it("has A/B comparison test UI", () => {
    expect(dialog).toContain("abTestSection");
  });

  it("has A/B original play button", () => {
    expect(dialog).toContain("playOriginal");
  });

  it("has A/B clone play button", () => {
    expect(dialog).toContain("playClone");
  });

  it("uses voiceEffectPreset.list query", () => {
    expect(dialog).toContain("trpc.voiceEffectPreset.list.useQuery");
  });

  it("uses voiceEffectPreset.create mutation", () => {
    expect(dialog).toContain("trpc.voiceEffectPreset.create.useMutation");
  });

  it("uses voiceEffectPreset.delete mutation", () => {
    expect(dialog).toContain("trpc.voiceEffectPreset.delete.useMutation");
  });

  it("has save as preset button", () => {
    expect(dialog).toContain("saveAsPreset");
  });

  it("has preset name input", () => {
    expect(dialog).toContain("enterPresetName");
  });

  it("has preset load functionality", () => {
    expect(dialog).toContain("presetLoaded");
  });

  it("has preset delete confirmation", () => {
    expect(dialog).toContain("confirmDeletePreset");
  });
});

describe("v5.2 - i18n Translation Keys", () => {
  const requiredKeys = [
    "abTestSection",
    "abTestDesc",
    "originalSample",
    "clonedVoice",
    "playOriginal",
    "playClone",
    "savedPresets",
    "saveAsPreset",
    "enterPresetName",
    "savePreset",
    "presetSaved",
    "presetDeleted",
    "presetLoaded",
    "noSavedPresets",
    "confirmDeletePreset",
  ];

  for (const key of requiredKeys) {
    it(`has i18n key: avatarSettingsDialog.${key}`, () => {
      expect(i18n).toContain(`"avatarSettingsDialog.${key}"`);
    });
  }

  it("has Korean translations", () => {
    expect(i18n).toContain("A/B 비교 테스트");
  });

  it("has English translations", () => {
    expect(i18n).toContain("A/B Comparison Test");
  });
});
