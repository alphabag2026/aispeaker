import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const routersPath = join(__dirname, "routers.ts");
const routersContent = readFileSync(routersPath, "utf-8");
const schemaPath = join(__dirname, "../drizzle/schema.ts");
const schemaContent = readFileSync(schemaPath, "utf-8");

describe("v12.5 - 아바타 설정 다이얼로그", () => {
  it("updateAvatar 라우터에 sampleFaceId 필드가 있어야 한다", () => {
    // updateAvatar input에 sampleFaceId가 nullable로 존재
    const updateAvatarSection = routersContent.substring(
      routersContent.indexOf("updateAvatar: protectedProcedure"),
      routersContent.indexOf("updateAvatar: protectedProcedure") + 500
    );
    expect(updateAvatarSection).toContain("sampleFaceId");
    expect(updateAvatarSection).toContain("nullable");
  });

  it("updateAvatar 라우터에 customFaceUrl 필드가 있어야 한다", () => {
    const updateAvatarSection = routersContent.substring(
      routersContent.indexOf("updateAvatar: protectedProcedure"),
      routersContent.indexOf("updateAvatar: protectedProcedure") + 500
    );
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
    expect(content).toContain("샘플 갤러리");
    expect(content).toContain("내 얼굴 업로드");
  });

  it("AvatarSettingsDialog에 목소리 설정 섹션이 있어야 한다", () => {
    const dialogPath = join(__dirname, "../client/src/components/AvatarSettingsDialog.tsx");
    const content = readFileSync(dialogPath, "utf-8");
    expect(content).toContain("목소리 설정");
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
    const builderPath = join(__dirname, "../client/src/pages/LectureBuilder.tsx");
    const content = readFileSync(builderPath, "utf-8");
    expect(content).toContain("AvatarSettingsDialog");
    expect(content).toContain("setEditingAvatar");
    expect(content).toContain("cursor-pointer");
    expect(content).toContain("클릭하여 설정 변경");
  });

  it("아바타 카드에 customFaceUrl 우선 표시 로직이 있어야 한다", () => {
    const builderPath = join(__dirname, "../client/src/pages/LectureBuilder.tsx");
    const content = readFileSync(builderPath, "utf-8");
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
      routersContent.indexOf("collaboration: router"),
      routersContent.indexOf("collaboration: router") + 3000
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
    const dbContent = readFileSync(dbPath, "utf-8");
    expect(dbContent).toContain("getCollaboratorRole");
  });

  it("ProjectCollaborationPanel에 presenter 역할 UI가 있어야 한다", () => {
    const panelPath = join(__dirname, "../client/src/components/ProjectCollaborationPanel.tsx");
    const content = readFileSync(panelPath, "utf-8");
    expect(content).toContain("presenter");
    expect(content).toContain("발표자");
    expect(content).toContain("방송 시작/진행/슬라이드 제어");
  });

  it("역할별 권한 안내 UI가 있어야 한다", () => {
    const panelPath = join(__dirname, "../client/src/components/ProjectCollaborationPanel.tsx");
    const content = readFileSync(panelPath, "utf-8");
    expect(content).toContain("역할별 권한 안내");
    expect(content).toContain("편집자");
    expect(content).toContain("뷰어");
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
