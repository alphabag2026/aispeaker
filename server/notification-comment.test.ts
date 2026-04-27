import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("./db", () => ({
  createNotification: vi.fn().mockResolvedValue(1),
  listNotifications: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, type: "reply", title: "새 답글", message: "테스트 메시지", link: "/studio", isRead: false, createdAt: new Date() },
  ]),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(3),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  addPresetComment: vi.fn().mockResolvedValue(1),
  listPresetComments: vi.fn().mockResolvedValue([
    { comment: { id: 1, presetType: "avatar", presetId: 1, userId: 1, content: "좋은 프리셋!", rating: 5, parentId: null, createdAt: new Date() }, userName: "테스트유저" },
  ]),
  getPresetCommentCount: vi.fn().mockResolvedValue(5),
  getPresetAverageRating: vi.fn().mockResolvedValue({ average: 4.5, count: 3 }),
  deletePresetComment: vi.fn().mockResolvedValue(undefined),
  listPresetReportsAdmin: vi.fn().mockResolvedValue([
    { report: { id: 1, presetType: "avatar", presetId: 1, reason: "spam", status: "pending", createdAt: new Date() }, reporterName: "신고자" },
  ]),
  getPresetReportCount: vi.fn().mockResolvedValue(2),
  updatePresetReportStatus: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

describe("Notification System (v9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a notification", async () => {
    const result = await db.createNotification({
      userId: 1,
      type: "reply",
      title: "새 답글",
      message: "누군가 답글을 달았습니다",
      link: "/studio?presetType=avatar&presetId=1",
    } as any);
    expect(db.createNotification).toHaveBeenCalledOnce();
    expect(result).toBe(1);
  });

  it("should list notifications for a user", async () => {
    const result = await db.listNotifications(1, 20, 0);
    expect(db.listNotifications).toHaveBeenCalledWith(1, 20, 0);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("reply");
  });

  it("should get unread notification count", async () => {
    const count = await db.getUnreadNotificationCount(1);
    expect(count).toBe(3);
  });

  it("should mark a notification as read", async () => {
    await db.markNotificationRead(1, 1);
    expect(db.markNotificationRead).toHaveBeenCalledWith(1, 1);
  });

  it("should mark all notifications as read", async () => {
    await db.markAllNotificationsRead(1);
    expect(db.markAllNotificationsRead).toHaveBeenCalledWith(1);
  });
});

describe("Preset Comment System (v9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a comment", async () => {
    const result = await db.addPresetComment({
      presetType: "avatar",
      presetId: 1,
      userId: 1,
      content: "좋은 프리셋!",
      rating: 5,
      parentId: null,
    } as any);
    expect(db.addPresetComment).toHaveBeenCalledOnce();
    expect(result).toBe(1);
  });

  it("should list comments for a preset", async () => {
    const result = await db.listPresetComments("avatar", 1, 20, 0);
    expect(result).toHaveLength(1);
    expect(result[0].comment.content).toBe("좋은 프리셋!");
    expect(result[0].userName).toBe("테스트유저");
  });

  it("should get comment count", async () => {
    const count = await db.getPresetCommentCount("avatar", 1);
    expect(count).toBe(5);
  });

  it("should get average rating", async () => {
    const rating = await db.getPresetAverageRating("avatar", 1);
    expect(rating).toEqual({ average: 4.5, count: 3 });
  });

  it("should delete a comment", async () => {
    await db.deletePresetComment(1, 1);
    expect(db.deletePresetComment).toHaveBeenCalledWith(1, 1);
  });
});

describe("Admin Report Management (v9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list reports for admin", async () => {
    const result = await db.listPresetReportsAdmin("pending", 20, 0);
    expect(result).toHaveLength(1);
    expect(result[0].report.reason).toBe("spam");
    expect(result[0].reporterName).toBe("신고자");
  });

  it("should get report count", async () => {
    const count = await db.getPresetReportCount("pending");
    expect(count).toBe(2);
  });

  it("should update report status", async () => {
    await db.updatePresetReportStatus(1, "blocked", 99);
    expect(db.updatePresetReportStatus).toHaveBeenCalledWith(1, "blocked", 99);
  });
});
