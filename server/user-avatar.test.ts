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


function readAllLectureBuilderFiles(): string {
  const fsx = require('fs');
  const pathx = require('path');
  const mainFile = pathx.resolve(__dirname, '../client/src/pages/LectureBuilder.tsx');
  const subDir = pathx.resolve(__dirname, '../client/src/pages/lecture-builder');
  let content = fsx.readFileSync(mainFile, 'utf-8');
  if (fsx.existsSync(subDir) && fsx.statSync(subDir).isDirectory()) {
    const subFiles = fsx.readdirSync(subDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    content += '\n' + subFiles.map(f => fsx.readFileSync(pathx.join(subDir, f), 'utf-8')).join('\n');
  }
  return content;
}

describe("User Avatar Feature", () => {
  // Test 1: DB schema includes userAvatars table
  it("should have userAvatars table in schema", () => {
    const schema = fs.readFileSync(
      path.join(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );
    expect(schema).toContain("userAvatars");
    expect(schema).toContain("imageUrl");
    expect(schema).toContain("userId");
  });

  // Test 2: Router includes userAvatar procedures
  it("should have userAvatar router with CRUD procedures", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("userAvatar:");
    expect(routers).toContain("list:");
    expect(routers).toContain("create:");
    expect(routers).toContain("delete:");
  });

  // Test 3: DB helpers include userAvatar functions
  it("should have userAvatar helper functions in db.ts", () => {
    const db = readAllDbFiles();
    expect(db).toContain("listUserAvatars");
    expect(db).toContain("createUserAvatar");
    expect(db).toContain("deleteUserAvatar");
  });

  // Test 4: LectureBuilder has avatar upload UI with tabs
  it("should have avatar upload tabs in LectureBuilder including AI tab", () => {
    const lb = readAllLectureBuilderFiles();
    // Check for tab structure
    expect(lb).toContain("TabsList");
    expect(lb).toContain("TabsTrigger");
    expect(lb).toContain("TabsContent");
    // Check for 4 tabs: preset, my, upload, ai
    expect(lb).toContain('value="preset"');
    expect(lb).toContain('value="my"');
    expect(lb).toContain('value="upload"');
    expect(lb).toContain('value="ai"');
    // Check for file input
    expect(lb).toContain('type="file"');
    expect(lb).toContain('accept="image/*"');
  });

  // Test 5: i18n keys exist for avatar feature
  it("should have i18n translations for avatar upload feature", () => {
    const i18n = fs.readFileSync(
      path.join(__dirname, "../client/src/i18n/pages/LectureBuilder.ts"),
      "utf-8"
    );
    // Tab labels
    expect(i18n).toContain("lectureBuilder.avatarTab.preset");
    expect(i18n).toContain("lectureBuilder.avatarTab.myAvatars");
    expect(i18n).toContain("lectureBuilder.avatarTab.upload");
    // Avatar upload keys
    expect(i18n).toContain("lectureBuilder.avatar.uploadTitle");
    expect(i18n).toContain("lectureBuilder.avatar.uploadDesc");
    expect(i18n).toContain("lectureBuilder.avatar.clickToUpload");
    expect(i18n).toContain("lectureBuilder.avatar.saveAndRegister");
    expect(i18n).toContain("lectureBuilder.avatar.changePhoto");
    expect(i18n).toContain("lectureBuilder.avatar.fileTooLarge");
    expect(i18n).toContain("lectureBuilder.avatar.myAvatarsEmpty");
    expect(i18n).toContain("lectureBuilder.avatar.deleteConfirm");
  });

  // Test 6: addAvatar mutation supports customFaceUrl
  it("should support customFaceUrl in addAvatar mutation", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("customFaceUrl");
  });

  // Test 7: userAvatar create uses storagePut for S3 upload
  it("should use storagePut for avatar image storage", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    // The userAvatar.create procedure should use storagePut
    expect(routers).toContain("storagePut");
  });

  // Test 8: LectureBuilder uses trpc.userAvatar hooks
  it("should use trpc.userAvatar hooks in LectureBuilder", () => {
    const lb = readAllLectureBuilderFiles();
    expect(lb).toContain("trpc.userAvatar.list.useQuery");
    expect(lb).toContain("trpc.userAvatar.create.useMutation");
    expect(lb).toContain("trpc.userAvatar.delete.useMutation");
  });
});

