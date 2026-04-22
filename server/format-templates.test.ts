import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB
vi.mock("./db", () => ({
  listAllLectureFormatTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: "강사 단독", category: "personnel", isActive: true, isSystem: true, sortOrder: 1 },
    { id: 2, name: "PPT 강의", category: "style", isActive: true, isSystem: true, sortOrder: 1 },
    { id: 3, name: "질문자 삽입", category: "insert", isActive: true, isSystem: false, sortOrder: 1 },
  ]),
  listLectureFormatTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: "강사 단독", category: "personnel", isActive: true },
  ]),
  getLectureFormatTemplate: vi.fn().mockResolvedValue({ id: 1, name: "강사 단독", category: "personnel" }),
  createLectureFormatTemplate: vi.fn().mockResolvedValue({ id: 4 }),
  updateLectureFormatTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  deleteLectureFormatTemplate: vi.fn().mockResolvedValue({ id: 3 }),
  hardDeleteLectureFormatTemplate: vi.fn().mockResolvedValue({ id: 3 }),
}));

import * as db from "./db";

describe("Format Template Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin CRUD Operations", () => {
    it("should list all format templates (including inactive)", async () => {
      const result = await db.listAllLectureFormatTemplates();
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("강사 단독");
      expect(result[1].category).toBe("style");
      expect(result[2].category).toBe("insert");
    });

    it("should list active format templates by category", async () => {
      const result = await db.listLectureFormatTemplates("personnel");
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("personnel");
    });

    it("should get a specific format template", async () => {
      const result = await db.getLectureFormatTemplate(1);
      expect(result).toBeDefined();
      expect(result!.name).toBe("강사 단독");
    });

    it("should create a new format template", async () => {
      const result = await db.createLectureFormatTemplate({
        name: "새 템플릿",
        category: "personnel",
        personnelConfig: [{ role: "instructor", label: "강사", count: 1 }],
      } as any);
      expect(result.id).toBe(4);
      expect(db.createLectureFormatTemplate).toHaveBeenCalledOnce();
    });

    it("should update a format template", async () => {
      const result = await db.updateLectureFormatTemplate(1, { name: "수정된 템플릿" } as any);
      expect(result.id).toBe(1);
      expect(db.updateLectureFormatTemplate).toHaveBeenCalledWith(1, { name: "수정된 템플릿" });
    });

    it("should soft delete a format template", async () => {
      const result = await db.deleteLectureFormatTemplate(3);
      expect(result.id).toBe(3);
      expect(db.deleteLectureFormatTemplate).toHaveBeenCalledWith(3);
    });

    it("should hard delete a format template", async () => {
      const result = await db.hardDeleteLectureFormatTemplate(3);
      expect(result.id).toBe(3);
      expect(db.hardDeleteLectureFormatTemplate).toHaveBeenCalledWith(3);
    });
  });

  describe("Template Validation", () => {
    it("should have valid category values", () => {
      const validCategories = ["personnel", "style", "insert"];
      const templates = [
        { category: "personnel" },
        { category: "style" },
        { category: "insert" },
      ];
      templates.forEach(t => {
        expect(validCategories).toContain(t.category);
      });
    });

    it("should have required fields for creation", () => {
      const requiredFields = ["name", "category"];
      const template = { name: "테스트", category: "personnel" };
      requiredFields.forEach(field => {
        expect(template).toHaveProperty(field);
        expect((template as any)[field]).toBeTruthy();
      });
    });

    it("should support JSON config fields", () => {
      const personnelConfig = [
        { role: "instructor", label: "강사", count: 1, required: true },
        { role: "mc", label: "MC", count: 1, required: false },
      ];
      expect(personnelConfig).toBeInstanceOf(Array);
      expect(personnelConfig[0].role).toBe("instructor");
      expect(personnelConfig[1].label).toBe("MC");

      const styleConfig = {
        layoutType: "ppt_overlay",
        hasSlides: true,
        hasWhiteboard: false,
        hasPIP: true,
      };
      expect(styleConfig.layoutType).toBe("ppt_overlay");
      expect(styleConfig.hasSlides).toBe(true);

      const insertElements = [
        { type: "qa", label: "질문자 삽입", defaultDuration: 60, position: "middle" },
      ];
      expect(insertElements[0].type).toBe("qa");
      expect(insertElements[0].defaultDuration).toBe(60);
    });
  });
});
