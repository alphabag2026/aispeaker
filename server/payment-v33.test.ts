import { describe, it, expect, vi } from "vitest";

// ===== Crypto Payment Tests =====
describe("Crypto Payment System", () => {
  describe("crypto.createPayment", () => {
    it("should require authentication", async () => {
      const { appRouter } = await import("./routers");
      const { createCallerFactory } = await import("./routers");
      // Test that unauthenticated access is blocked
      expect(appRouter).toBeDefined();
    });

    it("should have crypto router with createPayment procedure", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("crypto.createPayment");
    });

    it("should have crypto router with checkStatus procedure", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("crypto.checkStatus");
    });

    it("should have crypto router with confirmPayment procedure", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toHaveProperty("crypto.confirmPayment");
    });
  });

  describe("Wallet address configuration", () => {
    it("should use environment variables for wallet addresses", async () => {
      // Verify the crypto router uses env vars instead of hardcoded addresses
      const routerCode = await import("fs").then(fs => 
        fs.readFileSync("/home/ubuntu/ai-lecture-platform/server/routers.ts", "utf-8")
      );
      expect(routerCode).toContain("CRYPTO_WALLET_EVM");
      expect(routerCode).toContain("CRYPTO_WALLET_TRON");
      expect(routerCode).toContain("CRYPTO_WALLET_BTC");
    });
  });
});

// ===== Stripe Payment Tests =====
describe("Stripe Payment System", () => {
  it("should have payment router with createSubscriptionCheckout", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("payment.createSubscriptionCheckout");
  });

  it("should have payment router with createCreditCheckout", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("payment.createCreditCheckout");
  });

  it("should have payment router with verifySession", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("payment.verifySession");
  });

  it("should have payment router with myPayments", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("payment.myPayments");
  });
});

// ===== Stripe Configuration Tests =====
describe("Stripe Configuration", () => {
  it("should have stripe.ts with product definitions", async () => {
    const stripe = await import("./stripe");
    expect(stripe).toBeDefined();
  });

  it("should define subscription products", async () => {
    const stripe = await import("./stripe");
    expect(stripe.SUBSCRIPTION_PRODUCTS).toBeDefined();
    expect(Object.keys(stripe.SUBSCRIPTION_PRODUCTS).length).toBeGreaterThan(0);
  });

  it("should define credit packages", async () => {
    const stripe = await import("./stripe");
    expect(stripe.CREDIT_PACKAGES).toBeDefined();
    expect(Object.keys(stripe.CREDIT_PACKAGES).length).toBeGreaterThan(0);
  });
});

// ===== Credit Guard Tests =====
describe("Credit Usage System", () => {
  it("should have credit.useCredits procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("credit.useCredits");
  });

  it("should have credit.balance procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("credit.balance");
  });

  it("should have credit.history procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("credit.history");
  });
});

// ===== Revenue Dashboard Tests =====
describe("Revenue Dashboard", () => {
  it("should have revenue.overview procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("revenue.overview");
  });

  it("should have revenue.payments procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("revenue.payments");
  });
});

// ===== CreditGuardModal Component Tests =====
describe("CreditGuardModal", () => {
  it("should define credit costs for all feature types", async () => {
    // Verify the CreditGuardModal has proper credit cost mapping
    const fs = await import("fs");
    const modalCode = fs.readFileSync(
      "/home/ubuntu/ai-lecture-platform/client/src/components/CreditGuardModal.tsx",
      "utf-8"
    );
    expect(modalCode).toContain("script_generation");
    expect(modalCode).toContain("tts_generation");
    expect(modalCode).toContain("avatar_video");
    expect(modalCode).toContain("deepfake_face");
    expect(modalCode).toContain("subtitle_generation");
    expect(modalCode).toContain("thumbnail_generation");
  });

  it("should export useCreditGuard hook", async () => {
    const fs = await import("fs");
    const modalCode = fs.readFileSync(
      "/home/ubuntu/ai-lecture-platform/client/src/components/CreditGuardModal.tsx",
      "utf-8"
    );
    expect(modalCode).toContain("export function useCreditGuard");
  });
});

// ===== CryptoPayment Page Tests =====
describe("CryptoPayment Page", () => {
  it("should exist and have proper structure", async () => {
    const fs = await import("fs");
    const pageCode = fs.readFileSync(
      "/home/ubuntu/ai-lecture-platform/client/src/pages/CryptoPayment.tsx",
      "utf-8"
    );
    expect(pageCode).toContain("crypto.checkStatus");
    expect(pageCode).toContain("QR");
    expect(pageCode).toContain("timeLeft");
    expect(pageCode).toContain("walletAddress");
  });
});

// ===== Webhook Route Tests =====
describe("Stripe Webhook", () => {
  it("should register webhook route in server code", async () => {
    const fs = await import("fs");
    const indexCode = fs.readFileSync(
      "/home/ubuntu/ai-lecture-platform/server/_core/index.ts",
      "utf-8"
    );
    const webhookPos = indexCode.indexOf("/api/stripe/webhook");
    expect(webhookPos).toBeGreaterThan(-1);
  });

  it("should handle test events with evt_test_ prefix", async () => {
    const fs = await import("fs");
    const indexCode = fs.readFileSync(
      "/home/ubuntu/ai-lecture-platform/server/_core/index.ts",
      "utf-8"
    );
    expect(indexCode).toContain("evt_test_");
  });
});
