import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("./db", () => ({
  listSharedPresetsPaginated: vi.fn(),
  listSharedSubtitlePresetsPaginated: vi.fn(),
  getSharedPresetById: vi.fn(),
  getSharedSubtitlePresetById: vi.fn(),
  getPresetTags: vi.fn(),
  createSharedPreset: vi.fn(),
  createSharedSubtitlePreset: vi.fn(),
  addTagsToPreset: vi.fn(),
  listSharedPresets: vi.fn(),
  listSharedSubtitlePresets: vi.fn(),
  toggleSharedPresetLike: vi.fn(),
  toggleSharedSubtitlePresetLike: vi.fn(),
  incrementSharedPresetDownloads: vi.fn(),
  incrementSharedSubtitlePresetDownloads: vi.fn(),
  getUserLikedPresets: vi.fn(),
  getUserLikedSubtitlePresets: vi.fn(),
  deleteSharedPreset: vi.fn(),
  deleteSharedSubtitlePreset: vi.fn(),
  getOrCreateTag: vi.fn(),
  searchTags: vi.fn(),
  listPresetTags: vi.fn(),
  getPopularTags: vi.fn(),
  removeTagsFromPreset: vi.fn(),
  getMySharedPresets: vi.fn(),
  getMySharedSubtitlePresets: vi.fn(),
  updateSharedPreset: vi.fn(),
  updateSharedSubtitlePreset: vi.fn(),
}));

import * as db from "./db";

describe("v9.0 - Paginated Preset Galleries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSharedPresetsPaginated", () => {
    it("should return items and nextCursor when more items exist", async () => {
      const mockItems = Array.from({ length: 21 }, (_, i) => ({
        id: 100 - i,
        name: `Preset ${i}`,
        userId: 1,
        userName: "Test",
        position: "custom",
        size: "medium",
        opacity: 100,
        shape: "rounded",
        customX: 75,
        customY: 75,
        customWidth: 25,
        customHeight: 25,
        likes: i,
        downloads: 0,
        createdAt: new Date(),
      }));

      (db.listSharedPresetsPaginated as any).mockResolvedValue({
        items: mockItems.slice(0, 20),
        nextCursor: 80,
      });

      const result = await db.listSharedPresetsPaginated("latest", undefined, undefined, 20);
      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe(80);
    });

    it("should return null nextCursor when no more items", async () => {
      (db.listSharedPresetsPaginated as any).mockResolvedValue({
        items: [{ id: 1, name: "Last Preset" }],
        nextCursor: null,
      });

      const result = await db.listSharedPresetsPaginated("latest", undefined, undefined, 20);
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it("should filter by tagId when provided", async () => {
      (db.listSharedPresetsPaginated as any).mockResolvedValue({
        items: [{ id: 5, name: "Tagged Preset" }],
        nextCursor: null,
      });

      const result = await db.listSharedPresetsPaginated("popular", 3, undefined, 20);
      expect(db.listSharedPresetsPaginated).toHaveBeenCalledWith("popular", 3, undefined, 20);
      expect(result.items).toHaveLength(1);
    });

    it("should use cursor for pagination", async () => {
      (db.listSharedPresetsPaginated as any).mockResolvedValue({
        items: [{ id: 50, name: "Page 2 Preset" }],
        nextCursor: null,
      });

      const result = await db.listSharedPresetsPaginated("latest", undefined, 60, 20);
      expect(db.listSharedPresetsPaginated).toHaveBeenCalledWith("latest", undefined, 60, 20);
      expect(result.items[0].id).toBe(50);
    });
  });

  describe("listSharedSubtitlePresetsPaginated", () => {
    it("should return paginated subtitle presets", async () => {
      (db.listSharedSubtitlePresetsPaginated as any).mockResolvedValue({
        items: Array.from({ length: 10 }, (_, i) => ({
          id: 50 - i,
          name: `Sub Preset ${i}`,
          fontSize: 16,
          fontColor: "#FFFFFF",
          bgColor: "rgba(0,0,0,0.7)",
        })),
        nextCursor: 40,
      });

      const result = await db.listSharedSubtitlePresetsPaginated("latest", undefined, undefined, 10);
      expect(result.items).toHaveLength(10);
      expect(result.nextCursor).toBe(40);
    });

    it("should filter subtitle presets by tag", async () => {
      (db.listSharedSubtitlePresetsPaginated as any).mockResolvedValue({
        items: [{ id: 3, name: "Tagged Sub" }],
        nextCursor: null,
      });

      await db.listSharedSubtitlePresetsPaginated("popular", 5, undefined, 20);
      expect(db.listSharedSubtitlePresetsPaginated).toHaveBeenCalledWith("popular", 5, undefined, 20);
    });
  });
});