describe("AI Face Generation Feature", () => {
  // Test 9: Router includes generateFace procedure
  it("should have generateFace procedure in userAvatar router", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("generateFace:");
    expect(routers).toContain("generateImage");
    expect(routers).toContain("Professional headshot portrait photo");
  });

  // Test 10: generateFace handles undefined URL from generateImage
  it("should handle undefined URL from generateImage with TRPCError", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    // Check that there's a null check for generatedUrl
    expect(routers).toContain("if (!generatedUrl)");
    expect(routers).toContain("Image generation failed");
  });

  // Test 11: generateFace saves to S3 and creates DB record
  it("should save generated image to S3 and create DB record", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    // Check S3 upload path pattern
    expect(routers).toContain("user-avatars/");
    expect(routers).toContain("ai-");
    // Check DB creation
    expect(routers).toContain('type: "ai"');
    expect(routers).toContain("createUserAvatar");
  });

  // Test 12: LectureBuilder has AI generation tab UI
  it("should have AI generation tab UI in LectureBuilder", () => {
    const lb = readAllLectureBuilderFiles();
    // AI tab trigger
    expect(lb).toContain('value="ai"');
    // AI generation state
    expect(lb).toContain("aiPrompt");
    expect(lb).toContain("aiGenerating");
    expect(lb).toContain("aiPreview");
    // generateFace mutation
    expect(lb).toContain("trpc.userAvatar.generateFace.useMutation");
    // Example prompts
    expect(lb).toContain("Korean female professor");
  });

  // Test 13: AI generation i18n keys exist for all 20 languages
  it("should have AI generation i18n keys for all languages", () => {
    const i18n = fs.readFileSync(
      path.join(__dirname, "../client/src/i18n/pages/LectureBuilder.ts"),
      "utf-8"
    );
    // AI tab label
    expect(i18n).toContain("lectureBuilder.avatarTab.aiGenerate");
    // AI generation keys
    expect(i18n).toContain("lectureBuilder.avatar.aiTitle");
    expect(i18n).toContain("lectureBuilder.avatar.aiDesc");
    expect(i18n).toContain("lectureBuilder.avatar.aiPlaceholder");
    expect(i18n).toContain("lectureBuilder.avatar.aiGenerateBtn");
    expect(i18n).toContain("lectureBuilder.avatar.aiGenerating");
    expect(i18n).toContain("lectureBuilder.avatar.aiGenerated");
    expect(i18n).toContain("lectureBuilder.avatar.aiRegenerate");
    expect(i18n).toContain("lectureBuilder.avatar.aiSavedToMyAvatars");
    expect(i18n).toContain("lectureBuilder.avatar.aiExamples");
    expect(i18n).toContain("lectureBuilder.avatar.aiEx1");
    expect(i18n).toContain("lectureBuilder.avatar.aiEx2");
    expect(i18n).toContain("lectureBuilder.avatar.aiEx3");
    expect(i18n).toContain("lectureBuilder.avatar.aiEx4");
    // Verify multiple languages have the key
    const matches = i18n.match(/lectureBuilder\.avatarTab\.aiGenerate/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });

  // Test 14: Grid layout is 4 columns for tabs
  it("should use grid-cols-4 for tab layout", () => {
    const lb = readAllLectureBuilderFiles();
    expect(lb).toContain("grid-cols-4");
  });
});

