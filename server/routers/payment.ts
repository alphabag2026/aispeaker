import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const planRouter = router({
  list: publicProcedure.query(async () => {
    return db.listSubscriptionPlans();
  }),
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getSubscriptionPlan(input.id);
    }),
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return db.getSubscriptionPlanBySlug(input.slug);
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      priceMonthly: z.number().optional(),
      priceYearly: z.number().optional(),
      monthlyCredits: z.number().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      await db.updateSubscriptionPlan(id, data as any);
      return { success: true };
    }),
});

export const subscriptionRouter = router({
  my: protectedProcedure.query(async ({ ctx }) => {
    const sub = await db.getUserSubscription(ctx.user.id);
    if (!sub) {
      // Auto-assign free plan
      const freePlan = await db.getSubscriptionPlanBySlug("free");
      if (freePlan) {
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await db.createUserSubscription({
          userId: ctx.user.id,
          planId: freePlan.id,
          status: "active",
          billingCycle: "monthly",
          currentPeriodEnd: periodEnd,
          creditsRemaining: freePlan.monthlyCredits,
        });
        const newSub = await db.getUserSubscription(ctx.user.id);
        const plan = freePlan;
        return { subscription: newSub, plan };
      }
    }
    const plan = sub ? await db.getSubscriptionPlan(sub.planId) : null;
    return { subscription: sub, plan };
  }),
  subscribe: protectedProcedure
    .input(z.object({
      planSlug: z.string(),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = await db.getSubscriptionPlanBySlug(input.planSlug);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found." });
      const periodEnd = new Date();
      if (input.billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      await db.createUserSubscription({
        userId: ctx.user.id,
        planId: plan.id,
        status: "active",
        billingCycle: input.billingCycle ?? "monthly",
        currentPeriodEnd: periodEnd,
        creditsRemaining: plan.monthlyCredits,
      });
      return { success: true, planName: plan.name };
    }),
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await db.getUserSubscription(ctx.user.id);
    if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
    await db.updateUserSubscription(sub.id, { cancelAtPeriodEnd: true });
    return { success: true };
  }),
  // Admin: list all subscriptions
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listAllSubscriptions();
  }),
});

