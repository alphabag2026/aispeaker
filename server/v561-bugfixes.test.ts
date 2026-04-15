import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("v5.6.1 - Bug Fixes & Improvements", () => {
  // 1. D-ID Video URL Permanent Storage Fix
  describe("D-ID Video URL Permanent Storage", () => {
    it("should save D-ID video to S3 in avatar.generate route", () => {
      const routersContent = fs.readFileSync(
        path.join(__dirname, "routers.ts"),
        "utf-8"
      );
      // Check that avatar.generate downloads and saves D-ID video permanently
      expect(routersContent).toContain("Download D-ID video and save to S3");
      expect(routersContent).toContain("avatar-video/");
      expect(routersContent).toContain("Video saved permanently");
    });

    it("should save pipeline avatar videos to S3 in pipeline.start", () => {
      const routersContent = fs.readFileSync(
        path.join(__dirname, "routers.ts"),
        "utf-8"
      );
      // Check that pipeline.start saves avatar videos locally
      expect(routersContent).toContain("pipeline/${pipelineId}/avatar-section");
      expect(routersContent).toContain("video saved locally");
    });
  });

  // 2. Gemini Image Generation Model Fix
  describe("Gemini Image Generation Model Update", () => {
    it("should use gemini-2.5-flash-image model instead of deprecated one", () => {
      const imageGenContent = fs.readFileSync(
        path.join(__dirname, "_core/imageGeneration.ts"),
        "utf-8"
      );
      expect(imageGenContent).toContain("gemini-2.5-flash-image");
      expect(imageGenContent).not.toContain("gemini-2.0-flash-preview-image-generation");
    });
  });

  // 3. Avatar Video in Preview Player
  describe("Avatar Video in Preview Player", () => {
    it("should include avatarVideoUrl in pipeline.preview sections", () => {
      const routersContent = fs.readFileSync(
        path.join(__dirname, "routers.ts"),
        "utf-8"
      );
      expect(routersContent).toContain("avatarVideoUrl: avatarVideoUrls[idx] || null");
    });

    it("should parse avatarVideoUrls in pipeline.preview", () => {
      const routersContent = fs.readFileSync(
        path.join(__dirname, "routers.ts"),
        "utf-8"
      );
      expect(routersContent).toContain(
        "p.avatarVideoUrls ? JSON.parse(p.avatarVideoUrls as string) : []"
      );
    });

    it("should render video element in PreviewPlayer when avatarVideoUrl exists", () => {
      const previewContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/PreviewPlayer.tsx"),
        "utf-8"
      );
      expect(previewContent).toContain("currentSec.avatarVideoUrl");
      expect(previewContent).toContain("<video");
      expect(previewContent).toContain("autoPlay={isPlaying}");
    });
  });

  // 4. PipelineDashboard Avatar Engine Display
  describe("PipelineDashboard Avatar Engine Display", () => {
    it("should show avatar engine label in pipeline history", () => {
      const dashContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/PipelineDashboard.tsx"),
        "utf-8"
      );
      expect(dashContent).toContain("engineLabel");
      expect(dashContent).toContain("Kling AI");
      expect(dashContent).toContain("Google Veo");
      expect(dashContent).toContain("HeyGen");
      expect(dashContent).toContain("D-ID");
    });

    it("should parse avatarVideoUrls in pipeline list items", () => {
      const dashContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/PipelineDashboard.tsx"),
        "utf-8"
      );
      expect(dashContent).toContain("avatarVideoUrls");
      expect(dashContent).toContain("hasAvatarVideos");
    });
  });

  // 5. GEMINI_API_KEY Configuration
  describe("GEMINI_API_KEY Configuration", () => {
    it("should have GEMINI_API_KEY in env.ts", () => {
      const envContent = fs.readFileSync(
        path.join(__dirname, "_core/env.ts"),
        "utf-8"
      );
      expect(envContent).toContain("geminiApiKey");
      expect(envContent).toContain("GEMINI_API_KEY");
    });

    it("should have GEMINI_API_KEY set in environment", () => {
      const key = process.env.GEMINI_API_KEY;
      expect(key).toBeTruthy();
    });
  });

  // 6. Veo model configuration
  describe("Google Veo Configuration", () => {
    it("should use correct Veo model in veo.ts", () => {
      const veoContent = fs.readFileSync(
        path.join(__dirname, "veo.ts"),
        "utf-8"
      );
      expect(veoContent).toContain("veo-3.1-generate-preview");
      expect(veoContent).toContain("isVeoConfigured");
    });
  });
});
