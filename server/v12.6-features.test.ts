import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

function readFile(relPath: string): string {
  return readFileSync(resolve(__dirname, "..", relPath), "utf-8");
}

describe("v12.6 - Avatar AI Face Generation", () => {
  const routersCode = readFile("server/routers.ts");

  it("should have generateAvatarFace procedure in lectureBuilder router", () => {
    expect(routersCode).toContain("generateAvatarFace");
  });

  it("should accept prompt, style, gender, ageRange inputs", () => {
    expect(routersCode).toContain('prompt: z.string()');
    expect(routersCode).toContain('style: z.enum(["realistic", "anime", "3d", "illustration"])');
    expect(routersCode).toContain('gender: z.enum(["male", "female", "neutral"])');
    expect(routersCode).toContain('ageRange: z.enum(["young", "middle", "senior"])');
  });

  it("should use generateImage for AI face generation", () => {
    expect(routersCode).toContain("generateImage");
  });

  it("should return imageUrl from generation", () => {
    // The procedure returns { imageUrl }
    expect(routersCode).toContain("imageUrl");
  });
});

describe("v12.6 - Avatar Settings Dialog with AI Face & Voice Clone", () => {
  const dialogCode = readFile("client/src/components/AvatarSettingsDialog.tsx");

  it("should have 3 face tabs: gallery, custom, ai", () => {
    expect(dialogCode).toContain('value="gallery"');
    expect(dialogCode).toContain('value="custom"');
    expect(dialogCode).toContain('value="ai"');
  });

  it("should have AI style options", () => {
    expect(dialogCode).toContain('"realistic"');
    expect(dialogCode).toContain('"anime"');
    expect(dialogCode).toContain('"3d"');
    expect(dialogCode).toContain('"illustration"');
  });

  it("should have AI gender options", () => {
    expect(dialogCode).toContain('"male"');
    expect(dialogCode).toContain('"female"');
    expect(dialogCode).toContain('"neutral"');
  });

  it("should have AI age range options", () => {
    expect(dialogCode).toContain('"young"');
    expect(dialogCode).toContain('"middle"');
    expect(dialogCode).toContain('"senior"');
  });

  it("should call generateAvatarFace mutation", () => {
    expect(dialogCode).toContain("trpc.lectureBuilder.generateAvatarFace.useMutation");
  });

  it("should have voice clone tab with preset and clone modes", () => {
    expect(dialogCode).toContain('value="preset"');
    expect(dialogCode).toContain('value="clone"');
    expect(dialogCode).toContain("avatarSettingsDialog.defaultVoice");
    expect(dialogCode).toContain("avatarSettingsDialog.myVoiceClone");
  });

  it("should have voice recording functionality", () => {
    expect(dialogCode).toContain("startRecording");
    expect(dialogCode).toContain("stopRecording");
    expect(dialogCode).toContain("MediaRecorder");
    expect(dialogCode).toContain("navigator.mediaDevices.getUserMedia");
  });

  it("should have voice clone CRUD operations", () => {
    expect(dialogCode).toContain("trpc.voiceClone.create.useMutation");
    expect(dialogCode).toContain("trpc.voiceClone.list.useQuery");
    expect(dialogCode).toContain("trpc.voiceClone.delete.useMutation");
    expect(dialogCode).toContain("trpc.voiceClone.preview.useMutation");
  });

  it("should display clone list with status badges", () => {
    expect(dialogCode).toContain("avatarSettingsDialog.available");
    expect(dialogCode).toContain("avatarSettingsDialog.processing");
  });

  it("should have recording duration limit of 30 seconds", () => {
    expect(dialogCode).toContain("30");
    expect(dialogCode).toContain("recordDuration");
  });
});

