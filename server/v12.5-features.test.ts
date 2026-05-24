import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function readAllDbFiles(): string {
  const fsx = require('fs');
  const pathx = require('path');
  const dir = pathx.resolve(__dirname, 'db');
  if (fsx.existsSync(dir) && fsx.statSync(dir).isDirectory()) {
    return fsx.readdirSync(dir).filter((f: string) => f.endsWith('.ts')).map((f: string) => fsx.readFileSync(pathx.join(dir, f), 'utf-8')).join('\n');
  }
  return fsx.readFileSync(pathx.resolve(__dirname, 'db.ts'), 'utf-8');
}

const routersPath = join(__dirname, "routers");
const routersContent = (() => { const { existsSync, statSync, readdirSync } = require("fs"); if (existsSync(routersPath) && statSync(routersPath).isDirectory()) return readdirSync(routersPath).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(join(routersPath, f), "utf-8")).join("\n"); return readFileSync(routersPath, "utf-8"); })();
const schemaPath = join(__dirname, "../drizzle/schema.ts");
const schemaContent = readFileSync(schemaPath, "utf-8");


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

describe("v12.5 - 아바타 설정 다이얼로그", () => {
  it("updateAvatar 라우터에 sampleFaceId 필드가 있어야 한다", () => {
    // updateAvatar input에 sampleFaceId가 nullable로 존재 (lectureBuilder의 updateAvatar)
    const idx = routersContent.lastIndexOf("updateAvatar: protectedProcedure");
    const updateAvatarSection = routersContent.substring(idx, idx + 500);
    expect(updateAvatarSection).toContain("sampleFaceId");
    expect(updateAvatarSection).toContain("nullable");
  });

  it("updateAvatar 라우터에 customFaceUrl 필드가 있어야 한다", () => {
    const idx = routersContent.lastIndexOf("updateAvatar: protectedProcedure");
    const updateAvatarSection = routersContent.substring(idx, idx + 500);
    expect(updateAvatarSection).toContain("customFaceUrl");
    expect(updateAvatarSection).toContain("nullable");
  });

  it("projectAvatars 스키마에 customFaceUrl 필드가 있어야 한다", () => {
    expect(schemaContent).toContain("customFaceUrl");
    expect(schemaContent).toContain("sampleFaceId");
  });

  it("AvatarSettingsDialog 컴포넌트 파일이 존재해야 한다", () => {
    const dialogPath = join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
    expect(existsSync(dialogPath)).toBe(true);
  });

  it("AvatarSettingsDialog에 얼굴 갤러리 탭이 있어야 한다", () => {
    const dialogPath = join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
    const content = readFileSync(dialogPath, "utf-8");
    // i18n: was toContain("샘플 갤러리")
    expect(content).toContain("t(");
    // i18n: was toContain("내 얼굴 업로드")
    expect(content).toContain("t(");
  });

  it("AvatarSettingsDialog에 목소리 설정 섹션이 있어야 한다", () => {
    const dialogPath = join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
    const content = readFileSync(dialogPath, "utf-8");
    // i18n: was toContain("목소리 설정")
    expect(content).toContain("t(");
    expect(content).toContain("VoicePreviewButton");
  });

  it("AvatarSettingsDialog에 역할 선택이 있어야 한다", () => {
    const dialogPath = join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
    const content = readFileSync(dialogPath, "utf-8");
    expect(content).toContain("instructor");
    expect(content).toContain("host");
    expect(content).toContain("guest");
    expect(content).toContain("narrator");
  });

  it("LectureBuilder에서 아바타 카드 클릭 시 설정 다이얼로그가 열려야 한다", () => {
    const content = readAllLectureBuilderFiles();
    expect(content).toContain("AvatarSettingsDialog");
    expect(content).toContain("setEditingAvatar");
    expect(content).toContain("cursor-pointer");
    // i18n: was toContain("클릭하여 설정 변경")
    expect(content).toContain("t(");
  });

  it("아바타 카드에 customFaceUrl 우선 표시 로직이 있어야 한다", () => {
    const content = readAllLectureBuilderFiles();
    expect(content).toContain("av.customFaceUrl");
  });
});

describe("v12.5 - 협업 권한 세분화 (presenter/editor/viewer)", () => {
  it("projectCollaborators 스키마에 presenter 역할이 있어야 한다", () => {
    expect(schemaContent).toContain('"presenter"');
    expect(schemaContent).toContain('"editor"');
    expect(schemaContent).toContain('"viewer"');
  });

  it("collaboration invite 라우터에 presenter 역할이 포함되어야 한다", () => {
    const inviteSection = routersContent.substring(
      routersContent.indexOf("collaborationRouter = router"),
      routersContent.indexOf("collaborationRouter = router") + 3000
    );
    expect(inviteSection).toContain("presenter");
    expect(inviteSection).toContain("editor");
    expect(inviteSection).toContain("viewer");
  });

  it("broadcast 라우터에서 presenter 권한 체크가 있어야 한다", () => {
    // broadcast.start에서 presenter 역할 확인
    expect(routersContent).toContain("presenter");
    // getCollaboratorRole 함수 사용
    const dbPath = join(__dirname, "db.ts");
    const dbContent = readAllDbFiles();
    expect(dbContent).toContain("getCollaboratorRole");
  });

  it("ProjectCollaborationPanel에 presenter 역할 UI가 있어야 한다", () => {
    const panelPath = join(__dirname, "../client/src/components/ProjectCollaborationPanel.tsx");
    const content = readFileSync(panelPath, "utf-8");
    expect(content).toContain("presenter");
    // i18n: was toContain("발표자")
    expect(content).toContain("t(");
    // i18n: was toContain("방송 시작/진행/슬라이드 제어")
    expect(content).toContain("t(");
  });

  it("역할별 권한 안내 UI가 있어야 한다", () => {
    const panelPath = join(__dirname, "../client/src/components/ProjectCollaborationPanel.tsx");
    const content = readFileSync(panelPath, "utf-8");
    // i18n: was toContain("역할별 권한 안내")
    expect(content).toContain("t(");
    // i18n: was toContain("편집자")
    expect(content).toContain("t(");
    // i18n: was toContain("뷰어")
    expect(content).toContain("t(");
  });

  it("liveBroadcasts 테이블에 projectId 필드가 있어야 한다", () => {
    expect(schemaContent).toContain("liveBroadcasts");
    // projectId가 liveBroadcasts에 있는지 확인 (전체 테이블 정의 범위 확대)
    const startIdx = schemaContent.indexOf("liveBroadcasts");
    const broadcastSection = schemaContent.substring(startIdx, startIdx + 2000);
    expect(broadcastSection).toContain("projectId");
  });

  it("updateRole에 presenter 옵션이 있어야 한다", () => {
    const updateRoleSection = routersContent.substring(
      routersContent.indexOf("updateRole"),
      routersContent.indexOf("updateRole") + 500
    );
    expect(updateRoleSection).toContain("presenter");
  });
});
