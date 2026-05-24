import { generateCertificateHtml, generateScormManifest, generateScoHtml, generateXapiStatements } from "./helpers";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { transcribeAudio } from "../_core/voiceTranscription";
import { generateImage } from "../_core/imageGeneration";
import { generateGeminiTts, GEMINI_VOICES } from "../_core/geminiTts";
import { createImageToVideo as createImageToVideoApi, getImageToVideoStatus as getImageToVideoStatusApi, createTextToVideo as createTextToVideoApi, getTextToVideoStatus as getTextToVideoStatusApi, isKlingConfigured } from "../kling";

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

import { SUPPORTED_LANGUAGES } from "./shared";

export const whiteboardRouter = router({
  save: instructorProcedure
    .input(z.object({ lectureId: z.number(), snapshotData: z.string() }))
    .mutation(async ({ input }) => { await db.saveWhiteboardSnapshot(input.lectureId, input.snapshotData); return { success: true }; }),
  load: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ input }) => db.getLatestWhiteboardSnapshot(input.lectureId)),
});

export const translationRouter = router({
  languages: publicProcedure.query(() => SUPPORTED_LANGUAGES),
  translate: protectedProcedure
    .input(z.object({ text: z.string().min(1), targetLang: z.string().min(2).max(10), sourceLang: z.string().optional(), sourceType: z.enum(["qa_message", "lecture_title", "lecture_description"]).optional(), sourceId: z.number().optional() }))
    .mutation(async ({ input }) => {
      if (input.sourceType && input.sourceId) {
        const cached = await db.getTranslation(input.sourceType, input.sourceId, input.targetLang);
        if (cached) return { translatedText: cached.translatedText, cached: true };
      }
      const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === input.targetLang);
      const response = await invokeLLM({ messages: [{ role: "system", content: `Translate to ${targetLangInfo?.name || input.targetLang}. Output only the translation.` }, { role: "user", content: input.text }] });
      const rawT = response.choices?.[0]?.message?.content;
      const translatedText = typeof rawT === "string" ? rawT : input.text;
      if (input.sourceType && input.sourceId) {
        await db.createTranslation({ sourceType: input.sourceType, sourceId: input.sourceId, sourceLang: input.sourceLang || "ko", targetLang: input.targetLang, originalText: input.text, translatedText });
      }
      return { translatedText, cached: false };
    }),
});

export const templateRouter = router({
  list: publicProcedure.input(z.object({ category: z.string().optional() }).optional()).query(async ({ input }) => db.getAiContextTemplates(input?.category)),
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const template = await db.getAiContextTemplateById(input.id);
    if (!template) throw new TRPCError({ code: "NOT_FOUND" });
    return template;
  }),
  create: instructorProcedure
    .input(z.object({ category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]), name: z.string().min(1), description: z.string().optional(), systemPrompt: z.string().min(1), topics: z.string().optional(), difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional() }))
    .mutation(async ({ ctx, input }) => { const id = await db.createAiContextTemplate({ ...input, isBuiltIn: false, creatorId: ctx.user.id }); return { id }; }),
  update: instructorProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional(), systemPrompt: z.string().optional(), topics: z.string().optional(), difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateAiContextTemplate(id, data); return { success: true }; }),
  delete: instructorProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await db.deleteAiContextTemplate(input.id); return { success: true }; }),
  applyToLecture: instructorProcedure
    .input(z.object({ templateId: z.number(), lectureId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.getAiContextTemplateById(input.templateId);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      await db.updateLecture(input.lectureId, ctx.user.id, { aiContext: template.systemPrompt, category: template.category as any });
      await db.incrementTemplateUsage(input.templateId);
      return { success: true };
    }),
  seed: publicProcedure.mutation(async () => { await db.seedBuiltInTemplates(); return { success: true }; }),
});

