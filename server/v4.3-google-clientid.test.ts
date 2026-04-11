import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("v4.3 - Google OAuth Client ID Configuration", () => {
  it("VITE_GOOGLE_CLIENT_ID environment variable is set", () => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    expect(clientId!.length).toBeGreaterThan(10);
  });

  it("VITE_GOOGLE_CLIENT_ID has valid format (ends with .apps.googleusercontent.com)", () => {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("getGoogleClientId returns the configured client ID", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });
    const result = await caller.auth.getGoogleClientId();
    expect(result.clientId).toBeDefined();
    expect(result.clientId).not.toBe("");
    expect(result.clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });
});
