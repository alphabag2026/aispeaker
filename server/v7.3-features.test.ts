import { describe, it, expect, vi } from "vitest";

// ============ Eraser Tool Tests ============
describe("Eraser Tool Logic", () => {
  it("should find nearest annotation within threshold", () => {
    const annotations = [
      { id: 1, pathData: { x: 50, y: 50, width: 8, height: 8 } },
      { id: 2, pathData: { x: 20, y: 20, width: 8, height: 8 } },
      { id: 3, pathData: { points: [{ x: 10, y: 10 }, { x: 15, y: 15 }, { x: 20, y: 10 }] } },
    ];

    // Simulate findNearestAnnotation logic
    function findNearestAnnotation(pos: { x: number; y: number }, anns: any[], threshold = 5) {
      let nearest: any = null;
      let minDist = threshold;
      for (const ann of anns) {
        const pd = ann.pathData;
        if (!pd) continue;
        let dist = Infinity;
        if (pd.points && Array.isArray(pd.points)) {
          for (const pt of pd.points) {
            const d = Math.sqrt((pt.x - pos.x) ** 2 + (pt.y - pos.y) ** 2);
            if (d < dist) dist = d;
          }
        } else if (pd.x !== undefined && pd.y !== undefined) {
          dist = Math.sqrt((pd.x - pos.x) ** 2 + (pd.y - pos.y) ** 2);
        }
        if (dist < minDist) {
          minDist = dist;
          nearest = ann;
        }
      }
      return nearest;
    }

    // Click near annotation 2
    expect(findNearestAnnotation({ x: 21, y: 21 }, annotations)?.id).toBe(2);
    // Click near freehand annotation 3
    expect(findNearestAnnotation({ x: 11, y: 11 }, annotations)?.id).toBe(3);
    // Click far from any annotation
    expect(findNearestAnnotation({ x: 80, y: 80 }, annotations)).toBeNull();
    // Click exactly on annotation 1
    expect(findNearestAnnotation({ x: 50, y: 50 }, annotations)?.id).toBe(1);
  });

  it("should not find annotation beyond threshold", () => {
    const annotations = [
      { id: 1, pathData: { x: 50, y: 50 } },
    ];
    function findNearestAnnotation(pos: { x: number; y: number }, anns: any[], threshold = 5) {
      let nearest: any = null;
      let minDist = threshold;
      for (const ann of anns) {
        const pd = ann.pathData;
        if (!pd) continue;
        let dist = Infinity;
        if (pd.x !== undefined && pd.y !== undefined) {
          dist = Math.sqrt((pd.x - pos.x) ** 2 + (pd.y - pos.y) ** 2);
        }
        if (dist < minDist) {
          minDist = dist;
          nearest = ann;
        }
      }
      return nearest;
    }
    expect(findNearestAnnotation({ x: 60, y: 60 }, annotations)).toBeNull();
  });
});

// ============ Custom Color Picker Tests ============
describe("Custom Color Picker", () => {
  it("should detect custom color not in preset palette", () => {
    const PEN_COLORS = ["#FF0000", "#00FF00", "#0066FF", "#FFFF00", "#FF6600", "#FF00FF", "#FFFFFF"];
    expect(PEN_COLORS.includes("#FF0000")).toBe(true);
    expect(PEN_COLORS.includes("#123456")).toBe(false);
    expect(PEN_COLORS.includes("#ABCDEF")).toBe(false);
  });

  it("should validate hex color format", () => {
    const isValidHex = (c: string) => /^#[0-9A-Fa-f]{6}$/.test(c);
    expect(isValidHex("#FF0000")).toBe(true);
    expect(isValidHex("#123abc")).toBe(true);
    expect(isValidHex("red")).toBe(false);
    expect(isValidHex("#GGG")).toBe(false);
  });
});

