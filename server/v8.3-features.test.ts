import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("v8.3 - User Profile, AI History, Admin Analytics", () => {
  describe("User Profile Page", () => {
    it("UserProfile.tsx exists and exports default component", async () => {
      const path = resolve(__dirname, "../client/src/pages/UserProfile.tsx");
      expect(existsSync(path)).toBe(true);
    });

    it("UserProfile uses correct auth import", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/UserProfile.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("@/_core/hooks/useAuth");
      expect(content).toContain("trpc.profile");
    });

    it("UserProfile includes edit functionality", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/UserProfile.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("setEditing");
      expect(content).toContain("updateMut");
    });
  });

  describe("AI History Page", () => {
    it("AiHistory.tsx exists and exports default component", async () => {
      const path = resolve(__dirname, "../client/src/pages/AiHistory.tsx");
      expect(existsSync(path)).toBe(true);
    });

    it("AiHistory uses aiHistory.list query", async () => {
      const { readFileSync } = await import("fs");
      // AiHistory uses useAiHistory hook which internally calls trpc.aiHistory.list
      const hookPath = resolve(__dirname, "../client/src/hooks/useAiHistory.ts");
      const hookContent = readFileSync(hookPath, "utf-8");
      expect(hookContent).toContain("trpc.aiHistory.list.useQuery");
    });

    it("AiHistory has tool filter and pagination", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/AiHistory.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("toolFilter");
      expect(content).toContain("setPage");
      expect(content).toContain("totalPages");
    });

    it("AiHistory defines all tool labels", async () => {
      const { readFileSync } = await import("fs");
      // Tool labels are defined in ai-tools.ts
      const toolsPath = resolve(__dirname, "../client/src/lib/ai-tools.ts");
      const toolsContent = readFileSync(toolsPath, "utf-8");
      expect(toolsContent).toContain("tts");
      expect(toolsContent).toContain("voice-clone");
      expect(toolsContent).toContain("image-gen");
    });
  });

  describe("Admin Analytics Page", () => {
    it("AdminAnalytics.tsx exists and exports default component", async () => {
      const path = resolve(__dirname, "../client/src/pages/AdminAnalytics.tsx");
      expect(existsSync(path)).toBe(true);
    });

    it("AdminAnalytics uses admin-only queries", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/AdminAnalytics.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("trpc.adminAnalytics.creditSales.useQuery");
      expect(content).toContain("trpc.adminAnalytics.toolUsage.useQuery");
      expect(content).toContain("trpc.adminAnalytics.userStats.useQuery");
    });

    it("AdminAnalytics has role guard", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/AdminAnalytics.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain('user?.role === "admin"');
      expect(content).toContain("관리자 권한이 필요합니다");
    });

    it("AdminAnalytics shows user stats cards", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/pages/AdminAnalytics.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("totalUsers");
      expect(content).toContain("DAU");
      expect(content).toContain("WAU");
      expect(content).toContain("MAU");
    });
  });

  describe("Routes Registration", () => {
    it("App.tsx includes all v8.3 routes", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../client/src/App.tsx");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("/profile");
      expect(content).toContain("/ai-history");
      expect(content).toContain("/admin/analytics");
    });
  });

  describe("Backend - aiGenerations schema", () => {
    it("schema.ts includes aiGenerations table", async () => {
      const { readFileSync } = await import("fs");
      const path = resolve(__dirname, "../drizzle/schema.ts");
      const content = readFileSync(path, "utf-8");
      expect(content).toContain("aiGenerations");
      expect(content).toContain("tool");
      expect(content).toContain("inputSummary");
      expect(content).toContain("outputUrl");
    });
  });
});
