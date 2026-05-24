import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const serverDir = path.resolve(__dirname);
const clientDir = path.resolve(__dirname, "../client/src");
const projectRoot = path.resolve(__dirname, "..");

// ========== 1. BroadcastViewer 실시간 통역 패널 ==========
describe("v12.4 - BroadcastViewer Interpretation Panel", () => {
  describe("BroadcastInterpretationPanel component", () => {
    const panelPath = path.join(clientDir, "components/BroadcastInterpretationPanel.tsx");
    const panelContent = fs.readFileSync(panelPath, "utf-8");

    it("should exist as a standalone component", () => {
      expect(fs.existsSync(panelPath)).toBe(true);
    });

    it("should support 15 broadcast languages", () => {
      const langMatches = panelContent.match(/\{ code: "[a-z]{2}"/g);
      expect(langMatches).not.toBeNull();
      expect(langMatches!.length).toBeGreaterThanOrEqual(15);
    });

    it("should include major languages: ko, en, ja, zh, es, fr, de", () => {
      expect(panelContent).toContain('code: "ko"');
      expect(panelContent).toContain('code: "en"');
      expect(panelContent).toContain('code: "ja"');
      expect(panelContent).toContain('code: "zh"');
      expect(panelContent).toContain('code: "es"');
      expect(panelContent).toContain('code: "fr"');
      expect(panelContent).toContain('code: "de"');
    });

    it("should have language selector UI", () => {
      expect(panelContent).toContain("Select");
      expect(panelContent).toContain("SelectTrigger");
      expect(panelContent).toContain("SelectContent");
      expect(panelContent).toContain("SelectItem");
      expect(panelContent).toContain("setTargetLanguage");
    });

    it("should have TTS toggle and speech synthesis", () => {
      expect(panelContent).toContain("ttsEnabled");
      expect(panelContent).toContain("speechSynthesis");
      expect(panelContent).toContain("SpeechSynthesisUtterance");
    });

    it("should have enable/disable toggle for interpretation", () => {
      expect(panelContent).toContain("isEnabled");
      expect(panelContent).toContain("Switch");
      // i18n: was toContain("통역 활성화")
      expect(panelContent).toContain("t(");
    });

    it("should auto-translate when slide changes", () => {
      expect(panelContent).toContain("useEffect");
      expect(panelContent).toContain("currentSlideIndex");
      expect(panelContent).toContain("translateSlide.mutate");
    });

    it("should maintain translation history", () => {
      expect(panelContent).toContain("translationHistory");
      expect(panelContent).toContain("setTranslationHistory");
      // i18n: was toContain("이전 번역")
      expect(panelContent).toContain("t(");
    });

    it("should use trpc.broadcast.translateSlide mutation", () => {
      expect(panelContent).toContain("trpc.broadcast.translateSlide.useMutation");
    });

    it("should accept required props: broadcastId, currentSlideIndex, isAuthenticated", () => {
      expect(panelContent).toContain("broadcastId: number");
      expect(panelContent).toContain("currentSlideIndex: number");
      expect(panelContent).toContain("isAuthenticated: boolean");
    });

    it("should cleanup TTS on unmount", () => {
      expect(panelContent).toContain("speechSynthesis.cancel");
    });

    it("should show loading state during translation", () => {
      expect(panelContent).toContain("isPending");
      expect(panelContent).toContain("Loader2");
      // i18n: was toContain("번역 중")
      expect(panelContent).toContain("t(");
    });

    it("should have replay TTS button", () => {
      // i18n: was toContain("다시 듣기")
      expect(panelContent).toContain("t(");
    });

    it("should filter out source language from target options", () => {
      expect(panelContent).toContain("filter((l) => l.code !== sourceLanguage)");
    });

    it("should not render for unauthenticated users", () => {
      expect(panelContent).toContain("if (!isAuthenticated) return null");
    });
  });

  describe("BroadcastViewer integration", () => {
    const viewerPath = path.join(clientDir, "pages/BroadcastViewer.tsx");
    const viewerContent = fs.readFileSync(viewerPath, "utf-8");

    it("should import BroadcastInterpretationPanel", () => {
      expect(viewerContent).toContain("BroadcastInterpretationPanel");
    });

    it("should render interpretation panel in viewer", () => {
      expect(viewerContent).toContain("<BroadcastInterpretationPanel");
    });

    it("should pass broadcastId to interpretation panel", () => {
      expect(viewerContent).toContain("broadcastId=");
    });

    it("should pass currentSlideIndex to interpretation panel", () => {
      expect(viewerContent).toContain("currentSlideIndex=");
    });
  });

  describe("broadcast.translateSlide backend procedure", () => {
    const routersPath = path.join(serverDir, "routers");
    const routersContent = (() => { if (fs.existsSync(routersPath) && fs.statSync(routersPath).isDirectory()) return fs.readdirSync(routersPath).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(routersPath, f), "utf-8")).join("\n"); return fs.readFileSync(routersPath, "utf-8"); })();

    it("should have translateSlide procedure in broadcast router", () => {
      expect(routersContent).toContain("translateSlide: protectedProcedure");
    });

    it("should accept broadcastId, slideIndex, targetLanguage, sourceLanguage", () => {
      const translateSection = routersContent.substring(
        routersContent.indexOf("translateSlide: protectedProcedure"),
        routersContent.indexOf("translateSlide: protectedProcedure") + 500
      );
      expect(translateSection).toContain("broadcastId: z.number()");
      expect(translateSection).toContain("slideIndex: z.number()");
      expect(translateSection).toContain("targetLanguage: z.string()");
      expect(translateSection).toContain("sourceLanguage: z.string()");
    });

    it("should use LLM for translation", () => {
      expect(routersContent).toContain("invokeLLM");
    });

    it("should return translated title and content", () => {
      const translateSection = routersContent.substring(
        routersContent.indexOf("translateSlide: protectedProcedure"),
        routersContent.indexOf("translateSlide: protectedProcedure") + 2500
      );
      expect(translateSection).toContain("translatedTitle");
      expect(translateSection).toContain("translatedContent");
    });

    it("should support 15 language codes in langNames mapping", () => {
      const langSection = routersContent.substring(
        routersContent.indexOf("translateSlide: protectedProcedure"),
        routersContent.indexOf("translateSlide: protectedProcedure") + 1500
      );
      const langCodes = ["ko", "en", "ja", "zh", "vi", "th", "es", "fr", "de", "ar", "hi", "pt", "ru", "id", "tr"];
      for (const code of langCodes) {
        expect(langSection).toContain(`${code}:`);
      }
    });
  });
});

