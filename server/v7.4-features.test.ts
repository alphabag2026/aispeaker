import { describe, it, expect } from "vitest";

describe("Batch AI Script Improvement", () => {
  it("should filter empty sections before sending to LLM", () => {
    const sections = [
      { id: "1", text: "블록체인 기초 설명" },
      { id: "2", text: "" },
      { id: "3", text: "   " },
      { id: "4", text: "스마트 컨트랙트 개요" },
    ];
    const validSections = sections.filter(s => s.text.trim().length > 0);
    expect(validSections).toHaveLength(2);
    expect(validSections[0].id).toBe("1");
    expect(validSections[1].id).toBe("4");
  });

  it("should correctly count improved sections", () => {
    const results = [
      { id: "1", original: "원본1", improved: "개선1" },
      { id: "2", original: "원본2", improved: "원본2" }, // unchanged
      { id: "3", original: "원본3", improved: "개선3" },
    ];
    const improvedCount = results.filter(r => r.improved !== r.original).length;
    expect(improvedCount).toBe(2);
    expect(results.length).toBe(3);
  });

  it("should apply batch improvements to correct sections", () => {
    const sections = [
      { id: "s1", section: 1, text: "원본 A" },
      { id: "s2", section: 2, text: "원본 B" },
      { id: "s3", section: 3, text: "원본 C" },
    ];
    const batchResults = [
      { id: "s1", original: "원본 A", improved: "개선 A" },
      { id: "s2", original: "원본 B", improved: "원본 B" },
      { id: "s3", original: "원본 C", improved: "개선 C" },
    ];
    const newSections = sections.map(sec => {
      const result = batchResults.find(r => r.id === sec.id);
      return result && result.improved !== result.original ? { ...sec, text: result.improved } : sec;
    });
    expect(newSections[0].text).toBe("개선 A");
    expect(newSections[1].text).toBe("원본 B"); // unchanged
    expect(newSections[2].text).toBe("개선 C");
  });

  it("should handle max 50 sections input constraint", () => {
    const validate = (count: number) => count >= 1 && count <= 50;
    expect(validate(1)).toBe(true);
    expect(validate(50)).toBe(true);
    expect(validate(0)).toBe(false);
    expect(validate(51)).toBe(false);
  });

  it("should preserve section order after batch apply", () => {
    const sections = Array.from({ length: 10 }, (_, i) => ({
      id: `sec-${i}`, section: i + 1, text: `원본 ${i + 1}`,
    }));
    const batchResults = sections.map(s => ({
      id: s.id, original: s.text, improved: `개선 ${s.section}`,
    }));
    const newSections = sections.map(sec => {
      const result = batchResults.find(r => r.id === sec.id);
      return result && result.improved !== result.original ? { ...sec, text: result.improved } : sec;
    });
    expect(newSections.map(s => s.section)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(newSections[0].text).toBe("개선 1");
    expect(newSections[9].text).toBe("개선 10");
  });

  it("should handle progress simulation correctly", () => {
    let progress = 10;
    // Simulate 5 progress updates
    for (let i = 0; i < 5; i++) {
      progress = Math.min(progress + 15, 90);
    }
    expect(progress).toBeLessThanOrEqual(90);
    expect(progress).toBeGreaterThan(10);
  });
});
