import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  setKlingKeys: adminProcedure
    .input(z.object({
      accessKey: z.string().min(1),
      secretKey: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Save to DB for persistence across server restarts
      await db.setSystemSetting("KLING_ACCESS_KEY", input.accessKey, ctx.user.id);
      await db.setSystemSetting("KLING_SECRET_KEY", input.secretKey, ctx.user.id);
      // Also update process.env at runtime so kling.ts picks up the new keys immediately
      process.env.KLING_ACCESS_KEY = input.accessKey;
      process.env.KLING_SECRET_KEY = input.secretKey;
      return { success: true };
    }),
});

/**
 * Load KLING API keys from DB into process.env on server startup.
 * Called once during server initialization.
 */
export async function loadKlingKeysFromDb() {
  try {
    const accessKey = await db.getSystemSetting("KLING_ACCESS_KEY");
    const secretKey = await db.getSystemSetting("KLING_SECRET_KEY");
    if (accessKey && secretKey) {
      process.env.KLING_ACCESS_KEY = accessKey;
      process.env.KLING_SECRET_KEY = secretKey;
      console.log("[System] KLING API keys loaded from database");
    }
  } catch (err) {
    console.error("[System] Failed to load KLING keys from DB:", err);
  }
}