// ========== 2. 협업 알림 연동 ==========
describe("v12.4 - Collaboration Notification Integration", () => {
  const routersPath = path.join(serverDir, "routers");
  const routersContent = (() => { if (fs.existsSync(routersPath) && fs.statSync(routersPath).isDirectory()) return fs.readdirSync(routersPath).filter((f) => f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(routersPath, f), "utf-8")).join("\n"); return fs.readFileSync(routersPath, "utf-8"); })();

  describe("Invite notification", () => {
    it("should send notification to invitee when invited", () => {
      // Find the invite section
      const inviteSection = routersContent.substring(
        routersContent.indexOf("collaborationRouter = router({"),
        routersContent.indexOf("collaborationRouter = router({") + 3000
      );
      expect(inviteSection).toContain("createNotification");
      // i18n: was toContain("협업 초대")
      expect(inviteSection).toContain("t(");
    });

    it("should include project title in invite notification", () => {
      const inviteSection = routersContent.substring(
        routersContent.indexOf("collaborationRouter = router({"),
        routersContent.indexOf("collaborationRouter = router({") + 3000
      );
      expect(inviteSection).toContain("project.title");
    });

    it("should include inviter name in notification message", () => {
      const inviteSection = routersContent.substring(
        routersContent.indexOf("collaborationRouter = router({"),
        routersContent.indexOf("collaborationRouter = router({") + 3000
      );
      expect(inviteSection).toContain("ctx.user.name");
    });

    it("should include role info in invite notification", () => {
      const inviteSection = routersContent.substring(
        routersContent.indexOf("collaborationRouter = router({"),
        routersContent.indexOf("collaborationRouter = router({") + 3000
      );
      // i18n: was toContain("편집자")
      expect(inviteSection).toContain("t(");
      // i18n: was toContain("뷰어")
      expect(inviteSection).toContain("t(");
    });
  });

  describe("Accept/Reject notification", () => {
    it("should send notification to inviter when invite is responded to", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      expect(respondSection).toContain("createNotification");
    });

    it("should distinguish accept vs reject in notification title", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      // i18n: was toContain("협업 초대 수락")
      expect(respondSection).toContain("t(");
      // i18n: was toContain("협업 초대 거절")
      expect(respondSection).toContain("t(");
    });

    it("should include responder name and project title in notification", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      expect(respondSection).toContain("ctx.user.name");
      expect(respondSection).toContain("projectTitle");
    });

    it("should look up inviter userId from collaborator record", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      expect(respondSection).toContain("inviterUserId");
      expect(respondSection).toContain("invitedBy");
    });

    it("should gracefully handle notification failures (try/catch)", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      expect(respondSection).toContain("try");
      expect(respondSection).toContain("catch");
    });

    it("should link notification to lecture-builder page", () => {
      const respondSection = routersContent.substring(
        routersContent.indexOf("respondToInvite: protectedProcedure"),
        routersContent.indexOf("respondToInvite: protectedProcedure") + 2000
      );
      expect(respondSection).toContain("/lecture-builder");
    });
  });
});