export const creditRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    return { credits: await db.getUserCredits(ctx.user.id) };
  }),
  history: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserCreditHistory(ctx.user.id, input?.limit ?? 50);
    }),
  usageLogs: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserCreditUsageLogs(ctx.user.id, input?.limit ?? 50);
    }),
  // Use credits for a feature
  useCredits: protectedProcedure
    .input(z.object({
      feature: z.enum(["script_generation", "tts_conversion", "avatar_video", "deepfake_transform", "thumbnail_generation", "subtitle_generation", "voice_modulation", "live_broadcast", "image_generation", "bg_remove", "voice_clone", "voice_change", "video_effects", "image_to_video", "face_swap", "talking_avatar", "video_translate"]),
      resourceId: z.number().optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { CREDIT_COSTS } = await import("../stripe");
      const cost = CREDIT_COSTS[input.feature];
      const currentCredits = await db.getUserCredits(ctx.user.id);
      if (currentCredits < cost) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Insufficient credits. Required: ${cost}, Available: ${currentCredits}`,
        });
      }
      // Deduct credits from subscription
      const sub = await db.getUserSubscription(ctx.user.id);
      if (sub) {
        await db.updateUserSubscription(sub.id, {
          creditsRemaining: (sub.creditsRemaining || 0) - cost,
        });
      }
      // Log usage
      const balanceAfter = currentCredits - cost;
      await db.createCreditUsageLog({
        userId: ctx.user.id,
        feature: input.feature,
        creditsUsed: cost,
        balanceBefore: currentCredits,
        balanceAfter,
        resourceId: input.resourceId,
        metadata: input.metadata,
      });
      // Also record in credit transactions
      await db.addCreditTransaction({
        userId: ctx.user.id,
        type: "usage",
        amount: -cost,
        balanceAfter,
        description: `Used ${input.feature}`,
        resourceType: input.feature,
        resourceId: input.resourceId,
      });
      return { success: true, creditsUsed: cost, remaining: balanceAfter };
    }),
  // Check low balance and notify
  checkLowBalance: protectedProcedure.query(async ({ ctx }) => {
    const credits = await db.getUserCredits(ctx.user.id);
    const LOW_THRESHOLD = 10;
    const isLow = credits <= LOW_THRESHOLD;
    if (isLow && credits > 0) {
      // Notify owner about low balance (fire-and-forget)
      const { notifyOwner } = await import("../_core/notification");
      notifyOwner({
        title: "\ud06c\ub808\ub527 \uc794\uc561 \ubd80\uc871 \uc54c\ub9bc",
        content: `\uc0ac\uc6a9\uc790 ${ctx.user.name || ctx.user.openId}\uc758 \ud06c\ub808\ub527\uc774 ${credits}\uac1c \ub0a8\uc558\uc2b5\ub2c8\ub2e4. \ucda9\uc804\uc744 \uad8c\uc7a5\ud574\uc8fc\uc138\uc694.`,
      }).catch(() => {});
    }
    return { credits, isLow, threshold: LOW_THRESHOLD };
  }),
  // Usage stats by feature and period
  usageStats: protectedProcedure
    .input(z.object({
      period: z.enum(["7d", "30d", "all"]).default("30d"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const logs = await db.getUserCreditUsageLogs(ctx.user.id, 500);
      const period = input?.period || "30d";
      const now = Date.now();
      const cutoff = period === "7d" ? now - 7 * 86400000 : period === "30d" ? now - 30 * 86400000 : 0;

      const filtered = cutoff > 0 ? logs.filter((l: any) => new Date(l.createdAt).getTime() >= cutoff) : logs;

      // Group by feature
      const byFeature: Record<string, { count: number; credits: number }> = {};
      let totalCredits = 0;
      for (const log of filtered) {
        if (!byFeature[log.feature]) byFeature[log.feature] = { count: 0, credits: 0 };
        byFeature[log.feature].count++;
        byFeature[log.feature].credits += log.creditsUsed;
        totalCredits += log.creditsUsed;
      }

      // Daily trend
      const dailyMap: Record<string, number> = {};
      for (const log of filtered) {
        const day = new Date(log.createdAt).toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + log.creditsUsed;
      }
      const dailyTrend = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, credits]) => ({ date, credits }));

      // Recent logs (top 20)
      const recentLogs = filtered.slice(0, 20).map((l: any) => ({
        feature: l.feature,
        creditsUsed: l.creditsUsed,
        createdAt: l.createdAt,
        resourceId: l.resourceId,
      }));

      return { byFeature, totalCredits, dailyTrend, recentLogs, period };
    }),
});

export const paymentRouter = router({
  // Create checkout session for subscription
  createSubscriptionCheckout: protectedProcedure
    .input(z.object({
      planSlug: z.string(),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getStripe, SUBSCRIPTION_PRODUCTS } = await import("../stripe");
      const stripe = getStripe();
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system is not configured." });
      const product = SUBSCRIPTION_PRODUCTS[input.planSlug as keyof typeof SUBSCRIPTION_PRODUCTS];
      if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan." });
      const priceCents = input.billingCycle === "yearly" ? product.priceYearly : product.priceMonthly;
      // Create payment record
      const paymentRecord = await db.createPayment({
        userId: ctx.user.id,
        paymentType: "subscription",
        paymentMethod: "stripe",
        amountCents: priceCents,
        currency: "usd",
        status: "pending",
        description: `${product.name} subscription (${input.billingCycle})`,
        metadata: { planSlug: input.planSlug, billingCycle: input.billingCycle },
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `AI Speaker ${product.name} (${input.billingCycle === "yearly" ? "yearly" : "monthly"})` },
            unit_amount: priceCents,
          },
          quantity: 1,
        }],
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          payment_id: paymentRecord.id.toString(),
          plan_slug: input.planSlug,
          billing_cycle: input.billingCycle,
          type: "subscription",
        },
        success_url: `${input.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/pricing`,
      });
      await db.updatePaymentStatus(paymentRecord.id, "processing", session.id);
      return { checkoutUrl: session.url };
    }),

  // Create checkout session for credit package
  createCreditCheckout: protectedProcedure
    .input(z.object({
      packageId: z.string(),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getStripe, CREDIT_PACKAGES } = await import("../stripe");
      const stripe = getStripe();
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system is not configured." });
      const pkg = CREDIT_PACKAGES.find(p => p.id === input.packageId);
      if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid package." });
      const paymentRecord = await db.createPayment({
        userId: ctx.user.id,
        paymentType: "credit_package",
        paymentMethod: "stripe",
        amountCents: pkg.priceCents,
        currency: "usd",
        creditAmount: pkg.credits,
        status: "pending",
        description: `${pkg.name} credit package`,
        metadata: { packageId: input.packageId, credits: pkg.credits },
      });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `AI Speaker ${pkg.name}` },
            unit_amount: pkg.priceCents,
          },
          quantity: 1,
        }],
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          payment_id: paymentRecord.id.toString(),
          package_id: input.packageId,
          credits: pkg.credits.toString(),
          type: "credit_package",
        },
        success_url: `${input.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/pricing`,
      });
      await db.updatePaymentStatus(paymentRecord.id, "processing", session.id);
      return { checkoutUrl: session.url };
    }),

  // Create recurring subscription for monthly credit auto-refill
  createCreditSubscription: protectedProcedure
    .input(z.object({
      planSlug: z.enum(["starter", "professional", "business", "enterprise"]),
      billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getStripe, SUBSCRIPTION_PRODUCTS } = await import("../stripe");
      const stripe = getStripe();
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system is not configured." });
      const product = SUBSCRIPTION_PRODUCTS[input.planSlug];
      if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan." });
      const priceCents = input.billingCycle === "yearly" ? product.priceYearly : product.priceMonthly;
      const interval = input.billingCycle === "yearly" ? "year" : "month";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `AI Speaker ${product.name} - ${product.credits} credits/${interval === "year" ? "year" : "month"}`,
              description: product.description,
            },
            unit_amount: priceCents,
            recurring: { interval },
          },
          quantity: 1,
        }],
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          plan_slug: input.planSlug,
          billing_cycle: input.billingCycle,
          credits: product.credits.toString(),
          type: "credit_subscription",
        },
        success_url: `${input.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
        cancel_url: `${input.origin}/pricing`,
      });
      return { checkoutUrl: session.url };
    }),

  // Cancel credit subscription
  cancelCreditSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const sub = await db.getUserSubscription(ctx.user.id);
      if (!sub || !sub.externalPaymentId) throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found." });
      const { getStripe } = await import("../stripe");
      const stripe = getStripe();
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system is not configured." });
      try {
        await stripe.subscriptions.update(sub.externalPaymentId, {
          cancel_at_period_end: true,
        });
      } catch (e: any) {
        console.warn("[Stripe] Cancel subscription error:", e.message);
      }
      await db.updateUserSubscription(sub.id, { cancelAtPeriodEnd: true });
      return { success: true, cancelAt: sub.currentPeriodEnd };
    }),

  // Get subscription status
  subscriptionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const sub = await db.getUserSubscription(ctx.user.id);
      if (!sub) return { hasSubscription: false, plan: null, status: null };
      const plan = await db.getSubscriptionPlan(sub.planId);
      return {
        hasSubscription: true,
        plan,
        status: sub.status,
        billingCycle: sub.billingCycle,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        creditsRemaining: sub.creditsRemaining,
        externalPaymentId: sub.externalPaymentId,
      };
    }),

  // Get user's payment history
  myPayments: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserPayments(ctx.user.id, input?.limit ?? 50);
    }),

  // Verify payment success
  verifySession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const payment = await db.getPaymentByExternalId(input.sessionId);
      if (!payment) return { status: "not_found" as const };
      if (payment.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return { status: payment.status, payment };
    }),

  // Admin: all payments
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.getAllPayments(200);
  }),
});

