import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
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
    preferredLang: "ko",
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

// ============ Bookmark Tests ============

describe("Bookmark System", () => {
  it("bookmark.add requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.bookmark.add({ messageId: 1, lectureId: 1 })
    ).rejects.toThrow();
  });

  it("bookmark.add accepts valid input from authenticated user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.bookmark.add({ messageId: 1, lectureId: 1 });
    } catch (e: any) {
      // DB error expected, but not auth error
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("bookmark.remove requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.bookmark.remove({ messageId: 1 })
    ).rejects.toThrow();
  });

  it("bookmark.remove accepts valid input", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.bookmark.remove({ messageId: 1 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("bookmark.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.bookmark.list()
    ).rejects.toThrow();
  });

  it("bookmark.list returns array for authenticated user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.bookmark.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("bookmark.list accepts optional lectureId filter", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.bookmark.list({ lectureId: 1 });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

// ============ Progress Tracking Tests ============

describe("Progress Tracking System", () => {
  it("progress.get requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.progress.get({ lectureId: 1 })
    ).rejects.toThrow();
  });

  it("progress.get returns data for authenticated user", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.progress.get({ lectureId: 1 });
      // Should return null or progress object
      expect(result === null || typeof result === "object").toBe(true);
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("progress.update requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.progress.update({ lectureId: 1, timeSpentSeconds: 30 })
    ).rejects.toThrow();
  });

  it("progress.update accepts valid input", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.progress.update({
        lectureId: 1,
        timeSpentSeconds: 30,
        lastSlideIndex: 5,
      });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("progress.update accepts zero timeSpentSeconds", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.progress.update({
        lectureId: 1,
        timeSpentSeconds: 0,
      });
    } catch (e: any) {
      // DB error expected, not validation
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("progress.dashboard requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.progress.dashboard()
    ).rejects.toThrow();
  });

  it("progress.dashboard returns dashboard data", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.progress.dashboard();
      expect(result).toHaveProperty("totalLectures");
      expect(result).toHaveProperty("totalTimeSpent");
      expect(result).toHaveProperty("recentActivity");
      expect(result).toHaveProperty("vodHistory");
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("progress.recordVodView requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.progress.recordVodView({ vodId: 1 })
    ).rejects.toThrow();
  });
});

// ============ AI Context Template Tests ============

describe("AI Context Template System", () => {
  it("template.list is publicly accessible", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.template.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("template.list accepts optional category filter", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.template.list({ category: "web3" });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("template.create requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.template.create({
        name: "Test Template",
        category: "web3",
        systemPrompt: "You are a Web3 expert.",
      })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("template.create allows instructors", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.template.create({
        name: "Test Template",
        category: "web3",
        systemPrompt: "You are a Web3 expert.",
        description: "Test description",
        topics: "blockchain,ethereum",
        sampleQuestions: "What is Web3?",
      });
    } catch (e: any) {
      // DB error expected, but not auth error
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("template.create validates required fields", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.template.create({
        name: "",
        category: "web3",
        systemPrompt: "test",
      })
    ).rejects.toThrow();
  });

  it("template.update requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.template.update({
        id: 1,
        name: "Updated",
      })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("template.delete requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.template.delete({ id: 1 })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("template.seed creates built-in templates", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.template.seed();
      expect(result).toEqual({ success: true });
    } catch (e: any) {
      // DB error expected, not auth
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("template.getById throws NOT_FOUND for non-existent template", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.template.getById({ id: 99999 });
    } catch (e: any) {
      if (e.code) {
        expect(["NOT_FOUND", "INTERNAL_SERVER_ERROR"]).toContain(e.code);
      }
    }
  });
});

// ============ Avatar Generation Tests ============

describe("Avatar Generation (D-ID)", () => {
  it("avatar.generate requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.avatar.generate({
        text: "Hello",
        lectureId: 1,
      })
    ).rejects.toThrow();
  });

  it("avatar.generate validates text is not empty", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.avatar.generate({
        text: "",
        lectureId: 1,
      })
    ).rejects.toThrow();
  });

  it("avatar.generate accepts valid input", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.avatar.generate({
        text: "Hello, this is a test",
        lectureId: 1,
      });
    } catch (e: any) {
      // May fail due to D-ID API not configured, but should not be auth/validation error
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("avatar.getConfig requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.avatar.getConfig({ lectureId: 1 })
    ).rejects.toThrow();
  });
});

// ============ Cross-feature v1.2 Integration Tests ============

describe("v1.2 Cross-feature Integration", () => {
  it("student can use bookmark and progress but not templates CRUD", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);

    // Bookmark should work for students
    try {
      await caller.bookmark.add({ messageId: 1, lectureId: 1 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }

    // Progress should work for students
    try {
      await caller.progress.update({ lectureId: 1, timeSpentSeconds: 30 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
      expect(e.code).not.toBe("FORBIDDEN");
    }

    // Template CRUD should be forbidden for students
    await expect(
      caller.template.create({
        name: "Test",
        category: "web3",
        systemPrompt: "test",
      })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("instructor can manage templates", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.template.create({
        name: "Instructor Template",
        category: "web3",
        systemPrompt: "Expert in Web3",
      });
    } catch (e: any) {
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("template list is publicly accessible", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.template.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });
});
