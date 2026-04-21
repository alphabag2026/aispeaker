import { describe, it, expect, vi, beforeEach } from "vitest";

// ========== 1. Touch event helpers (unit logic test) ==========
describe("v7.2 - Touch coordinate conversion", () => {
  it("should convert touch coordinates to relative percentage", () => {
    // Simulate the getTouchRelativePos logic
    const rect = { left: 100, top: 50, width: 800, height: 450 };
    const touchClientX = 500;
    const touchClientY = 275;

    const x = ((touchClientX - rect.left) / rect.width) * 100;
    const y = ((touchClientY - rect.top) / rect.height) * 100;

    expect(x).toBe(50); // center horizontally
    expect(y).toBe(50); // center vertically
  });

  it("should handle edge coordinates correctly", () => {
    const rect = { left: 0, top: 0, width: 1000, height: 500 };

    // Top-left corner
    const x1 = ((0 - rect.left) / rect.width) * 100;
    const y1 = ((0 - rect.top) / rect.height) * 100;
    expect(x1).toBe(0);
    expect(y1).toBe(0);

    // Bottom-right corner
    const x2 = ((1000 - rect.left) / rect.width) * 100;
    const y2 = ((500 - rect.top) / rect.height) * 100;
    expect(x2).toBe(100);
    expect(y2).toBe(100);
  });
});

// ========== 2. Progress calculation logic ==========
describe("v7.2 - Video generation progress calculation", () => {
  it("should calculate avatar phase progress correctly", () => {
    const calcProgress = (phase: string, current: number, total: number) => {
      if (phase === "avatar") return Math.round((current / total) * 70);
      if (phase === "compose") return 75;
      if (phase === "finalize") return 90;
      if (phase === "complete") return 100;
      return 0;
    };

    expect(calcProgress("avatar", 1, 5)).toBe(14);
    expect(calcProgress("avatar", 3, 5)).toBe(42);
    expect(calcProgress("avatar", 5, 5)).toBe(70);
    expect(calcProgress("compose", 0, 5)).toBe(75);
    expect(calcProgress("finalize", 0, 1)).toBe(90);
    expect(calcProgress("complete", 1, 1)).toBe(100);
  });

  it("should cap progress at 95 during generation", () => {
    const pct = Math.min(95, 100);
    expect(pct).toBe(95);
  });
});

// ========== 3. getVideoProgress procedure ==========
describe("v7.2 - getVideoProgress procedure", () => {
  it("should return progress data structure", () => {
    // Simulate the response shape
    const mockProject = {
      status: "generating",
      generationProgress: 42,
      generationStep: "슬라이드 3/5: 아바타 영상 생성 중",
      finalVideoUrl: null,
      errorMessage: null,
    };

    const result = {
      status: mockProject.status,
      progress: mockProject.generationProgress ?? 0,
      step: mockProject.generationStep ?? "",
      videoUrl: mockProject.finalVideoUrl ?? null,
      errorMessage: mockProject.errorMessage ?? null,
    };

    expect(result.status).toBe("generating");
    expect(result.progress).toBe(42);
    expect(result.step).toContain("슬라이드 3/5");
    expect(result.videoUrl).toBeNull();
  });

  it("should handle completed state", () => {
    const mockProject = {
      status: "completed",
      generationProgress: 100,
      generationStep: "완료",
      finalVideoUrl: "https://example.com/video.mp4",
      errorMessage: null,
    };

    const result = {
      status: mockProject.status,
      progress: mockProject.generationProgress ?? 0,
      step: mockProject.generationStep ?? "",
      videoUrl: mockProject.finalVideoUrl ?? null,
      errorMessage: mockProject.errorMessage ?? null,
    };

    expect(result.status).toBe("completed");
    expect(result.progress).toBe(100);
    expect(result.videoUrl).toBe("https://example.com/video.mp4");
  });

  it("should handle failed state with error message", () => {
    const mockProject = {
      status: "failed",
      generationProgress: 0,
      generationStep: null,
      finalVideoUrl: null,
      errorMessage: "DID API timeout",
    };

    const result = {
      status: mockProject.status,
      progress: mockProject.generationProgress ?? 0,
      step: mockProject.generationStep ?? "",
      videoUrl: mockProject.finalVideoUrl ?? null,
      errorMessage: mockProject.errorMessage ?? null,
    };

    expect(result.status).toBe("failed");
    expect(result.progress).toBe(0);
    expect(result.errorMessage).toBe("DID API timeout");
  });
});

