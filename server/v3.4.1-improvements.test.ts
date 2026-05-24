import { describe, it, expect } from "vitest";

describe("v3.4.1 - Payment Troubleshooting Failure Scenarios, Onboarding Time + Celebration, Crypto FAQ Logos", () => {
  describe("Stripe Test Card Failure Scenarios", () => {
    it("should have failureScenarios array with 8 scenarios", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      expect(content).toContain("failureScenarios");
      expect(content).toContain("FailScenario");
      // Count scenario objects by id field
      const scenarioIds = content.match(/id:\s*"[a-z-]+"/g);
      // stripeIssues + failureScenarios combined ids
      expect(scenarioIds).not.toBeNull();
      expect(scenarioIds!.length).toBeGreaterThanOrEqual(13);
    });

    it("should contain all failure scenario card numbers", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      // Generic decline
      expect(content).toContain("4000 0000 0000 0002");
      // Insufficient funds
      expect(content).toContain("4000 0000 0000 9995");
      // Lost card
      expect(content).toContain("4000 0000 0000 9987");
      // Stolen card
      expect(content).toContain("4000 0000 0000 9979");
      // Expired card
      expect(content).toContain("4000 0000 0000 0069");
      // Incorrect CVC
      expect(content).toContain("4000 0000 0000 0127");
      // Processing error
      expect(content).toContain("4000 0000 0000 0119");
      // 3DS auth fail
      expect(content).toContain("4000 0084 0000 1629");
    });

    it("should have error messages and resolutions for each scenario", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      expect(content).toContain("errorMessage:");
      expect(content).toContain("resolution:");
      expect(content).toContain("badgeColor:");
      // Specific error messages
      expect(content).toContain("Your card was declined.");
      expect(content).toContain("Your card has insufficient funds.");
      expect(content).toContain("Your card has expired.");
      expect(content).toContain("Your card's security code is incorrect.");
      expect(content).toContain("An error occurred while processing your card.");
      expect(content).toContain("We are unable to authenticate your payment method.");
    });

    it("should have expandable UI for failure scenarios", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/PaymentTroubleshooting.tsx",
        "utf-8"
      );
      // Has section header (i18n key)
      expect(content).toContain("pt.failureScenarios");
      // Has expandable items
      expect(content).toContain("expandedItems.has(scenario.id)");
      // Has copy button for card numbers
      expect(content).toContain("copyCardNumber(scenario.cardNumber)");
      // Has error message display (i18n)
      expect(content).toContain("failureScenarios.expectedError");
      // Has resolution display (i18n)
      expect(content).toContain("failureScenarios");
    });
  });

  describe("Onboarding Tutorial - Time Display & Celebration", () => {
    it("should have Clock icon import and time badges", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("Clock");
      // Amber-colored time badge in step header
      expect(content).toContain("bg-amber-500/15");
      expect(content).toContain("text-amber-400");
      // Clock icon in sidebar step navigation
      expect(content).toContain("Clock className=\"w-2.5 h-2.5\"");
    });

    it("should have total estimated time display", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("onboardingTutorial.totalEstimatedTime");
    });

    it("should have celebration modal when all steps completed", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      // Celebration state
      expect(content).toContain("showCelebration");
      expect(content).toContain("setShowCelebration");
      // Trophy icon
      expect(content).toContain("Trophy");
      // Star icons
      expect(content).toContain("Star");
      // Celebration text (i18n keys)
      expect(content).toContain("onboardingTutorial.congratulations");
      expect(content).toContain("onboardingTutorial.allOnboardingCompleted");
      // Action buttons (i18n keys)
      expect(content).toContain("onboardingTutorial.goToStudio");
      expect(content).toContain("onboardingTutorial.keepExploring");
    });

    it("should track all completed state and show green progress", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      expect(content).toContain("allCompleted");
      // Green gradient when all complete
      expect(content).toContain("from-green-500 to-emerald-400");
      // Completion text (i18n key)
      expect(content).toContain("onboardingTutorial.allStepsCompleted");
    });

    it("should have each step with estimatedTime field", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/OnboardingTutorial.tsx",
        "utf-8"
      );
      const timeMatches = content.match(/estimatedTime:\s*"/g);
      expect(timeMatches).not.toBeNull();
      expect(timeMatches!.length).toBe(6);
    });
  });

  describe("Crypto FAQ - Coin Logo Icons", () => {
    it("should have SVG crypto logo components", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      expect(content).toContain("function UsdtLogo");
      expect(content).toContain("function UsdcLogo");
      expect(content).toContain("function EthLogo");
      expect(content).toContain("function BtcLogo");
    });

    it("should have correct brand colors for each logo", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // USDT green
      expect(content).toContain("#26A17B");
      // USDC blue
      expect(content).toContain("#2775CA");
      // ETH blue
      expect(content).toContain("#627EEA");
      // BTC orange
      expect(content).toContain("#F7931A");
    });

    it("should have icons array in each FAQ item", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      const iconsMatches = content.match(/icons:\s*\[/g);
      expect(iconsMatches).not.toBeNull();
      // 7 FAQ items each with icons
      expect(iconsMatches!.length).toBe(7);
    });

    it("should render icons next to each FAQ question", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "./client/src/pages/CryptoPayment.tsx",
        "utf-8"
      );
      // Icons rendered in button
      expect(content).toContain("item.icons.map");
      // Icons container with gap
      expect(content).toContain("flex items-center gap-1 shrink-0");
    });
  });
});
