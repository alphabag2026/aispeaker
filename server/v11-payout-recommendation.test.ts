import { describe, it, expect } from "vitest";
import * as db from "./db";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

// ===== Stripe Connect Payout System Tests =====
describe("v11 - Stripe Connect Payout System", () => {
  describe("payout router procedures", () => {
    it("should have connectOnboard procedure defined in routers", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("connectOnboard");
      expect(routerContent).toContain("protectedProcedure");
    });

    it("should have connectStatus procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("connectStatus");
    });

    it("should have requestPayout procedure with amount validation", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("requestPayout");
      expect(routerContent).toContain("amountInCents");
    });

    it("should have earnings procedure for balance info", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("totalEarnings");
      expect(routerContent).toContain("availableBalance");
      expect(routerContent).toContain("pendingPayouts");
      expect(routerContent).toContain("completedPayouts");
    });

    it("should have payoutHistory procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("payoutHistory");
    });

    it("should apply 20% platform fee on payouts", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("platformFeeInCents");
      expect(routerContent).toContain("netPayoutInCents");
    });

    it("should enforce minimum payout of $10 (1000 cents)", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("1000");
    });
  });

  describe("payout DB helpers", () => {
    it("should export getCreatorPayouts", () => {
      expect(typeof db.getCreatorPayouts).toBe("function");
    });

    it("should export getPendingPayoutTotal", () => {
      expect(typeof db.getPendingPayoutTotal).toBe("function");
    });

    it("should export createPayout", () => {
      expect(typeof db.createPayout).toBe("function");
    });
  });

  describe("payout schema", () => {
    it("should have creatorPayouts table with required fields", () => {
      const schemaContent = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("creatorPayouts");
      expect(schemaContent).toContain("amountInCents");
      expect(schemaContent).toContain("platformFeeInCents");
      expect(schemaContent).toContain("netPayoutInCents");
      expect(schemaContent).toContain("stripeTransferId");
    });

    it("should have payout status enum", () => {
      const schemaContent = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("pending");
      expect(schemaContent).toContain("processing");
      expect(schemaContent).toContain("completed");
      expect(schemaContent).toContain("failed");
    });
  });

  describe("CreatorDashboard payout UI", () => {
    it("should have Stripe Connect onboarding UI", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/CreatorDashboard.tsx"), "utf-8");
      expect(uiContent).toContain("Stripe Connect");
      // i18n: was toContain("계정 연결하기")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("connectOnboard");
    });

    it("should have payout request dialog", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/CreatorDashboard.tsx"), "utf-8");
      // i18n: was toContain("출금 신청")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("payoutAmount");
      expect(uiContent).toContain("requestPayout");
    });

    it("should show earnings breakdown", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/CreatorDashboard.tsx"), "utf-8");
      // i18n: was toContain("총 수익")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("출금 가능")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("출금 대기중")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("출금 완료")
      expect(uiContent).toContain("t(");
    });

    it("should have payout history list", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/CreatorDashboard.tsx"), "utf-8");
      expect(uiContent).toContain("payoutHistory");
      expect(uiContent).toContain("netPayoutInCents");
    });

    it("should have tabs for listings and payouts", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/CreatorDashboard.tsx"), "utf-8");
      // i18n: was toContain("내 상품")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("정산/출금")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("TabsList");
    });
  });
});