export const faceSwapRouter = router({
  list: instructorProcedure.query(async ({ ctx }) => db.getFaceSwapProfiles(ctx.user.id)),
  create: instructorProcedure
    .input(z.object({
      name: z.string().min(1),
      sourceFaceUrl: z.string().optional(),
      targetFaceUrl: z.string().optional(),
      method: z.enum(["did", "heygen", "builtin"]).optional(),
      settings: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createFaceSwapProfile({ ...input, userId: ctx.user.id });
      return { id };
    }),
  update: instructorProcedure
    .input(z.object({
      id: z.number(), name: z.string().optional(),
      sourceFaceUrl: z.string().optional(), targetFaceUrl: z.string().optional(),
      method: z.enum(["did", "heygen", "builtin"]).optional(),
      settings: z.string().optional(), previewUrl: z.string().optional(),
      isDefault: z.boolean().optional(), isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateFaceSwapProfile(id, ctx.user.id, data);
      return { success: true };
    }),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => { await db.deleteFaceSwapProfile(input.id, ctx.user.id); return { success: true }; }),
  uploadFace: instructorProcedure
    .input(z.object({ imageData: z.string(), fileName: z.string(), type: z.enum(["source", "target"]) }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.imageData, "base64");
      const fileKey = `face-swap/${ctx.user.id}/${input.type}-${Date.now()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, "image/png");
      return { url };
    }),
  /** Generate face swap preview using AI image generation */
  generatePreview: instructorProcedure
    .input(z.object({ profileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await db.getFaceSwapProfileById(input.profileId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      // For builtin method, generate an AI avatar based on settings
      const settings = profile.settings ? JSON.parse(profile.settings) : {};
      const { generateImage } = await import("../_core/imageGeneration");
      const prompt = `Professional headshot portrait of a ${settings.gender || "person"}, ${settings.age || "30s"}, ${settings.ethnicity || ""}, wearing business attire, neutral background, high quality, photorealistic`;
      const { url: previewUrl } = await generateImage({ prompt });
      await db.updateFaceSwapProfile(input.profileId, ctx.user.id, { previewUrl });
      return { previewUrl };
    }),
});

export const voiceModRouter = router({
  list: instructorProcedure.query(async ({ ctx }) => db.getVoiceModProfiles(ctx.user.id)),
  create: instructorProcedure
    .input(z.object({
      name: z.string().min(1),
      pitchShift: z.number().min(-12).max(12).optional(),
      speedPercent: z.number().min(50).max(200).optional(),
      toneWarmth: z.number().min(-100).max(100).optional(),
      speakingStyle: z.enum(["formal", "casual", "academic", "friendly", "authoritative"]).optional(),
      voiceCharacter: z.enum(["male_deep", "male_bright", "female_warm", "female_clear", "neutral"]).optional(),
      customTtsVoiceId: z.string().optional(),
      stylePrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createVoiceModProfile({ ...input, userId: ctx.user.id });
      return { id };
    }),
  update: instructorProcedure
    .input(z.object({
      id: z.number(), name: z.string().optional(),
      pitchShift: z.number().min(-12).max(12).optional(),
      speedPercent: z.number().min(50).max(200).optional(),
      toneWarmth: z.number().min(-100).max(100).optional(),
      speakingStyle: z.enum(["formal", "casual", "academic", "friendly", "authoritative"]).optional(),
      voiceCharacter: z.enum(["male_deep", "male_bright", "female_warm", "female_clear", "neutral"]).optional(),
      customTtsVoiceId: z.string().optional(), stylePrompt: z.string().optional(),
      isDefault: z.boolean().optional(), isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateVoiceModProfile(id, ctx.user.id, data);
      return { success: true };
    }),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => { await db.deleteVoiceModProfile(input.id, ctx.user.id); return { success: true }; }),
  /** Preview voice modulation - generate sample audio with applied settings */
  preview: instructorProcedure
    .input(z.object({ profileId: z.number(), sampleText: z.string().optional() }))
    .mutation(async ({ input }) => {
      const profile = await db.getVoiceModProfileById(input.profileId);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      const sampleText = input.sampleText || "Hello, I am an AI instructor. Today we will learn about Web3.";
      let textToSpeak = sampleText;
      // Apply style transformation
      if (profile.stylePrompt) {
        const styleResponse = await invokeLLM({
          messages: [
            { role: "system", content: `Convert the following text to the specified speaking style. Instruction: ${profile.stylePrompt}\nStyle: ${profile.speakingStyle}` },
            { role: "user", content: sampleText },
          ],
        });
        const rawStyled = styleResponse.choices?.[0]?.message?.content;
        if (typeof rawStyled === "string") textToSpeak = rawStyled;
      }
      const charVoiceMap: Record<string, string> = { male_deep: "onyx", male_bright: "echo", female_warm: "nova", female_clear: "shimmer", neutral: "alloy" };
      const voiceId = profile.customTtsVoiceId || charVoiceMap[profile.voiceCharacter] || "alloy";
      const ttsResult = await generateGeminiTts({ text: textToSpeak, voiceId, speed: (profile.speedPercent || 100) / 100 });
      if ('error' in ttsResult) throw new TRPCError({ code: ttsResult.code === 'QUOTA_EXCEEDED' ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR', message: ttsResult.error });
      const fileKey = `voice-mod-preview/${Date.now()}-${nanoid(6)}.mp3`;
      const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
      await db.updateVoiceModProfile(input.profileId, 0, { previewAudioUrl: url });
      return { audioUrl: url, transformedText: textToSpeak, voiceId };
    }),
});

export const platformRouter = router({
  list: instructorProcedure.query(async ({ ctx }) => db.getPlatformIntegrations(ctx.user.id)),
  create: instructorProcedure
    .input(z.object({
      platform: z.enum(["zoom", "google_meet", "webex", "tencent", "obs"]),
      name: z.string().min(1),
      apiKey: z.string().optional(), apiSecret: z.string().optional(),
      meetingUrl: z.string().optional(), config: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createPlatformIntegration({ ...input, userId: ctx.user.id });
      return { id };
    }),
  update: instructorProcedure
    .input(z.object({
      id: z.number(), name: z.string().optional(),
      apiKey: z.string().optional(), apiSecret: z.string().optional(),
      meetingUrl: z.string().optional(), config: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updatePlatformIntegration(id, ctx.user.id, data);
      return { success: true };
    }),
  delete: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => { await db.deletePlatformIntegration(input.id, ctx.user.id); return { success: true }; }),
  /** Generate meeting link for external platform */
  createMeeting: instructorProcedure
    .input(z.object({ integrationId: z.number(), lectureId: z.number(), topic: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await db.getPlatformIntegrationById(input.integrationId);
      if (!integration) throw new TRPCError({ code: "NOT_FOUND" });
      // For now, return the configured meeting URL or generate a placeholder
      const meetingUrl = integration.meetingUrl || `https://${integration.platform}.example.com/meeting/${nanoid(10)}`;
      return { meetingUrl, platform: integration.platform };
    }),
});

