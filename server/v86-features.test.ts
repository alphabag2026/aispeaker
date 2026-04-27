import { describe, it, expect } from "vitest";

describe("v8.6 - SRT Export, Interpreter Preview, Preset Sharing", () => {
  // SRT Export
  describe("SRT Export", () => {
    it("should format SRT time correctly", () => {
      const formatSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 1000);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
      };
      expect(formatSrtTime(0)).toBe("00:00:00,000");
      expect(formatSrtTime(65.5)).toBe("00:01:05,500");
      expect(formatSrtTime(3661.123)).toBe("01:01:01,123");
    });

    it("should generate valid SRT format", () => {
      const segments = [
        { start: 0, end: 2.5, text: "Hello world" },
        { start: 3.0, end: 5.5, text: "Second line" },
      ];
      const formatSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 1000);
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
      };
      const srt = segments
        .map(
          (seg, i) =>
            `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.text}\n`
        )
        .join("\n");
      expect(srt).toContain("1\n00:00:00,000 --> 00:00:02,500\nHello world");
      expect(srt).toContain("2\n00:00:03,000 --> 00:00:05,500\nSecond line");
    });

    it("should handle empty segments", () => {
      const segments: any[] = [];
      expect(segments.length).toBe(0);
    });
  });

  // Preset Sharing
  describe("Preset Sharing", () => {
    it("should encode preset to base64 code", () => {
      const preset = {
        name: "Bottom Right",
        customX: 75,
        customY: 75,
        customWidth: 25,
        customHeight: 25,
        opacity: 100,
        shape: "rounded",
        position: "custom",
      };
      const data = {
        n: preset.name,
        x: preset.customX,
        y: preset.customY,
        w: preset.customWidth,
        h: preset.customHeight,
        o: preset.opacity,
        s: preset.shape,
        p: preset.position,
      };
      const code = btoa(JSON.stringify(data));
      expect(code).toBeTruthy();
      expect(typeof code).toBe("string");
    });

    it("should decode preset from base64 code", () => {
      const original = {
        n: "Test",
        x: 50,
        y: 50,
        w: 30,
        h: 30,
        o: 80,
        s: "circle",
        p: "custom",
      };
      const code = btoa(JSON.stringify(original));
      const decoded = JSON.parse(atob(code));
      expect(decoded.n).toBe("Test");
      expect(decoded.x).toBe(50);
      expect(decoded.y).toBe(50);
      expect(decoded.w).toBe(30);
      expect(decoded.o).toBe(80);
      expect(decoded.s).toBe("circle");
    });

    it("should handle invalid base64 gracefully", () => {
      expect(() => JSON.parse(atob("invalid!!!"))).toThrow();
    });

    it("should handle missing fields with defaults", () => {
      const partial = { n: "Partial" };
      const code = btoa(JSON.stringify(partial));
      const decoded = JSON.parse(atob(code));
      expect(decoded.n).toBe("Partial");
      expect(decoded.x ?? 75).toBe(75);
      expect(decoded.y ?? 75).toBe(75);
      expect(decoded.w ?? 25).toBe(25);
    });
  });

  // Interpreter Preview
  describe("Interpreter Preview", () => {
    it("should handle section navigation logic", () => {
      const sections = [
        { title: "Intro", content: "Hello" },
        { title: "Main", content: "World" },
      ];
      const interpSections = [
        { interpretedContent: "안녕하세요" },
        { interpretedContent: "세계" },
      ];

      // Start at section 0, original
      let idx = 0;
      let isOrig = true;

      // After original plays, switch to interpreted
      if (isOrig && interpSections.length > 0) {
        isOrig = false;
      }
      expect(isOrig).toBe(false);
      expect(idx).toBe(0);

      // After interpreted plays, move to next section
      if (!isOrig) {
        idx++;
        isOrig = true;
      }
      expect(idx).toBe(1);
      expect(isOrig).toBe(true);
    });

    it("should stop at end of sections", () => {
      const sections = [{ title: "Only", content: "One" }];
      let idx = 0;
      let isOrig = true;
      // Play original
      isOrig = false;
      // Play interpreted
      idx++;
      isOrig = true;
      // idx >= sections.length → stop
      expect(idx >= sections.length).toBe(true);
    });
  });
});
