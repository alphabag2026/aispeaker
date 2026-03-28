import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 99,
    openId: "test-user-v3",
    email: "test@v3.com",
    name: "Test User V3",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 1, role: "admin", name: "Admin V3" });
}

function createAnonContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ========== Sample Faces ==========
describe("sampleFace", () => {
  it("lists sample faces (public)", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const faces = await caller.sampleFace.list();
    expect(Array.isArray(faces)).toBe(true);
    // Should have seed data
    expect(faces.length).toBeGreaterThanOrEqual(1);
  });

  it("lists faces with category filter", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const faces = await caller.sampleFace.list({ category: "professional" });
    expect(Array.isArray(faces)).toBe(true);
    for (const face of faces) {
      expect(face.category).toBe("professional");
    }
  });

  it("gets a single face by id", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const faces = await caller.sampleFace.list();
    if (faces.length > 0) {
      const face = await caller.sampleFace.get({ id: faces[0].id });
      expect(face).toBeTruthy();
      expect(face!.name).toBeTruthy();
    }
  });

  it("rejects non-admin create", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.sampleFace.create({
        name: "Test Face",
        category: "test",
        gender: "male",
        imageUrl: "https://example.com/face.jpg",
      })
    ).rejects.toThrow();
  });

  it("rejects non-admin delete", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.sampleFace.delete({ id: 1 })).rejects.toThrow();
  });
});

// ========== Sample Voices ==========
describe("sampleVoice", () => {
  it("lists sample voices (public)", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const voices = await caller.sampleVoice.list();
    expect(Array.isArray(voices)).toBe(true);
    expect(voices.length).toBeGreaterThanOrEqual(1);
  });

  it("lists voices with language filter", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const voices = await caller.sampleVoice.list({ language: "ko" });
    expect(Array.isArray(voices)).toBe(true);
    for (const voice of voices) {
      expect(voice.language).toBe("ko");
    }
  });

  it("gets a single voice by id", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const voices = await caller.sampleVoice.list();
    if (voices.length > 0) {
      const voice = await caller.sampleVoice.get({ id: voices[0].id });
      expect(voice).toBeTruthy();
      expect(voice!.name).toBeTruthy();
    }
  });

  it("rejects non-admin create", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.sampleVoice.create({
        name: "Test Voice",
        language: "ko",
        gender: "male",
        tone: "warm",
        ttsVoiceId: "test-id",
      })
    ).rejects.toThrow();
  });
});

// ========== Subscription Plans ==========
describe("plan", () => {
  it("lists subscription plans (public)", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const plans = await caller.plan.list();
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBe(5); // Free, Starter, Professional, Business, Enterprise
  });

  it("gets plan by slug", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const plan = await caller.plan.getBySlug({ slug: "free" });
    expect(plan).toBeTruthy();
    expect(plan!.name).toContain("Free");
  });

  it("gets plan by id", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    const plans = await caller.plan.list();
    const plan = await caller.plan.get({ id: plans[0].id });
    expect(plan).toBeTruthy();
  });

  it("rejects non-admin plan update", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.plan.update({ id: 1, priceMonthly: 999 })
    ).rejects.toThrow();
  });
});

// ========== User Subscription ==========
describe("subscription", () => {
  it("returns subscription info for user (may be null if no subscription)", async () => {
    const caller = appRouter.createCaller(createUserContext({ id: 9999 }));
    const result = await caller.subscription.my();
    // New user may not have a subscription yet
    expect(result).toBeTruthy();
    // plan can be null for new users without subscription
    if (result.plan) {
      expect(result.plan.slug).toBeTruthy();
    }
  });

  it("can subscribe to a plan", async () => {
    const ctx = createUserContext({ id: 9998 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.subscribe({ planSlug: "professional" });
    expect(result.success).toBe(true);
    expect(result.planName).toContain("Professional");
  });

  it("rejects subscribing to non-existent plan", async () => {
    const caller = appRouter.createCaller(createUserContext({ id: 9997 }));
    await expect(
      caller.subscription.subscribe({ planSlug: "nonexistent" })
    ).rejects.toThrow();
  });

  it("requires auth for subscription", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.subscription.my()).rejects.toThrow();
  });

  it("admin can list all subscriptions", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const subs = await caller.subscription.listAll();
    expect(Array.isArray(subs)).toBe(true);
  });

  it("non-admin cannot list all subscriptions", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.subscription.listAll()).rejects.toThrow();
  });
});

// ========== Credits ==========
describe("credit", () => {
  it("returns credit balance for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.credit.balance();
    expect(typeof result.credits).toBe("number");
  });

  it("returns credit history", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const history = await caller.credit.history();
    expect(Array.isArray(history)).toBe(true);
  });

  it("requires auth for credit balance", async () => {
    const caller = appRouter.createCaller(createAnonContext());
    await expect(caller.credit.balance()).rejects.toThrow();
  });
});

// ========== Route Structure ==========
describe("v3 route structure", () => {
  it("has sampleFace router", () => {
    expect(appRouter._def.procedures).toHaveProperty("sampleFace.list");
    expect(appRouter._def.procedures).toHaveProperty("sampleFace.get");
    expect(appRouter._def.procedures).toHaveProperty("sampleFace.create");
    expect(appRouter._def.procedures).toHaveProperty("sampleFace.update");
    expect(appRouter._def.procedures).toHaveProperty("sampleFace.delete");
  });

  it("has sampleVoice router", () => {
    expect(appRouter._def.procedures).toHaveProperty("sampleVoice.list");
    expect(appRouter._def.procedures).toHaveProperty("sampleVoice.get");
    expect(appRouter._def.procedures).toHaveProperty("sampleVoice.create");
    expect(appRouter._def.procedures).toHaveProperty("sampleVoice.update");
    expect(appRouter._def.procedures).toHaveProperty("sampleVoice.delete");
  });

  it("has plan router", () => {
    expect(appRouter._def.procedures).toHaveProperty("plan.list");
    expect(appRouter._def.procedures).toHaveProperty("plan.get");
    expect(appRouter._def.procedures).toHaveProperty("plan.getBySlug");
    expect(appRouter._def.procedures).toHaveProperty("plan.update");
  });

  it("has subscription router", () => {
    expect(appRouter._def.procedures).toHaveProperty("subscription.my");
    expect(appRouter._def.procedures).toHaveProperty("subscription.subscribe");
    expect(appRouter._def.procedures).toHaveProperty("subscription.cancel");
    expect(appRouter._def.procedures).toHaveProperty("subscription.listAll");
  });

  it("has credit router", () => {
    expect(appRouter._def.procedures).toHaveProperty("credit.balance");
    expect(appRouter._def.procedures).toHaveProperty("credit.history");
  });
});