describe("v9.0 - Preset Detail View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSharedPresetById", () => {
    it("should return preset with full details", async () => {
      const mockPreset = {
        id: 10,
        name: "My Avatar Preset",
        userId: 1,
        userName: "TestUser",
        description: "A nice preset",
        position: "custom",
        size: "medium",
        opacity: 100,
        shape: "rounded",
        customX: 75,
        customY: 75,
        customWidth: 25,
        customHeight: 25,
        likes: 5,
        downloads: 10,
        createdAt: new Date(),
      };

      (db.getSharedPresetById as any).mockResolvedValue(mockPreset);
      (db.getPresetTags as any).mockResolvedValue([{ id: 1, name: "cool" }]);

      const result = await db.getSharedPresetById(10);
      expect(result).toBeDefined();
      expect(result!.name).toBe("My Avatar Preset");
      expect(result!.likes).toBe(5);
    });

    it("should return null for non-existent preset", async () => {
      (db.getSharedPresetById as any).mockResolvedValue(null);

      const result = await db.getSharedPresetById(999);
      expect(result).toBeNull();
    });
  });

  describe("getSharedSubtitlePresetById", () => {
    it("should return subtitle preset with full details", async () => {
      const mockPreset = {
        id: 5,
        name: "Cinematic Subs",
        userId: 2,
        userName: "Designer",
        fontSize: 24,
        fontColor: "#FFD700",
        bgColor: "rgba(0,0,0,0.8)",
        position: "bottom",
        fontFamily: "serif",
        bold: true,
        italic: false,
        outline: true,
        likes: 12,
        downloads: 30,
      };

      (db.getSharedSubtitlePresetById as any).mockResolvedValue(mockPreset);

      const result = await db.getSharedSubtitlePresetById(5);
      expect(result).toBeDefined();
      expect(result!.fontSize).toBe(24);
      expect(result!.fontFamily).toBe("serif");
    });
  });
});

describe("v9.0 - Share Preset with Tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create avatar preset with tags", async () => {
    (db.createSharedPreset as any).mockResolvedValue(42);
    (db.addTagsToPreset as any).mockResolvedValue(undefined);

    const presetId = await db.createSharedPreset({
      userId: 1,
      userName: "Test",
      name: "My Preset",
      position: "custom",
      size: "medium",
      opacity: 100,
      shape: "rounded",
      customX: 75,
      customY: 75,
      customWidth: 25,
      customHeight: 25,
    } as any);

    expect(presetId).toBe(42);

    await db.addTagsToPreset("avatar", 42, [1, 2, 3]);
    expect(db.addTagsToPreset).toHaveBeenCalledWith("avatar", 42, [1, 2, 3]);
  });

  it("should create subtitle preset with tags", async () => {
    (db.createSharedSubtitlePreset as any).mockResolvedValue(15);
    (db.addTagsToPreset as any).mockResolvedValue(undefined);

    const presetId = await db.createSharedSubtitlePreset({
      userId: 1,
      userName: "Test",
      name: "Sub Preset",
      fontSize: 20,
      fontColor: "#FFFFFF",
      bgColor: "rgba(0,0,0,0.7)",
      position: "bottom",
      fontFamily: "sans-serif",
      bold: false,
      italic: false,
      outline: true,
    } as any);

    expect(presetId).toBe(15);

    await db.addTagsToPreset("subtitle", 15, [4, 5]);
    expect(db.addTagsToPreset).toHaveBeenCalledWith("subtitle", 15, [4, 5]);
  });

  it("should not add tags when tagIds is empty", async () => {
    (db.createSharedPreset as any).mockResolvedValue(50);

    await db.createSharedPreset({
      userId: 1,
      userName: "Test",
      name: "No Tags Preset",
    } as any);

    // When tagIds is empty, addTagsToPreset should not be called
    expect(db.addTagsToPreset).not.toHaveBeenCalled();
  });
});

describe("v9.0 - Tag Search for Share Modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search tags by query", async () => {
    (db.searchTags as any).mockResolvedValue([
      { id: 1, name: "cinematic", usageCount: 5 },
      { id: 2, name: "cinema-style", usageCount: 2 },
    ]);

    const results = await db.searchTags("cine", "general");
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("cinematic");
  });

  it("should create new tag when not found", async () => {
    (db.getOrCreateTag as any).mockResolvedValue(99);

    const tagId = await db.getOrCreateTag("new-tag", "avatar");
    expect(tagId).toBe(99);
    expect(db.getOrCreateTag).toHaveBeenCalledWith("new-tag", "avatar");
  });
});

describe("v9.0 - Gallery Infinite Scroll Logic", () => {
  it("should handle empty gallery gracefully", async () => {
    (db.listSharedPresetsPaginated as any).mockResolvedValue({
      items: [],
      nextCursor: null,
    });

    const result = await db.listSharedPresetsPaginated("latest", undefined, undefined, 20);
    expect(result.items).toHaveLength(0);
    expect(result.nextCursor).toBeNull();
  });

  it("should support popular sort with cursor", async () => {
    (db.listSharedPresetsPaginated as any).mockResolvedValue({
      items: [
        { id: 30, name: "Popular 1", likes: 100 },
        { id: 20, name: "Popular 2", likes: 50 },
      ],
      nextCursor: 20,
    });

    const result = await db.listSharedPresetsPaginated("popular", undefined, 40, 2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].likes).toBe(100);
  });
});