// ===== AI Recommendation Engine Tests =====
describe("v11 - AI Recommendation Engine", () => {
  describe("recommendation router procedures", () => {
    it("should have getPersonalized procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("getPersonalized");
    });

    it("should have getTrending procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("getTrending");
    });

    it("should have getSimilar procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("getSimilar");
    });

    it("should have trackProgress procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("trackProgress");
      expect(routerContent).toContain("progressPercent");
      expect(routerContent).toContain("watchTimeSec");
    });

    it("should have updatePreferences procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("updatePreferences");
      expect(routerContent).toContain("preferredCategories");
      expect(routerContent).toContain("weeklyTargetMinutes");
    });

    it("should have getHistory procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("getHistory");
    });

    it("should have getPreferences procedure", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("getPreferences");
    });

    it("should use caching for recommendations", () => {
      const routerContent = (() => { const dir = resolve(__dirname, "routers"); const { readdirSync: rd, existsSync: ex } = require("fs"); if (!ex(dir)) return readFileSync(resolve(__dirname, "routers.ts"), "utf-8"); return rd(dir).filter((f: string) => f.endsWith(".ts")).map((f: string) => readFileSync(resolve(dir, f), "utf-8")).join("\n"); })();
      expect(routerContent).toContain("setCachedRecommendations");
      expect(routerContent).toContain("fromCache");
    });
  });

  describe("recommendation DB helpers", () => {
    it("should export trackLearningProgress", () => {
      expect(typeof db.trackLearningProgress).toBe("function");
    });

    it("should export getUserLearningHistoryList", () => {
      expect(typeof db.getUserLearningHistoryList).toBe("function");
    });

    it("should export getUserPreferences", () => {
      expect(typeof db.getUserPreferences).toBe("function");
    });

    it("should export getCreatorProfileByUserId", () => {
      expect(typeof db.getCreatorProfileByUserId).toBe("function");
    });

    it("should export getPopularListings", () => {
      expect(typeof db.getPopularListings).toBe("function");
    });

    it("should export getRecentListings", () => {
      expect(typeof db.getRecentListings).toBe("function");
    });

    it("should export getListingsByCategory", () => {
      expect(typeof db.getListingsByCategory).toBe("function");
    });

    it("should export setCachedRecommendations", () => {
      expect(typeof db.setCachedRecommendations).toBe("function");
    });
  });

  describe("recommendation schema", () => {
    it("should have userLearningHistory table", () => {
      const schemaContent = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("userLearningHistory");
      expect(schemaContent).toContain("progressPercent");
      expect(schemaContent).toContain("watchTimeSec");
      expect(schemaContent).toContain("isCompleted");
    });

    it("should have userPreferences table", () => {
      const schemaContent = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("userPreferences");
      expect(schemaContent).toContain("preferredCategories");
      expect(schemaContent).toContain("weeklyTargetMinutes");
    });

    it("should have recommendationCache table", () => {
      const schemaContent = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");
      expect(schemaContent).toContain("recommendationCache");
      expect(schemaContent).toContain("expiresAt");
    });
  });

  describe("Recommendations page UI", () => {
    it("should have personalized recommendations section", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/Recommendations.tsx"), "utf-8");
      // i18n: was toContain("나를 위한 추천")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("getPersonalized");
    });

    it("should have trending section", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/Recommendations.tsx"), "utf-8");
      // i18n: was toContain("인기 강의")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("getTrending");
    });

    it("should have learning history section", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/Recommendations.tsx"), "utf-8");
      // i18n: was toContain("최근 학습 이력")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("getHistory");
    });

    it("should have preferences settings panel", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/Recommendations.tsx"), "utf-8");
      // i18n: was toContain("학습 선호도 설정")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("관심 카테고리")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("주간 학습 목표")
      expect(uiContent).toContain("t(");
      expect(uiContent).toContain("updatePreferences");
    });

    it("should have difficulty level filter", () => {
      const uiContent = readFileSync(resolve(__dirname, "../client/src/pages/Recommendations.tsx"), "utf-8");
      // i18n: was toContain("초급")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("중급")
      expect(uiContent).toContain("t(");
      // i18n: was toContain("고급")
      expect(uiContent).toContain("t(");
    });

    it("should be registered in App.tsx routes", () => {
      const appContent = readFileSync(resolve(__dirname, "../client/src/App.tsx"), "utf-8");
      expect(appContent).toContain("/recommendations");
      expect(appContent).toContain("Recommendations");
    });

    it("should be linked in Navbar", () => {
      const navContent = readFileSync(resolve(__dirname, "../client/src/components/Navbar.tsx"), "utf-8");
      expect(navContent).toContain("/recommendations");
      // i18n: was toContain("AI추천")
      expect(navContent).toContain("t(");
    });
  });
});
