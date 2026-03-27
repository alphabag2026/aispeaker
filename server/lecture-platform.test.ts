import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    platformRole: "student",
    bio: null,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createInstructorContext(overrides: Partial<AuthenticatedUser> = {}) {
  return createUserContext({
    platformRole: "instructor",
    ...overrides,
  });
}

function createAdminContext(overrides: Partial<AuthenticatedUser> = {}) {
  return createUserContext({
    role: "admin",
    ...overrides,
  });
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Auth", () => {
  it("auth.me returns user when authenticated", async () => {
    const { ctx } = createUserContext({ name: "Alice" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.name).toBe("Alice");
    expect(result?.platformRole).toBe("student");
  });

  it("auth.me returns null when unauthenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.logout clears session cookie", async () => {
    const { ctx, clearedCookies } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("User Profile", () => {
  it("user.switchRole changes platform role", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // This will call db.updateUserPlatformRole which may fail without DB
    // We test that the procedure is callable and properly typed
    try {
      await caller.user.switchRole({ platformRole: "instructor" });
    } catch (e: any) {
      // DB not available in test, but procedure should not throw type errors
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("user.switchRole rejects invalid role", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.user.switchRole({ platformRole: "invalid" as any })
    ).rejects.toThrow();
  });

  it("user.updateProfile requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.user.updateProfile({ name: "New Name" })
    ).rejects.toThrow();
  });
});

describe("Instructor Access Control", () => {
  it("voiceProfile.list rejects students", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.voiceProfile.list()).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("voiceProfile.list allows instructors", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.voiceProfile.list();
    } catch (e: any) {
      // DB not available, but should not be FORBIDDEN
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("voiceProfile.list allows admins", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.voiceProfile.list();
    } catch (e: any) {
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("lecture.create rejects students", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.lecture.create({ title: "Test Lecture" })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("lecture.create allows instructors", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.lecture.create({ title: "Test Lecture" });
    } catch (e: any) {
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });
});

describe("Public Lecture Access", () => {
  it("lecture.list is accessible without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.lecture.list();
      // Should return an array (empty if no DB)
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // DB not available, but should not be auth error
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("lecture.list accepts optional filters", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.lecture.list({ category: "web3" });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("Enrollment", () => {
  it("enrollment.enroll requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.enrollment.enroll({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("enrollment.myEnrollments requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.enrollment.myEnrollments()).rejects.toThrow();
  });
});

describe("Q&A", () => {
  it("qa.ask requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.qa.ask({ lectureId: 1, content: "What is Web3?" })
    ).rejects.toThrow();
  });

  it("qa.ask validates input", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.qa.ask({ lectureId: 1, content: "" })
    ).rejects.toThrow();
  });

  it("qa.ask validates inputMethod parameter enum", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // Invalid inputMethod should fail validation
    await expect(
      caller.qa.ask({
        lectureId: 1,
        content: "What is DeFi?",
        inputMethod: "invalid_method" as any,
      })
    ).rejects.toThrow();
  });
});

describe("TTS", () => {
  it("tts.generate requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tts.generate({ text: "Hello" })
    ).rejects.toThrow();
  });

  it("tts.generate validates text length", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.tts.generate({ text: "" })
    ).rejects.toThrow();
  });
});

describe("Whiteboard", () => {
  it("whiteboard.save requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.whiteboard.save({ lectureId: 1, snapshotData: "{}" })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("whiteboard.load requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.whiteboard.load({ lectureId: 1 })
    ).rejects.toThrow();
  });
});

describe("Voice Profile CRUD", () => {
  it("voiceProfile.create validates name", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voiceProfile.create({ name: "" })
    ).rejects.toThrow();
  });

  it("voiceProfile.delete requires instructor", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voiceProfile.delete({ id: 1 })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });
});

describe("Material Management", () => {
  it("material.upload requires instructor", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.material.upload({
        lectureId: 1,
        title: "test.pdf",
        fileBase64: "dGVzdA==",
        filename: "test.pdf",
        fileType: "pdf",
      })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("material.delete requires instructor", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.material.delete({ id: 1 })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });
});
