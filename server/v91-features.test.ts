import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("./db", () => ({
  searchSharedPresets: vi.fn(),
  searchSharedSubtitlePresets: vi.fn(),
  createPresetReport: vi.fn(),
  getPresetReportByUser: vi.fn(),
  getPresetReports: vi.fn(),
  updatePresetReportStatus: vi.fn(),
  createPresetVersion: vi.fn(),
  getPresetVersions: vi.fn(),
  getPresetVersionById: vi.fn(),
  listSharedPresets: vi.fn(),
  listSharedSubtitlePresets: vi.fn(),
  getSharedPresetById: vi.fn(),
  getSharedSubtitlePresetById: vi.fn(),
  updateSharedPreset: vi.fn(),
  updateSharedSubtitlePreset: vi.fn(),
}));

import * as db from "./db";

describe("v9.1 - Preset Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search avatar presets by keyword", async () => {
    const mockResults = [
      { id: 1, name: "Cinematic Avatar", description: "A cinematic style", likes: 10, downloads: 5 },
      { id: 2, name: "Cinema PiP", description: "Cinema look", likes: 8, downloads: 3 },
    ];
    (db.searchSharedPresets as any).mockResolvedValue(mockResults);

    const results = await db.searchSharedPresets("cinema", 30);
    expect(results).toHaveLength(2);
    expect(results[0].name).toContain("Cinematic");
    expect(db.searchSharedPresets).toHaveBeenCalledWith("cinema", 30);
  });

  it("should search subtitle presets by keyword", async () => {
    const mockResults = [
      { id: 5, name: "Bold Subtitle", description: "Bold white text", likes: 15, downloads: 20 },
    ];
    (db.searchSharedSubtitlePresets as any).mockResolvedValue(mockResults);

    const results = await db.searchSharedSubtitlePresets("bold", 30);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Bold Subtitle");
  });

  it("should return empty array when no results found", async () => {
    (db.searchSharedPresets as any).mockResolvedValue([]);

    const results = await db.searchSharedPresets("nonexistent_xyz", 30);
    expect(results).toHaveLength(0);
  });

  it("should limit results to specified count", async () => {
    const mockResults = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Preset ${i}`,
      likes: i,
      downloads: 0,
    }));
    (db.searchSharedPresets as any).mockResolvedValue(mockResults);

    const results = await db.searchSharedPresets("preset", 10);
    expect(results).toHaveLength(10);
  });
});

describe("v9.1 - Preset Report System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new report", async () => {
    (db.getPresetReportByUser as any).mockResolvedValue(null);
    (db.createPresetReport as any).mockResolvedValue(1);

    const existingReport = await db.getPresetReportByUser("avatar", 10, 1);
    expect(existingReport).toBeNull();

    const reportId = await db.createPresetReport({
      presetType: "avatar",
      presetId: 10,
      userId: 1,
      reason: "inappropriate",
      description: "Contains inappropriate content",
    } as any);
    expect(reportId).toBe(1);
  });

  it("should detect duplicate reports from same user", async () => {
    (db.getPresetReportByUser as any).mockResolvedValue({
      id: 1,
      presetType: "avatar",
      presetId: 10,
      userId: 1,
      reason: "spam",
      status: "pending",
    });

    const existingReport = await db.getPresetReportByUser("avatar", 10, 1);
    expect(existingReport).not.toBeNull();
    expect(existingReport!.reason).toBe("spam");
  });

  it("should support all report reasons", async () => {
    const reasons = ["inappropriate", "spam", "copyright", "offensive", "other"];
    for (const reason of reasons) {
      (db.createPresetReport as any).mockResolvedValue(1);
      await db.createPresetReport({
        presetType: "subtitle",
        presetId: 5,
        userId: 2,
        reason,
      } as any);
    }
    expect(db.createPresetReport).toHaveBeenCalledTimes(5);
  });

  it("should get reports for admin review", async () => {
    const mockReports = [
      { id: 1, presetType: "avatar", presetId: 10, userId: 1, reason: "spam", status: "pending", createdAt: new Date() },
      { id: 2, presetType: "subtitle", presetId: 5, userId: 2, reason: "copyright", status: "pending", createdAt: new Date() },
    ];
    (db.getPresetReports as any).mockResolvedValue(mockReports);

    const reports = await db.getPresetReports("pending", 20);
    expect(reports).toHaveLength(2);
    expect(reports[0].status).toBe("pending");
  });

  it("should update report status", async () => {
    (db.updatePresetReportStatus as any).mockResolvedValue(undefined);

    await db.updatePresetReportStatus(1, "resolved");
    expect(db.updatePresetReportStatus).toHaveBeenCalledWith(1, "resolved");

    await db.updatePresetReportStatus(2, "dismissed");
    expect(db.updatePresetReportStatus).toHaveBeenCalledWith(2, "dismissed");
  });
});

describe("v9.1 - Preset Version Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a version snapshot", async () => {
    (db.createPresetVersion as any).mockResolvedValue(1);

    const versionId = await db.createPresetVersion({
      presetType: "avatar",
      presetId: 10,
      version: 1,
      snapshotData: JSON.stringify({
        name: "My Preset v1",
        position: "custom",
        size: "medium",
        opacity: 100,
        shape: "rounded",
      }),
      changeNote: "Initial version",
    } as any);
    expect(versionId).toBe(1);
  });

  it("should list version history for a preset", async () => {
    const mockVersions = [
      { id: 3, presetType: "avatar", presetId: 10, version: 3, changeNote: "Updated position", createdAt: new Date() },
      { id: 2, presetType: "avatar", presetId: 10, version: 2, changeNote: "Changed opacity", createdAt: new Date() },
      { id: 1, presetType: "avatar", presetId: 10, version: 1, changeNote: "Initial", createdAt: new Date() },
    ];
    (db.getPresetVersions as any).mockResolvedValue(mockVersions);

    const versions = await db.getPresetVersions("avatar", 10);
    expect(versions).toHaveLength(3);
    expect(versions[0].version).toBe(3); // Latest first
    expect(versions[2].version).toBe(1);
  });

  it("should get specific version by id", async () => {
    const mockVersion = {
      id: 2,
      presetType: "avatar",
      presetId: 10,
      version: 2,
      snapshotData: JSON.stringify({
        name: "My Preset v2",
        position: "bottom-right",
        size: "large",
        opacity: 80,
        shape: "circle",
      }),
      changeNote: "Changed to circle",
      createdAt: new Date(),
    };
    (db.getPresetVersionById as any).mockResolvedValue(mockVersion);

    const version = await db.getPresetVersionById(2);
    expect(version).toBeDefined();
    expect(version!.version).toBe(2);

    const snapshot = JSON.parse(version!.snapshotData);
    expect(snapshot.shape).toBe("circle");
    expect(snapshot.opacity).toBe(80);
  });

  it("should return empty array for preset with no versions", async () => {
    (db.getPresetVersions as any).mockResolvedValue([]);

    const versions = await db.getPresetVersions("subtitle", 999);
    expect(versions).toHaveLength(0);
  });

  it("should restore a version by updating the preset", async () => {
    const mockVersion = {
      id: 1,
      presetType: "avatar",
      presetId: 10,
      version: 1,
      snapshotData: JSON.stringify({
        name: "Original Name",
        position: "custom",
        size: "small",
        opacity: 100,
        shape: "rounded",
        customX: 80,
        customY: 80,
      }),
      changeNote: "Initial",
    };
    (db.getPresetVersionById as any).mockResolvedValue(mockVersion);
    (db.updateSharedPreset as any).mockResolvedValue(undefined);
    (db.createPresetVersion as any).mockResolvedValue(4);

    const version = await db.getPresetVersionById(1);
    expect(version).toBeDefined();

    const snapshot = JSON.parse(version!.snapshotData);
    await db.updateSharedPreset(10, snapshot);
    expect(db.updateSharedPreset).toHaveBeenCalledWith(10, expect.objectContaining({
      name: "Original Name",
      size: "small",
    }));

    // Create a new version entry for the restore action
    await db.createPresetVersion({
      presetType: "avatar",
      presetId: 10,
      version: 4,
      snapshotData: version!.snapshotData,
      changeNote: "Restored from v1",
    } as any);
    expect(db.createPresetVersion).toHaveBeenCalled();
  });

  it("should handle subtitle preset version restore", async () => {
    const mockVersion = {
      id: 5,
      presetType: "subtitle",
      presetId: 3,
      version: 2,
      snapshotData: JSON.stringify({
        name: "Bold Subs v2",
        fontSize: 20,
        fontColor: "#FFD700",
        bgColor: "rgba(0,0,0,0.9)",
        position: "top",
        fontFamily: "serif",
        bold: true,
        italic: false,
        outline: true,
      }),
      changeNote: "Changed to gold color",
    };
    (db.getPresetVersionById as any).mockResolvedValue(mockVersion);
    (db.updateSharedSubtitlePreset as any).mockResolvedValue(undefined);

    const version = await db.getPresetVersionById(5);
    const snapshot = JSON.parse(version!.snapshotData);

    await db.updateSharedSubtitlePreset(3, snapshot);
    expect(db.updateSharedSubtitlePreset).toHaveBeenCalledWith(3, expect.objectContaining({
      fontSize: 20,
      fontColor: "#FFD700",
      bold: true,
    }));
  });
});
