import { describe, it, expect } from "vitest";

describe("v3.4 - Payment Troubleshooting, Crypto FAQ, Onboarding Tutorial", () => {
  describe("PaymentTroubleshooting page", () => {
    it("should have the page file with correct structure", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      // Has troubleshooting items
      expect(content).toContain("stripeIssues");
      // Has test card numbers
      expect(content).toContain("4242 4242 4242 4242");
      expect(content).toContain("4000 0025 0000 3155");
      // Has expandable accordion
      expect(content).toContain("expandedItems");
      // Has copy card number function
      expect(content).toContain("copyCardNumber");
      // Has Navbar
      expect(content).toContain("Navbar");
      // Has link to pricing
      expect(content).toContain("/pricing");
    });

    it("should contain at least 5 troubleshooting items", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      // Count troubleshoot item objects (each has id, icon, title, description, solution)
      const itemMatches = content.match(/id:\s*"/g);
      expect(itemMatches).not.toBeNull();
      expect(itemMatches!.length).toBeGreaterThanOrEqual(5);
    });

    it("should have proper solution steps for each item", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      // Each item has solutions array
      expect(content).toContain("solutions:");
      // Has symptoms for diagnosis
      expect(content).toContain("symptoms:");
    });
  });

  describe("CryptoPayment FAQ section", () => {
    it("should have FAQ items in CryptoPayment page", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // Has FAQ component
      expect(content).toContain("CryptoFAQ");
      // Has faqItems array
      expect(content).toContain("faqItems");
      // Has HelpCircle icon for FAQ header
      expect(content).toContain("HelpCircle");
    });

    it("should have at least 5 FAQ questions", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // Count FAQ question entries (each has q: and a:)
      const questionMatches = content.match(/q:\s*"/g);
      expect(questionMatches).not.toBeNull();
      expect(questionMatches!.length).toBeGreaterThanOrEqual(5);
    });

    it("should cover key crypto payment topics", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // Supported coins
      expect(content).toContain("USDT");
      expect(content).toContain("USDC");
      expect(content).toContain("ETH");
      expect(content).toContain("BTC");
      // Network info
      expect(content).toContain("ERC20");
      expect(content).toContain("TRC20");
      // Refund info
      expect(content).toContain("환불");
      // Wrong network warning
      expect(content).toContain("잘못된 네트워크");
    });

    it("should have accordion toggle functionality", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // Has open/close state
      expect(content).toContain("openIndex");
      expect(content).toContain("setOpenIndex");
      // Has ChevronDown for toggle
      expect(content).toContain("ChevronDown");
      // Has rotate animation
      expect(content).toContain("rotate-180");
    });
  });

  describe("OnboardingTutorial page", () => {
    it("should have the page file with correct structure", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      // Has tutorial steps
      expect(content).toContain("tutorialSteps");
      // Has step navigation
      expect(content).toContain("currentStep");
      expect(content).toContain("setCurrentStep");
      // Has completion tracking
      expect(content).toContain("completedSteps");
      // Has progress bar
      expect(content).toContain("progress");
      // Has Navbar
      expect(content).toContain("Navbar");
    });

    it("should have 6 tutorial steps covering all features", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      // Count step objects (each has id, title, subtitle, description)
      const stepIdMatches = content.match(/id:\s*\d+,\s*\n\s*title:/g);
      expect(stepIdMatches).not.toBeNull();
      expect(stepIdMatches!.length).toBeGreaterThanOrEqual(6);
    });

    it("should cover key platform features in steps", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      // AI face selection
      expect(content).toContain("AI 얼굴 선택");
      // AI voice setup
      expect(content).toContain("AI 음성 설정");
      // Script writing
      expect(content).toContain("강의 스크립트");
      // Video production
      expect(content).toContain("영상 제작");
      // Live broadcast
      expect(content).toContain("라이브 방송");
      // Credit management
      expect(content).toContain("크레딧 관리");
    });

    it("should have action links to relevant pages", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("/face-gallery");
      expect(content).toContain("/voice-gallery");
      expect(content).toContain("/studio");
      expect(content).toContain("/broadcasts");
      expect(content).toContain("/my-subscription");
    });

    it("should have pro tips for each step", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("PRO TIP");
      expect(content).toContain("tip:");
      // Tips should contain practical advice
      expect(content).toContain("추천");
    });

    it("should have quick links section", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("빠른 링크");
      expect(content).toContain("/script-templates");
      expect(content).toContain("/obs-tutorial");
      expect(content).toContain("/pricing");
    });
  });

  describe("Route registration", () => {
    it("should have all new routes in App.tsx", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync("./client/src/App.tsx", "utf-8");
      expect(content).toContain("/payment-troubleshooting");
      expect(content).toContain("/onboarding");
      expect(content).toContain("PaymentTroubleshooting");
      expect(content).toContain("OnboardingTutorial");
    });
  });

  describe("PaymentSuccess onboarding link", () => {
    it("should have onboarding link in payment success page", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentSuccess.tsx",
        "utf-8"
      );
      expect(content).toContain("/onboarding");
      expect(content).toContain("시작 가이드");
      expect(content).toContain("Rocket");
    });
  });

  describe("Cross-page navigation", () => {
    it("should have troubleshooting link in Pricing page", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/Pricing.tsx",
        "utf-8"
      );
      expect(content).toContain("/payment-troubleshooting");
      expect(content).toContain("문제 해결 가이드");
    });

    it("should have troubleshooting link in CryptoPayment FAQ", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      expect(content).toContain("/payment-troubleshooting");
      expect(content).toContain("결제 문제 해결 가이드 보기");
    });
  });
});
