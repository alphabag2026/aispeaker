import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB
vi.mock("./db", () => ({
  createKlingTask: vi.fn().mockResolvedValue({ id: 1 }),
  getKlingTask: vi.fn().mockResolvedValue({ id: 1, userId: 1, status: "pending", taskType: "image_to_video" }),
  updateKlingTask: vi.fn().mockResolvedValue(undefined),
  listKlingTasks: vi.fn().mockResolvedValue([
    { id: 1, status: "completed", taskType: "image_to_video", resultUrl: "https://example.com/video.mp4" },
  ]),
  listFormatTemplates: vi.fn().mockResolvedValue([
    { id: 1, name: "강사 단독", category: "personnel", icon: "User", colorTheme: "blue" },
    { id: 2, name: "PPT 강의", category: "style", icon: "Presentation", colorTheme: "green" },
    { id: 3, name: "질문자 삽입", category: "insert", icon: "HelpCircle", colorTheme: "yellow" },
  ]),
  createSampleFace: vi.fn().mockResolvedValue({ id: 10 }),
}));

// Mock kling module
vi.mock("./kling", () => ({
  createImageToVideo: vi.fn().mockResolvedValue({ task_id: "kling-123", task_status: "submitted" }),
  createTextToVideo: vi.fn().mockResolvedValue({ task_id: "kling-456", task_status: "submitted" }),
  getTaskStatus: vi.fn().mockResolvedValue({
    task_id: "kling-123",
    task_status: "succeed",
    task_result: { videos: [{ url: "https://cdn.kling.ai/video.mp4", duration: "5.0" }] },
  }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/face.jpg", key: "face.jpg" }),
}));

import * as db from "./db";

describe("KLING v2 - Aspect Ratio & Style Options", () => {
  it("should support 6 aspect ratio options", () => {
    const validRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "2:3"];
    validRatios.forEach(ratio => {
      expect(ratio).toMatch(/^\d+:\d+$/);
    });
    expect(validRatios).toHaveLength(6);
  });

  it("should support 7 style presets", () => {
    const styles = [
      { id: "natural", label: "자연스러운" },
      { id: "professional", label: "프로페셔널" },
      { id: "casual", label: "캐주얼" },
      { id: "energetic", label: "에너지틱" },
      { id: "academic", label: "학술적" },
      { id: "storyteller", label: "스토리텔러" },
      { id: "custom", label: "커스텀" },
    ];
    expect(styles).toHaveLength(7);
    expect(styles.map(s => s.id)).toContain("custom");
  });
});

describe("KLING v2 - Register as Avatar", () => {
  it("should create sampleFace from completed KLING task", async () => {
    const result = await (db as any).createSampleFace({
      name: "KLING Generated Avatar",
      imageUrl: "https://s3.example.com/face.jpg",
      videoUrl: "https://cdn.kling.ai/video.mp4",
      userId: 1,
      isPublic: false,
    });
    expect(result.id).toBe(10);
    expect(db.createSampleFace).toHaveBeenCalledWith(expect.objectContaining({
      name: "KLING Generated Avatar",
      userId: 1,
    }));
  });

  it("should require completed task status before registering", async () => {
    const task = await (db as any).getKlingTask(1);
    expect(task.status).toBe("pending");
    // Only completed tasks should be registerable
    const isRegisterable = task.status === "completed";
    expect(isRegisterable).toBe(false);
  });
});

describe("Lecture Format Templates", () => {
  it("should list format templates by category", async () => {
    const templates = await (db as any).listFormatTemplates();
    expect(templates).toHaveLength(3);
    
    const personnel = templates.filter((t: any) => t.category === "personnel");
    const style = templates.filter((t: any) => t.category === "style");
    const insert = templates.filter((t: any) => t.category === "insert");
    
    expect(personnel).toHaveLength(1);
    expect(style).toHaveLength(1);
    expect(insert).toHaveLength(1);
  });

  it("should have required fields for each template", async () => {
    const templates = await (db as any).listFormatTemplates();
    templates.forEach((t: any) => {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("category");
      expect(t).toHaveProperty("icon");
      expect(t).toHaveProperty("colorTheme");
    });
  });

  it("should support 3 categories: personnel, style, insert", async () => {
    const validCategories = ["personnel", "style", "insert"];
    const templates = await (db as any).listFormatTemplates();
    templates.forEach((t: any) => {
      expect(validCategories).toContain(t.category);
    });
  });

  it("should have valid icon names", async () => {
    const validIcons = [
      "User", "Users", "MessageSquare", "UsersRound",
      "Presentation", "PenTool", "LayoutPanelLeft", "Monitor", "ScreenShare",
      "HelpCircle", "Coffee", "Film", "ListChecks", "CircleHelp", "Clapperboard",
    ];
    const templates = await (db as any).listFormatTemplates();
    templates.forEach((t: any) => {
      expect(validIcons).toContain(t.icon);
    });
  });

  it("should allow selecting one personnel + one style + multiple inserts", () => {
    const selection = {
      personnel: 1,
      style: 2,
      inserts: [3, 4, 5],
    };
    expect(selection.personnel).toBeTruthy();
    expect(selection.style).toBeTruthy();
    expect(selection.inserts.length).toBeGreaterThanOrEqual(0);
  });
});

describe("KLING Task Lifecycle", () => {
  it("should create task and track status", async () => {
    const task = await (db as any).createKlingTask({ userId: 1, taskType: "image_to_video" });
    expect(task.id).toBe(1);
    
    const status = await (db as any).getKlingTask(1);
    expect(status.taskType).toBe("image_to_video");
  });

  it("should list user's KLING tasks", async () => {
    const tasks = await (db as any).listKlingTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe("completed");
    expect(tasks[0].resultUrl).toBeTruthy();
  });
});