export const cryptoRouter = router({
  // Create crypto payment
  createPayment: protectedProcedure
    .input(z.object({
      type: z.enum(["subscription", "credit_package"]),
      planSlug: z.string().optional(),
      billingCycle: z.enum(["monthly", "yearly"]).optional(),
      packageId: z.string().optional(),
      cryptoCurrency: z.enum(["USDT", "USDC", "ETH", "BTC"]),
      network: z.enum(["ethereum", "bsc", "polygon", "tron", "bitcoin"]).default("ethereum"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { SUBSCRIPTION_PRODUCTS, CREDIT_PACKAGES } = await import("../stripe");
      let amountCents = 0;
      let creditAmount: number | undefined;
      let description = "";
      if (input.type === "subscription" && input.planSlug) {
        const product = SUBSCRIPTION_PRODUCTS[input.planSlug as keyof typeof SUBSCRIPTION_PRODUCTS];
        if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });
        amountCents = input.billingCycle === "yearly" ? product.priceYearly : product.priceMonthly;
        description = `${product.name} subscription (${input.billingCycle || "monthly"}) - cryptocurrency`;
      } else if (input.type === "credit_package" && input.packageId) {
        const pkg = CREDIT_PACKAGES.find(p => p.id === input.packageId);
        if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid package" });
        amountCents = pkg.priceCents;
        creditAmount = pkg.credits;
        description = `${pkg.name} credit package - cryptocurrency`;
      } else {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      // Wallet addresses from environment variables
      const evmWallet = process.env.CRYPTO_WALLET_EVM || "0x0000000000000000000000000000000000000000";
      const tronWallet = process.env.CRYPTO_WALLET_TRON || "T0000000000000000000000000000000000";
      const btcWallet = process.env.CRYPTO_WALLET_BTC || "bc1q0000000000000000000000000000000000000000";
      const walletAddresses: Record<string, Record<string, string>> = {
        USDT: { ethereum: evmWallet, bsc: evmWallet, tron: tronWallet, polygon: evmWallet },
        USDC: { ethereum: evmWallet, bsc: evmWallet, polygon: evmWallet },
        ETH: { ethereum: evmWallet },
        BTC: { bitcoin: btcWallet },
      };
      const walletAddress = walletAddresses[input.cryptoCurrency]?.[input.network] || evmWallet;
      // Calculate crypto amount (simplified - in production use real-time price feed)
      const usdAmount = amountCents / 100;
      let cryptoAmount = "0";
      if (input.cryptoCurrency === "USDT" || input.cryptoCurrency === "USDC") {
        cryptoAmount = usdAmount.toFixed(2);
      } else if (input.cryptoCurrency === "ETH") {
        cryptoAmount = (usdAmount / 2000).toFixed(6); // Approximate ETH price
      } else if (input.cryptoCurrency === "BTC") {
        cryptoAmount = (usdAmount / 87000).toFixed(8); // Approximate BTC price
      }
      // Create payment record
      const paymentRecord = await db.createPayment({
        userId: ctx.user.id,
        paymentType: input.type,
        paymentMethod: "crypto",
        amountCents,
        currency: input.cryptoCurrency.toLowerCase(),
        creditAmount,
        status: "pending",
        description,
        metadata: { planSlug: input.planSlug, billingCycle: input.billingCycle, packageId: input.packageId, cryptoCurrency: input.cryptoCurrency, network: input.network },
      });
      // Create crypto payment detail
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await db.createCryptoPayment({
        paymentId: paymentRecord.id,
        cryptoCurrency: input.cryptoCurrency,
        network: input.network,
        walletAddress,
        cryptoAmount,
        usdEquivalent: amountCents,
        expiresAt,
      });
      return {
        paymentId: paymentRecord.id,
        walletAddress,
        cryptoAmount,
        cryptoCurrency: input.cryptoCurrency,
        network: input.network,
        usdAmount: (amountCents / 100).toFixed(2),
        expiresAt: expiresAt.toISOString(),
      };
    }),

  // Check crypto payment status
  checkStatus: protectedProcedure
    .input(z.object({ paymentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment || payment.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const cryptoDetail = await db.getCryptoPaymentByPaymentId(input.paymentId);
      return {
        status: payment.status,
        cryptoDetail,
        isExpired: cryptoDetail ? new Date() > cryptoDetail.expiresAt : false,
      };
    }),

  // Admin: confirm crypto payment manually
  confirmPayment: protectedProcedure
    .input(z.object({ paymentId: z.number(), txHash: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      // Update payment status
      await db.updatePaymentStatus(payment.id, "completed", input.txHash);
      // Update crypto payment
      const cryptoDetail = await db.getCryptoPaymentByPaymentId(payment.id);
      if (cryptoDetail) {
        await db.updateCryptoPayment(cryptoDetail.id, { txHash: input.txHash, confirmations: 3 });
      }
      // Fulfill: activate subscription or add credits
      const metadata = payment.metadata as any;
      if (payment.paymentType === "subscription" && metadata?.planSlug) {
        const plans = await db.listSubscriptionPlans();
        const plan = plans.find((p: any) => p.slug === metadata.planSlug);
        if (plan) {
          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + (metadata.billingCycle === "yearly" ? 12 : 1));
          await db.createUserSubscription({
            userId: payment.userId,
            planId: plan.id,
            status: "active",
            billingCycle: metadata.billingCycle || "monthly",
            currentPeriodEnd: periodEnd,
            creditsRemaining: plan.monthlyCredits,
            externalPaymentId: input.txHash,
          });
        }
      } else if (payment.paymentType === "credit_package" && payment.creditAmount) {
        const sub = await db.getUserSubscription(payment.userId);
        if (sub) {
          await db.updateUserSubscription(sub.id, {
            creditsRemaining: (sub.creditsRemaining || 0) + payment.creditAmount,
          });
        }
        await db.addCreditTransaction({
          userId: payment.userId,
          type: "purchase",
          amount: payment.creditAmount,
          balanceAfter: (sub?.creditsRemaining || 0) + payment.creditAmount,
          description: `Purchased ${payment.creditAmount} credits (cryptocurrency)`,
        });
      }
      return { success: true };
    }),
});

export const revenueRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const [stats, monthlyRevenue, planDist, creditTrend] = await Promise.all([
      db.getPaymentStats(),
      db.getMonthlyRevenue(),
      db.getPlanDistribution(),
      db.getCreditConsumptionTrend(),
    ]);
    return { stats, monthlyRevenue, planDistribution: planDist, creditConsumptionTrend: creditTrend };
  }),
  payments: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getAllPayments(input?.limit ?? 100);
    }),
  /** API usage stats for monitoring */
  apiUsage: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getApiUsageStats(input?.days ?? 30);
    }),
});

