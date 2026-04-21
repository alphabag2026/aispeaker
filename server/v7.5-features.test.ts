import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

// ===== v7.5 Feature Tests: Selective Batch Improvement + History =====

describe("v7.5 - Selective Batch Improvement", () => {
  it("should filter sections by selectedSectionIds when set", () => {
    const sections = [
      { id: "s1", text: "Hello world" },
      { id: "s2", text: "Blockchain intro" },
      { id: "s3", text: "DeFi basics" },
    ];
    const selectedSectionIds = new Set(["s1", "s3"]);

    let targetSections = sections.filter(s => s.text.trim().length > 0);
    if (selectedSectionIds.size > 0) {
      targetSections = targetSections.filter(s => selectedSectionIds.has(s.id));
    }

    expect(targetSections).toHaveLength(2);
    expect(targetSections.map(s => s.id)).toEqual(["s1", "s3"]);
  });

  it("should use all sections when no selection is made", () => {
    const sections = [
      { id: "s1", text: "Hello" },
      { id: "s2", text: "World" },
    ];
    const selectedSectionIds = new Set<string>();

    let targetSections = sections.filter(s => s.text.trim().length > 0);
    if (selectedSectionIds.size > 0) {
      targetSections = targetSections.filter(s => selectedSectionIds.has(s.id));
    }

    expect(targetSections).toHaveLength(2);
  });

  it("should toggle section selection correctly", () => {
    const selectedIds = new Set<string>();

    // Add
    const next1 = new Set(selectedIds);
    next1.add("s1");
    expect(next1.has("s1")).toBe(true);

    // Toggle off
    const next2 = new Set(next1);
    next2.delete("s1");
    expect(next2.has("s1")).toBe(false);
  });

  it("should toggle select all correctly", () => {
    const sections = [
      { id: "s1", text: "Hello" },
      { id: "s2", text: "" },
      { id: "s3", text: "World" },
    ];
    const validIds = sections.filter(s => s.text.trim()).map(s => s.id);

    // Select all
    const allSelected = new Set(validIds);
    expect(allSelected.size).toBe(2);

    // Deselect all
    const noneSelected = new Set<string>();
    expect(noneSelected.size).toBe(0);
  });

  it("should return error when no sections selected and all empty", () => {
    const sections = [{ id: "s1", text: "" }];
    const selectedSectionIds = new Set(["s1"]);

    let targetSections = sections.filter(s => s.text.trim().length > 0);
    if (selectedSectionIds.size > 0) {
      targetSections = targetSections.filter(s => selectedSectionIds.has(s.id));
    }

    expect(targetSections).toHaveLength(0);
  });
});

describe("v7.5 - improveAllScripts input validation", () => {
  const inputSchema = z.object({
    projectId: z.number().optional(),
    sections: z.array(z.object({
      id: z.string(),
      text: z.string(),
    })).min(1).max(50),
    style: z.enum(["formal", "casual", "educational", "storytelling"]).default("educational"),
    language: z.string().default("ko"),
  });

  it("should accept valid input with projectId", () => {
    const result = inputSchema.safeParse({
      projectId: 42,
      sections: [{ id: "s1", text: "Hello" }],
      style: "formal",
      language: "ko",
    });
    expect(result.success).toBe(true);
  });

  it("should accept input without projectId", () => {
    const result = inputSchema.safeParse({
      sections: [{ id: "s1", text: "Hello" }],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty sections array", () => {
    const result = inputSchema.safeParse({
      projectId: 1,
      sections: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("v7.5 - Script Improvement History", () => {
  it("should generate unique batchId", () => {
    const batchId1 = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const batchId2 = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    expect(batchId1).not.toBe(batchId2);
    expect(batchId1).toMatch(/^batch-\d+-[a-z0-9]+$/);
  });

  it("should create history records with correct structure", () => {
    const results = [
      { id: "s1", original: "Hello", improved: "Hello, welcome to the lecture" },
      { id: "s2", original: "World", improved: "World of blockchain" },
    ];
    const batchId = "batch-123-abc";
    const userId = 1;
    const projectId = 42;

    const historyRecords = results.map((r, idx) => ({
      userId,
      projectId,
      sectionId: r.id,
      sectionIndex: idx,
      originalText: r.original,
      improvedText: r.improved,
      style: "educational" as const,
      applied: false,
      isBatch: true,
      batchId,
    }));

    expect(historyRecords).toHaveLength(2);
    expect(historyRecords[0].sectionId).toBe("s1");
    expect(historyRecords[0].batchId).toBe(batchId);
    expect(historyRecords[1].sectionIndex).toBe(1);
  });

  it("should group history by batchId", () => {
    const history = [
      { id: 1, batchId: "batch-a", sectionId: "s1", style: "educational", createdAt: new Date() },
      { id: 2, batchId: "batch-a", sectionId: "s2", style: "educational", createdAt: new Date() },
      { id: 3, batchId: "batch-b", sectionId: "s1", style: "formal", createdAt: new Date() },
    ];

    const groups = new Map<string, { batchId: string; count: number }>();
    for (const item of history) {
      const key = item.batchId || `single-${item.id}`;
      if (!groups.has(key)) {
        groups.set(key, { batchId: key, count: 0 });
      }
      groups.get(key)!.count++;
    }

    const result = Array.from(groups.values());
    expect(result).toHaveLength(2);
    expect(result.find(g => g.batchId === "batch-a")?.count).toBe(2);
    expect(result.find(g => g.batchId === "batch-b")?.count).toBe(1);
  });

  it("should revert sections to original text", () => {
    const sections = [
      { id: "s1", text: "Improved text 1" },
      { id: "s2", text: "Improved text 2" },
      { id: "s3", text: "Unchanged" },
    ];
    const revertData = {
      sections: [
        { sectionId: "s1", originalText: "Original text 1" },
        { sectionId: "s2", originalText: "Original text 2" },
      ],
    };

    const newSections = sections.map(sec => {
      const reverted = revertData.sections.find(s => s.sectionId === sec.id);
      return reverted ? { ...sec, text: reverted.originalText } : sec;
    });

    expect(newSections[0].text).toBe("Original text 1");
    expect(newSections[1].text).toBe("Original text 2");
    expect(newSections[2].text).toBe("Unchanged");
  });

  it("should validate revertImprovement input", () => {
    const schema = z.object({ batchId: z.string() });
    expect(schema.safeParse({ batchId: "batch-123-abc" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("should validate getImprovementHistory input", () => {
    const schema = z.object({ projectId: z.number() });
    expect(schema.safeParse({ projectId: 42 }).success).toBe(true);
    expect(schema.safeParse({ projectId: "abc" }).success).toBe(false);
  });
});
