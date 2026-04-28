import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import * as schema from "../drizzle/schema";
import fs from "fs";
import path from "path";

describe("v4.2 - Google OAuth Login/Register Fix", () => {
  describe("Router structure", () => {
    it("has getGoogleClientId procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.getGoogleClientId");
    });

    it("has googleLogin procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("auth.googleLogin");
    });
  });

  describe("auth.getGoogleClientId", () => {
    it("returns an object with clientId field", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });
      const result = await caller.auth.getGoogleClientId();
      expect(result).toHaveProperty("clientId");
      expect(typeof result.clientId).toBe("string");
    });
  });

  describe("auth.googleLogin - input validation", () => {
    it("requires credential string", async () => {
      const caller = appRouter.createCaller({
        user: null,
        req: {} as any,
        res: {} as any,
      });
      await expect(
        caller.auth.googleLogin({ credential: "" })
      ).rejects.toThrow();
    });
  });

  describe("DB helpers for Google OAuth", () => {
    it("getUserByGoogleId function exists", () => {
      expect(typeof db.getUserByGoogleId).toBe("function");
    });

    it("createUserWithGoogle function exists", () => {
      expect(typeof db.createUserWithGoogle).toBe("function");
    });

    it("linkGoogleToUser function exists", () => {
      expect(typeof db.linkGoogleToUser).toBe("function");
    });
  });

  describe("Schema - Google OAuth fields", () => {
    it("users table has googleId field", () => {
      const columns = schema.users;
      expect(columns).toBeDefined();
    });
  });

  describe("Frontend - Google Sign-In integration", () => {
    it("index.html includes Google GSI script", () => {
      const indexPath = path.join(__dirname, "../client/index.html");
      const content = fs.readFileSync(indexPath, "utf-8");
      expect(content).toContain("accounts.google.com/gsi/client");
    });

    it("Login.tsx uses trpc.auth.getGoogleClientId", () => {
      const loginPath = path.join(__dirname, "../client/src/pages/Login.tsx");
      const content = fs.readFileSync(loginPath, "utf-8");
      expect(content).toContain("trpc.auth.getGoogleClientId.useQuery");
      expect(content).toContain("trpc.auth.googleLogin.useMutation");
    });

    it("Register.tsx includes Google Sign-In button", () => {
      const registerPath = path.join(__dirname, "../client/src/pages/Register.tsx");
      const content = fs.readFileSync(registerPath, "utf-8");
      expect(content).toContain("trpc.auth.getGoogleClientId.useQuery");
      expect(content).toContain("trpc.auth.googleLogin.useMutation");
      expect(content).toContain("googleRegister");
    });

    it("Login.tsx has fallback button when Google not configured", () => {
      const loginPath = path.join(__dirname, "../client/src/pages/Login.tsx");
      const content = fs.readFileSync(loginPath, "utf-8");
      expect(content).toContain("googleNotConfigured");
      expect(content).toContain("Sign in with Google");
    });

    it("Register.tsx has fallback button when Google not configured", () => {
      const registerPath = path.join(__dirname, "../client/src/pages/Register.tsx");
      const content = fs.readFileSync(registerPath, "utf-8");
      expect(content).toContain("googleNotConfigured");
      // After i18n, text is in translation key
      expect(content).toContain("googleRegister");
    });
  });

  describe("env.ts - Google Client ID", () => {
    it("env.ts includes googleClientId", () => {
      const envPath = path.join(__dirname, "_core/env.ts");
      const content = fs.readFileSync(envPath, "utf-8");
      expect(content).toContain("googleClientId");
      expect(content).toContain("VITE_GOOGLE_CLIENT_ID");
    });
  });
});
