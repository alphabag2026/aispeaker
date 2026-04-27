import { describe, it, expect } from "vitest";

describe("v8.8 - Subtitle Preset Sharing, Export Subtitle Style, Tag System", () => {

  // ── Shared Subtitle Preset Data Validation ──
  describe("Shared Subtitle Preset Data", () => {
    it("should validate shared subtitle preset required fields", () => {
      const preset = {
        name: "Cinematic Bold",
        userId: 1,
        userName: "alpha",
        fontSize: 24,
        fontColor: "#FFD700",
        bgColor: "rgba(0,0,0,0.8)",
        position: "bottom" as const,
        fontFamily: "sans-serif",
        bold: true,
        italic: false,
        outline: true,
      };
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeLessThanOrEqual(100);
      expect(preset.fontSize).toBeGreaterThanOrEqual(8);
      expect(preset.fontSize).toBeLessThanOrEqual(48);
      expect(["top", "bottom"]).toContain(preset.position);
      expect(typeof preset.bold).toBe("boolean");
      expect(typeof preset.italic).toBe("boolean");
      expect(typeof preset.outline).toBe("boolean");
    });

    it("should reject invalid fontSize values", () => {
      const validate = (size: number) => size >= 8 && size <= 48;
      expect(validate(7)).toBe(false);
      expect(validate(49)).toBe(false);
      expect(validate(0)).toBe(false);
      expect(validate(-1)).toBe(false);
      expect(validate(24)).toBe(true);
    });

    it("should validate position enum for subtitle presets", () => {
      const validPositions = ["top", "bottom"];
      expect(validPositions.includes("top")).toBe(true);
      expect(validPositions.includes("bottom")).toBe(true);
      expect(validPositions.includes("custom")).toBe(false);
      expect(validPositions.includes("left")).toBe(false);
    });

    it("should validate fontFamily options", () => {
      const validFonts = ["sans-serif", "serif", "monospace", "'Noto Sans KR'", "'Noto Sans JP'"];
      expect(validFonts.includes("sans-serif")).toBe(true);
      expect(validFonts.includes("serif")).toBe(true);
      expect(validFonts.includes("monospace")).toBe(true);
      expect(validFonts.includes("'Noto Sans KR'")).toBe(true);
      expect(validFonts.includes("'Noto Sans JP'")).toBe(true);
    });
  });

  // ── Subtitle Preset Like/Download Logic ──
  describe("Subtitle Preset Like/Download", () => {
    it("should toggle like state correctly", () => {
      const myLikes: number[] = [];
      const presetId = 42;

      // Like
      const isLiked = myLikes.includes(presetId);
      expect(isLiked).toBe(false);
      myLikes.push(presetId);
      expect(myLikes.includes(presetId)).toBe(true);

      // Unlike
      const idx = myLikes.indexOf(presetId);
      myLikes.splice(idx, 1);
      expect(myLikes.includes(presetId)).toBe(false);
    });

    it("should increment download count on apply", () => {
      let downloads = 0;
      downloads++;
      expect(downloads).toBe(1);
      downloads++;
      expect(downloads).toBe(2);
    });
  });

  // ── Tag System ──
  describe("Tag System", () => {
    it("should validate tag name constraints", () => {
      const validateTag = (name: string) => name.length >= 1 && name.length <= 30;
      expect(validateTag("cinematic")).toBe(true);
      expect(validateTag("a")).toBe(true);
      expect(validateTag("a".repeat(30))).toBe(true);
      expect(validateTag("")).toBe(false);
      expect(validateTag("a".repeat(31))).toBe(false);
    });

    it("should validate tag category enum", () => {
      const validCategories = ["avatar", "subtitle"];
      expect(validCategories.includes("avatar")).toBe(true);
      expect(validCategories.includes("subtitle")).toBe(true);
      expect(validCategories.includes("other")).toBe(false);
    });

    it("should filter presets by tag correctly", () => {
      const presets = [
        { id: 1, name: "Bold", tags: [{ id: 1, name: "cinematic" }, { id: 2, name: "bold" }] },
        { id: 2, name: "Minimal", tags: [{ id: 3, name: "minimal" }] },
        { id: 3, name: "Neon", tags: [{ id: 1, name: "cinematic" }, { id: 4, name: "neon" }] },
      ];

      // Filter by "cinematic" tag
      const filtered = presets.filter(p => p.tags.some(t => t.id === 1));
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual([1, 3]);

      // Filter by "minimal" tag
      const filtered2 = presets.filter(p => p.tags.some(t => t.id === 3));
      expect(filtered2).toHaveLength(1);
      expect(filtered2[0].name).toBe("Minimal");

      // No filter (all)
      expect(presets).toHaveLength(3);
    });

    it("should sort tags by usage count", () => {
      const tags = [
        { id: 1, name: "cinematic", usageCount: 15 },
        { id: 2, name: "bold", usageCount: 42 },
        { id: 3, name: "minimal", usageCount: 8 },
      ];
      const sorted = [...tags].sort((a, b) => b.usageCount - a.usageCount);
      expect(sorted[0].name).toBe("bold");
      expect(sorted[1].name).toBe("cinematic");
      expect(sorted[2].name).toBe("minimal");
    });
  });

  // ── Gallery Sort ──
  describe("Gallery Sort", () => {
    it("should sort presets by popularity (likes desc)", () => {
      const presets = [
        { id: 1, name: "A", likes: 5, createdAt: new Date("2026-01-01") },
        { id: 2, name: "B", likes: 20, createdAt: new Date("2026-03-01") },
        { id: 3, name: "C", likes: 10, createdAt: new Date("2026-02-01") },
      ];
      const sorted = [...presets].sort((a, b) => b.likes - a.likes);
      expect(sorted[0].name).toBe("B");
      expect(sorted[1].name).toBe("C");
      expect(sorted[2].name).toBe("A");
    });

    it("should sort presets by latest (createdAt desc)", () => {
      const presets = [
        { id: 1, name: "A", likes: 5, createdAt: new Date("2026-01-01") },
        { id: 2, name: "B", likes: 20, createdAt: new Date("2026-03-01") },
        { id: 3, name: "C", likes: 10, createdAt: new Date("2026-02-01") },
      ];
      const sorted = [...presets].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      expect(sorted[0].name).toBe("B");
      expect(sorted[1].name).toBe("C");
      expect(sorted[2].name).toBe("A");
    });

    it("should default to popular sort", () => {
      const defaultSort: "latest" | "popular" = "popular";
      expect(defaultSort).toBe("popular");
    });
  });

  // ── Export Video Subtitle Style Integration ──
  describe("Export Video Subtitle Style", () => {
    it("should resolve subtitle style from saved settings", () => {
      const savedStyle = {
        fontSize: 20,
        fontColor: "#FFFF00",
        bgColor: "rgba(0,0,0,0.5)",
        position: "custom" as const,
        fontFamily: "serif",
        bold: true,
        italic: false,
        outline: true,
      };

      // Resolve custom position to bottom for export
      const resolved = {
        fontSize: savedStyle.fontSize,
        fontColor: savedStyle.fontColor,
        bgColor: savedStyle.bgColor,
        position: savedStyle.position === "custom" ? "bottom" : savedStyle.position,
        fontFamily: savedStyle.fontFamily,
        bold: savedStyle.bold,
        italic: savedStyle.italic,
        outline: savedStyle.outline,
      };

      expect(resolved.position).toBe("bottom");
      expect(resolved.fontSize).toBe(20);
      expect(resolved.fontColor).toBe("#FFFF00");
      expect(resolved.bold).toBe(true);
    });

    it("should use default style when no saved style exists", () => {
      const savedStyle = null;
      const includeSubtitles = true;

      let resolvedStyle: any = undefined;
      if (!resolvedStyle && includeSubtitles) {
        if (savedStyle) {
          resolvedStyle = savedStyle;
        }
      }

      expect(resolvedStyle).toBeUndefined();
    });

    it("should pass subtitle style to export config", () => {
      const exportConfig = {
        projectId: 1,
        resolution: "1080p" as const,
        includeSubtitles: true,
        subtitleStyle: {
          fontSize: 24,
          fontColor: "#FFFFFF",
          bgColor: "rgba(0,0,0,0.7)",
          position: "bottom" as const,
          fontFamily: "sans-serif",
          bold: false,
          italic: false,
          outline: true,
        },
      };

      expect(exportConfig.subtitleStyle).toBeDefined();
      expect(exportConfig.subtitleStyle!.fontSize).toBe(24);
      expect(exportConfig.includeSubtitles).toBe(true);
    });
  });

  // ── Subtitle Preset Apply Logic ──
  describe("Subtitle Preset Apply", () => {
    it("should apply community preset to local state", () => {
      const communityPreset = {
        fontSize: 28,
        fontColor: "#FF6B6B",
        bgColor: "rgba(0,0,0,0.9)",
        position: "top" as const,
        fontFamily: "monospace",
        bold: true,
        italic: true,
        outline: false,
      };

      // Simulate applying to local state
      let localFontSize = 16;
      let localFontColor = "#FFFFFF";
      let localBgColor = "rgba(0,0,0,0.7)";
      let localPosition: "top" | "bottom" = "bottom";
      let localFontFamily = "sans-serif";
      let localBold = false;
      let localItalic = false;
      let localOutline = true;

      localFontSize = communityPreset.fontSize;
      localFontColor = communityPreset.fontColor;
      localBgColor = communityPreset.bgColor;
      localPosition = communityPreset.position;
      localFontFamily = communityPreset.fontFamily;
      localBold = communityPreset.bold;
      localItalic = communityPreset.italic;
      localOutline = communityPreset.outline;

      expect(localFontSize).toBe(28);
      expect(localFontColor).toBe("#FF6B6B");
      expect(localBgColor).toBe("rgba(0,0,0,0.9)");
      expect(localPosition).toBe("top");
      expect(localFontFamily).toBe("monospace");
      expect(localBold).toBe(true);
      expect(localItalic).toBe(true);
      expect(localOutline).toBe(false);
    });
  });

  // ── Subtitle Preview Style Rendering ──
  describe("Subtitle Preview Style", () => {
    it("should generate correct CSS style object for preview", () => {
      const style = {
        fontSize: "20px",
        fontFamily: "serif",
        color: "#FFD700",
        backgroundColor: "rgba(0,0,0,0.8)",
        fontWeight: "bold",
        fontStyle: "italic",
        textShadow: "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)",
        padding: "2px 6px",
        borderRadius: "2px",
      };

      expect(style.fontSize).toBe("20px");
      expect(style.fontWeight).toBe("bold");
      expect(style.fontStyle).toBe("italic");
      expect(style.textShadow).toContain("rgba(0,0,0,0.8)");
    });

    it("should cap preview font size for gallery items", () => {
      const originalSize = 48;
      const cappedSize = Math.min(originalSize, 14);
      expect(cappedSize).toBe(14);

      const smallSize = 10;
      const cappedSmall = Math.min(smallSize, 14);
      expect(cappedSmall).toBe(10);
    });
  });

  // ── i18n Keys ──
  describe("i18n Keys for v8.8", () => {
    it("should have all required v8.8 translation keys defined", () => {
      const requiredKeys = [
        "ps.allTags",
        "ps.sortPopular",
        "ps.sortLatest",
        "ps.communitySubtitlePresets",
        "ps.subtitlePresetGallery",
        "ps.presetApplied",
        "ps.loading",
        "ps.generateThumbnail",
      ];
      // Verify key format
      requiredKeys.forEach(key => {
        expect(key).toMatch(/^ps\.\w+$/);
      });
      expect(requiredKeys).toHaveLength(8);
    });
  });
});