describe("Avatar Edit Feature", () => {
  // Test 15: Router includes update procedure
  it("should have update procedure in userAvatar router", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("update:");
    expect(routers).toContain("updateUserAvatar");
  });

  // Test 16: DB helpers include updateUserAvatar
  it("should have updateUserAvatar helper in db.ts", () => {
    const db = readAllDbFiles();
    expect(db).toContain("updateUserAvatar");
  });

  // Test 17: LectureBuilder has edit dialog for user avatars
  it("should have user avatar edit dialog in LectureBuilder", () => {
    const lb = readAllLectureBuilderFiles();
    // Edit state
    expect(lb).toContain("editingUserAvatar");
    expect(lb).toContain("editUserAvatarName");
    expect(lb).toContain("editUserAvatarDesc");
    // Update mutation
    expect(lb).toContain("trpc.userAvatar.update.useMutation");
    // Edit button (Pencil icon)
    expect(lb).toContain("Pencil");
  });

  // Test 18: Edit dialog i18n keys exist
  it("should have edit dialog i18n keys", () => {
    const i18n = fs.readFileSync(
      path.join(__dirname, "../client/src/i18n/pages/LectureBuilder.ts"),
      "utf-8"
    );
    expect(i18n).toContain("lectureBuilder.avatar.editTitle");
    expect(i18n).toContain("lectureBuilder.avatar.editName");
    expect(i18n).toContain("lectureBuilder.avatar.editDesc");
    expect(i18n).toContain("lectureBuilder.avatar.editSave");
    expect(i18n).toContain("lectureBuilder.avatar.updated");
    // Verify multiple languages
    const matches = i18n.match(/lectureBuilder\.avatar\.editTitle/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });
});

describe("Avatar Favorite & Sort Feature", () => {
  // Test 19: DB schema includes favorite/usage columns
  it("should have isFavorite, lastUsedAt, useCount in userAvatars schema", () => {
    const schema = fs.readFileSync(
      path.join(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );
    expect(schema).toContain("isFavorite");
    expect(schema).toContain("lastUsedAt");
    expect(schema).toContain("useCount");
  });

  // Test 20: DB helpers include favorite/usage functions
  it("should have toggleFavorite, recordUsage, listSorted helpers in db.ts", () => {
    const db = readAllDbFiles();
    expect(db).toContain("toggleUserAvatarFavorite");
    expect(db).toContain("recordUserAvatarUsage");
    expect(db).toContain("listUserAvatarsSorted");
  });

  // Test 21: listUserAvatarsSorted supports 4 sort modes
  it("should support favorite, recent, name, created sort modes", () => {
    const db = readAllDbFiles();
    expect(db).toContain('"favorite"');
    expect(db).toContain('"recent"');
    expect(db).toContain('"name"');
    expect(db).toContain('"created"');
    // Check that asc is imported for name sorting
    expect(db).toContain("asc");
  });

  // Test 22: Router includes toggleFavorite and recordUsage procedures
  it("should have toggleFavorite and recordUsage procedures in router", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("toggleFavorite:");
    expect(routers).toContain("recordUsage:");
    expect(routers).toContain("toggleUserAvatarFavorite");
    expect(routers).toContain("recordUserAvatarUsage");
  });

  // Test 23: Router list procedure accepts sortBy parameter
  it("should accept sortBy parameter in list procedure", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("sortBy");
    expect(routers).toContain("listUserAvatarsSorted");
  });

  // Test 24: LectureBuilder has favorite toggle and sort UI
  it("should have favorite toggle and sort dropdown in LectureBuilder", () => {
    const lb = readAllLectureBuilderFiles();
    // Sort state
    expect(lb).toContain("avatarSortBy");
    // Favorite toggle mutation
    expect(lb).toContain("trpc.userAvatar.toggleFavorite.useMutation");
    // Record usage mutation
    expect(lb).toContain("trpc.userAvatar.recordUsage.useMutation");
    // Star icon for favorites
    expect(lb).toContain("Star");
    // ArrowUpDown icon for sort
    expect(lb).toContain("ArrowUpDown");
    // Sort select options
    expect(lb).toContain("sortFavorite");
    expect(lb).toContain("sortRecent");
    expect(lb).toContain("sortName");
    expect(lb).toContain("sortCreated");
  });

  // Test 25: Favorite star badge shows on favorited avatars
  it("should show star badge on favorited avatars", () => {
    const lb = readAllLectureBuilderFiles();
    expect(lb).toContain("av.isFavorite");
    expect(lb).toContain("fill-yellow-400");
  });

  // Test 26: i18n keys for sort options exist in all 20 languages
  it("should have sort i18n keys for all 20 languages", () => {
    const i18n = fs.readFileSync(
      path.join(__dirname, "../client/src/i18n/pages/LectureBuilder.ts"),
      "utf-8"
    );
    expect(i18n).toContain("lectureBuilder.avatar.avatarCount");
    expect(i18n).toContain("lectureBuilder.avatar.sortFavorite");
    expect(i18n).toContain("lectureBuilder.avatar.sortRecent");
    expect(i18n).toContain("lectureBuilder.avatar.sortName");
    expect(i18n).toContain("lectureBuilder.avatar.sortCreated");
    // Verify all 20 languages have the key
    const matches = i18n.match(/lectureBuilder\.avatar\.sortFavorite/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(20);
  });
});

