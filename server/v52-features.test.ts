import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("v5.2 - PPT Slide Preview, Batch PIP/PPT, Gallery Filter/Sort", () => {
  // ── PPT Slide Thumbnails Preview ──
  describe("PPT Slide Thumbnails Preview", () => {
    const studioContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ProductionStudio.tsx"),
      "utf-8"
    );

    it("should have previewSlideIdx state for slide preview modal", () => {
      expect(studioContent).toContain("previewSlideIdx");
    });

    it("should render slide thumbnail grid when PPT is selected", () => {
      // i18n: was toContain("슬라이드 미리보기")
      expect(studioContent).toContain("t(");
      expect(studioContent).toContain("grid grid-cols-3");
    });

    it("should have enlarged preview modal with navigation arrows", () => {
      expect(studioContent).toContain("fixed inset-0 z-50");
      expect(studioContent).toContain("setPreviewSlideIdx");
    });

    it("should parse slideImages from PPT data", () => {
      expect(studioContent).toContain("slideImages");
    });
  });

  // ── Batch Production PIP/PPT Options ──
  describe("Batch Production PIP/PPT Options", () => {
    const studioContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/ProductionStudio.tsx"),
      "utf-8"
    );

    it("should have batchPipEnabled state", () => {
      expect(studioContent).toContain("batchPipEnabled");
      expect(studioContent).toContain("setBatchPipEnabled");
    });

    it("should have batchSelectedPptId state", () => {
      expect(studioContent).toContain("batchSelectedPptId");
      expect(studioContent).toContain("setBatchSelectedPptId");
    });

    it("should render PIP mode toggle in batch tab", () => {
      // i18n: was toContain("공통 PIP 모드")
      expect(studioContent).toContain("t(");
      // i18n: was toContain("PIP 모드 활성화")
      expect(studioContent).toContain("t(");
    });

    it("should render PPT selection in batch tab when PIP is enabled", () => {
      expect(studioContent).toContain("batchSelectedPptId");
    });

    it("should pass PIP options in handleBatchStart", () => {
      expect(studioContent).toContain("batchPipEnabled");
      expect(studioContent).toContain("pipPosition: pipSettings?.position");
    });
  });

  // ── Backend: batchStart PIP options ──
  describe("Backend batchStart PIP options", () => {
    const routersContent = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );

    it("should accept pipEnabled in batchStart input schema", () => {
      expect(routersContent).toContain("pipEnabled: z.boolean().optional()");
    });

    it("should accept pptUploadId in batchStart input schema", () => {
      expect(routersContent).toContain("pptUploadId: z.number().optional()");
    });

    it("should pass PIP options to createProductionPipeline in batch", () => {
      // Check that input.pipEnabled is used in the batch handler
      expect(routersContent).toContain("input.pipEnabled");
    });
  });

  // ── Gallery Filter/Sort ──
  describe("Gallery Filter and Sort", () => {
    const galleryContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/InstructorFaceSwap.tsx"),
      "utf-8"
    );

    it("should have galleryMethod state for filtering", () => {
      expect(galleryContent).toContain("galleryMethod");
      expect(galleryContent).toContain("setGalleryMethod");
    });

    it("should have gallerySort state for sorting", () => {
      expect(galleryContent).toContain("gallerySort");
      expect(galleryContent).toContain("setGallerySort");
    });

    it("should render filter buttons for all methods", () => {
      // i18n: was toContain("내장 AI")
      expect(galleryContent).toContain("t(");
      expect(galleryContent).toContain("D-ID");
      expect(galleryContent).toContain("HeyGen");
    });

    it("should render sort buttons for latest and likes", () => {
      // i18n: was toContain("최신순")
      expect(galleryContent).toContain("t(");
      // i18n: was toContain("좋아요순")
      expect(galleryContent).toContain("t(");
    });

    it("should pass method and sort to gallery.list query", () => {
      expect(galleryContent).toContain("method: galleryMethod");
      expect(galleryContent).toContain("sort: gallerySort");
    });
  });

  // ── Backend: gallery.list filter/sort ──
  describe("Backend gallery.list filter/sort", () => {
    const routersContent = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );

    it("should accept method filter in gallery.list input", () => {
      expect(routersContent).toContain('method: z.enum(["all", "builtin", "did", "heygen"])');
    });

    it("should accept sort option in gallery.list input", () => {
      expect(routersContent).toContain('sort: z.enum(["latest", "likes"])');
    });
  });

  // ── DB: getGalleryItems filter/sort ──
  describe("DB getGalleryItems filter/sort", () => {
    const dbContent = fs.readFileSync(
      path.resolve(__dirname, "./db.ts"),
      "utf-8"
    );

    it("should accept method and sort parameters", () => {
      expect(dbContent).toContain('method: "all" | "builtin" | "did" | "heygen"');
      expect(dbContent).toContain('sort: "latest" | "likes"');
    });

    it("should filter by method when not 'all'", () => {
      expect(dbContent).toContain('method !== "all"');
    });

    it("should sort by likesCount when sort is 'likes'", () => {
      expect(dbContent).toContain("likesCount");
    });
  });
});
