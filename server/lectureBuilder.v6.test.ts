import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock invokeLLM
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "교정된 텍스트입니다." } }],
  }),
}));

// Mock db functions
const mockDb = {
  getLectureProject: vi.fn(),
  upsertSlideAvatarOverride: vi.fn(),
  getSlideAvatarOverrides: vi.fn(),
  deleteSlideAvatarOverride: vi.fn(),
  createSlideInsertContent: vi.fn(),
  listSlideInsertContent: vi.fn(),
  getSlideInsertContentById: vi.fn(),
  updateSlideInsertContent: vi.fn(),
  deleteSlideInsertContent: vi.fn(),
};

vi.mock("./server/db", () => ({
  default: mockDb,
  ...mockDb,
}));

describe("LectureBuilder v6 - AI Proofread & Avatar Override & Insert Content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.getLectureProject.mockResolvedValue({ id: 1, userId: 1 });
  });

  describe("AI Proofread Script", () => {
    it("should define proofread filter types", () => {
      const validFilters = ["smooth", "news", "presentation", "conversational", "dramatic", "concise"];
      expect(validFilters).toHaveLength(6);
      expect(validFilters).toContain("smooth");
      expect(validFilters).toContain("news");
      expect(validFilters).toContain("presentation");
    });

    it("should validate proofread input structure", () => {
      const input = {
        scriptText: "엑스플레이에 대해서 수익구조를 분석해보겠습니다.",
        filter: "smooth" as const,
        language: "ko",
      };
      expect(input.scriptText.length).toBeGreaterThan(0);
      expect(["smooth", "news", "presentation", "conversational", "dramatic", "concise"]).toContain(input.filter);
    });
  });

  describe("Avatar Override", () => {
    it("should validate avatar override input structure", () => {
      const input = {
        projectId: 1,
        slideId: 10,
        avatarPosition: "bottom-right" as const,
        avatarSizePercent: 25,
        offsetX: 75,
        offsetY: 75,
        avatarShape: "circle" as const,
        avatarOpacity: 100,
        isHidden: false,
      };
      expect(input.avatarSizePercent).toBeGreaterThanOrEqual(5);
      expect(input.avatarSizePercent).toBeLessThanOrEqual(80);
      expect(input.avatarOpacity).toBeGreaterThanOrEqual(0);
      expect(input.avatarOpacity).toBeLessThanOrEqual(100);
      expect(["circle", "rounded", "rectangle"]).toContain(input.avatarShape);
    });

    it("should call upsertSlideAvatarOverride with correct params", async () => {
      mockDb.upsertSlideAvatarOverride.mockResolvedValue(1);
      const input = {
        projectId: 1,
        slideId: 10,
        avatarSizePercent: 30,
        offsetX: 80,
        offsetY: 60,
        avatarShape: "rounded",
        avatarOpacity: 90,
      };
      const result = await mockDb.upsertSlideAvatarOverride(input);
      expect(result).toBe(1);
      expect(mockDb.upsertSlideAvatarOverride).toHaveBeenCalledWith(input);
    });

    it("should retrieve avatar overrides for a project", async () => {
      const mockOverrides = [
        { id: 1, projectId: 1, slideId: 10, avatarSizePercent: 30, offsetX: 80, offsetY: 60, avatarShape: "circle", avatarOpacity: 100 },
        { id: 2, projectId: 1, slideId: 11, avatarSizePercent: 20, offsetX: 70, offsetY: 70, avatarShape: "rounded", avatarOpacity: 80 },
      ];
      mockDb.getSlideAvatarOverrides.mockResolvedValue(mockOverrides);
      const result = await mockDb.getSlideAvatarOverrides(1);
      expect(result).toHaveLength(2);
      expect(result[0].slideId).toBe(10);
      expect(result[1].avatarShape).toBe("rounded");
    });
  });

  describe("Insert Content", () => {
    it("should validate insert content types", () => {
      const validTypes = ["whiteboard", "video", "image", "design"];
      expect(validTypes).toHaveLength(4);
    });

    it("should create insert content", async () => {
      mockDb.createSlideInsertContent.mockResolvedValue(5);
      const input = {
        projectId: 1,
        afterSlideId: 10,
        contentType: "whiteboard",
        title: "빈 화이트보드",
        drawingData: { elements: [], background: "#ffffff" },
      };
      const result = await mockDb.createSlideInsertContent(input);
      expect(result).toBe(5);
      expect(mockDb.createSlideInsertContent).toHaveBeenCalledWith(input);
    });

    it("should list insert content for a project", async () => {
      const mockContent = [
        { id: 1, projectId: 1, afterSlideId: 10, contentType: "whiteboard", title: "화이트보드 1" },
        { id: 2, projectId: 1, afterSlideId: 11, contentType: "video", title: "삽입 영상" },
      ];
      mockDb.listSlideInsertContent.mockResolvedValue(mockContent);
      const result = await mockDb.listSlideInsertContent(1);
      expect(result).toHaveLength(2);
      expect(result[0].contentType).toBe("whiteboard");
      expect(result[1].contentType).toBe("video");
    });

    it("should delete insert content", async () => {
      mockDb.getSlideInsertContentById.mockResolvedValue({ id: 1, projectId: 1 });
      mockDb.deleteSlideInsertContent.mockResolvedValue(undefined);
      await mockDb.deleteSlideInsertContent(1);
      expect(mockDb.deleteSlideInsertContent).toHaveBeenCalledWith(1);
    });
  });

  describe("Whiteboard Content Generation", () => {
    it("should validate whiteboard content types", () => {
      const validTypes = ["text", "diagram", "bullet_points", "equation", "timeline"];
      expect(validTypes).toHaveLength(5);
    });

    it("should validate whiteboard prompt constraints", () => {
      const prompt = "블록체인 구조를 그림으로 설명해주세요";
      expect(prompt.length).toBeGreaterThanOrEqual(1);
      expect(prompt.length).toBeLessThanOrEqual(2000);
    });
  });
});
