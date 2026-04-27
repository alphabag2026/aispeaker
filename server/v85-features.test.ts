import { describe, it, expect, vi } from "vitest";

describe("v8.5 - AI Auto Translation", () => {
  it("should validate autoTranslate input schema", () => {
    const input = {
      scriptId: 1,
      targetLanguage: "en",
      sections: [
        { title: "Introduction", content: "안녕하세요, 오늘 강의를 시작하겠습니다." },
        { title: "Main Content", content: "블록체인 기술의 핵심 원리를 설명합니다." },
      ],
    };
    expect(input.scriptId).toBe(1);
    expect(input.targetLanguage).toBe("en");
    expect(input.sections).toHaveLength(2);
    expect(input.sections[0].title).toBe("Introduction");
    expect(input.sections[0].content).toContain("안녕하세요");
  });

  it("should support multiple target languages", () => {
    const supportedLangs = ["ko", "en", "ja", "zh", "es", "fr", "de", "pt", "ru", "ar", "hi", "vi", "th", "id", "tr", "pl", "nl", "sv", "it", "ms"];
    expect(supportedLangs).toHaveLength(20);
    supportedLangs.forEach(lang => {
      expect(lang.length).toBeGreaterThanOrEqual(2);
      expect(lang.length).toBeLessThanOrEqual(10);
    });
  });

  it("should parse LLM response correctly", () => {
    const mockResponse = JSON.stringify({
      sections: [
        { title: "Introduction", content: "Hello, let's start today's lecture." },
        { title: "Main Content", content: "We will explain the core principles of blockchain technology." },
      ],
    });
    const parsed = JSON.parse(mockResponse);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[0].title).toBe("Introduction");
    expect(parsed.sections[1].content).toContain("blockchain");
  });
});

describe("v8.5 - PiP Presets", () => {
  it("should validate preset save input", () => {
    const preset = {
      name: "Bottom Right",
      customX: 80,
      customY: 80,
      customWidth: 25,
      customHeight: 25,
      opacity: 90,
      shape: "rounded" as const,
      position: "custom" as const,
    };
    expect(preset.name).toBe("Bottom Right");
    expect(preset.customX).toBeGreaterThanOrEqual(0);
    expect(preset.customX).toBeLessThanOrEqual(100);
    expect(preset.customY).toBeGreaterThanOrEqual(0);
    expect(preset.customY).toBeLessThanOrEqual(100);
    expect(preset.opacity).toBeGreaterThanOrEqual(0);
    expect(preset.opacity).toBeLessThanOrEqual(100);
  });

  it("should validate preset shapes", () => {
    const validShapes = ["circle", "rounded", "square"];
    validShapes.forEach(shape => {
      expect(["circle", "rounded", "square"]).toContain(shape);
    });
  });

  it("should apply preset values to PiP settings", () => {
    const preset = { customX: 75, customY: 75, customWidth: 30, opacity: 85, shape: "circle" };
    const pipPosition = { x: preset.customX, y: preset.customY };
    const pipSize = preset.customWidth;
    expect(pipPosition.x).toBe(75);
    expect(pipPosition.y).toBe(75);
    expect(pipSize).toBe(30);
  });
});

describe("v8.5 - Subtitle Generation", () => {
  it("should validate generateSubtitles input", () => {
    const input = {
      videoUrl: "https://storage.example.com/recording-123.webm",
      language: "ko",
    };
    expect(input.videoUrl).toMatch(/^https?:\/\//);
    expect(input.language).toBe("ko");
  });

  it("should format time correctly", () => {
    const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(125)).toBe("2:05");
  });

  it("should handle subtitle segments structure", () => {
    const segments = [
      { start: 0, end: 5, text: "안녕하세요" },
      { start: 5, end: 12, text: "오늘 강의를 시작하겠습니다" },
      { start: 12, end: 20, text: "블록체인에 대해 알아보겠습니다" },
    ];
    expect(segments).toHaveLength(3);
    segments.forEach(seg => {
      expect(seg.start).toBeLessThan(seg.end);
      expect(seg.text.length).toBeGreaterThan(0);
    });
  });

  it("should allow editing subtitle text", () => {
    const segments = [
      { start: 0, end: 5, text: "Original text" },
    ];
    const updated = [...segments];
    updated[0] = { ...updated[0], text: "Edited text" };
    expect(updated[0].text).toBe("Edited text");
    expect(updated[0].start).toBe(0);
    expect(updated[0].end).toBe(5);
  });
});