export const certificateRouter = router({
  /** Issue a certificate for a completed lecture */
  issue: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already issued
      const existing = await db.getCertificateForLecture(ctx.user.id, input.lectureId);
      if (existing) return { certificateCode: existing.certificateCode, pdfUrl: existing.pdfUrl, alreadyIssued: true };
      // Check completion
      const progress = await db.getLearningProgressForLecture(ctx.user.id, input.lectureId);
      if (!progress || (progress.completionPercent || 0) < 70) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "You must complete at least 70% of the lecture to receive a certificate." });
      }
      const lecture = await db.getLectureById(input.lectureId);
      if (!lecture) throw new TRPCError({ code: "NOT_FOUND" });
      const certificateCode = `CERT-${nanoid(12).toUpperCase()}`;
      const studentName = ctx.user.name || "Student";
      // Generate certificate HTML and store as PDF placeholder
      const certHtml = generateCertificateHtml(studentName, lecture.title, certificateCode, progress.completionPercent || 100);
      const certBuffer = Buffer.from(certHtml, "utf-8");
      const fileKey = `certificates/${certificateCode}.html`;
      const { url: pdfUrl } = await storagePut(fileKey, certBuffer, "text/html");
      const id = await db.createCertificate({
        userId: ctx.user.id, lectureId: input.lectureId, certificateCode,
        studentName, lectureTitle: lecture.title, completionPercent: progress.completionPercent || 100, pdfUrl,
      });
      return { certificateCode, pdfUrl, alreadyIssued: false };
    }),
  /** Verify a certificate by code */
  verify: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const cert = await db.getCertificateByCode(input.code);
      if (!cert) return { valid: false };
      return { valid: true, certificate: cert };
    }),
  /** Get user's certificates */
  myCertificates: protectedProcedure.query(async ({ ctx }) => db.getUserCertificates(ctx.user.id)),
});

