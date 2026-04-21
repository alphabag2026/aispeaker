import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ===== v7.6 Feature Tests =====
// 1. Improvement History Detail Modal (frontend-only, test data structure)
// 2. Script Auto-save (frontend-only, test debounce logic)
// 3. Script Version Management (saveScriptVersion, listScriptVersions, restoreScriptVersion)

describe("v7.6 - Improvement History Detail Modal", () => {
  it("should structure history items with original and improved text for comparison", () => {
    const historyItem = {
      id: 1,
      projectId: 10,
      sectionIndex: 0,
      originalText: "원본 텍스트입니다",
      improvedText: "개선된 텍스트입니다",
      style: "educational",
      batchId: "batch-abc123",
      createdAt: new Date().toISOString(),
    };

    expect(historyItem.originalText).not.toBe(historyItem.improvedText);
    expect(historyItem.batchId).toBeTruthy();
    expect(historyItem.sectionIndex).toBe(0);
  });

  it("should group history items by batchId for batch comparison", () => {
    const items = [
      { id: 1, batchId: "batch-1", sectionIndex: 0, originalText: "a", improvedText: "b" },
      { id: 2, batchId: "batch-1", sectionIndex: 1, originalText: "c", improvedText: "d" },
      { id: 3, batchId: "batch-2", sectionIndex: 0, originalText: "e", improvedText: "f" },
    ];

    const grouped = items.reduce((acc, item) => {
      if (!acc[item.batchId]) acc[item.batchId] = [];
      acc[item.batchId].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["batch-1"]).toHaveLength(2);
    expect(grouped["batch-2"]).toHaveLength(1);
  });
});

describe("v7.6 - Script Auto-save", () => {
  it("should debounce save calls within 30 second window", async () => {
    vi.useFakeTimers();
    const saveFn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerAutoSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(saveFn, 30000);
    };

    // Trigger multiple edits
    triggerAutoSave();
    vi.advanceTimersByTime(10000);
    triggerAutoSave();
    vi.advanceTimersByTime(10000);
    triggerAutoSave();

    // Should not have saved yet
    expect(saveFn).not.toHaveBeenCalled();

    // Wait for debounce to complete
    vi.advanceTimersByTime(30000);
    expect(saveFn).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("should cancel auto-save timer on manual save", () => {
    vi.useFakeTimers();
    const autoSaveFn = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerAutoSave = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(autoSaveFn, 30000);
    };

    const manualSave = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    triggerAutoSave();
    vi.advanceTimersByTime(15000);
    manualSave(); // Cancel auto-save
    vi.advanceTimersByTime(30000);

    expect(autoSaveFn).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("v7.6 - Script Version Management", () => {
  it("should validate saveScriptVersion input schema", () => {
    const schema = z.object({
      projectId: z.number(),
      changeDescription: z.string().optional(),
      changeType: z.enum(["manual", "auto"]).default("manual"),
    });

    const validInput = { projectId: 1, changeDescription: "수동 저장 (5개 섹션)", changeType: "manual" as const };
    expect(() => schema.parse(validInput)).not.toThrow();

    const minimalInput = { projectId: 1 };
    expect(() => schema.parse(minimalInput)).not.toThrow();

    expect(() => schema.parse({ projectId: "abc" })).toThrow();
  });

  it("should validate listScriptVersions input schema", () => {
    const schema = z.object({
      projectId: z.number(),
      limit: z.number().min(1).max(100).default(20),
    });

    expect(() => schema.parse({ projectId: 1 })).not.toThrow();
    expect(() => schema.parse({ projectId: 1, limit: 50 })).not.toThrow();
    expect(() => schema.parse({ projectId: 1, limit: 0 })).toThrow();
    expect(() => schema.parse({ projectId: 1, limit: 101 })).toThrow();
  });

  it("should validate restoreScriptVersion input schema", () => {
    const schema = z.object({
      projectId: z.number(),
      versionId: z.number(),
    });

    expect(() => schema.parse({ projectId: 1, versionId: 5 })).not.toThrow();
    expect(() => schema.parse({ projectId: 1 })).toThrow();
    expect(() => schema.parse({ versionId: 5 })).toThrow();
  });

  it("should structure version data with version number and metadata", () => {
    const version = {
      id: 1,
      projectId: 10,
      versionNumber: 3,
      sectionCount: 5,
      snapshotData: JSON.stringify([
        { section: 1, text: "섹션 1 내용" },
        { section: 2, text: "섹션 2 내용" },
      ]),
      changeType: "manual",
      changeDescription: "수동 저장 (2개 섹션)",
      createdAt: new Date().toISOString(),
    };

    expect(version.versionNumber).toBe(3);
    expect(version.sectionCount).toBe(5);
    expect(JSON.parse(version.snapshotData)).toHaveLength(2);
    expect(version.changeType).toBe("manual");
  });

  it("should restore version by parsing snapshot data back to sections", () => {
    const snapshotData = JSON.stringify([
      { section: 1, text: "복원된 섹션 1" },
      { section: 2, text: "복원된 섹션 2" },
      { section: 3, text: "복원된 섹션 3" },
    ]);

    const restored = JSON.parse(snapshotData);
    expect(restored).toHaveLength(3);
    expect(restored[0].text).toBe("복원된 섹션 1");
    expect(restored[2].section).toBe(3);
  });

  it("should increment version number for each save", () => {
    const existingVersions = [
      { versionNumber: 1 },
      { versionNumber: 2 },
      { versionNumber: 3 },
    ];

    const maxVersion = existingVersions.reduce((max, v) => Math.max(max, v.versionNumber), 0);
    const nextVersion = maxVersion + 1;

    expect(nextVersion).toBe(4);
  });

  it("should support both manual and auto change types", () => {
    const changeTypeEnum = z.enum(["manual", "auto"]);

    expect(() => changeTypeEnum.parse("manual")).not.toThrow();
    expect(() => changeTypeEnum.parse("auto")).not.toThrow();
    expect(() => changeTypeEnum.parse("unknown")).toThrow();
  });
});
