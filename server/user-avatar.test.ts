import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

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
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routers).toContain("userAvatar:");
    expect(routers).toContain("list:");
    expect(routers).toContain("create:");
    expect(routers).toContain("delete:");
  });

  // Test 3: DB helpers include userAvatar functions
  it("should have userAvatar helper functions in db.ts", () => {
    const db = fs.readFileSync(path.join(__dirname, "db.ts"), "utf-8");
    expect(db).toContain("listUserAvatars");
    expect(db).toContain("createUserAvatar");
    expect(db).toContain("deleteUserAvatar");
  });

  // Test 4: LectureBuilder has avatar upload UI with tabs
  it("should have avatar upload tabs in LectureBuilder including AI tab", () => {
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
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
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routers).toContain("customFaceUrl");
  });

  // Test 7: userAvatar create uses storagePut for S3 upload
  it("should use storagePut for avatar image storage", () => {
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    // The userAvatar.create procedure should use storagePut
    expect(routers).toContain("storagePut");
  });

  // Test 8: LectureBuilder uses trpc.userAvatar hooks
  it("should use trpc.userAvatar hooks in LectureBuilder", () => {
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
    expect(lb).toContain("trpc.userAvatar.list.useQuery");
    expect(lb).toContain("trpc.userAvatar.create.useMutation");
    expect(lb).toContain("trpc.userAvatar.delete.useMutation");
  });
});

describe("AI Face Generation Feature", () => {
  // Test 9: Router includes generateFace procedure
  it("should have generateFace procedure in userAvatar router", () => {
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routers).toContain("generateFace:");
    expect(routers).toContain("generateImage");
    expect(routers).toContain("Professional headshot portrait photo");
  });

  // Test 10: generateFace handles undefined URL from generateImage
  it("should handle undefined URL from generateImage with TRPCError", () => {
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    // Check that there's a null check for generatedUrl
    expect(routers).toContain("if (!generatedUrl)");
    expect(routers).toContain("Image generation failed");
  });

  // Test 11: generateFace saves to S3 and creates DB record
  it("should save generated image to S3 and create DB record", () => {
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    // Check S3 upload path pattern
    expect(routers).toContain("user-avatars/");
    expect(routers).toContain("ai-");
    // Check DB creation
    expect(routers).toContain('type: "ai"');
    expect(routers).toContain("createUserAvatar");
  });

  // Test 12: LectureBuilder has AI generation tab UI
  it("should have AI generation tab UI in LectureBuilder", () => {
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
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
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
    expect(lb).toContain("grid-cols-4");
  });
});

describe("Avatar Edit Feature", () => {
  // Test 15: Router includes update procedure
  it("should have update procedure in userAvatar router", () => {
    const routers = fs.readFileSync(
      path.join(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routers).toContain("update:");
    expect(routers).toContain("updateUserAvatar");
  });

  // Test 16: DB helpers include updateUserAvatar
  it("should have updateUserAvatar helper in db.ts", () => {
    const db = fs.readFileSync(path.join(__dirname, "db.ts"), "utf-8");
    expect(db).toContain("updateUserAvatar");
  });

  // Test 17: LectureBuilder has edit dialog for user avatars
  it("should have user avatar edit dialog in LectureBuilder", () => {
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
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
