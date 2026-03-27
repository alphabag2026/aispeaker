import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper to create instructor context
function createInstructorContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-instructor",
      email: "instructor@test.com",
      name: "Test Instructor",
      loginMethod: "manus",
      role: "admin",
      platformRole: "instructor",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// Helper to create student context
function createStudentContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "test-student",
      email: "student@test.com",
      name: "Test Student",
      loginMethod: "manus",
      role: "user",
      platformRole: "student",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// Helper to create anonymous context
function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("v2.0 Features - Face Swap Profiles", () => {
  it("rejects unauthenticated users from listing face swap profiles", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.faceSwap.list()).rejects.toThrow();
  });

  it("rejects students from creating face swap profiles", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.faceSwap.create({ name: "Test Profile" })
    ).rejects.toThrow();
  });

  it("validates face swap create input - name is required", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.faceSwap.create({ name: "" })
    ).rejects.toThrow();
  });

  it("validates face swap method enum", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.faceSwap.create({ name: "Test", method: "invalid" as any })
    ).rejects.toThrow();
  });

  it("validates face swap update requires id", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.faceSwap.update({ id: undefined as any, name: "Updated" })
    ).rejects.toThrow();
  });
});

describe("v2.0 Features - Voice Modulation Profiles", () => {
  it("rejects unauthenticated users from listing voice mod profiles", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.voiceMod.list()).rejects.toThrow();
  });

  it("rejects students from creating voice mod profiles", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.voiceMod.create({ name: "Test Voice" })
    ).rejects.toThrow();
  });

  it("validates voice mod create - name is required", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "" })
    ).rejects.toThrow();
  });

  it("validates pitchShift range (-12 to 12)", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "Test", pitchShift: 20 })
    ).rejects.toThrow();
  });

  it("validates speedPercent range (50 to 200)", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "Test", speedPercent: 10 })
    ).rejects.toThrow();
  });

  it("validates toneWarmth range (-100 to 100)", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "Test", toneWarmth: 200 })
    ).rejects.toThrow();
  });

  it("validates speakingStyle enum", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "Test", speakingStyle: "invalid" as any })
    ).rejects.toThrow();
  });

  it("validates voiceCharacter enum", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.create({ name: "Test", voiceCharacter: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("v2.0 Features - Platform Integrations", () => {
  it("rejects unauthenticated users from listing platforms", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.platform.list()).rejects.toThrow();
  });

  it("rejects students from creating platform integrations", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.platform.create({ platform: "zoom", name: "My Zoom" })
    ).rejects.toThrow();
  });

  it("validates platform enum values", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.platform.create({ platform: "invalid" as any, name: "Test" })
    ).rejects.toThrow();
  });

  it("validates platform name is required", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.platform.create({ platform: "zoom", name: "" })
    ).rejects.toThrow();
  });

  it("validates platform update requires id", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.platform.update({ id: undefined as any, name: "Updated" })
    ).rejects.toThrow();
  });
});

describe("v2.0 Features - Certificates", () => {
  it("rejects unauthenticated users from issuing certificates", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.certificate.issue({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("allows public certificate verification", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.certificate.verify({ code: "NONEXISTENT" });
    expect(result).toEqual({ valid: false });
  });

  it("rejects unauthenticated users from listing certificates", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.certificate.myCertificates()).rejects.toThrow();
  });

  it("validates certificate issue requires lectureId", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.certificate.issue({ lectureId: undefined as any })
    ).rejects.toThrow();
  });
});

describe("v2.0 Features - Lecture Sessions", () => {
  it("rejects unauthenticated users from starting sessions", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.session.start({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("rejects students from starting sessions", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.session.start({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("rejects students from ending sessions", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(
      caller.session.end({ sessionId: 1, lectureId: 1 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from viewing current session", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(
      caller.session.current({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("rejects students from viewing active sessions", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(caller.session.activeSessions()).rejects.toThrow();
  });

  it("rejects students from viewing session history", async () => {
    const caller = appRouter.createCaller(createStudentContext());
    await expect(caller.session.history()).rejects.toThrow();
  });
});

describe("v2.0 Features - Certificate HTML Generation", () => {
  it("certificate verify returns valid:false for non-existent code", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const result = await caller.certificate.verify({ code: "CERT-DOESNOTEXIST" });
    expect(result.valid).toBe(false);
  });
});

describe("v2.0 Features - Input Validation Edge Cases", () => {
  it("face swap delete requires valid id", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.faceSwap.delete({ id: undefined as any })
    ).rejects.toThrow();
  });

  it("voice mod delete requires valid id", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.voiceMod.delete({ id: undefined as any })
    ).rejects.toThrow();
  });

  it("platform delete requires valid id", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.platform.delete({ id: undefined as any })
    ).rejects.toThrow();
  });

  it("session start validates lectureId is a number", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.session.start({ lectureId: "abc" as any })
    ).rejects.toThrow();
  });

  it("createMeeting validates integrationId", async () => {
    const caller = appRouter.createCaller(createInstructorContext());
    await expect(
      caller.platform.createMeeting({ integrationId: undefined as any, lectureId: 1 })
    ).rejects.toThrow();
  });
});