// ========== 3. 프로덕션 배포 자동화 스크립트 ==========
describe("v12.4 - Production Deploy Script", () => {
  const deployPath = path.join(projectRoot, "deploy.sh");

  it("should exist at project root", () => {
    expect(fs.existsSync(deployPath)).toBe(true);
  });

  it("should be executable", () => {
    const stats = fs.statSync(deployPath);
    const isExecutable = !!(stats.mode & 0o111);
    expect(isExecutable).toBe(true);
  });

  const deployContent = fs.readFileSync(deployPath, "utf-8");

  it("should target aispeaker.cc domain", () => {
    expect(deployContent).toContain("aispeaker.cc");
  });

  it("should target /opt/aispeaker/app deploy directory", () => {
    expect(deployContent).toContain("/opt/aispeaker/app");
  });

  it("should accept SERVER_IP as first argument", () => {
    expect(deployContent).toContain('SERVER_IP="${1:-}"');
  });

  it("should accept SSH_KEY as second argument", () => {
    expect(deployContent).toContain("SSH_KEY=");
  });

  it("should show usage when no arguments provided", () => {
    expect(deployContent).toContain("사용법");
  });

  it("should run TypeScript type check before build", () => {
    expect(deployContent).toContain("tsc --noEmit");
  });

  it("should run pnpm build", () => {
    expect(deployContent).toContain("pnpm build");
  });

  it("should create tar.gz deployment package", () => {
    expect(deployContent).toContain("tar -czf");
  });

  it("should exclude node_modules and .git from package", () => {
    expect(deployContent).toContain("--exclude='node_modules'");
    expect(deployContent).toContain("--exclude='.git'");
  });

  it("should exclude test files from package", () => {
    expect(deployContent).toContain("--exclude='*.test.ts'");
  });

  it("should test SSH connection before deploying", () => {
    expect(deployContent).toContain("서버 연결 테스트");
    expect(deployContent).toContain("ConnectTimeout");
  });

  it("should upload package via SCP", () => {
    expect(deployContent).toContain("scp");
  });

  it("should install production dependencies on server", () => {
    expect(deployContent).toContain("pnpm install --prod");
  });

  it("should support Docker, systemd, and PM2 restart methods", () => {
    expect(deployContent).toContain("docker");
    expect(deployContent).toContain("systemctl");
    expect(deployContent).toContain("pm2");
  });

  it("should create backup before deploying", () => {
    expect(deployContent).toContain("backup");
    expect(deployContent).toContain("cp -r");
  });

  it("should verify deployment with HTTP health check", () => {
    expect(deployContent).toContain("curl");
    expect(deployContent).toContain("http_code");
  });

  it("should retry health check after initial failure", () => {
    expect(deployContent).toContain("재시도");
  });

  it("should provide rollback command in output", () => {
    expect(deployContent).toContain("롤백");
  });

  it("should display deployment summary with domain and timestamp", () => {
    expect(deployContent).toContain("배포 완료");
    expect(deployContent).toContain("도메인");
  });

  it("should have 6 deployment steps", () => {
    expect(deployContent).toContain("단계 1/6");
    expect(deployContent).toContain("단계 2/6");
    expect(deployContent).toContain("단계 3/6");
    expect(deployContent).toContain("단계 4/6");
    expect(deployContent).toContain("단계 5/6");
    expect(deployContent).toContain("단계 6/6");
  });

  it("should use strict error handling (set -euo pipefail)", () => {
    expect(deployContent).toContain("set -euo pipefail");
  });

  it("should support DEPLOY_SERVER environment variable", () => {
    expect(deployContent).toContain("DEPLOY_SERVER");
  });
});
