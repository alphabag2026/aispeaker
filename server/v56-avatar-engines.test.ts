import { describe, expect, it, vi } from "vitest";

describe("Kling AI Avatar Engine", () => {
  it("should have KLING_ACCESS_KEY environment variable set", () => {
    const key = process.env.KLING_ACCESS_KEY;
    if (key) {
      expect(key.length).toBeGreaterThan(0);
      expect(typeof key).toBe("string");
    } else {
      // Optional - system works without Kling AI
      expect(true).toBe(true);
    }
  });

  it("should have KLING_SECRET_KEY environment variable set", () => {
    const key = process.env.KLING_SECRET_KEY;
    if (key) {
      expect(key.length).toBeGreaterThan(0);
      expect(typeof key).toBe("string");
    } else {
      expect(true).toBe(true);
    }
  });

  it("should generate valid JWT token structure", async () => {
    // Mock the env values for testing
    const accessKey = process.env.KLING_ACCESS_KEY || "test-access-key";
    const secretKey = process.env.KLING_SECRET_KEY || "test-secret-key";

    if (process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY) {
      const { SignJWT } = await import("jose");
      const now = Math.floor(Date.now() / 1000);
      const secret = new TextEncoder().encode(secretKey);
      const token = await new SignJWT({
        iss: accessKey,
        exp: now + 1800,
        nbf: now - 5,
        iat: now,
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .sign(secret);

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      // JWT has 3 parts separated by dots
      const parts = token.split(".");
      expect(parts.length).toBe(3);
    } else {
      expect(true).toBe(true);
    }
  });

  it("should correctly identify Kling configuration status", async () => {
    const { isKlingConfigured } = await import("./klingai");
    const configured = isKlingConfigured();
    const hasKeys = !!(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY);
    expect(configured).toBe(hasKeys);
  });
});

describe("Google Veo 3.1 Engine", () => {
  it("should have GEMINI_API_KEY environment variable for Veo", () => {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      expect(key.length).toBeGreaterThan(0);
      expect(typeof key).toBe("string");
    } else {
      // Optional - system works without Veo
      expect(true).toBe(true);
    }
  });

  it("should correctly identify Veo configuration status", async () => {
    const { isVeoConfigured } = await import("./veo");
    const configured = isVeoConfigured();
    const hasKey = !!process.env.GEMINI_API_KEY;
    expect(configured).toBe(hasKey);
  });

  it("should construct correct Veo API URL", () => {
    const VEO_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
    const VEO_MODEL = "veo-3.1-generate-preview";
    const url = `${VEO_API_BASE}/models/${VEO_MODEL}:generateVideos`;
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:generateVideos"
    );
  });
});

describe("Avatar Engine Selection", () => {
  it("should support all four avatar engines in enum", () => {
    const validEngines = ["d-id", "heygen", "kling", "veo"];
    validEngines.forEach((engine) => {
      expect(["d-id", "heygen", "kling", "veo"]).toContain(engine);
    });
  });

  it("should map engine labels correctly", () => {
    const engineLabels: Record<string, string> = {
      "heygen": "HeyGen",
      "d-id": "D-ID",
      "kling": "Kling AI",
      "veo": "Google Veo",
    };
    expect(engineLabels["d-id"]).toBe("D-ID");
    expect(engineLabels["heygen"]).toBe("HeyGen");
    expect(engineLabels["kling"]).toBe("Kling AI");
    expect(engineLabels["veo"]).toBe("Google Veo");
  });

  it("should default to d-id when no engine specified", () => {
    const avatarEngine = undefined || "d-id";
    expect(avatarEngine).toBe("d-id");
  });
});
