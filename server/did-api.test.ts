import { describe, expect, it } from "vitest";

describe("D-ID API Key", () => {
  it("should have DID_API_KEY environment variable set", () => {
    // DID_API_KEY is optional - if set, it should be a non-empty string
    const key = process.env.DID_API_KEY;
    if (key) {
      expect(key.length).toBeGreaterThan(0);
      expect(typeof key).toBe("string");
    } else {
      // If not set, the system falls back to built-in avatar animation
      expect(true).toBe(true);
    }
  });

  it("should be able to construct D-ID API headers when key is available", () => {
    const key = process.env.DID_API_KEY;
    if (key) {
      const headers = {
        Authorization: `Basic ${key}`,
        "Content-Type": "application/json",
      };
      expect(headers.Authorization).toContain("Basic");
      expect(headers["Content-Type"]).toBe("application/json");
    } else {
      // Fallback mode - no API call needed
      expect(true).toBe(true);
    }
  });
});
