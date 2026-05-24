import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const adminRouter = router({
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listAllUsers();
  }),
  listSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listAllSubscriptions();
  }),
  listPlans: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listSubscriptionPlans();
  }),
  listPresets: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const [faces, voices] = await Promise.all([
      db.listSampleFaces(),
      db.listSampleVoices(),
    ]);
    return { faces, voices };
  }),
  // --- Format Template Management ---
  listFormatTemplates: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.listAllLectureFormatTemplates();
  }),
  createFormatTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["personnel", "style", "insert"]),
      icon: z.string().optional(),
      colorTheme: z.string().default("blue"),
      personnelConfig: z.any().optional(),
      styleConfig: z.any().optional(),
      insertElements: z.any().optional(),
      defaultScriptTemplate: z.string().optional(),
      previewImageUrl: z.string().optional(),
      sortOrder: z.number().default(0),
      isActive: z.boolean().default(true),
      isSystem: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.createLectureFormatTemplate(input as any);
    }),
  updateFormatTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.enum(["personnel", "style", "insert"]).optional(),
      icon: z.string().optional(),
      colorTheme: z.string().optional(),
      personnelConfig: z.any().optional(),
      styleConfig: z.any().optional(),
      insertElements: z.any().optional(),
      defaultScriptTemplate: z.string().optional(),
      previewImageUrl: z.string().optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...data } = input;
      return db.updateLectureFormatTemplate(id, data as any);
    }),
  deleteFormatTemplate: protectedProcedure
    .input(z.object({ id: z.number(), hard: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      if (input.hard) return db.hardDeleteLectureFormatTemplate(input.id);
      return db.deleteLectureFormatTemplate(input.id);
    }),
});

export const adminAnalyticsRouter = router({
  creditSales: protectedProcedure
    .input(z.object({ period: z.enum(["day", "week", "month"]) }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getAdminCreditSalesStats(input?.period ?? "day");
    }),
  toolUsage: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.getAdminToolUsageStats();
  }),
  userStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db.getAdminUserStats();
  }),
});

export const adminReportRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const reports = await db.listPresetReportsAdmin(input.status, input.limit, input.offset);
      const totalPending = await db.getPresetReportCount("pending");
      const totalAll = await db.getPresetReportCount();
      return { reports, totalPending, totalAll };
    }),
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "reviewed", "blocked", "dismissed"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await db.updatePresetReportStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),
});

export const adminStatsRouter = router({
  userSignups: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getUserSignupStats(input.days);
    }),
  userActivity: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getUserActivityStats(input.days);
    }),
  userTotals: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getUserTotalStats();
    }),
  topPresets: protectedProcedure
    .input(z.object({ limit: z.number().default(10), sortBy: z.enum(["likes", "downloads"]).default("likes"), type: z.enum(["avatar", "subtitle"]).default("avatar") }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      if (input.type === "avatar") return db.getTopPresets(input.limit, input.sortBy);
      return db.getTopSubtitlePresets(input.limit, input.sortBy);
    }),
  presetCategories: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getPresetCategoryStats();
    }),
  presetGrowth: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.getPresetGrowthStats(input.days);
    }),
});

