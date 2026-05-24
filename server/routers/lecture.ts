import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

// Helper: coerce NaN/null/string to undefined for optional number fields
const safeOptionalNumber = z.union([z.number(), z.null(), z.undefined()]).optional().transform((val): number | undefined => {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'number' || isNaN(val)) return undefined;
  return val;
});

// Instructor-only procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor permission required." });
  }
  return next({ ctx });
});

export const lectureRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional(), status: z.string().optional(), instructorId: z.number().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => db.getLectures(input ?? {})),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lecture = await db.getLectureById(input.id);
      if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "Lecture not found." });
      return lecture;
    }),
  create: instructorProcedure
    .input(z.object({
      title: z.string().min(1), description: z.string().optional(),
      category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
      aiMode: z.enum(["voice", "text", "avatar"]).optional(),
      voiceProfileId: safeOptionalNumber, maxParticipants: z.number().optional(),
      aiContext: z.string().optional(), scheduledAt: z.string().optional(),
      faceSwapProfileId: safeOptionalNumber, voiceModProfileId: safeOptionalNumber,
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createLecture({
        ...input, instructorId: ctx.user.id,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      });
      return { id };
    }),
  update: instructorProcedure
    .input(z.object({
      id: z.number(), title: z.string().optional(), description: z.string().optional(),
      category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
      aiMode: z.enum(["voice", "text", "avatar"]).optional(),
      voiceProfileId: safeOptionalNumber, maxParticipants: z.number().optional(),
      aiContext: z.string().optional(), status: z.enum(["draft", "scheduled", "live", "completed", "archived"]).optional(),
      faceSwapProfileId: safeOptionalNumber, voiceModProfileId: safeOptionalNumber,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateLecture(id, ctx.user.id, data);
      return { success: true };
    }),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteLecture(input.id, ctx.user.id);
      return { success: true };
    }),
  stats: instructorProcedure.query(async ({ ctx }) => db.getLectureStats(ctx.user.id)),
});

