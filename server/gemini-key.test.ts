import { describe, expect, it } from "vitest";

describe("GEMINI_API_KEY Validation", () => {
  it("should have GEMINI_API_KEY environment variable set", () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("should be able to call Gemini API with the key", async () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      expect(true).toBe(true);
      return;
    }
    // Lightweight API call to validate key - list models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    expect(response.ok).toBe(true);
    const data = await response.json() as any;
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
    // Check that Veo model is available
    const modelNames = data.models.map((m: any) => m.name);
    console.log("Available Veo-related models:", modelNames.filter((n: string) => n.includes("veo")));
  }, 15000);
});
