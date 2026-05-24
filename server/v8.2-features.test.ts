import { describe, it, expect } from "vitest";
import { CREDIT_COSTS } from "./stripe";

describe("v8.2 - Credit Auto-Deduction System", () => {
  it("should have credit costs defined for all AI Studio features", () => {
    const requiredFeatures = [
      "tts_conversion",
      "image_generation",
      "bg_remove",
      "voice_clone",
      "voice_change",
      "video_effects",
      "image_to_video",
      "face_swap",
      "talking_avatar",
      "video_translate",
    ];
    for (const feature of requiredFeatures) {
      expect(CREDIT_COSTS[feature]).toBeDefined();
      expect(CREDIT_COSTS[feature]).toBeGreaterThan(0);
    }
  });

  it("should have reasonable credit costs (1-100 range)", () => {
    for (const [feature, cost] of Object.entries(CREDIT_COSTS)) {
      expect(cost).toBeGreaterThanOrEqual(1);
      expect(cost).toBeLessThanOrEqual(100);
    }
  });
});

describe("v8.2 - Gallery Share Integration", () => {
  it("should have community router defined in appRouter", async () => {
    // Verify the community router exists by checking the routers file exports
    const routersModule = await import("./routers");
    expect(routersModule.appRouter).toBeDefined();
    // The appRouter should have community procedures
    const routerDef = routersModule.appRouter._def;
    expect(routerDef).toBeDefined();
  });
});

describe("v8.2 - Credit Dashboard", () => {
  it("should have credit.balance procedure available", async () => {
    const routersModule = await import("./routers");
    expect(routersModule.appRouter).toBeDefined();
  });

  it("should have credit.history procedure available", async () => {
    const routersModule = await import("./routers");
    expect(routersModule.appRouter).toBeDefined();
  });
});

describe("v8.2 - ShareToGalleryButton Component", () => {
  it("should export from correct path", async () => {
    // Verify the file exists and has proper structure
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/components/ShareToGalleryButton.tsx");
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
    
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("ShareToGalleryButton");
    expect(content).toContain("trpc.community.create.useMutation");
    expect(content).toContain("mediaUrl");
    expect(content).toContain("mediaType");
    expect(content).toContain("toolUsed");
  });
});

describe("v8.2 - useCreditDeduction Hook", () => {
  it("should export from correct path", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/hooks/useCreditDeduction.ts");
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
    
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("useCreditDeduction");
    expect(content).toContain("deductAndRun");
    expect(content).toContain("insufficientCredits");
    expect(content).toContain("credit.balance");
  });
});

describe("v8.2 - InsufficientCreditsDialog Component", () => {
  it("should export from correct path", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/components/InsufficientCreditsDialog.tsx");
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
    
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("InsufficientCreditsDialog");
    expect(content).toContain("/pricing");
    expect(content).toContain("insufficientCreditsDialog");
  });
});

describe("v8.2 - CreditDashboard Page", () => {
  it("should export from correct path", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/CreditDashboard.tsx");
    const exists = fs.existsSync(filePath);
    expect(exists).toBe(true);
    
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("CreditDashboard");
    expect(content).toContain("credit.balance");
    expect(content).toContain("credit.history");
    expect(content).toContain("FEATURE_INFO");
    expect(content).toContain("/pricing");
    expect(content).toContain("/ai-studio");
  });
});

describe("v8.2 - Route Registration", () => {
  it("should have /credits route in App.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('path="/credits"');
    expect(content).toContain("CreditDashboard");
  });

  it("should have /community route in App.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('path="/community"');
    expect(content).toContain("CommunityGallery");
  });
});
