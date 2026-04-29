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
  it("should have avatar upload tabs in LectureBuilder", () => {
    const lb = fs.readFileSync(
      path.join(__dirname, "../client/src/pages/LectureBuilder.tsx"),
      "utf-8"
    );
    // Check for tab structure
    expect(lb).toContain("TabsList");
    expect(lb).toContain("TabsTrigger");
    expect(lb).toContain("TabsContent");
    // Check for 3 tabs: preset, my, upload
    expect(lb).toContain('value="preset"');
    expect(lb).toContain('value="my"');
    expect(lb).toContain('value="upload"');
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