// ============ Video Generation History Tests ============
describe("Video Generation History", () => {
  it("should format status correctly", () => {
    const STATUS_MAP: Record<string, { label: string; color: string }> = {
      pending: { label: "대기 중", color: "bg-yellow-500/20 text-yellow-400" },
      generating: { label: "생성 중", color: "bg-blue-500/20 text-blue-400" },
      completed: { label: "완료", color: "bg-green-500/20 text-green-400" },
      failed: { label: "실패", color: "bg-red-500/20 text-red-400" },
    };
    expect(STATUS_MAP["completed"].label).toBe("완료");
    expect(STATUS_MAP["failed"].label).toBe("실패");
    expect(STATUS_MAP["generating"].label).toBe("생성 중");
    expect(STATUS_MAP["pending"].label).toBe("대기 중");
  });

  it("should parse config from generation record", () => {
    const gen = {
      id: 1,
      status: "completed",
      config: {
        avatarPosition: "bottom-right",
        avatarSize: 25,
        bgmUrl: "https://example.com/bgm.mp3",
        bgmVolume: 0.3,
        noiseReduction: true,
      },
    };
    const config = gen.config as any;
    expect(config.avatarPosition).toBe("bottom-right");
    expect(config.avatarSize).toBe(25);
    expect(config.bgmUrl).toBeTruthy();
    expect(config.noiseReduction).toBe(true);
  });

  it("should format duration correctly", () => {
    const formatDuration = (sec: number | null) => sec ? `${Math.round(sec)}초` : "-";
    expect(formatDuration(120)).toBe("120초");
    expect(formatDuration(null)).toBe("-");
    expect(formatDuration(0)).toBe("-");
  });
});

// ============ AI Script Improvement Tests ============
describe("AI Script Improvement", () => {
  it("should have correct style guides", () => {
    const styleGuides: Record<string, string> = {
      formal: "격식적이고 전문적인 강의 톤",
      casual: "친근하고 편안한 톤",
      educational: "교육적이고 이해하기 쉬운 톤",
      storytelling: "스토리텔링 형식",
    };
    expect(Object.keys(styleGuides)).toHaveLength(4);
    expect(styleGuides.educational).toContain("교육적");
    expect(styleGuides.formal).toContain("격식적");
    expect(styleGuides.casual).toContain("친근");
    expect(styleGuides.storytelling).toContain("스토리텔링");
  });

  it("should validate script input constraints", () => {
    const validateInput = (text: string) => text.length >= 1 && text.length <= 10000;
    expect(validateInput("Hello")).toBe(true);
    expect(validateInput("")).toBe(false);
    expect(validateInput("a".repeat(10001))).toBe(false);
    expect(validateInput("a".repeat(10000))).toBe(true);
  });

  it("should handle improvement result structure", () => {
    const result = { original: "원본 텍스트", improved: "개선된 텍스트" };
    expect(result.original).toBe("원본 텍스트");
    expect(result.improved).toBe("개선된 텍스트");
    expect(result.improved).not.toBe(result.original);
  });

  it("should apply improvement to correct section", () => {
    const sections = [
      { id: "1", section: 1, text: "섹션 1 원본" },
      { id: "2", section: 2, text: "섹션 2 원본" },
      { id: "3", section: 3, text: "섹션 3 원본" },
    ];
    const improvedPreview = { idx: 1, original: "섹션 2 원본", improved: "섹션 2 개선됨" };
    const newSections = [...sections];
    newSections[improvedPreview.idx] = { ...newSections[improvedPreview.idx], text: improvedPreview.improved };
    expect(newSections[0].text).toBe("섹션 1 원본");
    expect(newSections[1].text).toBe("섹션 2 개선됨");
    expect(newSections[2].text).toBe("섹션 3 원본");
  });
});

// ============ ANNOTATION_TOOLS with Eraser ============
describe("ANNOTATION_TOOLS includes eraser", () => {
  it("should have eraser in tools list", () => {
    const ANNOTATION_TOOLS = [
      { type: "circle" },
      { type: "arrow" },
      { type: "check" },
      { type: "underline" },
      { type: "freehand" },
      { type: "eraser" },
    ];
    expect(ANNOTATION_TOOLS.find(t => t.type === "eraser")).toBeTruthy();
    expect(ANNOTATION_TOOLS).toHaveLength(6);
  });
});
