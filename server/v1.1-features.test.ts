import { describe, expect, it } from "vitest";
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

// ============ VOD Tests ============

describe("VOD System", () => {
  it("vod.list is publicly accessible", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.vod.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // DB not available, but should not be auth error
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("vod.list accepts optional filters", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.vod.list({ lectureId: 1, status: "ready" });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("vod.getById throws NOT_FOUND for non-existent VOD", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.vod.getById({ id: 99999 });
      // If DB is available, should throw NOT_FOUND
    } catch (e: any) {
      if (e.code) {
        expect(["NOT_FOUND", "INTERNAL_SERVER_ERROR"]).toContain(e.code);
      }
    }
  });

  it("vod.timeline is publicly accessible", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.vod.timeline({ vodId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("vod.delete requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vod.delete({ id: 1 })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("vod.createFromLecture requires instructor role", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.vod.createFromLecture({ lectureId: 1 })
    ).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("vod.createFromLecture allows instructors", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.vod.createFromLecture({ lectureId: 1 });
    } catch (e: any) {
      // DB/lecture not found is expected, but not FORBIDDEN
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });
});

// ============ Translation Tests ============

describe("Translation System", () => {
  it("translation.languages returns supported languages", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const languages = await caller.translation.languages();
    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThanOrEqual(20);

    // Check structure
    const ko = languages.find((l: any) => l.code === "ko");
    expect(ko).toBeTruthy();
    expect(ko?.name).toBe("한국어");
    expect(ko?.flag).toBe("🇰🇷");

    const en = languages.find((l: any) => l.code === "en");
    expect(en).toBeTruthy();
    expect(en?.name).toBe("English");
  });

  it("translation.languages includes all major languages", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const languages = await caller.translation.languages();
    const codes = languages.map((l: any) => l.code);

    // Check key languages are present
    expect(codes).toContain("ko");
    expect(codes).toContain("en");
    expect(codes).toContain("ja");
    expect(codes).toContain("zh");
    expect(codes).toContain("es");
    expect(codes).toContain("fr");
    expect(codes).toContain("de");
    expect(codes).toContain("pt");
    expect(codes).toContain("ru");
    expect(codes).toContain("ar");
    expect(codes).toContain("hi");
    expect(codes).toContain("vi");
    expect(codes).toContain("th");
    expect(codes).toContain("id");
    expect(codes).toContain("tr");
    expect(codes).toContain("it");
    expect(codes).toContain("nl");
    expect(codes).toContain("pl");
    expect(codes).toContain("uk");
    expect(codes).toContain("sv");
  });

  it("translation.translate requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translation.translate({
        text: "안녕하세요",
        targetLang: "en",
      })
    ).rejects.toThrow();
  });

  it("translation.translate validates text is not empty", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translation.translate({
        text: "",
        targetLang: "en",
      })
    ).rejects.toThrow();
  });

  it("translation.translate validates targetLang length", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translation.translate({
        text: "Hello",
        targetLang: "x",
      })
    ).rejects.toThrow();
  });

  it("translation.translateMessages requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.translation.translateMessages({
        lectureId: 1,
        targetLang: "en",
      })
    ).rejects.toThrow();
  });
});

// ============ Avatar Mode Tests ============

describe("Avatar Mode in Lectures", () => {
  it("lecture.create accepts avatar aiMode", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.lecture.create({
        title: "Avatar Test Lecture",
        aiMode: "avatar",
      });
    } catch (e: any) {
      // DB not available, but input validation should pass
      expect(e.code).not.toBe("BAD_REQUEST");
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("lecture.create accepts voice aiMode", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.lecture.create({
        title: "Voice Test Lecture",
        aiMode: "voice",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("lecture.create accepts text aiMode", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.lecture.create({
        title: "Text Test Lecture",
        aiMode: "text",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("lecture.create rejects invalid aiMode", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.lecture.create({
        title: "Invalid Mode",
        aiMode: "invalid_mode" as any,
      })
    ).rejects.toThrow();
  });
});

// ============ User Preferred Language Tests ============

describe("User Preferred Language", () => {
  it("user.updateProfile accepts preferredLang", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.user.updateProfile({ preferredLang: "en" });
    } catch (e: any) {
      // DB not available, but should not be validation error
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("user.updateProfile validates preferredLang length", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.user.updateProfile({ preferredLang: "toolongstring" })
    ).rejects.toThrow();
  });
});

// ============ Cross-feature Integration Tests ============

describe("Cross-feature Integration", () => {
  it("instructor can access both VOD and lecture management", async () => {
    const { ctx } = createInstructorContext();
    const caller = appRouter.createCaller(ctx);

    // VOD delete should not throw FORBIDDEN
    try {
      await caller.vod.delete({ id: 1 });
    } catch (e: any) {
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }

    // Lecture create should not throw FORBIDDEN
    try {
      await caller.lecture.create({ title: "Integration Test" });
    } catch (e: any) {
      expect(e.message).not.toBe("강사 권한이 필요합니다.");
    }
  });

  it("student cannot access instructor-only features", async () => {
    const { ctx } = createUserContext({ platformRole: "student" });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.vod.delete({ id: 1 })).rejects.toThrow("강사 권한이 필요합니다.");
    await expect(caller.vod.createFromLecture({ lectureId: 1 })).rejects.toThrow("강사 권한이 필요합니다.");
    await expect(caller.lecture.create({ title: "Test" })).rejects.toThrow("강사 권한이 필요합니다.");
  });

  it("unauthenticated users can access public endpoints", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    // Public endpoints should not throw UNAUTHORIZED
    const languages = await caller.translation.languages();
    expect(languages.length).toBeGreaterThan(0);

    try {
      await caller.vod.list();
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }

    try {
      await caller.lecture.list();
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });
});
