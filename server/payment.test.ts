import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
    openId: "test-payment-user",
    email: "payment@test.com",
    name: "Payment Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: { origin: "https://test.example.com" } } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 1, role: "admin", name: "Admin Payment" });
}

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

const caller = (ctx: TrpcContext) => appRouter.createCaller(ctx);

// ============================================================
// Payment Router
// ============================================================
describe("payment", () => {
  it("requires auth for myPayments", async () => {
    await expect(
      caller(createAnonymousContext()).payment.myPayments()
    ).rejects.toThrow();
  });

  it("returns empty array for user with no payments", async () => {
    const result = await caller(createUserContext()).payment.myPayments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("requires auth for createSubscriptionCheckout", async () => {
    await expect(
      caller(createAnonymousContext()).payment.createSubscriptionCheckout({
        planSlug: "professional",
        billingCycle: "monthly",
      })
    ).rejects.toThrow();
  });

  it("requires auth for createCreditCheckout", async () => {
    await expect(
      caller(createAnonymousContext()).payment.createCreditCheckout({
        packageId: "starter",
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// Crypto Payment Router
// ============================================================
describe("crypto", () => {
  it("requires auth for createPayment", async () => {
    await expect(
      caller(createAnonymousContext()).crypto.createPayment({
        type: "subscription",
        planSlug: "professional",
        billingCycle: "monthly",
        cryptoCurrency: "USDT",
        network: "ERC20",
      })
    ).rejects.toThrow();
  });

  it("requires auth for checkStatus", async () => {
    await expect(
      caller(createAnonymousContext()).crypto.checkStatus({ paymentId: 1 })
    ).rejects.toThrow();
  });
});

// ============================================================
// Credit Usage Router
// ============================================================
describe("creditUsage", () => {
  it("requires auth for useCredits", async () => {
    await expect(
      caller(createAnonymousContext()).credit.useCredits({
        feature: "script_generation",
        description: "test",
      })
    ).rejects.toThrow();
  });

  it("requires auth for usageLogs", async () => {
    await expect(
      caller(createAnonymousContext()).credit.usageLogs()
    ).rejects.toThrow();
  });

  it("returns usage logs for authenticated user", async () => {
    const result = await caller(createUserContext()).credit.usageLogs();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ============================================================
// Revenue Router (Admin)
// ============================================================
describe("revenue", () => {
  it("requires admin for overview", async () => {
    await expect(
      caller(createUserContext()).revenue.overview()
    ).rejects.toThrow();
  });

  it("requires admin for payments list", async () => {
    await expect(
      caller(createUserContext()).revenue.payments({ limit: 10 })
    ).rejects.toThrow();
  });

  it("admin can access revenue overview", async () => {
    const result = await caller(createAdminContext()).revenue.overview();
    expect(result).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(typeof result.stats.totalRevenue).toBe("number");
    expect(typeof result.stats.totalPayments).toBe("number");
    expect(typeof result.stats.completedPayments).toBe("number");
    expect(Array.isArray(result.monthlyRevenue)).toBe(true);
    expect(Array.isArray(result.planDistribution)).toBe(true);
  });

  it("admin can list recent payments", async () => {
    const result = await caller(createAdminContext()).revenue.payments({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("anonymous cannot access revenue", async () => {
    await expect(
      caller(createAnonymousContext()).revenue.overview()
    ).rejects.toThrow();
  });
});

// ============================================================
// Route Structure Checks
// ============================================================
describe("v3.2 payment route structure", () => {
  const procedures = Object.keys(appRouter._def.procedures);

  it("has payment router procedures", () => {
    expect(procedures).toContain("payment.myPayments");
    expect(procedures).toContain("payment.createSubscriptionCheckout");
    expect(procedures).toContain("payment.createCreditCheckout");
    expect(procedures).toContain("payment.verifySession");
  });

  it("has crypto router procedures", () => {
    expect(procedures).toContain("crypto.createPayment");
    expect(procedures).toContain("crypto.checkStatus");
    expect(procedures).toContain("crypto.confirmPayment");
  });

  it("has credit usage procedures", () => {
    expect(procedures).toContain("credit.useCredits");
    expect(procedures).toContain("credit.usageLogs");
  });

  it("has revenue router procedures", () => {
    expect(procedures).toContain("revenue.overview");
    expect(procedures).toContain("revenue.payments");
  });
});