export const sessionRouter = router({
  /** Start a new live session */
  start: instructorProcedure
    .input(z.object({
      lectureId: z.number(),
      faceSwapProfileId: safeOptionalNumber,
      voiceModProfileId: safeOptionalNumber,
      platformIntegrationId: z.number().optional(),
      externalMeetingUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const webrtcRoomId = `room-${nanoid(10)}`;
      const id = await db.createLectureSession({
        ...input, instructorId: ctx.user.id, status: "live",
        webrtcRoomId, startedAt: new Date(),
      });
      await db.updateLectureStatus(input.lectureId, "live");
      return { sessionId: id, webrtcRoomId };
    }),
  /** End a live session */
  end: instructorProcedure
    .input(z.object({ sessionId: z.number(), lectureId: z.number() }))
    .mutation(async ({ input }) => {
      await db.endLectureSession(input.sessionId);
      await db.updateLectureStatus(input.lectureId, "completed");
      return { success: true };
    }),
  /** Get current session for a lecture */
  current: protectedProcedure
    .input(z.object({ lectureId: z.number() }))
    .query(async ({ input }) => db.getLectureSession(input.lectureId)),
  /** Get active sessions for instructor */
  activeSessions: instructorProcedure.query(async ({ ctx }) => db.getActiveSessions(ctx.user.id)),
  /** Get session history */
  history: instructorProcedure.query(async ({ ctx }) => db.getSessionHistory(ctx.user.id)),
});

export const akoolRouter = router({
  // Get available I2V effects
  getEffects: protectedProcedure
    .query(async () => {
      const akool = await import("../akool");
      const result = await akool.getI2VEffects();
      return result.data || [];
    }),

  // Get Akool avatar list
  getAvatars: protectedProcedure
    .input(z.object({ page: z.number().default(1), size: z.number().default(50) }))
    .query(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.getAvatarList(input.page, input.size);
      return result.data || [];
    }),

  // Image to Video
  imageToVideo: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      prompt: z.string().min(1).max(2000),
      negativePrompt: z.string().optional(),
      resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
      videoLength: z.union([z.literal(5), z.literal(10)]).default(5),
      effectCode: z.string().optional(),
      isPremiumModel: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.createImageToVideo({
        image_url: input.imageUrl,
        prompt: input.prompt,
        negative_prompt: input.negativePrompt,
        resolution: input.resolution,
        video_length: input.videoLength,
        effect_code: input.effectCode,
        is_premium_model: input.isPremiumModel,
      });
      return { id: result.data?._id || result.data?.id, status: "pending" };
    }),

  // Get I2V result
  getI2VResult: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.getImageToVideoResult(input.id);
      const data = result.data || {};
      return {
        status: data.status as number, // 1=pending, 2=processing, 3=completed, 4=failed
        videoUrl: data.video_url || data.url || null,
        thumbnailUrl: data.thumbnail_url || null,
        progress: data.progress || 0,
      };
    }),

  // Face Swap Pro (single face, highest quality)
  faceSwapPro: protectedProcedure
    .input(z.object({
      sourceImageUrl: z.string().url(),
      targetImageUrl: z.string().url(),
      faceEnhance: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.faceSwapPro({
        sourceImage: [{ path: input.sourceImageUrl }],
        targetImage: [{ path: input.targetImageUrl }],
        face_enhance: input.faceEnhance,
      });
      return { id: result.data?._id || result.data?.id, status: "pending" };
    }),

  // Face Swap Plus (multi-face, image+video)
  faceSwapPlus: protectedProcedure
    .input(z.object({
      sourceUrl: z.string().url(),
      targetUrl: z.string().url(),
      faceEnhance: z.boolean().default(false),
      singleFaceMode: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.faceSwapPlus({
        source_url: input.sourceUrl,
        target_url: input.targetUrl,
        face_enhance: input.faceEnhance,
        single_face_mode: input.singleFaceMode,
      });
      return { id: result.data?._id || result.data?.id, status: "pending" };
    }),

  // Get Face Swap result
  getFaceSwapResult: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.getFaceSwapResult(input.id);
      const data = result.data || {};
      return {
        status: data.faceswap_status as number,
        resultUrl: data.url || null,
      };
    }),

  // Create Talking Avatar video
  createTalkingAvatar: protectedProcedure
    .input(z.object({
      avatarId: z.string().optional(),
      avatarUrl: z.string().url().optional(),
      avatarFrom: z.number().default(2),
      audioUrl: z.string().url().optional(),
      inputText: z.string().optional(),
      voiceId: z.string().optional(),
      backgroundUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const akool = await import("../akool");
      const elements: any[] = [];

      // Background image
      if (input.backgroundUrl) {
        elements.push({
          type: "image",
          url: input.backgroundUrl,
          width: 3840,
          height: 2160,
          scale_x: 1,
          scale_y: 1,
          offset_x: 0,
          offset_y: 0,
        });
      }

      // Avatar element
      elements.push({
        type: "avatar",
        url: input.avatarUrl,
        avatar_id: input.avatarId,
        width: 1080,
        height: 1080,
        scale_x: 1,
        scale_y: 1,
        offset_x: input.backgroundUrl ? 1380 : 1380,
        offset_y: input.backgroundUrl ? 540 : 540,
      });

      // Audio element
      elements.push({
        type: "audio",
        url: input.audioUrl,
        input_text: input.inputText,
        voice_id: input.voiceId,
      });

      const result = await akool.createTalkingAvatar({
        avatar_from: input.avatarFrom,
        elements,
      });
      return { id: result.data?._id || result.data?.video_id, status: "pending" };
    }),

  // Get Talking Avatar result
  getTalkingAvatarResult: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.getTalkingAvatarResult(input.videoId);
      const data = result.data || {};
      return {
        status: data.video_status as number,
        videoUrl: data.url || null,
      };
    }),

  // Video Translation
  translateVideo: protectedProcedure
    .input(z.object({
      videoUrl: z.string().url(),
      targetLanguage: z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.createVideoTranslation({
        video_url: input.videoUrl,
        target_language: input.targetLanguage,
      });
      return { id: result.data?._id || result.data?.id, status: "pending" };
    }),

  // Get Video Translation result
  getTranslationResult: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const akool = await import("../akool");
      const result = await akool.getVideoTranslationResult(input.id);
      const data = result.data || {};
      return {
        status: data.status as number,
        videoUrl: data.url || null,
      };
    }),

  // Get user credits info
  getCredits: protectedProcedure
    .query(async () => {
      const akool = await import("../akool");
      try {
        const result = await akool.getUserCredits();
        return result.data || null;
      } catch {
        return null;
      }
    }),

  // ============ v8.0: TTS (Text to Speech) ============
  ttsVoices: protectedProcedure
    .query(async () => {
      const { GEMINI_VOICES } = await import("../_core/geminiTts");
      return GEMINI_VOICES;
    }),

  ttsGenerate: protectedProcedure
    .input(z.object({
      text: z.string().min(1).max(5000),
      voiceId: z.string().default("Kore"),
      speed: z.number().min(0.5).max(2.0).default(1.0),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateGeminiTts } = await import("../_core/geminiTts");
      const { storagePut } = await import("../storage");
      const result = await generateGeminiTts({
        text: input.text,
        voiceId: input.voiceId,
        speed: input.speed,
      });
      if ('error' in result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
      // Upload to S3
      const ext = result.mimeType.includes("mp3") ? "mp3" : "wav";
      const key = `tts/${ctx.user.id}-${Date.now()}-${nanoid(6)}.${ext}`;
      const { url } = await storagePut(key, result.audioBuffer, result.mimeType);
      return { audioUrl: url, voiceName: result.voiceName, mimeType: result.mimeType };
    }),

  // ============ v8.0: Voice Clone (placeholder - uses TTS with voice matching) ============
  voiceClone: protectedProcedure
    .input(z.object({
      sampleAudioUrl: z.string().url(),
      text: z.string().min(1).max(5000),
      voiceId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Voice clone: analyze sample and pick closest Gemini voice, then generate
      const { invokeLLM } = await import("../_core/llm");
      const { generateGeminiTts, GEMINI_VOICES } = await import("../_core/geminiTts");
      const { storagePut } = await import("../storage");

      // Use LLM to suggest best matching voice based on description
      let voiceId = input.voiceId || "Kore";
      if (!input.voiceId) {
        try {
          const voiceList = GEMINI_VOICES.map(v => `${v.id}: ${v.desc} (${v.style})`).join("\n");
          const llmRes = await invokeLLM({
            messages: [
              { role: "system", content: `You are a voice matching expert. Given an audio sample URL, suggest the best matching voice ID from this list. Return ONLY the voice ID, nothing else.\n\nAvailable voices:\n${voiceList}` },
              { role: "user", content: `Audio sample: ${input.sampleAudioUrl}\nPlease suggest the best matching voice ID.` },
            ],
          });
          const rawContent = llmRes.choices?.[0]?.message?.content;
          const suggested = typeof rawContent === 'string' ? rawContent.trim() : undefined;
          if (suggested && GEMINI_VOICES.some(v => v.id === suggested)) {
            voiceId = suggested;
          }
        } catch { /* fallback to default */ }
      }

      const result = await generateGeminiTts({ text: input.text, voiceId });
      if ('error' in result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
      const ext = result.mimeType.includes("mp3") ? "mp3" : "wav";
      const key = `voice-clone/${ctx.user.id}-${Date.now()}-${nanoid(6)}.${ext}`;
      const { url } = await storagePut(key, result.audioBuffer, result.mimeType);
      return { audioUrl: url, voiceName: result.voiceName, matchedVoiceId: voiceId };
    }),

  // ============ v8.0: Voice Change ============
  voiceChange: protectedProcedure
    .input(z.object({
      sourceAudioUrl: z.string().url(),
      targetVoiceId: z.string(),
      text: z.string().min(1).max(5000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { generateGeminiTts } = await import("../_core/geminiTts");
      const { storagePut } = await import("../storage");
      const { transcribeAudio } = await import("../_core/voiceTranscription");

      // If no text provided, transcribe the source audio first
      let text = input.text;
      if (!text) {
        try {
          const transcription = await transcribeAudio({ audioUrl: input.sourceAudioUrl });
          if ('text' in transcription) {
            text = transcription.text;
          } else {
            throw new Error("Transcription failed");
          }
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Speech recognition failed. Please enter text manually." });
        }
      }

      const result = await generateGeminiTts({ text, voiceId: input.targetVoiceId });
      if ('error' in result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error });
      const ext = result.mimeType.includes("mp3") ? "mp3" : "wav";
      const key = `voice-change/${ctx.user.id}-${Date.now()}-${nanoid(6)}.${ext}`;
      const { url } = await storagePut(key, result.audioBuffer, result.mimeType);
      return { audioUrl: url, voiceName: result.voiceName, originalText: text };
    }),

  // ============ v8.0: Image Generation ============
  imageGen: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(2000),
      style: z.enum(["realistic", "illustration", "cartoon", "sketch", "3d", "anime", "watercolor"]).default("realistic"),
    }))
    .mutation(async ({ input }) => {
      const { generateImage } = await import("../_core/imageGeneration");
      const stylePrompts: Record<string, string> = {
        realistic: "photorealistic, high quality, detailed",
        illustration: "digital illustration, clean lines, vibrant colors",
        cartoon: "cartoon style, bold outlines, bright colors",
        sketch: "pencil sketch, hand-drawn, artistic",
        "3d": "3D rendered, CGI, volumetric lighting",
        anime: "anime style, Japanese animation, detailed",
        watercolor: "watercolor painting, soft edges, artistic",
      };
      const fullPrompt = `${input.prompt}. Style: ${stylePrompts[input.style] || stylePrompts.realistic}`;
      const result = await generateImage({ prompt: fullPrompt });
      return { imageUrl: result.url || null };
    }),

  // ============ v8.0: Background Remove / Change ============
  bgRemove: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(),
      newBackground: z.string().optional(), // description of new background
    }))
    .mutation(async ({ input }) => {
      const { generateImage } = await import("../_core/imageGeneration");
      const prompt = input.newBackground
        ? `Remove the background from this image and replace it with: ${input.newBackground}. Keep the main subject intact.`
        : "Remove the background from this image, making it transparent. Keep the main subject intact with clean edges.";
      const result = await generateImage({
        prompt,
        originalImages: [{ url: input.imageUrl }],
      });
      return { imageUrl: result.url || null };
    }),
});