export const materialRouter = router({
  list: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ input }) => db.getLectureMaterials(input.lectureId)),
  upload: instructorProcedure
    .input(z.object({ lectureId: z.number(), title: z.string(), fileType: z.enum(["pdf", "ppt", "image", "video", "other"]), fileData: z.string(), fileName: z.string(), pageCount: z.number().optional() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      const fileKey = `materials/${input.lectureId}/${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.fileType === "pdf" ? "application/pdf" : "application/octet-stream");
      const id = await db.createLectureMaterial({ lectureId: input.lectureId, title: input.title, fileType: input.fileType, fileUrl: url, fileKey, pageCount: input.pageCount });
      return { id, url };
    }),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await db.deleteLectureMaterial(input.id); return { success: true }; }),
});

export const enrollmentRouter = router({
  enroll: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.enrollInLecture(input.lectureId, ctx.user.id);
      return { id };
    }),
  list: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ input }) => db.getLectureEnrollments(input.lectureId)),
  myEnrollments: protectedProcedure.query(async ({ ctx }) => db.getUserEnrollments(ctx.user.id)),
  isEnrolled: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ ctx, input }) => db.isEnrolled(input.lectureId, ctx.user.id)),
});

export const qaRouter = router({
  messages: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ input }) => db.getQaMessages(input.lectureId)),
  ask: protectedProcedure
    .input(z.object({ lectureId: z.number(), content: z.string().min(1), inputMethod: z.enum(["text", "voice"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const questionId = await db.createQaMessage({ lectureId: input.lectureId, userId: ctx.user.id, messageType: "question", inputMethod: input.inputMethod || "text", content: input.content });
      await db.incrementQuestionCount(ctx.user.id, input.lectureId);
      const lecture = await db.getLectureById(input.lectureId);
      const systemPrompt = lecture?.aiContext || "You are a Web3 and AI expert instructor. Answer student questions accurately and in an easy-to-understand manner.";

      // Apply voice modulation style if configured
      let styleInstruction = "";
      if (lecture?.voiceModProfileId) {
        const voiceMod = await db.getVoiceModProfileById(lecture.voiceModProfileId);
        if (voiceMod?.stylePrompt) {
          styleInstruction = `\n\nSpeaking style instruction: ${voiceMod.stylePrompt}`;
        }
        if (voiceMod?.speakingStyle) {
          const styleMap: Record<string, string> = {
            formal: "Speak formally and politely", casual: "Speak casually and comfortably", academic: "Speak academically and professionally",
            friendly: "Speak warmly and kindly", authoritative: "Speak with authority and confidence"
          };
          styleInstruction += `\nResponse style: ${styleMap[voiceMod.speakingStyle] || "Speak naturally"} respond accordingly.`;
        }
      }

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt + styleInstruction },
          { role: "user", content: input.content },
        ],
      });
      const rawAnswer = response.choices?.[0]?.message?.content;
      const answerContent = typeof rawAnswer === "string" ? rawAnswer : "Sorry, could not generate a response.";
      const answerId = await db.createQaMessage({ lectureId: input.lectureId, messageType: "answer", inputMethod: "text", content: answerContent });
      await db.incrementAnswerCount(ctx.user.id, input.lectureId);
      return { questionId, answerId, answer: answerContent };
    }),
});

export const vodRouter = router({
  list: publicProcedure
    .input(z.object({ lectureId: z.number().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => db.getVodRecordings(input ?? {})),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const vod = await db.getVodById(input.id);
      if (!vod) throw new TRPCError({ code: "NOT_FOUND", message: "VOD not found." });
      await db.incrementVodViewCount(input.id);
      return vod;
    }),
  timeline: publicProcedure
    .input(z.object({ vodId: z.number() }))
    .query(async ({ input }) => db.getVodTimelineEvents(input.vodId)),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => { await db.deleteVodRecording(input.id); return { success: true }; }),
  createFromLecture: instructorProcedure
    .input(z.object({ lectureId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const lecture = await db.getLectureById(input.lectureId);
      if (!lecture) throw new TRPCError({ code: "NOT_FOUND" });
      const messages = await db.getQaMessages(input.lectureId);
      const snapshots = await db.getWhiteboardSnapshots(input.lectureId);
      const vodId = await db.createVodRecording({ lectureId: input.lectureId, title: `${lecture.title} - Recording`, description: lecture.description, messageCount: messages.length, snapshotCount: snapshots.length, status: "processing", startedAt: lecture.createdAt, endedAt: new Date() });
      if (vodId) {
        let offsetSec = 0;
        for (const msg of messages) {
          await db.createVodTimelineEvent({ vodId, eventType: msg.message.messageType === "question" ? "qa_question" : "qa_answer", offsetSeconds: offsetSec, content: msg.message.content, userId: msg.message.userId, audioUrl: msg.message.audioUrl, avatarVideoUrl: msg.message.avatarVideoUrl });
          offsetSec += 10;
        }
        for (let i = 0; i < snapshots.length; i++) {
          await db.createVodTimelineEvent({ vodId, eventType: "whiteboard_snapshot", offsetSeconds: i * 30, content: snapshots[i].snapshotData });
        }
        const duration = messages.length * 10 + snapshots.length * 30;
        await db.updateVodRecording(vodId, { status: "ready", duration });
      }
      return { vodId };
    }),
});

export const progressRouter = router({
  get: protectedProcedure.input(z.object({ lectureId: z.number() })).query(async ({ ctx, input }) => db.getLearningProgressForLecture(ctx.user.id, input.lectureId)),
  update: protectedProcedure
    .input(z.object({ lectureId: z.number(), timeSpentSeconds: z.number().optional(), lastSlideIndex: z.number().optional(), completionPercent: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { lectureId, ...data } = input;
      await db.getOrCreateLearningProgress(ctx.user.id, lectureId);
      await db.updateLearningProgress(ctx.user.id, lectureId, data);
      return { success: true };
    }),
  myProgress: protectedProcedure.query(async ({ ctx }) => db.getUserLearningProgress(ctx.user.id)),
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const progressList = await db.getUserLearningProgress(ctx.user.id);
    const vodHistory = await db.getUserVodWatchHistory(ctx.user.id);
    const bookmarks = await db.getUserQaBookmarks(ctx.user.id);
    const enrollments = await db.getUserEnrollments(ctx.user.id);
    const certs = await db.getUserCertificates(ctx.user.id);
    const totalTimeSpent = progressList.reduce((sum, p) => sum + (p.progress.timeSpentSeconds || 0), 0);
    const totalQuestionsAsked = progressList.reduce((sum, p) => sum + (p.progress.questionsAsked || 0), 0);
    const avgCompletion = progressList.length > 0 ? Math.round(progressList.reduce((sum, p) => sum + (p.progress.completionPercent || 0), 0) / progressList.length) : 0;
    return {
      stats: { totalEnrollments: enrollments.length, totalTimeSpent, totalQuestionsAsked, avgCompletion, totalVodsWatched: vodHistory.length, totalBookmarks: bookmarks.length, totalCertificates: certs.length },
      recentProgress: progressList.slice(0, 5), recentVodHistory: vodHistory.slice(0, 5), recentBookmarks: bookmarks.slice(0, 5),
    };
  }),
});

export const vodHistoryRouter = router({
  update: protectedProcedure
    .input(z.object({ vodId: z.number(), watchedSeconds: z.number(), totalSeconds: z.number() }))
    .mutation(async ({ ctx, input }) => { await db.updateVodWatchProgress(ctx.user.id, input.vodId, input.watchedSeconds, input.totalSeconds); return { success: true }; }),
  myHistory: protectedProcedure.query(async ({ ctx }) => db.getUserVodWatchHistory(ctx.user.id)),
});

export const bookmarkRouter = router({
  add: protectedProcedure
    .input(z.object({ messageId: z.number(), lectureId: z.number(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => { const id = await db.createQaBookmark({ userId: ctx.user.id, ...input }); return { id }; }),
  remove: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => { await db.deleteQaBookmark(ctx.user.id, input.messageId); return { success: true }; }),
  isBookmarked: protectedProcedure.input(z.object({ messageId: z.number() })).query(async ({ ctx, input }) => db.isBookmarked(ctx.user.id, input.messageId)),
  myBookmarks: protectedProcedure.query(async ({ ctx }) => db.getUserQaBookmarks(ctx.user.id)),
});