export const payoutRouter = router({
  connectOnboard: protectedProcedure
    .input(z.object({ returnUrl: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Creator profile not found. Please create one first." });
      // In test/sandbox mode, simulate Connect onboarding
      const mockAccountId = `acct_test_${ctx.user.id}_${Date.now()}`;
      await db.updateCreatorConnectAccount(profile.id, mockAccountId, "pending");
      const onboardingUrl = `https://connect.stripe.com/setup/s/${mockAccountId}`;
      return { url: onboardingUrl, accountId: mockAccountId };
    }),
  connectStatus: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getCreatorProfileByUserId(ctx.user.id);
    if (!profile) return { status: "no_profile" as const, accountId: null };
    return { status: profile.stripeConnectStatus || "not_started", accountId: profile.stripeConnectAccountId || null };
  }),
  requestPayout: protectedProcedure
    .input(z.object({ amountInCents: z.number().min(1000) }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getCreatorProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Creator profile not found" });
      if (profile.stripeConnectStatus !== "active") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe Connect account not active. Complete onboarding first." });
      // Check available balance
      const earnings = await db.getSellerEarnings(ctx.user.id);
      const pendingPayouts = await db.getPendingPayoutTotal(profile.id);
      const availableBalance = (earnings.total || 0) - pendingPayouts;
      if (input.amountInCents > availableBalance) throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      const platformFee = Math.round(input.amountInCents * 0.2);
      const netPayout = input.amountInCents - platformFee;
      const result = await db.createPayout({
        creatorId: profile.id,
        amountInCents: input.amountInCents,
        platformFeeInCents: platformFee,
        netPayoutInCents: netPayout,
        stripeConnectAccountId: profile.stripeConnectAccountId || undefined,
        status: "pending",
        currency: "usd",
      });
      return { payoutId: result.id, netPayout, platformFee };
    }),
  payoutHistory: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getCreatorProfileByUserId(ctx.user.id);
    if (!profile) return [];
    return db.getCreatorPayouts(profile.id);
  }),
  earnings: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.getCreatorProfileByUserId(ctx.user.id);
    if (!profile) return { totalEarnings: 0, pendingPayouts: 0, availableBalance: 0, completedPayouts: 0 };
    const earnings = await db.getSellerEarnings(ctx.user.id);
    const pendingPayouts = await db.getPendingPayoutTotal(profile.id);
    const payouts = await db.getCreatorPayouts(profile.id);
    const completedPayouts = payouts.filter(p => p.status === "completed").reduce((sum, p) => sum + p.netPayoutInCents, 0);
    return {
      totalEarnings: earnings.total || 0,
      pendingPayouts,
      availableBalance: (earnings.total || 0) - pendingPayouts - completedPayouts,
      completedPayouts,
    };
  }),
});

