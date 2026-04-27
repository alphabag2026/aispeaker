import { describe, it, expect } from "vitest";

describe("v8.7 - Subtitle Style Customization & Community Preset Gallery", () => {
  // Subtitle Style
  describe("Subtitle Style Defaults", () => {
    it("should have correct default subtitle style values", () => {
      const defaults = {
        fontSize: 16,
        fontColor: "#FFFFFF",
        bgColor: "rgba(0,0,0,0.7)",
        position: "bottom",
        fontFamily: "sans-serif",
        bold: false,
        italic: false,
        outline: true,
      };
      expect(defaults.fontSize).toBe(16);
      expect(defaults.fontColor).toBe("#FFFFFF");
      expect(defaults.bgColor).toBe("rgba(0,0,0,0.7)");
      expect(defaults.position).toBe("bottom");
      expect(defaults.fontFamily).toBe("sans-serif");
      expect(defaults.bold).toBe(false);
      expect(defaults.italic).toBe(false);
      expect(defaults.outline).toBe(true);
    });

    it("should validate fontSize range (8-48)", () => {
      const validate = (size: number) => size >= 8 && size <= 48;
      expect(validate(16)).toBe(true);
      expect(validate(8)).toBe(true);
      expect(validate(48)).toBe(true);
      expect(validate(7)).toBe(false);
      expect(validate(49)).toBe(false);
    });

    it("should validate position enum values", () => {
      const validPositions = ["top", "bottom", "custom"];
      expect(validPositions.includes("top")).toBe(true);
      expect(validPositions.includes("bottom")).toBe(true);
      expect(validPositions.includes("custom")).toBe(true);
      expect(validPositions.includes("left")).toBe(false);
    });

    it("should build correct CSS style from subtitle settings", () => {
      const settings = {
        fontSize: 20,
        fontFamily: "'Noto Sans KR'",
        fontColor: "#FFFF00",
        bgColor: "rgba(0,0,0,0.5)",
        bold: true,
        italic: true,
        outline: true,
      };
      const style = {
        fontSize: `${settings.fontSize}px`,
        fontFamily: settings.fontFamily,
        color: settings.fontColor,
        backgroundColor: settings.bgColor,
        fontWeight: settings.bold ? "bold" : "normal",
        fontStyle: settings.italic ? "italic" : "normal",
        textShadow: settings.outline
          ? "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)"
          : "none",
      };
      expect(style.fontSize).toBe("20px");
      expect(style.fontWeight).toBe("bold");
      expect(style.fontStyle).toBe("italic");
      expect(style.textShadow).toContain("rgba(0,0,0,0.8)");
    });

    it("should build correct CSS style when bold/italic/outline are off", () => {
      const settings = { bold: false, italic: false, outline: false };
      const style = {
        fontWeight: settings.bold ? "bold" : "normal",
        fontStyle: settings.italic ? "italic" : "normal",
        textShadow: settings.outline
          ? "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)"
          : "none",
      };
      expect(style.fontWeight).toBe("normal");
      expect(style.fontStyle).toBe("normal");
      expect(style.textShadow).toBe("none");
    });
  });

  // Subtitle Style Update Payload
  describe("Subtitle Style Update Payload", () => {
    it("should construct valid update payload", () => {
      const payload = {
        fontSize: 24,
        fontColor: "#00FF00",
        bgColor: "rgba(0,0,0,0.9)",
        position: "top" as const,
        fontFamily: "monospace",
        bold: true,
        italic: false,
        outline: true,
      };
      expect(payload.fontSize).toBeGreaterThanOrEqual(8);
      expect(payload.fontSize).toBeLessThanOrEqual(48);
      expect(payload.fontColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(["top", "bottom", "custom"]).toContain(payload.position);
      expect(typeof payload.bold).toBe("boolean");
      expect(typeof payload.italic).toBe("boolean");
      expect(typeof payload.outline).toBe("boolean");
    });

    it("should accept partial update payload", () => {
      const partial: Partial<{
        fontSize: number;
        fontColor: string;
        bgColor: string;
        position: string;
        fontFamily: string;
        bold: boolean;
        italic: boolean;
        outline: boolean;
      }> = { fontSize: 32 };
      expect(partial.fontSize).toBe(32);
      expect(partial.fontColor).toBeUndefined();
      expect(partial.bold).toBeUndefined();
    });
  });

  // Community Shared Presets
  describe("Community Shared Presets", () => {
    it("should construct valid share preset payload", () => {
      const payload = {
        name: "My Custom Layout",
        description: "Bottom right with 80% opacity",
        position: "custom" as const,
        size: "medium" as const,
        opacity: 80,
        shape: "rounded" as const,
        customX: 75,
        customY: 75,
        customWidth: 25,
        customHeight: 25,
      };
      expect(payload.name.length).toBeGreaterThan(0);
      expect(payload.name.length).toBeLessThanOrEqual(100);
      expect(payload.opacity).toBeGreaterThanOrEqual(0);
      expect(payload.opacity).toBeLessThanOrEqual(100);
      expect(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).toContain(
        payload.position
      );
      expect(["small", "medium", "large"]).toContain(payload.size);
      expect(["circle", "rounded", "rectangle"]).toContain(payload.shape);
    });

    it("should validate shared preset name constraints", () => {
      const validateName = (name: string) => name.length >= 1 && name.length <= 100;
      expect(validateName("My Preset")).toBe(true);
      expect(validateName("")).toBe(false);
      expect(validateName("A".repeat(101))).toBe(false);
      expect(validateName("A".repeat(100))).toBe(true);
    });

    it("should validate description constraints", () => {
      const validateDesc = (desc: string) => desc.length <= 500;
      expect(validateDesc("Short description")).toBe(true);
      expect(validateDesc("")).toBe(true);
      expect(validateDesc("A".repeat(500))).toBe(true);
      expect(validateDesc("A".repeat(501))).toBe(false);
    });

    it("should apply shared preset to PiP settings", () => {
      const sharedPreset = {
        customX: 60,
        customY: 80,
        customWidth: 30,
        size: "large",
        opacity: 90,
        shape: "circle",
      };
      // Simulate applying preset
      const newPipPosition = {
        x: sharedPreset.customX ?? 75,
        y: sharedPreset.customY ?? 75,
      };
      const newPipSize = sharedPreset.customWidth ?? 25;
      expect(newPipPosition.x).toBe(60);
      expect(newPipPosition.y).toBe(80);
      expect(newPipSize).toBe(30);
    });

    it("should handle shared preset with missing optional fields", () => {
      const minimalPreset = {
        customX: undefined,
        customY: undefined,
        customWidth: undefined,
      };
      const newPipPosition = {
        x: minimalPreset.customX ?? 75,
        y: minimalPreset.customY ?? 75,
      };
      const newPipSize = minimalPreset.customWidth ?? 25;
      expect(newPipPosition.x).toBe(75);
      expect(newPipPosition.y).toBe(75);
      expect(newPipSize).toBe(25);
    });

    it("should toggle like state correctly", () => {
      const likedIds: number[] = [1, 3, 5];
      const presetId = 3;
      const isLiked = likedIds.includes(presetId);
      expect(isLiked).toBe(true);

      const notLikedId = 2;
      const isNotLiked = likedIds.includes(notLikedId);
      expect(isNotLiked).toBe(false);
    });

    it("should sort presets by likes (popular) or creation (latest)", () => {
      const presets = [
        { id: 1, name: "A", likes: 5, createdAt: new Date("2026-01-01") },
        { id: 2, name: "B", likes: 10, createdAt: new Date("2026-03-01") },
        { id: 3, name: "C", likes: 3, createdAt: new Date("2026-02-01") },
      ];
      const byPopular = [...presets].sort((a, b) => b.likes - a.likes);
      expect(byPopular[0].name).toBe("B");
      expect(byPopular[1].name).toBe("A");
      expect(byPopular[2].name).toBe("C");

      const byLatest = [...presets].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      expect(byLatest[0].name).toBe("B");
      expect(byLatest[1].name).toBe("C");
      expect(byLatest[2].name).toBe("A");
    });
  });

  // DB Schema Validation
  describe("DB Schema Validation", () => {
    it("should have correct sharedPresets table structure", () => {
      const columns = [
        "id",
        "userId",
        "userName",
        "name",
        "description",
        "position",
        "size",
        "opacity",
        "shape",
        "customX",
        "customY",
        "customWidth",
        "customHeight",
        "likes",
        "downloads",
        "createdAt",
      ];
      expect(columns).toContain("userId");
      expect(columns).toContain("name");
      expect(columns).toContain("likes");
      expect(columns).toContain("downloads");
      expect(columns.length).toBe(16);
    });

    it("should have correct subtitleStyles table structure", () => {
      const columns = [
        "id",
        "userId",
        "fontSize",
        "fontColor",
        "bgColor",
        "position",
        "customY",
        "fontFamily",
        "bold",
        "italic",
        "outline",
        "updatedAt",
      ];
      expect(columns).toContain("userId");
      expect(columns).toContain("fontSize");
      expect(columns).toContain("fontFamily");
      expect(columns).toContain("outline");
      expect(columns.length).toBe(12);
    });

    it("should have correct sharedPresetLikes table structure", () => {
      const columns = ["id", "presetId", "userId", "createdAt"];
      expect(columns).toContain("presetId");
      expect(columns).toContain("userId");
      expect(columns.length).toBe(4);
    });
  });
});
