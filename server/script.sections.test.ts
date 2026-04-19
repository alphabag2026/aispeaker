import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock user context
const mockUser = {
  id: 999,
  openId: "test-open-id",
  name: "Test User",
  email: "test@example.com",
  role: "user" as const,
  avatarUrl: null,
  platformRole: "instructor" as const,
};

// Mock DB functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getLectureScriptById: vi.fn(),
    updateLectureScript: vi.fn(),
  };
});

import { getLectureScriptById, updateLectureScript } from "./db";

const mockGetScript = vi.mocked(getLectureScriptById);
const mockUpdateScript = vi.mocked(updateLectureScript);

describe("Script Section Management", () => {
  const baseSections = JSON.stringify([
    { title: "Intro", content: "Hello world", durationSec: 30, slideNotes: "" },
    { title: "Main", content: "Main content here", durationSec: 120, slideNotes: "slide 1" },
    { title: "Outro", content: "Goodbye", durationSec: 30, slideNotes: "" },
  ]);

  const mockScript = {
    id: 1,
    userId: 999,
    title: "Test Script",
    sections: baseSections,
    language: "ko",
    category: "Web3",
    difficulty: "beginner",
    targetDurationMin: 10,
    status: "completed",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScript.mockResolvedValue(mockScript as any);
    mockUpdateScript.mockResolvedValue(undefined as any);
  });

  describe("addSection", () => {
    it("should add a section after specified index", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.addSection({
        scriptId: 1,
        afterIndex: 0,
        title: "New Section",
        content: "New content",
        durationSec: 60,
      });

      expect(mockUpdateScript).toHaveBeenCalledTimes(1);
      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(4);
      expect(updatedSections[0].title).toBe("Intro");
      expect(updatedSections[1].title).toBe("New Section");
      expect(updatedSections[1].content).toBe("New content");
      expect(updatedSections[1].durationSec).toBe(60);
      expect(updatedSections[2].title).toBe("Main");
      expect(updatedSections[3].title).toBe("Outro");
    });

    it("should append a section at the end when afterIndex is -1", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.addSection({
        scriptId: 1,
        afterIndex: -1,
        title: "Appended Section",
        content: "Appended content",
        durationSec: 15,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(4);
      expect(updatedSections[3].title).toBe("Appended Section");
      expect(updatedSections[0].title).toBe("Intro");
    });

    it("should add a section at the end", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.addSection({
        scriptId: 1,
        afterIndex: 2,
        title: "Final Section",
        durationSec: 45,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(4);
      expect(updatedSections[3].title).toBe("Final Section");
      expect(updatedSections[3].durationSec).toBe(45);
    });

    it("should use default values when title/content not provided", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.addSection({
        scriptId: 1,
        afterIndex: 0,
        durationSec: 60,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections[1].title).toBeTruthy(); // default title like '섹션 4'
      expect(updatedSections[1].content).toBe("");
    });
  });

  describe("deleteSection", () => {
    it("should delete a section by index", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.deleteSection({
        scriptId: 1,
        sectionIndex: 1,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(2);
      expect(updatedSections[0].title).toBe("Intro");
      expect(updatedSections[1].title).toBe("Outro");
    });

    it("should delete the first section", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.deleteSection({
        scriptId: 1,
        sectionIndex: 0,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(2);
      expect(updatedSections[0].title).toBe("Main");
    });

    it("should delete the last section", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await caller.script.deleteSection({
        scriptId: 1,
        sectionIndex: 2,
      });

      const updateCall = mockUpdateScript.mock.calls[0];
      const updatedSections = JSON.parse(updateCall[1].sections!);
      
      expect(updatedSections).toHaveLength(2);
      expect(updatedSections[1].title).toBe("Main");
    });

    it("should reject deleting the last remaining section", async () => {
      mockGetScript.mockResolvedValue({
        ...mockScript,
        sections: JSON.stringify([{ title: "Only", content: "Only section", durationSec: 60, slideNotes: "" }]),
      } as any);

      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await expect(
        caller.script.deleteSection({ scriptId: 1, sectionIndex: 0 })
      ).rejects.toThrow();
    });

    it("should reject invalid section index", async () => {
      const caller = appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any });
      
      await expect(
        caller.script.deleteSection({ scriptId: 1, sectionIndex: 10 })
      ).rejects.toThrow();
    });
  });
});