describe("D-ID Avatar Preview Feature", () => {
  // Test: Router includes D-ID preview procedures
  it("should have createDidPreview procedure in userAvatar router", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("createDidPreview:");
    expect(routers).toContain("getDidPreviewStatus:");
    expect(routers).toContain("checkDidCredits:");
  });

  // Test: D-ID createDidPreview accepts correct input schema
  it("should accept imageUrl, text, voiceId, voiceProvider in createDidPreview", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("imageUrl: z.string().url()");
    expect(routers).toContain('text: z.string().min(1).max(1000)');
    expect(routers).toContain('voiceId: z.string().default("en-US-JennyNeural")');
    expect(routers).toContain('voiceProvider: z.enum(["microsoft", "amazon"])');
  });

  // Test: D-ID API endpoint is correct
  it("should call correct D-ID API endpoint", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("https://api.d-id.com/talks");
    expect(routers).toContain("https://api.d-id.com/credits");
  });

  // Test: D-ID videos are uploaded to S3
  it("should upload D-ID video to S3 for persistence", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("did-previews/");
    expect(routers).toContain("storagePut(videoKey, videoBuffer");
  });

  // Test: getDidPreviewStatus returns status and videoUrl
  it("should return status, videoUrl, and error from getDidPreviewStatus", () => {
    const routers = (() => { const dir = path.join(__dirname, "routers"); if (!fs.existsSync(dir)) return fs.readFileSync(path.join(__dirname, "routers.ts"), "utf-8"); return fs.readdirSync(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n"); })();
    expect(routers).toContain("status: data.status as string");
    expect(routers).toContain("videoUrl");
    expect(routers).toContain("error: data.error?.description");
  });

  // Test: ENV includes DID_API_KEY
  it("should have DID_API_KEY in env configuration", () => {
    const env = fs.readFileSync(
      path.join(__dirname, "_core/env.ts"),
      "utf-8"
    );
    expect(env).toContain("didApiKey");
    expect(env).toContain("DID_API_KEY");
  });

  // Test: Frontend includes DID preview tab
  it("should have DID preview tab in LectureBuilder", () => {
    const builder = readAllLectureBuilderFiles();
    expect(builder).toContain('value="did"');
    expect(builder).toContain("createDidPreview");
    expect(builder).toContain("didVideoUrl");
    expect(builder).toContain("didVoiceId");
  });

  // Test: i18n includes DID translation keys
  it("should have DID i18n translation keys for all 20 languages", () => {
    const i18n = fs.readFileSync(
      path.join(__dirname, "../client/src/i18n/pages/LectureBuilder.ts"),
      "utf-8"
    );
    const count = (i18n.match(/lectureBuilder\.avatarTab\.didPreview/g) || []).length;
    expect(count).toBe(20);
    expect(i18n).toContain("lectureBuilder.avatar.didTitle");
    expect(i18n).toContain("lectureBuilder.avatar.didGenerateBtn");
    expect(i18n).toContain("lectureBuilder.avatar.didSuccess");
  });

  // Test: D-ID voice options are available
  it("should include multiple voice options for D-ID", () => {
    const builder = readAllLectureBuilderFiles();
    expect(builder).toContain("en-US-JennyNeural");
    expect(builder).toContain("ko-KR-SunHiNeural");
    expect(builder).toContain("ja-JP-NanamiNeural");
    expect(builder).toContain("zh-CN-XiaoxiaoNeural");
  });
});
