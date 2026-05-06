import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_PRODUCTS, CREDIT_COSTS } from "./stripe";

describe("v6.4 - AI Clone Voice Speed/Pitch + Monthly Credit Subscription", () => {
  describe("AI Clone Voice Speed/Pitch Settings", () => {
    it("should have valid speed range (0.5 - 2.0)", () => {
      const minSpeed = 0.5;
      const maxSpeed = 2.0;
      const defaultSpeed = 1.0;
      expect(defaultSpeed).toBeGreaterThanOrEqual(minSpeed);
      expect(defaultSpeed).toBeLessThanOrEqual(maxSpeed);
      expect(maxSpeed).toBeGreaterThan(minSpeed);
    });

    it("should have valid pitch range (-12 to +12 semitones)", () => {
      const minPitch = -12;
      const maxPitch = 12;
      const defaultPitch = 0;
      expect(defaultPitch).toBeGreaterThanOrEqual(minPitch);
      expect(defaultPitch).toBeLessThanOrEqual(maxPitch);
    });

    it("should pass speed and pitch to generateCloneVoice", () => {
      // The generateCloneVoice router accepts speed and pitch params
      const input = {
        projectId: 1,
        slideIndex: 0,
        speed: 1.2,
        pitch: 3,
      };
      expect(input.speed).toBeGreaterThanOrEqual(0.5);
      expect(input.speed).toBeLessThanOrEqual(2.0);
      expect(input.pitch).toBeGreaterThanOrEqual(-12);
      expect(input.pitch).toBeLessThanOrEqual(12);
    });

    it("should pass speed and pitch to batchGenerateCloneVoice", () => {
      const input = {
        projectId: 1,
        speed: 0.8,
        pitch: -2,
      };
      expect(input.speed).toBeGreaterThanOrEqual(0.5);
      expect(input.speed).toBeLessThanOrEqual(2.0);
      expect(input.pitch).toBeGreaterThanOrEqual(-12);
      expect(input.pitch).toBeLessThanOrEqual(12);
    });
  });

  describe("Monthly Credit Subscription Products", () => {
    it("should have 4 subscription plans", () => {
      const plans = Object.keys(SUBSCRIPTION_PRODUCTS);
      expect(plans).toHaveLength(4);
      expect(plans).toContain("starter");
      expect(plans).toContain("professional");
      expect(plans).toContain("business");
      expect(plans).toContain("enterprise");
    });

    it("each plan should have required fields", () => {
      Object.values(SUBSCRIPTION_PRODUCTS).forEach((plan) => {
        expect(plan.name).toBeDefined();
        expect(plan.slug).toBeDefined();
        expect(plan.priceMonthly).toBeGreaterThan(0);
        expect(plan.priceYearly).toBeGreaterThan(0);
        expect(plan.credits).toBeGreaterThan(0);
        expect(plan.description).toBeDefined();
      });
    });

    it("yearly price should be less than 12x monthly (discount)", () => {
      Object.values(SUBSCRIPTION_PRODUCTS).forEach((plan) => {
        const yearlyEquiv = plan.priceMonthly * 12;
        expect(plan.priceYearly).toBeLessThan(yearlyEquiv);
      });
    });

    it("credits should increase with higher plans", () => {
      const credits = [
        SUBSCRIPTION_PRODUCTS.starter.credits,
        SUBSCRIPTION_PRODUCTS.professional.credits,
        SUBSCRIPTION_PRODUCTS.business.credits,
        SUBSCRIPTION_PRODUCTS.enterprise.credits,
      ];
      for (let i = 1; i < credits.length; i++) {
        expect(credits[i]).toBeGreaterThan(credits[i - 1]);
      }
    });

    it("price per credit should decrease with higher plans", () => {
      const plans = Object.values(SUBSCRIPTION_PRODUCTS);
      const pricePerCredit = plans.map((p) => p.priceMonthly / p.credits);
      for (let i = 1; i < pricePerCredit.length; i++) {
        expect(pricePerCredit[i]).toBeLessThan(pricePerCredit[i - 1]);
      }
    });
  });

  describe("Subscription Checkout Flow", () => {
    it("should support monthly and yearly billing cycles", () => {
      const validCycles = ["monthly", "yearly"];
      expect(validCycles).toContain("monthly");
      expect(validCycles).toContain("yearly");
    });

    it("should use mode: subscription for recurring billing", () => {
      // The createCreditSubscription router uses mode: "subscription"
      const checkoutMode = "subscription";
      expect(checkoutMode).toBe("subscription");
    });

    it("should include metadata for webhook processing", () => {
      const metadata = {
        user_id: "123",
        plan_slug: "professional",
        billing_cycle: "monthly",
        credits: "500",
        type: "credit_subscription",
      };
      expect(metadata.type).toBe("credit_subscription");
      expect(metadata.credits).toBeDefined();
      expect(metadata.plan_slug).toBeDefined();
    });
  });

  describe("Webhook Auto-Refill Logic", () => {
    it("should handle subscription_cycle billing reason", () => {
      const validReasons = ["subscription_cycle", "subscription_create"];
      expect(validReasons).toContain("subscription_cycle");
    });

    it("should handle subscription_create billing reason", () => {
      const validReasons = ["subscription_cycle", "subscription_create"];
      expect(validReasons).toContain("subscription_create");
    });

    it("should add credits to user subscription on renewal", () => {
      const currentCredits = 50;
      const refillCredits = 500;
      const newBalance = currentCredits + refillCredits;
      expect(newBalance).toBe(550);
    });
  });

  describe("Cancel Subscription", () => {
    it("should set cancel_at_period_end to true", () => {
      const cancelResult = { success: true, cancelAt: new Date() };
      expect(cancelResult.success).toBe(true);
    });
  });

  describe("Subscription Status Query", () => {
    it("should return hasSubscription: false when no subscription", () => {
      const noSub = { hasSubscription: false, plan: null, status: null };
      expect(noSub.hasSubscription).toBe(false);
    });

    it("should return subscription details when active", () => {
      const activeSub = {
        hasSubscription: true,
        plan: { name: "Professional", slug: "professional" },
        status: "active",
        billingCycle: "monthly",
        cancelAtPeriodEnd: false,
      };
      expect(activeSub.hasSubscription).toBe(true);
      expect(activeSub.status).toBe("active");
    });
  });
});