describe("v12.6 - Presenter Studio", () => {
  const presenterCode = readFile("client/src/pages/PresenterStudio.tsx");
  const appCode = readFile("client/src/App.tsx");

  it("should have PresenterStudio page", () => {
    expect(presenterCode).toBeTruthy();
    expect(presenterCode.length).toBeGreaterThan(100);
  });

  it("should have route registered in App.tsx", () => {
    expect(appCode).toContain("PresenterStudio");
    expect(appCode).toContain("/broadcast/presenter");
  });

  it("should access broadcast by room code", () => {
    expect(presenterCode).toContain("roomCode");
    expect(presenterCode).toContain("getByRoom");
  });

  it("should have slide navigation controls", () => {
    expect(presenterCode).toContain("updateSlide");
  });

  it("should check presenter permissions", () => {
    // Should verify user is presenter or owner
    expect(presenterCode).toContain("presenter");
  });

  it("should have chat functionality", () => {
    expect(presenterCode).toContain("sendChat");
  });
});

describe("v12.6 - Voice Clone Backend", () => {
  const routersCode = readFile("server/routers.ts");
  const schemaCode = readFile("drizzle/schema.ts");
  const dbCode = readFile("server/db.ts");

  it("should have voiceClones table in schema", () => {
    expect(schemaCode).toContain("voiceClones");
    expect(schemaCode).toContain("sampleUrl");
    expect(schemaCode).toContain("cloneVoiceId");
  });

  it("should have voiceClone status enum", () => {
    expect(schemaCode).toContain("pending");
    expect(schemaCode).toContain("processing");
    expect(schemaCode).toContain("ready");
    expect(schemaCode).toContain("failed");
  });

  it("should have voice clone DB helpers", () => {
    expect(dbCode).toContain("createVoiceClone");
    expect(dbCode).toContain("getVoiceClonesByUser");
    expect(dbCode).toContain("getVoiceCloneById");
    expect(dbCode).toContain("updateVoiceClone");
    expect(dbCode).toContain("deleteVoiceClone");
  });

  it("should have voiceClone router with CRUD operations", () => {
    expect(routersCode).toContain("voiceClone: router({");
    // Check procedures exist within the router
    const vcIdx = routersCode.indexOf("voiceClone: router({");
    const vcSection = routersCode.substring(vcIdx, vcIdx + 8000);
    expect(vcSection).toContain("create: protectedProcedure");
    expect(vcSection).toContain("list: protectedProcedure");
    expect(vcSection).toContain("delete: protectedProcedure");
  });

  it("should have voice clone preview procedure", () => {
    const vcIdx = routersCode.indexOf("voiceClone: router({");
    const vcSection = routersCode.substring(vcIdx, vcIdx + 8000);
    expect(vcSection).toContain("preview: protectedProcedure");
    // Should use TTS for preview
    expect(vcSection).toContain("Tts");
  });

  it("should upload voice sample to S3", () => {
    // The create procedure should use storagePut
    const voiceCloneSection = routersCode.substring(
      routersCode.indexOf("voiceClone: router({"),
      routersCode.indexOf("voiceClone: router({") + 2000
    );
    expect(voiceCloneSection).toContain("storagePut");
    expect(voiceCloneSection).toContain("voice-clones/");
  });
});

describe("v12.6 - Broadcast ProjectId Integration", () => {
  const schemaCode = readFile("drizzle/schema.ts");

  it("should have projectId field in liveBroadcasts table", () => {
    // Check within a reasonable range of liveBroadcasts definition
    const idx = schemaCode.indexOf("liveBroadcasts");
    expect(idx).toBeGreaterThan(-1);
    const section = schemaCode.substring(idx, idx + 3000);
    expect(section).toContain("projectId");
  });
});

describe("v12.6 - Collaboration Role Presenter", () => {
  const schemaCode = readFile("drizzle/schema.ts");
  const routersCode = readFile("server/routers.ts");

  it("should have presenter role in projectCollaborators enum", () => {
    expect(schemaCode).toContain("presenter");
  });

  it("should allow presenter role in collaboration invite", () => {
    // The invite procedure should accept presenter role
    const collabSection = routersCode.substring(
      routersCode.indexOf("collaboration: router({"),
      routersCode.indexOf("collaboration: router({") + 3000
    );
    expect(collabSection).toContain("presenter");
  });

  it("should check presenter permission in broadcast operations", () => {
    // The broadcast start should allow presenter role
    expect(routersCode).toContain("getCollaboratorRole");
  });
});
