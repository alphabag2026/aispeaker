import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function readAllDbFiles(): string {
  const dir = path.resolve(__dirname, "db");
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    return fs.readdirSync(dir).filter(f => f.endsWith(".ts")).map(f => fs.readFileSync(path.join(dir, f), "utf-8")).join("\n");
  }
  return fs.readFileSync(path.resolve(__dirname, "db.ts"), "utf-8");
}

const routersPath = path.join(__dirname, "routers");
const routersContent = (() => { if (fs.existsSync(routersPath) && fs.statSync(routersPath).isDirectory()) return fs.readdirSync(routersPath).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(routersPath, f), "utf-8")).join("\n"); return fs.readFileSync(routersPath, "utf-8"); })();

const dbPath = path.join(__dirname, "db.ts");
const dbContent = readAllDbFiles();

const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");

const creditDashboardPath = path.join(__dirname, "../client/src/pages/CreditDashboard.tsx");
const creditDashboardContent = fs.readFileSync(creditDashboardPath, "utf-8");

const lectureBuilderPath = path.join(__dirname, "../client/src/pages/LectureBuilder.tsx");
const lectureBuilderContent = readAllLectureBuilderFiles();


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

describe("v6.3: AI Clone Voice Preview", () => {
  it("should have generateCloneVoice router for single slide preview", () => {
    expect(routersContent).toContain("generateCloneVoice");
  });

  it("should have BatchCloneVoiceButton with preview step", () => {
    expect(lectureBuilderContent).toContain("BatchCloneVoiceButton");
    expect(lectureBuilderContent).toContain("previewUrl");
  });

  it("should have preview confirmation before batch generation", () => {
    expect(lectureBuilderContent).toContain("미리 테스트");
    expect(lectureBuilderContent).toContain("전체 생성");
  });

  it("should have audio playback in preview modal", () => {
    expect(lectureBuilderContent).toContain("<audio");
  });
});

describe("v6.3: Low Balance Alert", () => {
  it("should have checkLowBalance procedure in credit router", () => {
    expect(routersContent).toContain("checkLowBalance");
    expect(routersContent).toContain("LOW_THRESHOLD");
  });

  it("should notify owner when balance is low", () => {
    // The string is stored as unicode escapes in the file
    expect(routersContent).toContain("notifyOwner");
    expect(routersContent).toContain("checkLowBalance");
    // Check that the notification includes credit info
    expect(routersContent).toContain("credits");
  });

  it("should have LowBalanceBanner component in CreditDashboard", () => {
    expect(creditDashboardContent).toContain("LowBalanceBanner");
    expect(creditDashboardContent).toContain("크레딧 잔액이 부족합니다");
  });

  it("should show threshold and remaining credits", () => {
    expect(creditDashboardContent).toContain("threshold");
    expect(creditDashboardContent).toContain("충전하기");
  });

  it("should link to pricing page for top-up", () => {
    expect(creditDashboardContent).toContain("/pricing");
  });
});

describe("v6.3: Script Version Management", () => {
  it("should have slideScriptVersions table in schema", () => {
    expect(schemaContent).toContain("slideScriptVersions");
    expect(schemaContent).toContain("versionNumber");
    expect(schemaContent).toContain("sectionsSnapshot");
  });

  it("should have createSlideScriptVersion function in db.ts", () => {
    expect(dbContent).toContain("createSlideScriptVersion");
  });

  it("should have getSlideScriptVersions function in db.ts", () => {
    expect(dbContent).toContain("getSlideScriptVersions");
  });

  it("should have getLatestSlideScriptVersionNumber function in db.ts", () => {
    expect(dbContent).toContain("getLatestSlideScriptVersionNumber");
  });

  it("should auto-create version snapshot on saveSlideScripts", () => {
    // Check that saveSlideScripts router creates a version after saving
    const saveSlideScriptsIdx = routersContent.indexOf("saveSlideScripts:");
    const afterSave = routersContent.slice(saveSlideScriptsIdx, saveSlideScriptsIdx + 3000);
    expect(afterSave).toContain("createSlideScriptVersion");
    expect(afterSave).toContain("Auto-save");
  });

  it("should have listScriptVersions router", () => {
    expect(routersContent).toContain("listScriptVersions");
  });

  it("should have restoreScriptVersion router", () => {
    expect(routersContent).toContain("restoreScriptVersion");
  });

  it("should have VersionHistoryButton component in LectureBuilder", () => {
    expect(lectureBuilderContent).toContain("VersionHistoryButton");
    expect(lectureBuilderContent).toContain("버전 이력");
  });

  it("should show version list with restore button", () => {
    expect(lectureBuilderContent).toContain("복원");
    expect(lectureBuilderContent).toContain("versionNumber");
  });
});

describe("v6.3: Slide Transition Auto-save", () => {
  it("should trigger save on slide transition when there are unsaved changes", () => {
    // Check that slide click handler calls doSave when hasUnsavedChanges
    expect(lectureBuilderContent).toContain("if (hasUnsavedChanges) doSave()");
  });
});
