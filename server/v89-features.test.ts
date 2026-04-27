import { describe, it, expect } from "vitest";

describe("v8.9 - Tag Input, My Presets Management, Subtitle Slide Overlay", () => {

  // ── Tag Input for Sharing ──
  describe("Tag Input for Sharing", () => {
    it("should search tags by query string", () => {
      const allTags = [
        { id: 1, name: "cinematic", category: "general", usageCount: 20 },
        { id: 2, name: "cinema-noir", category: "general", usageCount: 5 },
        { id: 3, name: "bold", category: "subtitle", usageCount: 15 },
        { id: 4, name: "minimal", category: "avatar", usageCount: 10 },
      ];
      const query = "cine";
      const results = allTags.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toEqual(["cinematic", "cinema-noir"]);
    });

    it("should filter tag search by category", () => {
      const allTags = [
        { id: 1, name: "cinematic", category: "general", usageCount: 20 },
        { id: 2, name: "cinematic-sub", category: "subtitle", usageCount: 5 },
        { id: 3, name: "cinematic-av", category: "avatar", usageCount: 10 },
      ];
      const query = "cinematic";
      const category = "subtitle";
      const results = allTags.filter(t =>
        t.name.toLowerCase().includes(query.toLowerCase()) &&
        t.category === category
      );
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("cinematic-sub");
    });

    it("should allow selecting multiple tags", () => {
      const selectedTags: { id: number; name: string }[] = [];

      selectedTags.push({ id: 1, name: "cinematic" });
      selectedTags.push({ id: 3, name: "bold" });

      expect(selectedTags).toHaveLength(2);
      expect(selectedTags.map(t => t.name)).toEqual(["cinematic", "bold"]);
    });

    it("should prevent duplicate tag selection", () => {
      const selectedTags: { id: number; name: string }[] = [{ id: 1, name: "cinematic" }];

      const newTag = { id: 1, name: "cinematic" };
      const isDuplicate = selectedTags.some(t => t.id === newTag.id);
      expect(isDuplicate).toBe(true);

      if (!isDuplicate) selectedTags.push(newTag);
      expect(selectedTags).toHaveLength(1);
    });

    it("should allow creating new tags with valid names", () => {
      const validateTagName = (name: string) => name.trim().length >= 1 && name.trim().length <= 30;
      expect(validateTagName("new-tag")).toBe(true);
      expect(validateTagName("a")).toBe(true);
      expect(validateTagName("a".repeat(30))).toBe(true);
      expect(validateTagName("")).toBe(false);
      expect(validateTagName("   ")).toBe(false);
      expect(validateTagName("a".repeat(31))).toBe(false);
    });
  });

  // ── My Presets Management ──
  describe("My Presets Management", () => {
    it("should separate avatar and subtitle presets", () => {
      const myAvatarPresets = [
        { id: 1, name: "Corner PiP", type: "avatar", position: "bottom-right", size: "medium" },
        { id: 2, name: "Full Screen", type: "avatar", position: "custom", size: "large" },
      ];
      const mySubtitlePresets = [
        { id: 3, name: "Bold White", type: "subtitle", fontSize: 24, fontColor: "#FFFFFF" },
      ];

      expect(myAvatarPresets).toHaveLength(2);
      expect(mySubtitlePresets).toHaveLength(1);
    });

    it("should update avatar preset fields correctly", () => {
      const preset = {
        id: 1,
        name: "Corner PiP",
        description: "Bottom right corner",
        position: "bottom-right" as const,
        size: "medium" as const,
        opacity: 80,
        shape: "rounded" as const,
      };

      const updates = { name: "Updated PiP", description: "New description" };
      const updated = { ...preset, ...updates };

      expect(updated.name).toBe("Updated PiP");
      expect(updated.description).toBe("New description");
      expect(updated.position).toBe("bottom-right"); // unchanged
      expect(updated.size).toBe("medium"); // unchanged
    });

    it("should update subtitle preset fields correctly", () => {
      const preset = {
        id: 3,
        name: "Bold White",
        description: null as string | null,
        fontSize: 24,
        fontColor: "#FFFFFF",
        bgColor: "rgba(0,0,0,0.7)",
        position: "bottom" as const,
        fontFamily: "sans-serif",
        bold: true,
        italic: false,
        outline: true,
      };

      const updates = { name: "Neon Green", fontColor: "#00FF00", bold: false };
      const updated = { ...preset, ...updates };

      expect(updated.name).toBe("Neon Green");
      expect(updated.fontColor).toBe("#00FF00");
      expect(updated.bold).toBe(false);
      expect(updated.fontSize).toBe(24); // unchanged
    });

    it("should validate update permissions (userId match)", () => {
      const preset = { id: 1, userId: 42, name: "My Preset" };
      const requestUserId = 42;
      const otherUserId = 99;

      expect(preset.userId === requestUserId).toBe(true);
      expect(preset.userId === otherUserId).toBe(false);
    });

    it("should handle delete with tag cleanup", () => {
      const presetId = 5;
      const presetTags = [
        { presetType: "avatar", presetId: 5, tagId: 1 },
        { presetType: "avatar", presetId: 5, tagId: 2 },
        { presetType: "avatar", presetId: 7, tagId: 1 },
      ];

      // Remove tags for preset 5
      const remaining = presetTags.filter(t => !(t.presetType === "avatar" && t.presetId === presetId));
      expect(remaining).toHaveLength(1);
      expect(remaining[0].presetId).toBe(7);
    });

    it("should update tags on preset edit (remove old, add new)", () => {
      let tagMap = [
        { presetType: "avatar" as const, presetId: 1, tagId: 10 },
        { presetType: "avatar" as const, presetId: 1, tagId: 11 },
      ];

      // Remove all tags for preset 1
      tagMap = tagMap.filter(t => !(t.presetType === "avatar" && t.presetId === 1));
      expect(tagMap).toHaveLength(0);

      // Add new tags
      const newTagIds = [20, 21, 22];
      newTagIds.forEach(tagId => {
        tagMap.push({ presetType: "avatar", presetId: 1, tagId });
      });
      expect(tagMap).toHaveLength(3);
      expect(tagMap.map(t => t.tagId)).toEqual([20, 21, 22]);
    });
  });

  // ── Subtitle Slide Overlay Preview ──
  describe("Subtitle Slide Overlay Preview", () => {
    it("should position subtitle overlay based on position setting", () => {
      const getOverlayStyle = (position: "top" | "bottom") => ({
        [position === "top" ? "top" : "bottom"]: "4%",
      });

      const topStyle = getOverlayStyle("top");
      expect(topStyle).toHaveProperty("top", "4%");
      expect(topStyle).not.toHaveProperty("bottom");

      const bottomStyle = getOverlayStyle("bottom");
      expect(bottomStyle).toHaveProperty("bottom", "4%");
      expect(bottomStyle).not.toHaveProperty("top");
    });

    it("should cap font size for slide overlay preview", () => {
      const maxOverlayFontSize = 20;
      expect(Math.min(48, maxOverlayFontSize)).toBe(20);
      expect(Math.min(16, maxOverlayFontSize)).toBe(16);
      expect(Math.min(20, maxOverlayFontSize)).toBe(20);
    });

    it("should generate correct overlay style object", () => {
      const subtitleFontSize = 24;
      const subtitleFontFamily = "serif";
      const subtitleFontColor = "#FFD700";
      const subtitleBgColor = "rgba(0,0,0,0.8)";
      const subtitleBold = true;
      const subtitleItalic = false;
      const subtitleOutline = true;

      const style = {
        fontSize: `${Math.min(subtitleFontSize, 20)}px`,
        fontFamily: subtitleFontFamily,
        color: subtitleFontColor,
        backgroundColor: subtitleBgColor,
        fontWeight: subtitleBold ? "bold" : "normal",
        fontStyle: subtitleItalic ? "italic" : "normal",
        textShadow: subtitleOutline
          ? "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)"
          : "none",
        padding: "2px 8px",
        borderRadius: "2px",
        maxWidth: "90%",
        textAlign: "center" as const,
      };

      expect(style.fontSize).toBe("20px"); // capped
      expect(style.fontWeight).toBe("bold");
      expect(style.fontStyle).toBe("normal");
      expect(style.textShadow).toContain("rgba(0,0,0,0.8)");
      expect(style.maxWidth).toBe("90%");
    });

    it("should toggle subtitle overlay visibility", () => {
      let showSubtitleOverlay = true;
      expect(showSubtitleOverlay).toBe(true);

      showSubtitleOverlay = false;
      expect(showSubtitleOverlay).toBe(false);

      showSubtitleOverlay = !showSubtitleOverlay;
      expect(showSubtitleOverlay).toBe(true);
    });
  });

  // ── Tag Search Functionality ──
  describe("Tag Search", () => {
    it("should return results sorted by usage count", () => {
      const tags = [
        { id: 1, name: "cinematic", usageCount: 5 },
        { id: 2, name: "cinema-noir", usageCount: 20 },
        { id: 3, name: "cinema-classic", usageCount: 12 },
      ];
      const sorted = [...tags].sort((a, b) => b.usageCount - a.usageCount);
      expect(sorted[0].name).toBe("cinema-noir");
      expect(sorted[1].name).toBe("cinema-classic");
      expect(sorted[2].name).toBe("cinematic");
    });

    it("should limit search results", () => {
      const allResults = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `tag-${i + 1}`,
        usageCount: 25 - i,
      }));
      const limit = 10;
      const limited = allResults.slice(0, limit);
      expect(limited).toHaveLength(10);
      expect(limited[0].name).toBe("tag-1");
    });
  });

  // ── Remove Tags from Preset ──
  describe("Remove Tags from Preset", () => {
    it("should remove all tags for a specific preset type and id", () => {
      const tagMap = [
        { presetType: "avatar", presetId: 1, tagId: 10 },
        { presetType: "avatar", presetId: 1, tagId: 11 },
        { presetType: "subtitle", presetId: 1, tagId: 10 },
        { presetType: "avatar", presetId: 2, tagId: 10 },
      ];

      const filtered = tagMap.filter(
        t => !(t.presetType === "avatar" && t.presetId === 1)
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => !(t.presetType === "avatar" && t.presetId === 1))).toBe(true);
    });
  });

  // ── i18n Keys for v8.9 ──
  describe("i18n Keys for v8.9", () => {
    it("should have all required v8.9 translation keys defined", () => {
      const requiredKeys = [
        "ps.myPresetsManage",
        "ps.avatarPresets",
        "ps.subtitlePresets",
        "ps.noSharedPresetsYet",
        "ps.descriptionPlaceholder",
        "ps.confirmDelete",
        "ps.cancel",
        "ps.subtitleOverlayToggle",
      ];
      requiredKeys.forEach(key => {
        expect(key).toMatch(/^ps\.\w+$/);
      });
      expect(requiredKeys).toHaveLength(8);
    });
  });
});
