import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook MUST be registered BEFORE express.json() for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const { getStripe } = await import("../stripe");
      const stripe = getStripe();
      if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) return res.status(500).json({ error: "Webhook secret not configured" });
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error(`[Webhook] Signature verification failed:`, err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }
      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }
      console.log(`[Webhook] Received event: ${event.type} (${event.id})`);
      // Handle checkout.session.completed
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const metadata = session.metadata || {};
        const paymentId = parseInt(metadata.payment_id);
        const userId = parseInt(metadata.user_id);
        if (paymentId && userId) {
          const dbModule = await import("../db");
          const payment = await dbModule.getPaymentById(paymentId);
          if (payment && payment.status !== "completed") {
            await dbModule.updatePaymentStatus(paymentId, "completed", session.payment_intent);
            // Fulfill based on type
            if (metadata.type === "subscription" && metadata.plan_slug) {
              const plans = await dbModule.listSubscriptionPlans();
              const plan = plans.find((p: any) => p.slug === metadata.plan_slug);
              if (plan) {
                const periodEnd = new Date();
                periodEnd.setMonth(periodEnd.getMonth() + (metadata.billing_cycle === "yearly" ? 12 : 1));
                await dbModule.createUserSubscription({
                  userId,
                  planId: plan.id,
                  status: "active",
                  billingCycle: metadata.billing_cycle || "monthly",
                  currentPeriodEnd: periodEnd,
                  creditsRemaining: plan.monthlyCredits,
                  externalPaymentId: session.payment_intent,
                });
                console.log(`[Webhook] Subscription activated for user ${userId}: ${plan.name}`);
              }
            } else if (metadata.type === "credit_package" && metadata.credits) {
              const credits = parseInt(metadata.credits);
              const sub = await dbModule.getUserSubscription(userId);
              if (sub) {
                await dbModule.updateUserSubscription(sub.id, {
                  creditsRemaining: (sub.creditsRemaining || 0) + credits,
                });
              }
              await dbModule.addCreditTransaction({
                userId,
                type: "purchase",
                amount: credits,
                balanceAfter: (sub?.creditsRemaining || 0) + credits,
                description: `크레딧 ${credits}개 구매 (Stripe)`,
              });
              console.log(`[Webhook] Credits added for user ${userId}: ${credits}`);
            }
          }
        }
      }
      res.json({ received: true });
    } catch (err: any) {
      console.error("[Webhook] Error:", err);
      res.status(500).json({ error: "Webhook handler error" });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
