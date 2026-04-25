import { describe, it, expect } from "vitest";

describe("Akool API Key validation", () => {
  it("should have AKOOL_API_KEY environment variable set", () => {
    const key = process.env.AKOOL_API_KEY;
    expect(key).toBeDefined();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(5);
  });

  it("should be able to call Akool API with the key", async () => {
    const key = process.env.AKOOL_API_KEY;
    if (!key) {
      console.warn("AKOOL_API_KEY not set, skipping live test");
      return;
    }
    // Lightweight call - get avatar list (read-only, no credits consumed)
    const res = await fetch("https://openapi.akool.com/api/open/v3/avatar/list?from=2&page=1&size=1", {
      headers: { "x-api-key": key },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    // code 1000 = success
    expect(json.code).toBe(1000);
  });
});
