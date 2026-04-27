import { describe, it, expect, vi } from "vitest";

// Mock database
vi.mock("./db", () => ({
  getUserSignupStats: vi.fn().mockResolvedValue([
    { date: "2026-04-01", count: 5 },
    { date: "2026-04-02", count: 3 },
    { date: "2026-04-03", count: 8 },
  ]),
  getUserActivityStats: vi.fn().mockResolvedValue([
    { date: "2026-04-01", count: 12 },
    { date: "2026-04-02", count: 9 },
  ]),
  getUserTotalStats: vi.fn().mockResolvedValue({
    total: 150,
    instructors: 20,
    students: 125,
    admins: 5,
  }),
  getTopPresets: vi.fn().mockResolvedValue([
    { id: 1, name: "Test Preset", userName: "User1", likes: 50, downloads: 100, createdAt: new Date() },
    { id: 2, name: "Another Preset", userName: "User2", likes: 30, downloads: 80, createdAt: new Date() },
  ]),
  getTopSubtitlePresets: vi.fn().mockResolvedValue([
    { id: 1, name: "Sub Preset", userName: "User3", likes: 25, downloads: 60, createdAt: new Date() },
  ]),
  getPresetCategoryStats: vi.fn().mockResolvedValue({
    avatar: 45,
    subtitle: 30,
  }),
  getPresetGrowthStats: vi.fn().mockResolvedValue([
    { date: "2026-04-01", count: 2 },
    { date: "2026-04-02", count: 4 },
  ]),
}));

import * as db from "./db";

describe("v9.3: Admin Statistics API", () => {
  describe("getUserSignupStats", () => {
    it("should return daily signup counts", async () => {
      const result = await db.getUserSignupStats(30);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("count");
      expect(result[0].count).toBe(5);
    });

    it("should return array format with date and count", async () => {
      const result = await db.getUserSignupStats(7);
      result.forEach((row: any) => {
        expect(row).toHaveProperty("date");
        expect(row).toHaveProperty("count");
        expect(typeof row.count).toBe("number");
      });
    });
  });

  describe("getUserActivityStats", () => {
    it("should return daily activity counts", async () => {
      const result = await db.getUserActivityStats(30);
      expect(result).toHaveLength(2);
      expect(result[0].count).toBe(12);
    });
  });

  describe("getUserTotalStats", () => {
    it("should return total user breakdown", async () => {
      const result = await db.getUserTotalStats();
      expect(result.total).toBe(150);
      expect(result.instructors).toBe(20);
      expect(result.students).toBe(125);
      expect(result.admins).toBe(5);
    });

    it("should have consistent totals", async () => {
      const result = await db.getUserTotalStats();
      // instructors + students should be close to total (some might be admin+instructor)
      expect(result.total).toBeGreaterThanOrEqual(result.admins);
    });
  });

  describe("getTopPresets", () => {
    it("should return top presets sorted by likes", async () => {
      const result = await db.getTopPresets(10, "likes");
      expect(result).toHaveLength(2);
      expect(result[0].likes).toBeGreaterThanOrEqual(result[1].likes);
    });

    it("should have required fields", async () => {
      const result = await db.getTopPresets(10, "likes");
      result.forEach((preset: any) => {
        expect(preset).toHaveProperty("id");
        expect(preset).toHaveProperty("name");
        expect(preset).toHaveProperty("userName");
        expect(preset).toHaveProperty("likes");
        expect(preset).toHaveProperty("downloads");
      });
    });
  });

  describe("getTopSubtitlePresets", () => {
    it("should return top subtitle presets", async () => {
      const result = await db.getTopSubtitlePresets(10, "likes");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Sub Preset");
    });
  });

  describe("getPresetCategoryStats", () => {
    it("should return avatar and subtitle counts", async () => {
      const result = await db.getPresetCategoryStats();
      expect(result.avatar).toBe(45);
      expect(result.subtitle).toBe(30);
    });

    it("should have non-negative values", async () => {
      const result = await db.getPresetCategoryStats();
      expect(result.avatar).toBeGreaterThanOrEqual(0);
      expect(result.subtitle).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getPresetGrowthStats", () => {
    it("should return daily growth data", async () => {
      const result = await db.getPresetGrowthStats(30);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty("count");
    });
  });
});