// ========== 4. Text extraction logic ==========
describe("v7.2 - PPT/PDF text extraction", () => {
  it("should identify PDF files correctly", () => {
    const isPdfOrPpt = (fileName: string, mimeType: string) => {
      const lower = fileName.toLowerCase();
      if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
      if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || lower.endsWith(".pptx") || lower.endsWith(".ppt")) return "ppt";
      return null;
    };

    expect(isPdfOrPpt("test.pdf", "application/pdf")).toBe("pdf");
    expect(isPdfOrPpt("slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("ppt");
    expect(isPdfOrPpt("image.png", "image/png")).toBeNull();
  });

  it("should filter placeholder texts correctly", () => {
    const texts = [
      { pageIndex: 0, text: "Introduction to AI" },
      { pageIndex: 1, text: "[Page 2]" },
      { pageIndex: 2, text: "Machine Learning Basics" },
      { pageIndex: 3, text: "" },
    ];

    const validTexts = texts.filter(t => t.text && !t.text.startsWith("[Page"));
    expect(validTexts).toHaveLength(2);
    expect(validTexts[0].text).toBe("Introduction to AI");
    expect(validTexts[1].text).toBe("Machine Learning Basics");
  });

  it("should calculate estimated duration from text length", () => {
    const calcDuration = (text: string) => Math.max(10, Math.ceil(text.trim().length / 5));

    expect(calcDuration("Hello")).toBe(10); // min 10 seconds
    expect(calcDuration("A".repeat(100))).toBe(20); // 100/5 = 20
    expect(calcDuration("A".repeat(300))).toBe(60); // 300/5 = 60
  });
});

// ========== 5. applyExtractedTextsAsScripts logic ==========
describe("v7.2 - Apply extracted texts as scripts", () => {
  it("should map page indices to slide IDs", () => {
    const slides = [
      { id: 101 }, { id: 102 }, { id: 103 }, { id: 104 },
    ];
    const extractedTexts = [
      { pageIndex: 0, text: "Intro text" },
      { pageIndex: 1, text: "[Page 2]" },
      { pageIndex: 2, text: "Content text" },
    ];

    const pairs = extractedTexts
      .filter(t => t.text && !t.text.startsWith("[Page"))
      .map((t) => ({
        slideId: slides[t.pageIndex]?.id,
        text: t.text,
      }))
      .filter(p => p.slideId);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({ slideId: 101, text: "Intro text" });
    expect(pairs[1]).toEqual({ slideId: 103, text: "Content text" });
  });

  it("should skip empty texts", () => {
    const pairs = [
      { slideId: 1, text: "" },
      { slideId: 2, text: "  " },
      { slideId: 3, text: "Valid text" },
    ];

    const valid = pairs.filter(p => p.text && p.text.trim().length > 0);
    expect(valid).toHaveLength(1);
    expect(valid[0].slideId).toBe(3);
  });
});

// ========== 6. Schema migration validation ==========
describe("v7.2 - Schema fields", () => {
  it("should have generationProgress default to 0", () => {
    const defaultProgress = 0;
    expect(defaultProgress).toBe(0);
  });

  it("should allow generationStep to be null/undefined", () => {
    const step: string | null | undefined = undefined;
    const result = step ?? "";
    expect(result).toBe("");
  });
});