export const aiHistoryRouter = router({
  list: protectedProcedure
    .input(z.object({ tool: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const items = await db.getAiGenerationsByUser(ctx.user.id, input ?? undefined);
      const total = await db.getAiGenerationCount(ctx.user.id);
      return { items, total };
    }),
  record: protectedProcedure
    .input(z.object({
      tool: z.string(),
      inputSummary: z.string().optional(),
      outputUrl: z.string().optional(),
      outputType: z.enum(["audio", "image", "video"]),
      creditsUsed: z.number().optional(),
      status: z.enum(["completed", "failed"]).optional(),
      metadata: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createAiGeneration({ userId: ctx.user.id, ...input });
      return { id };
    }),
});

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      return db.listNotifications(ctx.user.id, input.limit, input.offset);
    }),
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return db.getUnreadNotificationCount(ctx.user.id);
  }),
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});

export const scormRouter = router({
  generate: instructorProcedure
    .input(z.object({
      pipelineId: z.number(),
      title: z.string().min(1).max(500),
      scormVersion: z.enum(["1.2", "2004"]).default("2004"),
      completionCriteria: z.enum(["slide_view", "quiz_pass", "time_spent"]).default("slide_view"),
      minTimeSec: z.number().default(0),
      includeSubtitles: z.boolean().default(true),
      includeThumbnail: z.boolean().default(true),
      language: z.string().default("ko"),
    }))
    .mutation(async ({ ctx, input }) => {
      const pipelineResult = await db.getProductionPipelineById(input.pipelineId);
      if (!pipelineResult || pipelineResult.pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found." });
      }
      const pipelineData = pipelineResult.pipeline;
      if (pipelineData.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only completed pipelines can be exported as SCORM." });
      }
      const scriptData = pipelineResult.script;
      const pkg = await db.createScormPackage({
        userId: ctx.user.id,
        pipelineId: input.pipelineId,
        title: input.title,
        scormVersion: input.scormVersion,
        completionCriteria: input.completionCriteria,
        minTimeSec: input.minTimeSec,
        includeSubtitles: input.includeSubtitles,
        includeThumbnail: input.includeThumbnail,
        language: input.language,
        status: "generating",
      });

      // Generate SCORM package asynchronously
      (async () => {
        try {
          const sections = scriptData?.sections ? JSON.parse(scriptData.sections) : [];
          const manifest = generateScormManifest(input.title, input.scormVersion, sections, input.language);
          const scoHtml = generateScoHtml(input.title, pipelineData, sections, input.scormVersion, input.includeSubtitles);
          const xapiStatements = generateXapiStatements(input.title, pipelineData, sections);

          // Create package content as JSON (simulated ZIP)
          const packageContent = JSON.stringify({
            manifest,
            scoHtml,
            xapiStatements,
            metadata: {
              title: input.title,
              version: input.scormVersion,
              language: input.language,
              duration: pipelineData.totalDurationSec,
              sections: sections.length,
            },
          });

          const { url } = await storagePut(
            `scorm/${ctx.user.id}/${pkg.id}/package.json`,
            Buffer.from(packageContent),
            "application/json"
          );

          await db.updateScormPackage(pkg.id, {
            status: "ready",
            packageUrl: url,
            fileSizeBytes: Buffer.byteLength(packageContent),
          });
        } catch (err: any) {
          await db.updateScormPackage(pkg.id, {
            status: "failed",
            errorMessage: err.message || "Package generation failed",
          });
        }
      })();

      return { id: pkg.id, status: "generating" };
    }),

  list: instructorProcedure.query(async ({ ctx }) => {
    return db.getScormPackagesByUser(ctx.user.id);
  }),

  get: instructorProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const pkg = await db.getScormPackageById(input.id);
      if (!pkg || pkg.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found." });
      }
      return pkg;
    }),

  download: instructorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await db.getScormPackageById(input.id);
      if (!pkg || pkg.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Package not found." });
      }
      if (pkg.status !== "ready" || !pkg.packageUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Package is not ready." });
      }
      await db.incrementScormDownloadCount(input.id);
      return { url: pkg.packageUrl };
    }),
});

