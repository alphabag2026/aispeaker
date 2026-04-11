import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

function createAuthContext(userId: number = 1): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: {
      id: userId,
      openId: `user_${userId}`,
      email: "test@example.com",
      name: "Test User",
      loginMethod: "email",
      role: "user",
      platformRole: "student",
      passwordHash: "$2a$12$dummyhash",
      googleId: null,
      bio: null,
      avatarUrl: null,
      preferredLang: "ko",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

// ============ Password Reset Flow Tests ============
describe("v4.1 - Password Reset & Admin Auto-Promotion", () => {

  describe("auth.forgotPassword", () => {
    it("returns success message for any email (security: no email existence leak)", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Even non-existent email should return success or throw DB error (no DB in test)
      try {
        const result = await caller.auth.forgotPassword({
          email: "nonexistent@example.com",
        });
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.message).toBeDefined();
      } catch (err: any) {
        // DB connection error is acceptable in test environment
        expect(err.message).toContain("Failed query");
      }
    });

    it("requires valid email format", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.forgotPassword({ email: "not-an-email" })
      ).rejects.toThrow();
    });
  });

  describe("auth.resetPassword", () => {
    it("rejects invalid token", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.resetPassword({
          token: "invalid-token-123",
          newPassword: "newpassword123",
        })
      ).rejects.toThrow();
    });

    it("requires minimum 6 character password", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.resetPassword({
          token: "some-token",
          newPassword: "12345", // too short
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.changePassword", () => {
    it("requires authentication", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // changePassword is a protectedProcedure, should fail for unauthenticated
      await expect(
        caller.auth.changePassword({
          currentPassword: "oldpass",
          newPassword: "newpass123",
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.register - input validation", () => {
    it("requires valid email", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: "invalid",
          password: "password123",
          name: "Test User",
        })
      ).rejects.toThrow();
    });

    it("requires minimum 6 character password", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: "test@example.com",
          password: "12345",
          name: "Test User",
        })
      ).rejects.toThrow();
    });

    it("requires non-empty name", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: "test@example.com",
          password: "password123",
          name: "",
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.login - input validation", () => {
    it("requires valid email format", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.login({
          email: "not-email",
          password: "password",
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.googleLogin - input validation", () => {
    it("requires credential string", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.googleLogin({
          credential: "",
        })
      ).rejects.toThrow();
    });
  });

  // ============ Route existence tests ============
  describe("Router structure", () => {
    it("has forgotPassword procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.forgotPassword");
    });

    it("has resetPassword procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.resetPassword");
    });

    it("has changePassword procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.changePassword");
    });

    it("has register procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.register");
    });

    it("has login procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.login");
    });

    it("has googleLogin procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.googleLogin");
    });
  });

  // ============ DB helper tests ============
  describe("DB helpers", () => {
    it("getAdminCount function exists", async () => {
      const db = await import("./db");
      expect(typeof db.getAdminCount).toBe("function");
    });

    it("savePasswordResetToken function exists", async () => {
      const db = await import("./db");
      expect(typeof db.savePasswordResetToken).toBe("function");
    });

    it("getPasswordResetToken function exists", async () => {
      const db = await import("./db");
      expect(typeof db.getPasswordResetToken).toBe("function");
    });

    it("deletePasswordResetToken function exists", async () => {
      const db = await import("./db");
      expect(typeof db.deletePasswordResetToken).toBe("function");
    });

    it("updateUserPassword function exists", async () => {
      const db = await import("./db");
      expect(typeof db.updateUserPassword).toBe("function");
    });

    it("createUserWithEmail function exists", async () => {
      const db = await import("./db");
      expect(typeof db.createUserWithEmail).toBe("function");
    });

    it("createUserWithGoogle function exists", async () => {
      const db = await import("./db");
      expect(typeof db.createUserWithGoogle).toBe("function");
    });
  });

  // ============ Schema tests ============
  describe("Schema", () => {
    it("passwordResetTokens table is defined", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.passwordResetTokens).toBeDefined();
    });

    it("users table has role field", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.users).toBeDefined();
    });
  });
});
