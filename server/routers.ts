import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { eq } from "drizzle-orm";
import { projectCollaborators } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { generateImage } from "./_core/imageGeneration";
import { generateGeminiTts, GEMINI_VOICES } from "./_core/geminiTts";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";
import axios from "axios";
import crypto from "crypto";
import { createImageToVideo as createImageToVideoApi, getImageToVideoStatus as getImageToVideoStatusApi, createTextToVideo as createTextToVideoApi, getTextToVideoStatus as getTextToVideoStatusApi, isKlingConfigured } from "./kling";

// Helper: coerce NaN/null/string to undefined for optional number fields
// Uses z.union to accept number | null | undefined, then transforms to number | undefined
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

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

// TTS voice options - Gemini 2.5 Flash TTS voices
const TTS_VOICES = GEMINI_VOICES;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Get Google Client ID for frontend
    getGoogleClientId: publicProcedure.query(() => {
      return { clientId: process.env.VITE_GOOGLE_CLIENT_ID || "" };
    }),

    // Email/Password Registration
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email already registered." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const userId = await db.createUserWithEmail({
          email: input.email,
          passwordHash,
          name: input.name,
        });
        const user = await db.getUserById(userId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Registration failed" });
        const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    // Email/Password Login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    // Google OAuth Login
    googleLogin: publicProcedure
      .input(z.object({
        credential: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify Google ID token
        let googlePayload: { sub: string; email: string; name: string; picture?: string };
        try {
          const response = await axios.get(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${input.credential}`
          );
          googlePayload = {
            sub: response.data.sub,
            email: response.data.email,
            name: response.data.name || response.data.email.split("@")[0],
            picture: response.data.picture,
          };
        } catch (err) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Google authentication failed." });
        }

        // Check if user exists by Google ID
        let user = await db.getUserByGoogleId(googlePayload.sub);
        if (!user) {
          // Check if email already exists
          user = await db.getUserByEmail(googlePayload.email);
          if (user) {
            // Link Google to existing account
            await db.linkGoogleToUser(user.id, googlePayload.sub);
          } else {
            // Create new user
            const userId = await db.createUserWithGoogle({
              googleId: googlePayload.sub,
              email: googlePayload.email,
              name: googlePayload.name,
              avatarUrl: googlePayload.picture,
            });
            user = await db.getUserById(userId);
          }
        }
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Login failed" });

        const token = await sdk.createSessionToken(user.id, { email: user.email || "", name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),

    // Forgot Password - generate reset token
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          // Don't reveal whether email exists
          return { success: true, message: "If the email is registered, a password reset link will be sent." };
        }
        // Generate a secure random token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.savePasswordResetToken(user.id, token, expiresAt);
        // In production, send email with reset link
        // For now, return token (development mode)
        console.log(`[Password Reset] Token for ${input.email}: ${token}`);
        return { success: true, message: "If the email is registered, a password reset link will be sent.", resetToken: token };
      }),

    // Reset Password with token
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const resetRecord = await db.getPasswordResetToken(input.token);
        if (!resetRecord) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid reset token." });
        }
        if (new Date() > resetRecord.expiresAt) {
          await db.deletePasswordResetToken(input.token);
          throw new TRPCError({ code: "BAD_REQUEST", message: "Expired reset token. Please request again." });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(resetRecord.userId, passwordHash);
        await db.deletePasswordResetToken(input.token);
        return { success: true, message: "Password changed successfully." };
      }),

    // Change Password (for logged-in users)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This account does not support password changes." });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(user.id, passwordHash);
        return { success: true, message: "Password changed successfully." };
      }),
  }),

  // ============ User & Role ============
  user: router({
    setRole: protectedProcedure
      .input(z.object({ platformRole: z.enum(["instructor", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPlatformRole(ctx.user.id, input.platformRole);
        return { success: true };
      }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().optional(), bio: z.string().optional(), avatarUrl: z.string().optional(), preferredLang: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============ Lectures ============
  lecture: router({
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
  }),

  // ============ Materials ============
  material: router({
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
  }),

  // ============ Enrollment ============
  enrollment: router({
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
  }),

  // ============ Q&A ============
  qa: router({
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
  }),

  // ============ Voice Profile ============
  voiceProfile: router({
    list: instructorProcedure.query(async ({ ctx }) => db.getVoiceProfiles(ctx.user.id)),
    create: instructorProcedure
      .input(z.object({ name: z.string().min(1), ttsVoiceId: z.string().optional(), voiceDescription: z.string().optional(), teachingStyle: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVoiceProfile({ ...input, userId: ctx.user.id });
        return { id };
      }),
    update: instructorProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), ttsVoiceId: z.string().optional(), voiceDescription: z.string().optional(), teachingStyle: z.string().optional(), avatarImageUrl: z.string().optional(), avatarStyle: z.string().optional(), didApiKey: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateVoiceProfile(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.deleteVoiceProfile(input.id, ctx.user.id); return { success: true }; }),
    uploadSample: instructorProcedure
      .input(z.object({ profileId: z.number(), audioData: z.string(), fileName: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.audioData, "base64");
        const fileKey = `voice-samples/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, "audio/webm");
        await db.updateVoiceProfile(input.profileId, ctx.user.id, { sampleUrl: url });
        return { url };
      }),
  }),

  // ============ TTS ============
  tts: router({
    voices: publicProcedure.query(() => TTS_VOICES),
    /** Preview a voice with a short sample text */
    preview: publicProcedure
      .input(z.object({ voiceId: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const voice = TTS_VOICES.find(v => v.id.toLowerCase() === input.voiceId.toLowerCase());
        const voiceName = voice?.name || input.voiceId;
        const voiceDesc = voice?.desc || '';
        const sampleText = `Hello, I am ${voiceName}. I will deliver AI lectures in a ${voiceDesc} style.`;
        const ttsResult = await generateGeminiTts({ text: sampleText, voiceId: input.voiceId });
        if ('error' in ttsResult) throw new TRPCError({ code: ttsResult.code === 'QUOTA_EXCEEDED' ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR', message: ttsResult.error });
        const fileKey = `tts-preview/${input.voiceId.toLowerCase()}-${Date.now()}.mp3`;
        const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
        return { audioUrl: url, voiceId: input.voiceId, voiceName };
      }),
    generate: protectedProcedure
      .input(z.object({ text: z.string().min(1), voiceId: z.string().optional(), voiceProfileId: safeOptionalNumber, voiceModProfileId: safeOptionalNumber }))
      .mutation(async ({ input }) => {
        let effectiveVoiceId = input.voiceId || "alloy";
        let textToSpeak = input.text;

        // Apply voice modulation if specified
        if (input.voiceModProfileId) {
          const voiceMod = await db.getVoiceModProfileById(input.voiceModProfileId);
          if (voiceMod) {
            if (voiceMod.customTtsVoiceId) effectiveVoiceId = voiceMod.customTtsVoiceId;
            else {
              const charVoiceMap: Record<string, string> = {
                male_deep: "onyx", male_bright: "echo", female_warm: "nova", female_clear: "shimmer", neutral: "alloy"
              };
              effectiveVoiceId = charVoiceMap[voiceMod.voiceCharacter] || effectiveVoiceId;
            }
            // Apply style transformation via LLM
            if (voiceMod.stylePrompt) {
              const styleResponse = await invokeLLM({
                messages: [
                  { role: "system", content: `Convert the following text to the specified speaking style. Keep the content but change only the tone. Instruction: ${voiceMod.stylePrompt}\nStyle: ${voiceMod.speakingStyle}` },
                  { role: "user", content: input.text },
                ],
              });
              const rawStyled = styleResponse.choices?.[0]?.message?.content;
              if (typeof rawStyled === "string") textToSpeak = rawStyled;
            }
          }
        }

        if (input.voiceProfileId) {
          const profile = await db.getVoiceProfileById(input.voiceProfileId);
          if (profile?.ttsVoiceId && !input.voiceModProfileId) effectiveVoiceId = profile.ttsVoiceId;
        }

        const ttsResult = await generateGeminiTts({ text: textToSpeak, voiceId: effectiveVoiceId });
        if ('error' in ttsResult) throw new TRPCError({ code: ttsResult.code === 'QUOTA_EXCEEDED' ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR', message: ttsResult.error });
        const fileKey = `tts/${Date.now()}-${nanoid(6)}.mp3`;
        const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
        return { audioUrl: url, voiceId: effectiveVoiceId, transformedText: textToSpeak !== input.text ? textToSpeak : undefined };
      }),
  }),

  // ============ STT (Speech to Text) ============
  stt: router({
    transcribe: protectedProcedure
      .input(z.object({ audioUrl: z.string(), language: z.string().optional() }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({ audioUrl: input.audioUrl, language: input.language });
        if ('error' in result) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
        }
        return { text: result.text, language: result.language };
      }),
  }),

  // ============ Avatar (D-ID) ============
  avatar: router({
    generate: instructorProcedure
      .input(z.object({ text: z.string().min(1), voiceProfileId: safeOptionalNumber, useDid: z.boolean().optional(), faceSwapProfileId: safeOptionalNumber, voiceModProfileId: safeOptionalNumber }))
      .mutation(async ({ input }) => {
        let voiceId = "alloy";
        let avatarImageUrl: string | null = null;
        let avatarStyle = "rectangular";
        let didApiKey: string | null = null;

        if (input.voiceProfileId) {
          const profile = await db.getVoiceProfileById(input.voiceProfileId);
          if (profile) {
            voiceId = profile.ttsVoiceId || "alloy";
            avatarImageUrl = profile.avatarImageUrl;
            avatarStyle = profile.avatarStyle || "rectangular";
            didApiKey = profile.didApiKey;
          }
        }

        // Apply voice modulation
        if (input.voiceModProfileId) {
          const voiceMod = await db.getVoiceModProfileById(input.voiceModProfileId);
          if (voiceMod) {
            const charVoiceMap: Record<string, string> = { male_deep: "onyx", male_bright: "echo", female_warm: "nova", female_clear: "shimmer", neutral: "alloy" };
            voiceId = voiceMod.customTtsVoiceId || charVoiceMap[voiceMod.voiceCharacter] || voiceId;
          }
        }

        // Use face swap target face as avatar if specified
        if (input.faceSwapProfileId) {
          const faceSwap = await db.getFaceSwapProfileById(input.faceSwapProfileId);
          if (faceSwap?.targetFaceUrl) avatarImageUrl = faceSwap.targetFaceUrl;
        }

        // Generate TTS audio via Gemini
        const ttsResult = await generateGeminiTts({ text: input.text, voiceId });
        if ('error' in ttsResult) throw new TRPCError({ code: ttsResult.code === 'QUOTA_EXCEEDED' ? 'TOO_MANY_REQUESTS' : 'INTERNAL_SERVER_ERROR', message: ttsResult.error });
        const audioKey = `avatar-audio/${Date.now()}-${nanoid(6)}.mp3`;
        const { url: audioUrl } = await storagePut(audioKey, ttsResult.audioBuffer, ttsResult.mimeType);

        // Generate D-ID video if enabled
        let videoUrl: string | null = null;
        const globalDidKey = process.env.DID_API_KEY;
        const effectiveDidKey = didApiKey || globalDidKey;

        if (input.useDid && effectiveDidKey && avatarImageUrl) {
          try {
            const didResponse = await fetch("https://api.d-id.com/talks", {
              method: "POST",
              headers: { "Authorization": `Basic ${effectiveDidKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ source_url: avatarImageUrl, script: { type: "audio", audio_url: audioUrl }, config: { stitch: true, result_format: "mp4" } }),
            });
            if (didResponse.ok) {
              const didData = await didResponse.json() as any;
              const talkId = didData.id;
              let attempts = 0;
              while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, { headers: { "Authorization": `Basic ${effectiveDidKey}` } });
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json() as any;
                  if (statusData.status === "done" && statusData.result_url) {
                    // Upload D-ID video to S3 to prevent URL expiration
                    try {
                      const videoResponse = await fetch(statusData.result_url);
                      if (videoResponse.ok) {
                        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                        const videoKey = `did-videos/${talkId}-${Date.now()}.mp4`;
                        const { url: s3Url } = await storagePut(videoKey, videoBuffer, "video/mp4");
                        videoUrl = s3Url;
                      } else {
                        videoUrl = statusData.result_url; // Fallback to D-ID URL
                      }
                    } catch (uploadErr) {
                      console.error("[D-ID] S3 upload failed, using original URL:", uploadErr);
                      videoUrl = statusData.result_url;
                    }
                    break;
                  }
                  else if (statusData.status === "error") break;
                }
                attempts++;
              }
            }
          } catch (error) { console.error("[D-ID] API error:", error); }
        }

        return { audioUrl, videoUrl, avatarImageUrl, avatarStyle, voiceId, text: input.text, usedDid: !!videoUrl };
      }),
    checkDidKey: instructorProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const response = await fetch("https://api.d-id.com/credits", { headers: { "Authorization": `Basic ${input.apiKey}` } });
          if (response.ok) { const data = await response.json() as any; return { valid: true, credits: data.remaining || 0 }; }
          return { valid: false, credits: 0 };
        } catch { return { valid: false, credits: 0 }; }
      }),
  }),

  // ============ Whiteboard ============
  whiteboard: router({
    save: instructorProcedure
      .input(z.object({ lectureId: z.number(), snapshotData: z.string() }))
      .mutation(async ({ input }) => { await db.saveWhiteboardSnapshot(input.lectureId, input.snapshotData); return { success: true }; }),
    load: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ input }) => db.getLatestWhiteboardSnapshot(input.lectureId)),
  }),

  // ============ VOD ============
  vod: router({
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
  }),

  // ============ Translation ============
  translation: router({
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
  }),

  // ============ Learning Progress ============
  progress: router({
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
  }),

  // ============ VOD Watch History ============
  vodHistory: router({
    update: protectedProcedure
      .input(z.object({ vodId: z.number(), watchedSeconds: z.number(), totalSeconds: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.updateVodWatchProgress(ctx.user.id, input.vodId, input.watchedSeconds, input.totalSeconds); return { success: true }; }),
    myHistory: protectedProcedure.query(async ({ ctx }) => db.getUserVodWatchHistory(ctx.user.id)),
  }),

  // ============ Q&A Bookmarks ============
  bookmark: router({
    add: protectedProcedure
      .input(z.object({ messageId: z.number(), lectureId: z.number(), note: z.string().optional() }))
      .mutation(async ({ ctx, input }) => { const id = await db.createQaBookmark({ userId: ctx.user.id, ...input }); return { id }; }),
    remove: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.deleteQaBookmark(ctx.user.id, input.messageId); return { success: true }; }),
    isBookmarked: protectedProcedure.input(z.object({ messageId: z.number() })).query(async ({ ctx, input }) => db.isBookmarked(ctx.user.id, input.messageId)),
    myBookmarks: protectedProcedure.query(async ({ ctx }) => db.getUserQaBookmarks(ctx.user.id)),
  }),

  // ============ AI Context Templates ============
  template: router({
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
  }),

  // ============ Face Swap Profiles (v2.0) ============
  faceSwap: router({
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
        const { generateImage } = await import("./_core/imageGeneration");
        const prompt = `Professional headshot portrait of a ${settings.gender || "person"}, ${settings.age || "30s"}, ${settings.ethnicity || ""}, wearing business attire, neutral background, high quality, photorealistic`;
        const { url: previewUrl } = await generateImage({ prompt });
        await db.updateFaceSwapProfile(input.profileId, ctx.user.id, { previewUrl });
        return { previewUrl };
      }),
  }),

  // ============ Voice Modulation Profiles (v2.0) ============
  voiceMod: router({
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
  }),

  // ============ Platform Integrations (v2.0) ============
  platform: router({
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
  }),

  // ============ Certificates (v2.0) ============
  certificate: router({
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
  }),

  // ============ Lecture Sessions (v2.0) ============
  session: router({
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
  }),

  // ============ Script Templates (v2.3) ============
  scriptTemplate: router({
    /** List all script templates */
    list: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => db.getScriptTemplates(input?.category)),

    /** Get template by ID */
    getById: instructorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getScriptTemplateById(input.id);
        if (!template) throw new TRPCError({ code: "NOT_FOUND" });
        return template;
      }),

    /** Create a new script template */
    create: instructorProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        structure: z.string().min(2),
        sectionCount: z.number().optional(),
        targetDurationMin: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createScriptTemplate({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category || "general",
          difficulty: input.difficulty || "beginner",
          structure: input.structure,
          sectionCount: input.sectionCount || 0,
          targetDurationMin: input.targetDurationMin || 10,
          isBuiltIn: false,
          tags: input.tags,
        });
        return { id, success: true };
      }),

    /** Update a script template */
    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        structure: z.string().optional(),
        sectionCount: z.number().optional(),
        targetDurationMin: z.number().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateScriptTemplate(id, data as any);
        return { success: true };
      }),

    /** Delete a script template */
    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteScriptTemplate(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Save an existing script as a template */
    saveFromScript: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        tags: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const templateId = await db.saveScriptAsTemplate(input.scriptId, ctx.user.id, input.name, input.description, input.tags);
        if (!templateId) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found." });
        return { id: templateId, success: true };
      }),

    /** Generate a script using a template structure */
    generateFromTemplate: instructorProcedure
      .input(z.object({
        templateId: z.number(),
        title: z.string().min(1),
        prompt: z.string().min(10),
        language: z.string().optional(),
        targetDurationMin: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getScriptTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });

        // Increment usage
        await db.incrementScriptTemplateUsage(input.templateId);

        const structure = JSON.parse(template.structure);
        const durationMin = input.targetDurationMin || template.targetDurationMin || 10;
        const langMap: Record<string, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" };
        const lang = langMap[input.language || "ko"] || "Korean";

        // Create script record first
        const scriptId = await db.createLectureScript({
          userId: ctx.user.id,
          title: input.title,
          prompt: input.prompt,
          category: template.category || "web3",
          difficulty: template.difficulty || "beginner",
          language: input.language || "ko",
          targetDurationMin: durationMin,
          status: "generating",
        });
        if (!scriptId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        try {
          // Build section prompts from template structure
          const sectionPrompts = structure.map((s: any, i: number) => {
            const secDuration = Math.round(durationMin * 60 * (s.durationPercent || (100 / structure.length)) / 100);
            return `Section ${i + 1}: "${s.title}" - ${s.description || ""} (approx ${secDuration}sec)`;
          }).join("\n");

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a professional lecture script writer. Write in ${lang}.
Create a ${durationMin}-minute lecture script following the given template structure.

Template structure:\n${sectionPrompts}

Respond ONLY in the following JSON format:
{
  "sections": [
    {
      "title": "section title",
      "content": "full script text the instructor will speak (natural conversational tone)",
      "durationSec": estimated_seconds,
      "slideNotes": "key keywords/summary to display on slides for this section"
    }
  ]
}`
              },
              { role: "user", content: `Topic: ${input.title}\nDetailed request: ${input.prompt}\nCategory: ${template.category}\nDifficulty: ${template.difficulty}\nTarget duration: ${durationMin} min` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "lecture_script",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          durationSec: { type: "integer" },
                          slideNotes: { type: "string" },
                        },
                        required: ["title", "content", "durationSec", "slideNotes"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["sections"],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          if (typeof rawContent !== "string") throw new Error("LLM returned no content");

          const parsed = JSON.parse(rawContent);
          const sections = parsed.sections || [];
          const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
          const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);

          await db.updateLectureScript(scriptId, {
            scriptContent: fullScript,
            sections: JSON.stringify(sections),
            estimatedDurationSec: totalDuration,
            sectionCount: sections.length,
            status: "ready",
          });

          return { id: scriptId, status: "ready", sectionCount: sections.length, estimatedDurationSec: totalDuration };
        } catch (error) {
          await db.updateLectureScript(scriptId, { status: "error" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate template-based script." });
        }
      }),

    /** Seed built-in script templates */
    seedBuiltIn: instructorProcedure.mutation(async () => {
      const builtInTemplates = [
        {
          name: "Basic Lecture (Intro-Body-Conclusion)",
          description: "The most basic 3-step lecture structure. Introduce the topic, deliver core content, and summarize.",
          category: "general" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "Introduction - Topic Overview", description: "Introduce the lecture topic and learning objectives.", durationPercent: 15, slideNotes: "Topic intro, Learning goals" },
            { title: "Body - Core Content", description: "Explain key concepts and theories in detail.", durationPercent: 60, slideNotes: "Key concepts, Theory" },
            { title: "Conclusion - Summary", description: "Summarize key content and guide next learning steps.", durationPercent: 25, slideNotes: "Summary, Key points" },
          ]),
          sectionCount: 3,
          targetDurationMin: 10,
          tags: "basic,intro,3-step",
        },
        {
          name: "Interactive Q&A Lecture",
          description: "Interactive lecture structure with intro, body, mid Q&A, advanced content, and final Q&A.",
          category: "general" as const,
          difficulty: "intermediate" as const,
          structure: JSON.stringify([
            { title: "Introduction - Background", description: "Explain the background and importance of the topic.", durationPercent: 10, slideNotes: "Background, Importance" },
            { title: "Core Concepts", description: "Explain fundamental concepts and principles.", durationPercent: 25, slideNotes: "Fundamentals" },
            { title: "Mid Q&A - Concept Check", description: "Q&A time to verify learner understanding.", durationPercent: 10, slideNotes: "Q&A, Understanding check" },
            { title: "Advanced Content", description: "Cover advanced concepts and real-world applications.", durationPercent: 30, slideNotes: "Advanced, Cases" },
            { title: "Final Q&A & Summary", description: "Overall summary and final Q&A session.", durationPercent: 25, slideNotes: "Summary, Final Q&A" },
          ]),
          sectionCount: 5,
          targetDurationMin: 20,
          tags: "Q&A,interactive,5-step",
        },
        {
          name: "Practical Workshop",
          description: "Hands-on workshop structure with theory followed by step-by-step practice.",
          category: "ai" as const,
          difficulty: "intermediate" as const,
          structure: JSON.stringify([
            { title: "Overview & Setup", description: "Guide practice goals and required tools/environment.", durationPercent: 10, slideNotes: "Setup, Tools" },
            { title: "Theory Background", description: "Briefly explain core theory needed for practice.", durationPercent: 15, slideNotes: "Core theory" },
            { title: "Practice Step 1", description: "Proceed with the first practice step.", durationPercent: 20, slideNotes: "Step 1" },
            { title: "Practice Step 2", description: "Proceed with the second practice step.", durationPercent: 20, slideNotes: "Step 2" },
            { title: "Practice Step 3", description: "Proceed with the third practice step.", durationPercent: 20, slideNotes: "Step 3" },
            { title: "Results & Wrap-up", description: "Review practice results and guide additional resources.", durationPercent: 15, slideNotes: "Results, Resources" },
          ]),
          sectionCount: 6,
          targetDurationMin: 30,
          tags: "practice,workshop,hands-on,6-step",
        },
        {
          name: "Web3 Project Analysis",
          description: "Systematic Web3 project analysis structure: overview, tech stack, tokenomics, roadmap, investment analysis.",
          category: "web3" as const,
          difficulty: "advanced" as const,
          structure: JSON.stringify([
            { title: "Project Overview", description: "Project vision, mission, and team introduction.", durationPercent: 15, slideNotes: "Vision, Mission, Team" },
            { title: "Tech Stack Analysis", description: "Blockchain used, consensus mechanism, smart contract architecture.", durationPercent: 20, slideNotes: "Tech, Blockchain, Contracts" },
            { title: "Tokenomics", description: "Token distribution, utility, inflation/deflation mechanisms.", durationPercent: 20, slideNotes: "Token, Distribution, Utility" },
            { title: "Roadmap & Partnerships", description: "Development roadmap, key partnerships, ecosystem expansion.", durationPercent: 20, slideNotes: "Roadmap, Partners" },
            { title: "Investment Analysis", description: "SWOT analysis, risk factors, competitor comparison.", durationPercent: 25, slideNotes: "SWOT, Risk, Competition" },
          ]),
          sectionCount: 5,
          targetDurationMin: 15,
          tags: "Web3,project-analysis,tokenomics,5-step",
        },
        {
          name: "DeFi Protocol Tutorial",
          description: "Step-by-step tutorial structure for using DeFi protocols.",
          category: "defi" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "DeFi Basics", description: "Basic DeFi concepts and differences from traditional finance.", durationPercent: 15, slideNotes: "DeFi basics, Differences" },
            { title: "Wallet Setup", description: "MetaMask setup, network addition, token preparation.", durationPercent: 15, slideNotes: "Wallet, MetaMask" },
            { title: "Protocol Usage", description: "How to use core features: swap, liquidity provision, staking.", durationPercent: 30, slideNotes: "Swap, Liquidity, Staking" },
            { title: "Yield & Risk", description: "Understanding APY/APR, impermanent loss, smart contract risk.", durationPercent: 25, slideNotes: "Yield, Risk" },
            { title: "Security Tips & Wrap-up", description: "Anti-phishing, approval management, safe DeFi usage.", durationPercent: 15, slideNotes: "Security, Anti-phishing" },
          ]),
          sectionCount: 5,
          targetDurationMin: 15,
          tags: "DeFi,tutorial,protocol,5-step",
        },
        {
          name: "News Briefing Format",
          description: "Quick news delivery format: headlines, detailed analysis, market impact, outlook.",
          category: "blockchain" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "Today's Headlines", description: "Brief introduction of 3-5 major news items.", durationPercent: 20, slideNotes: "Headlines, Major news" },
            { title: "Deep Analysis", description: "Detailed analysis of the most important news.", durationPercent: 35, slideNotes: "Deep analysis" },
            { title: "Market Impact", description: "Analyze the impact of news on the market.", durationPercent: 25, slideNotes: "Market impact, Price" },
            { title: "Outlook & Summary", description: "Summarize future outlook and investor implications.", durationPercent: 20, slideNotes: "Outlook, Implications" },
          ]),
          sectionCount: 4,
          targetDurationMin: 10,
          tags: "news,briefing,market-analysis,4-step",
        },
      ];

      let created = 0;
      for (const t of builtInTemplates) {
        const existing = await db.getScriptTemplates();
        const exists = existing.find(e => e.name === t.name && e.isBuiltIn);
        if (!exists) {
          await db.createScriptTemplate({ ...t, isBuiltIn: true });
          created++;
        }
      }
      return { created, total: builtInTemplates.length };
    }),
  }),

  // ============ Lecture Scripts (v2.1) ============
  script: router({
    /** Generate a lecture script from a prompt */
    generate: instructorProcedure
      .input(z.object({
        title: z.string().min(1),
        prompt: z.string().min(10),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        language: z.string().optional(),
        targetDurationMin: z.number().min(1).max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scriptId = await db.createLectureScript({
          userId: ctx.user.id,
          title: input.title,
          prompt: input.prompt,
          category: input.category || "web3",
          difficulty: input.difficulty || "beginner",
          language: input.language || "ko",
          targetDurationMin: input.targetDurationMin || 10,
          status: "generating",
        });
        if (!scriptId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Generate script using LLM
        const durationMin = input.targetDurationMin || 10;
        const sectionCount = Math.max(3, Math.ceil(durationMin / 3));
        const langMap: Record<string, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" };
        const lang = langMap[input.language || "ko"] || "Korean";

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a professional lecture script writer. Write in ${lang}.
Create a ${durationMin}-minute lecture script on the given topic.
Divide into ${sectionCount} sections.

Respond ONLY in the following JSON format:
{
  "sections": [
    {
      "title": "section title",
      "content": "full script text the instructor will speak (natural conversational tone)",
      "durationSec": estimated_seconds,
      "slideNotes": "key keywords/summary to display on slides for this section"
    }
  ]
}`
              },
              { role: "user", content: `Topic: ${input.title}\nDetailed request: ${input.prompt}\nCategory: ${input.category || "web3"}\nDifficulty: ${input.difficulty || "beginner"}\nTarget duration: ${durationMin} min` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "lecture_script",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          content: { type: "string" },
                          durationSec: { type: "integer" },
                          slideNotes: { type: "string" },
                        },
                        required: ["title", "content", "durationSec", "slideNotes"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["sections"],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = response.choices?.[0]?.message?.content;
          if (typeof rawContent !== "string") throw new Error("LLM returned no content");

          const parsed = JSON.parse(rawContent);
          const sections = parsed.sections || [];
          const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
          const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);

          await db.updateLectureScript(scriptId, {
            scriptContent: fullScript,
            sections: JSON.stringify(sections),
            estimatedDurationSec: totalDuration,
            sectionCount: sections.length,
            status: "ready",
          });

          return { id: scriptId, status: "ready", sectionCount: sections.length, estimatedDurationSec: totalDuration };
        } catch (error: any) {
          console.error('[Script Generate] Error:', error?.message || error, error?.stack);
          await db.updateLectureScript(scriptId, { status: "error" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Script generation failed: ${error?.message || 'Unknown error'}` });
        }
      }),

    /** Create script directly from user-written text (no AI generation) */
    createDirect: instructorProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().min(10),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        language: z.string().optional(),
        targetDurationMin: z.number().min(1).max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Split content into sections by numbered paragraphs or double newlines
        const rawText = input.content.trim();
        const durationMin = input.targetDurationMin || 10;
        
        // Try to split by numbered patterns: "1." "2." etc or "第一" etc
        const numberedPattern = /(?:^|\n)\s*(?:\d+[.、)\s]|第[一二三四五六七八九十]+)/;
        let rawSections: string[];
        
        if (numberedPattern.test(rawText)) {
          // Split by numbered paragraphs
          rawSections = rawText.split(/\n\s*(?=\d+[.、)\s]|第[一二三四五六七八九十]+)/).filter(s => s.trim().length > 0);
        } else {
          // Split by double newlines
          rawSections = rawText.split(/\n\s*\n/).filter(s => s.trim().length > 0);
        }
        
        // If only 1 section, try splitting by single newlines into chunks
        if (rawSections.length <= 1) {
          const lines = rawText.split(/\n/).filter(l => l.trim().length > 0);
          if (lines.length > 3) {
            const chunkSize = Math.ceil(lines.length / Math.max(3, Math.ceil(durationMin / 3)));
            rawSections = [];
            for (let i = 0; i < lines.length; i += chunkSize) {
              rawSections.push(lines.slice(i, i + chunkSize).join('\n'));
            }
          }
        }
        
        // Build sections array
        const totalChars = rawSections.reduce((sum, s) => sum + s.length, 0);
        const sections = rawSections.map((text, idx) => {
          // Extract title from first line or numbered prefix
          const firstLine = text.split('\n')[0].trim();
          const titleMatch = firstLine.match(/^\d+[.、)\s]\s*(.+)/) || firstLine.match(/^第[一二三四五六七八九十]+[.、\s]\s*(.+)/);
          const title = titleMatch ? titleMatch[1].substring(0, 100) : `Section ${idx + 1}`;
          const content = text.trim();
          const charRatio = content.length / totalChars;
          const durationSec = Math.round(durationMin * 60 * charRatio);
          
          return {
            title,
            content,
            durationSec,
            slideNotes: content.substring(0, 200),
          };
        });
        
        const fullScript = sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n');
        const totalDuration = sections.reduce((sum, s) => sum + s.durationSec, 0);
        
        const scriptId = await db.createLectureScript({
          userId: ctx.user.id,
          title: input.title,
          prompt: `[Manual] ${input.title}`,
          category: input.category || "web3",
          difficulty: input.difficulty || "beginner",
          language: input.language || "ko",
          targetDurationMin: input.targetDurationMin || 10,
          scriptContent: fullScript,
          sections: JSON.stringify(sections),
          estimatedDurationSec: totalDuration,
          sectionCount: sections.length,
          status: "ready",
        });
        
        if (!scriptId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        return { id: scriptId, status: "ready", sectionCount: sections.length, estimatedDurationSec: totalDuration };
      }),

    /** List user's scripts */
    list: instructorProcedure.query(async ({ ctx }) => db.getLectureScripts(ctx.user.id)),

    /** Get script by ID */
    getById: instructorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const script = await db.getLectureScriptById(input.id);
        if (!script) throw new TRPCError({ code: "NOT_FOUND" });
        return script;
      }),

    /** Update script content */
    update: instructorProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), scriptContent: z.string().optional(), sections: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLectureScript(id, data);
        return { success: true };
      }),

    /** Regenerate a single section of a script */
    regenerateSection: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        sectionIndex: z.number().min(0),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const sections = script.sections ? JSON.parse(script.sections) : [];
        if (input.sectionIndex >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid section index" });

        const section = sections[input.sectionIndex];
        const langMap: Record<string, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese" };
        const lang = langMap[script.language || "ko"] || "Korean";

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional lecture script writer. Write in ${lang}.\nImprove and rewrite the existing section.\nRespond ONLY in the following JSON format:\n{"title":"section title","content":"instructor script","durationSec":estimated_seconds,"slideNotes":"key keywords"}` },
            { role: "user", content: `Current section title: ${section.title}\nCurrent content: ${section.content}\n${input.customPrompt ? `Edit request: ${input.customPrompt}` : "Please improve to be more natural and professional."}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "section_regen",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  durationSec: { type: "integer" },
                  slideNotes: { type: "string" },
                },
                required: ["title", "content", "durationSec", "slideNotes"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (typeof rawContent !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM response error" });
        const newSection = JSON.parse(rawContent);
        sections[input.sectionIndex] = newSection;

        const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);

        await db.updateLectureScript(input.scriptId, {
          scriptContent: fullScript,
          sections: JSON.stringify(sections),
          estimatedDurationSec: totalDuration,
        });

        return { success: true, section: newSection, totalDuration };
      }),

    /** Reorder sections of a script */
    reorderSections: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        newOrder: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const sections = script.sections ? JSON.parse(script.sections) : [];
        if (input.newOrder.length !== sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Section count mismatch." });

        const reordered = input.newOrder.map(idx => {
          if (idx < 0 || idx >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid index" });
          return sections[idx];
        });

        const fullScript = reordered.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        await db.updateLectureScript(input.scriptId, {
          scriptContent: fullScript,
          sections: JSON.stringify(reordered),
        });
        return { success: true };
      }),

    /** Update a single section inline */
    updateSection: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        sectionIndex: z.number().min(0),
        title: z.string().optional(),
        content: z.string().optional(),
        durationSec: z.number().optional(),
        slideNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const sections = script.sections ? JSON.parse(script.sections) : [];
        if (input.sectionIndex >= sections.length) throw new TRPCError({ code: "BAD_REQUEST" });

        if (input.title !== undefined) sections[input.sectionIndex].title = input.title;
        if (input.content !== undefined) sections[input.sectionIndex].content = input.content;
        if (input.durationSec !== undefined) sections[input.sectionIndex].durationSec = input.durationSec;
        if (input.slideNotes !== undefined) sections[input.sectionIndex].slideNotes = input.slideNotes;

        const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);

        await db.updateLectureScript(input.scriptId, {
          scriptContent: fullScript,
          sections: JSON.stringify(sections),
          estimatedDurationSec: totalDuration,
        });
        return { success: true };
      }),

    /** Add a new section to a script */
    addSection: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        afterIndex: z.number().min(-1).optional(), // -1 or omit = append at end
        title: z.string().optional(),
        content: z.string().optional(),
        durationSec: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const sections = script.sections ? JSON.parse(script.sections) : [];
        const newSection = {
          title: input.title || `Section ${sections.length + 1}`,
          content: input.content || "",
          durationSec: input.durationSec || 60,
          slideNotes: "",
        };
        const insertAt = (input.afterIndex !== undefined && input.afterIndex >= 0) ? input.afterIndex + 1 : sections.length;
        sections.splice(insertAt, 0, newSection);
        const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);
        await db.updateLectureScript(input.scriptId, {
          scriptContent: fullScript,
          sections: JSON.stringify(sections),
          sectionCount: sections.length,
          estimatedDurationSec: totalDuration,
        });
        return { success: true, sectionCount: sections.length };
      }),

    /** Delete a section from a script */
    deleteSection: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        sectionIndex: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const sections = script.sections ? JSON.parse(script.sections) : [];
        if (input.sectionIndex >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid section index" });
        if (sections.length <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "At least 1 section is required." });
        sections.splice(input.sectionIndex, 1);
        const fullScript = sections.map((s: any) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        const totalDuration = sections.reduce((sum: number, s: any) => sum + (s.durationSec || 0), 0);
        await db.updateLectureScript(input.scriptId, {
          scriptContent: fullScript,
          sections: JSON.stringify(sections),
          sectionCount: sections.length,
          estimatedDurationSec: totalDuration,
        });
        return { success: true, sectionCount: sections.length };
      }),

    /** Delete a script */
    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.deleteLectureScript(input.id, ctx.user.id); return { success: true }; }),

    // ============ v2.4: Script Version Management ============

    /** Get version history for a script */
    versions: instructorProcedure
      .input(z.object({ scriptId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getScriptVersions(input.scriptId, ctx.user.id);
      }),

    /** Save current script state as a version snapshot */
    saveVersion: instructorProcedure
      .input(z.object({ scriptId: z.number(), changeDescription: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const versionId = await db.autoSaveScriptVersion(input.scriptId, ctx.user.id, input.changeDescription);
        if (!versionId) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found." });
        return { versionId };
      }),

    /** Rollback script to a specific version */
    rollback: instructorProcedure
      .input(z.object({ scriptId: z.number(), versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.rollbackScriptToVersion(input.scriptId, input.versionId, ctx.user.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found." });
        return { success: true };
      }),

    /** Get a specific version detail */
    versionDetail: instructorProcedure
      .input(z.object({ versionId: z.number() }))
      .query(async ({ input }) => {
        const version = await db.getScriptVersionById(input.versionId);
        if (!version) throw new TRPCError({ code: "NOT_FOUND" });
        return version;
      }),

    // ============ v2.4: Content Analysis ============

    /** Analyze script content quality with AI */
    analyze: instructorProcedure
      .input(z.object({ scriptId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Get script
        const scripts = await db.getLectureScripts(ctx.user.id);
        const script = scripts.find((s: any) => s.id === input.scriptId);
        if (!script) throw new TRPCError({ code: "NOT_FOUND" });
        if (!script.scriptContent) throw new TRPCError({ code: "BAD_REQUEST", message: "No script content." });

        // Create analysis record
        const analysisId = await db.createContentAnalysis({
          scriptId: input.scriptId,
          userId: ctx.user.id,
          status: "analyzing",
        });

        try {
          const sections = script.sections ? JSON.parse(script.sections as string) : [];
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are an educational content quality analysis expert. Analyze the lecture script, rate the following items 0-100, and provide improvement suggestions.

Respond ONLY in the following JSON format:
{
  "scores": {
    "readability": 0-100,
    "difficulty": 0-100,
    "keyword": 0-100,
    "structure": 0-100,
    "engagement": 0-100
  },
  "analysis": {
    "readability": { "avgSentenceLength": number, "complexWords": number, "summary": "description" },
    "difficulty": { "level": "beginner|intermediate|advanced", "appropriateness": "description" },
    "keywords": { "topKeywords": ["keyword1", "keyword2", ...], "density": number, "summary": "description" },
    "structure": { "sectionBalance": "description", "hasIntro": boolean, "hasConclusion": boolean },
    "engagement": { "questionCount": number, "exampleCount": number, "summary": "description" }
  },
  "metrics": {
    "totalWords": number,
    "uniqueWords": number,
    "avgSentenceLength": number,
    "sectionCount": number,
    "estimatedReadingTime": number
  },
  "suggestions": [
    { "category": "readability|difficulty|keyword|structure|engagement", "suggestion": "specific improvement suggestion", "priority": "high|medium|low" }
  ]
}`
              },
              {
                role: "user",
                content: `Title: ${script.title}\nCategory: ${script.category}\nDifficulty: ${script.difficulty}\nSections: ${sections.length}\n\nScript content:\n${script.scriptContent}`
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "content_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    scores: {
                      type: "object",
                      properties: {
                        readability: { type: "number" },
                        difficulty: { type: "number" },
                        keyword: { type: "number" },
                        structure: { type: "number" },
                        engagement: { type: "number" },
                      },
                      required: ["readability", "difficulty", "keyword", "structure", "engagement"],
                      additionalProperties: false,
                    },
                    analysis: {
                      type: "object",
                      properties: {
                        readability: {
                          type: "object",
                          properties: { avgSentenceLength: { type: "number" }, complexWords: { type: "number" }, summary: { type: "string" } },
                          required: ["avgSentenceLength", "complexWords", "summary"],
                          additionalProperties: false,
                        },
                        difficulty: {
                          type: "object",
                          properties: { level: { type: "string" }, appropriateness: { type: "string" } },
                          required: ["level", "appropriateness"],
                          additionalProperties: false,
                        },
                        keywords: {
                          type: "object",
                          properties: { topKeywords: { type: "array", items: { type: "string" } }, density: { type: "number" }, summary: { type: "string" } },
                          required: ["topKeywords", "density", "summary"],
                          additionalProperties: false,
                        },
                        structure: {
                          type: "object",
                          properties: { sectionBalance: { type: "string" }, hasIntro: { type: "boolean" }, hasConclusion: { type: "boolean" } },
                          required: ["sectionBalance", "hasIntro", "hasConclusion"],
                          additionalProperties: false,
                        },
                        engagement: {
                          type: "object",
                          properties: { questionCount: { type: "number" }, exampleCount: { type: "number" }, summary: { type: "string" } },
                          required: ["questionCount", "exampleCount", "summary"],
                          additionalProperties: false,
                        },
                      },
                      required: ["readability", "difficulty", "keywords", "structure", "engagement"],
                      additionalProperties: false,
                    },
                    metrics: {
                      type: "object",
                      properties: {
                        totalWords: { type: "number" },
                        uniqueWords: { type: "number" },
                        avgSentenceLength: { type: "number" },
                        sectionCount: { type: "number" },
                        estimatedReadingTime: { type: "number" },
                      },
                      required: ["totalWords", "uniqueWords", "avgSentenceLength", "sectionCount", "estimatedReadingTime"],
                      additionalProperties: false,
                    },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string" },
                          suggestion: { type: "string" },
                          priority: { type: "string" },
                        },
                        required: ["category", "suggestion", "priority"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["scores", "analysis", "metrics", "suggestions"],
                  additionalProperties: false,
                },
              },
            },
          });

          const result = JSON.parse((response.choices[0].message.content as string) || "{}");
          const overall = Math.round(
            (result.scores.readability + result.scores.difficulty + result.scores.keyword + result.scores.structure + result.scores.engagement) / 5
          );

          await db.updateContentAnalysis(analysisId, {
            overallScore: overall,
            readabilityScore: result.scores.readability,
            difficultyScore: result.scores.difficulty,
            keywordScore: result.scores.keyword,
            structureScore: result.scores.structure,
            engagementScore: result.scores.engagement,
            analysisDetail: JSON.stringify(result.analysis),
            suggestions: JSON.stringify(result.suggestions),
            metrics: JSON.stringify(result.metrics),
            status: "completed",
          });

          return { analysisId, overall, scores: result.scores, suggestions: result.suggestions, metrics: result.metrics, analysis: result.analysis };
        } catch (error) {
          await db.updateContentAnalysis(analysisId, { status: "failed" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "An error occurred during analysis." });
        }
      }),

    /** Get analysis history for a script */
    analysisHistory: instructorProcedure
      .input(z.object({ scriptId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getContentAnalyses(input.scriptId, ctx.user.id);
      }),

    /** Get a specific analysis detail */
    analysisDetail: instructorProcedure
      .input(z.object({ analysisId: z.number() }))
      .query(async ({ input }) => {
        const analysis = await db.getContentAnalysisById(input.analysisId);
        if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
        return analysis;
      }),

    /** Auto-translate script sections to interpreter language using LLM */
    autoTranslate: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        targetLanguage: z.string().min(2).max(10),
        sections: z.array(z.object({
          title: z.string(),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const langNames: Record<string, string> = {
          ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese",
          es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
          ru: "Russian", ar: "Arabic", hi: "Hindi", vi: "Vietnamese",
          th: "Thai", id: "Indonesian", tr: "Turkish", pl: "Polish",
          nl: "Dutch", sv: "Swedish", it: "Italian", ms: "Malay",
        };
        const targetLangName = langNames[input.targetLanguage] || input.targetLanguage;

        const sectionsText = input.sections.map((s, i) => `[Section ${i + 1}: ${s.title}]\n${s.content}`).join("\n\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional lecture interpreter/translator. Translate the following lecture script sections into ${targetLangName}. Maintain the same section structure and numbering. Keep technical terms accurate. The translation should sound natural as if spoken by a native interpreter. Return ONLY a JSON array of objects with "title" and "content" fields.`,
            },
            {
              role: "user",
              content: `Translate these lecture sections to ${targetLangName}:\n\n${sectionsText}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "translated_sections",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["title", "content"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sections"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0].message.content;
        const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const parsed = JSON.parse(contentStr || "{ \"sections\": [] }");
        const translatedSections = parsed.sections || [];

        // Save to DB
        await db.updateScriptInterpreter(input.scriptId, ctx.user.id, {
          interpreterEnabled: true,
          interpreterLanguage: input.targetLanguage,
          interpreterSections: JSON.stringify(translatedSections),
        });

        return { sections: translatedSections };
      }),

    /** Generate subtitles from recorded video using STT */
    generateSubtitles: instructorProcedure
      .input(z.object({
        videoUrl: z.string().url(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { transcribeAudio } = await import("./server/_core/voiceTranscription" as any).catch(() => ({ transcribeAudio: null }));
        
        if (transcribeAudio) {
          try {
            const result = await transcribeAudio({
              audioUrl: input.videoUrl,
              language: input.language || "ko",
              prompt: "Transcribe lecture recording",
            });
            const segments = (result.segments || []).map((seg: any) => ({
              start: seg.start || 0,
              end: seg.end || 0,
              text: seg.text || "",
            }));
            return { segments };
          } catch (err) {
            // Fallback to LLM-based placeholder
          }
        }
        
        // Fallback: return empty segments with instruction
        return {
          segments: [
            { start: 0, end: 5, text: "(Please enter subtitles)" },
          ],
        };
      }),
  }),
  // ============ Production Pipeline (v2.1) =============
  pipeline: router({
    /** Start a one-click production pipeline */
    start: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        title: z.string().min(1),
        voiceProfileId: safeOptionalNumber,
        voiceModProfileId: safeOptionalNumber,
        faceSwapProfileId: safeOptionalNumber,
        sampleFaceId: safeOptionalNumber,
        ttsVoiceId: z.string().optional(),
        config: z.string().optional(),
        // PIP mode settings
        pipEnabled: z.boolean().optional(),
        pipPosition: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).optional(),
        pipSize: z.enum(["small", "medium", "large"]).optional(),
        pipShape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        pipOpacity: z.number().min(0).max(100).optional(),
        pptUploadId: z.number().optional(),
        // Avatar engine selection
        avatarEngine: z.enum(["d-id", "heygen"]).optional(),
        // Seedance 2.0 intro/outro options
        seedanceIntro: z.boolean().optional(),
        seedanceOutro: z.boolean().optional(),
        seedanceIntroPrompt: z.string().optional(),
        seedanceOutroPrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Sanitize NaN values from optional number fields
        const safeNum = (v: number | undefined) => (v != null && !isNaN(v) ? v : undefined);
        input.faceSwapProfileId = safeNum(input.faceSwapProfileId);
        input.voiceModProfileId = safeNum(input.voiceModProfileId);
        input.voiceProfileId = safeNum(input.voiceProfileId);
        input.sampleFaceId = safeNum(input.sampleFaceId);

        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.status !== "ready") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Script is not ready." });

        // Build config with PIP settings
        const configObj = input.config ? JSON.parse(input.config) : {};
        if (input.pipEnabled) {
          configObj.pip = {
            enabled: true,
            position: input.pipPosition || "bottom-right",
            size: input.pipSize || "medium",
            shape: input.pipShape || "rounded",
            opacity: input.pipOpacity ?? 100,
            pptUploadId: input.pptUploadId,
          };
        }

        const pipelineId = await db.createProductionPipeline({
          userId: ctx.user.id,
          scriptId: input.scriptId,
          title: input.title,
          status: "tts_gen",
          progressPercent: 10,
          currentStep: "Generating TTS audio...",
          voiceProfileId: input.voiceProfileId,
          voiceModProfileId: input.voiceModProfileId,
          faceSwapProfileId: input.faceSwapProfileId,
          sampleFaceId: input.sampleFaceId,
          ttsVoiceId: input.ttsVoiceId || "alloy",
          config: JSON.stringify(configObj),
          startedAt: new Date(),
        });
        if (!pipelineId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Process TTS for each section
        const sections = script.sections ? JSON.parse(script.sections) : [];
        const audioUrls: string[] = [];

        // Determine voice
        let voiceId = input.ttsVoiceId || "alloy";
        if (input.voiceModProfileId) {
          const voiceMod = await db.getVoiceModProfileById(input.voiceModProfileId);
          if (voiceMod?.customTtsVoiceId) voiceId = voiceMod.customTtsVoiceId;
          else if (voiceMod?.voiceCharacter) {
            const charMap: Record<string, string> = { male_deep: "onyx", male_bright: "echo", female_warm: "nova", female_clear: "shimmer", neutral: "alloy" };
            voiceId = charMap[voiceMod.voiceCharacter] || "alloy";
          }
        } else if (input.voiceProfileId) {
          const voiceProfile = await db.getVoiceProfileById(input.voiceProfileId);
          if (voiceProfile?.ttsVoiceId) voiceId = voiceProfile.ttsVoiceId;
        }

        let totalDuration = 0;
        try {
          // Pre-fetch voice modulation data once (avoid repeated DB queries)
          let voiceModData: any = null;
          let speed = 1;
          if (input.voiceModProfileId) {
            voiceModData = await db.getVoiceModProfileById(input.voiceModProfileId);
            speed = voiceModData ? (voiceModData.speedPercent || 100) / 100 : 1;
          }

          // Prepare text for each section (apply style if needed) - sequential for LLM calls
          const preparedTexts: string[] = [];
          for (let i = 0; i < sections.length; i++) {
            let textToSpeak = sections[i].content;
            if (voiceModData?.stylePrompt) {
              const styleResponse = await invokeLLM({
                messages: [
                  { role: "system", content: `Convert the following text to the specified speaking style. Instruction: ${voiceModData.stylePrompt}\nStyle: ${voiceModData.speakingStyle}` },
                  { role: "user", content: textToSpeak },
                ],
              });
              const rawStyled = styleResponse.choices?.[0]?.message?.content;
              if (typeof rawStyled === "string") textToSpeak = rawStyled;
            }
            preparedTexts.push(textToSpeak);
          }

          await db.updateProductionPipeline(pipelineId, {
            progressPercent: 30,
            currentStep: `Generating TTS in parallel... (${sections.length} sections)`,
          });

          // Generate TTS for all sections in parallel (max 4 concurrent)
          const CONCURRENCY = 4;
          const sectionResults: { index: number; url: string; duration: number }[] = [];
          for (let batch = 0; batch < sections.length; batch += CONCURRENCY) {
            const batchSections = sections.slice(batch, batch + CONCURRENCY);
            const batchPromises = batchSections.map(async (section: any, batchIdx: number) => {
              const i = batch + batchIdx;
              const ttsResult = await generateGeminiTts({ text: preparedTexts[i], voiceId, speed });
              if ('error' in ttsResult) throw new Error(`TTS failed for section ${i}: ${ttsResult.error}`);
              const fileKey = `pipeline/${pipelineId}/section-${i}-${nanoid(6)}.mp3`;
              const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
              return { index: i, url, duration: section.durationSec || 0 };
            });

            const batchResults = await Promise.allSettled(batchPromises);
            for (const result of batchResults) {
              if (result.status === 'fulfilled') {
                sectionResults.push(result.value);
              } else {
                throw new Error(result.reason?.message || 'TTS generation failed');
              }
            }

            // Update progress after each batch
            const progress = Math.round(30 + (60 * Math.min(batch + CONCURRENCY, sections.length) / sections.length));
            await db.updateProductionPipeline(pipelineId, {
              progressPercent: progress,
              currentStep: `Generating TTS... (${Math.min(batch + CONCURRENCY, sections.length)}/${sections.length})`,
            });
          }

          // Sort by section index and collect URLs in order
          sectionResults.sort((a, b) => a.index - b.index);
          for (const r of sectionResults) {
            audioUrls.push(r.url);
            totalDuration += r.duration;
          }

          // Save audio URLs first
          await db.updateProductionPipeline(pipelineId, {
            audioUrls: JSON.stringify(audioUrls),
            totalDurationSec: totalDuration,
          });

          // ===== Avatar Video Generation (D-ID or HeyGen) =====
          const avatarVideoUrls: string[] = [];
          let avatarImageUrl: string | null = null;
          const avatarEngine = input.avatarEngine || "d-id";

          // Get avatar image from sample face or face swap profile
          if (input.sampleFaceId) {
            const sampleFace = await db.getSampleFace(input.sampleFaceId);
            if (sampleFace?.imageUrl) avatarImageUrl = sampleFace.imageUrl;
          }
          if (!avatarImageUrl && input.faceSwapProfileId) {
            const faceSwap = await db.getFaceSwapProfileById(input.faceSwapProfileId);
            if (faceSwap?.targetFaceUrl) avatarImageUrl = faceSwap.targetFaceUrl;
          }

          const didApiKey = process.env.DID_API_KEY;
          const heygenApiKey = process.env.HEYGEN_API_KEY;
          const siteBaseUrl = process.env.SITE_BASE_URL || "https://aispeaker.cc";

          // Helper: ensure absolute URL
          const toAbsoluteUrl = (url: string) => url.startsWith("/") ? `${siteBaseUrl}${url}` : url;

          if (avatarImageUrl && audioUrls.length > 0) {
            const engineLabel = avatarEngine === "heygen" ? "HeyGen" : "D-ID";
            const hasApiKey = avatarEngine === "heygen" ? !!heygenApiKey : !!didApiKey;

            if (!hasApiKey) {
              console.warn(`[${engineLabel}] API key not configured, skipping avatar video generation`);
            } else {
              await db.updateProductionPipeline(pipelineId, {
                status: "avatar_gen",
                progressPercent: 70,
                currentStep: `${engineLabel} avatar video generation... (0/${audioUrls.length})`,
              });

              for (let i = 0; i < audioUrls.length; i++) {
                try {
                  const absoluteAudioUrl = toAbsoluteUrl(audioUrls[i]);
                  const absoluteAvatarUrl = toAbsoluteUrl(avatarImageUrl);

                  let videoUrl: string | null = null;

                  if (avatarEngine === "heygen") {
                    // ===== HeyGen API =====
                    console.log(`[HeyGen] Section ${i}: audio=${absoluteAudioUrl}, avatar=${absoluteAvatarUrl}`);

                    const heygenResponse = await fetch("https://api.heygen.com/v2/videos", {
                      method: "POST",
                      headers: {
                        "x-api-key": heygenApiKey!,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                      },
                      body: JSON.stringify({
                        image_url: absoluteAvatarUrl,
                        audio_url: absoluteAudioUrl,
                        resolution: "1080p",
                        aspect_ratio: "16:9",
                        expressiveness: "high",
                        title: `Section ${i} - ${input.title}`,
                      }),
                    });

                    if (heygenResponse.ok) {
                      const heygenData = await heygenResponse.json() as any;
                      const heygenVideoId = heygenData.data?.video_id;
                      if (!heygenVideoId) {
                        console.error(`[HeyGen] No video_id in response for section ${i}:`, heygenData);
                      } else {
                        let attempts = 0;
                        // Poll for completion (max 90 attempts = 3 min)
                        while (attempts < 90) {
                          await new Promise(resolve => setTimeout(resolve, 2000));
                          const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${heygenVideoId}`, {
                            headers: { "x-api-key": heygenApiKey!, "Accept": "application/json" },
                          });
                          if (statusResponse.ok) {
                            const statusData = await statusResponse.json() as any;
                            const status = statusData.data?.status;
                            if (status === "completed" && statusData.data?.video_url) {
                              videoUrl = statusData.data.video_url;
                              console.log(`[HeyGen] Section ${i} completed: ${videoUrl}`);
                              break;
                            } else if (status === "failed") {
                              console.error(`[HeyGen] Video ${heygenVideoId} failed:`, statusData.data?.error);
                              break;
                            }
                          }
                          attempts++;
                        }
                      }
                    } else {
                      const errText = await heygenResponse.text();
                      console.error(`[HeyGen] Create video failed for section ${i}:`, errText);
                    }
                  } else {
                    // ===== D-ID API =====
                    console.log(`[D-ID] Section ${i}: audio=${absoluteAudioUrl}, avatar=${absoluteAvatarUrl}`);

                    const didResponse = await fetch("https://api.d-id.com/talks", {
                      method: "POST",
                      headers: {
                        "Authorization": `Basic ${didApiKey}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        source_url: absoluteAvatarUrl,
                        script: { type: "audio", audio_url: absoluteAudioUrl },
                        config: { stitch: true, result_format: "mp4" },
                      }),
                    });

                    if (didResponse.ok) {
                      const didData = await didResponse.json() as any;
                      const talkId = didData.id;
                      let attempts = 0;

                      while (attempts < 60) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                          headers: { "Authorization": `Basic ${didApiKey}` },
                        });
                        if (statusResponse.ok) {
                          const statusData = await statusResponse.json() as any;
                          if (statusData.status === "done" && statusData.result_url) {
                            videoUrl = statusData.result_url;
                            break;
                          } else if (statusData.status === "error") {
                            console.error(`[D-ID] Talk ${talkId} failed:`, statusData.error);
                            break;
                          }
                        }
                        attempts++;
                      }
                    } else {
                      const errText = await didResponse.text();
                      console.error(`[D-ID] Create talk failed for section ${i}:`, errText);
                    }
                  }

                  // Download video and save locally (both D-ID and HeyGen URLs expire)
                  if (videoUrl) {
                    try {
                      const videoResponse = await fetch(videoUrl);
                      if (videoResponse.ok) {
                        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                        const localVideoKey = `pipeline/${pipelineId}/avatar-section-${i}-${nanoid(6)}.mp4`;
                        const { url: localVideoUrl } = await storagePut(localVideoKey, videoBuffer, "video/mp4");
                        avatarVideoUrls.push(localVideoUrl);
                        console.log(`[${engineLabel}] Section ${i} video saved locally: ${localVideoUrl}`);
                      } else {
                        console.error(`[${engineLabel}] Failed to download video for section ${i}: ${videoResponse.status}`);
                        avatarVideoUrls.push("");
                      }
                    } catch (dlError) {
                      console.error(`[${engineLabel}] Error downloading video for section ${i}:`, dlError);
                      avatarVideoUrls.push("");
                    }
                  } else {
                    avatarVideoUrls.push("");
                  }

                  // Update progress
                  const avatarProgress = Math.round(70 + (25 * (i + 1)) / audioUrls.length);
                  await db.updateProductionPipeline(pipelineId, {
                    progressPercent: avatarProgress,
                    currentStep: `${engineLabel} avatar video generation... (${i + 1}/${audioUrls.length})`,
                  });
                } catch (error) {
                  console.error(`[${engineLabel}] Error generating avatar for section ${i}:`, error);
                  avatarVideoUrls.push("");
                }
              }
            }
          }

          // ===== Seedance 2.0 Intro/Outro Generation (via fal.ai) =====
          let introVideoUrl: string | null = null;
          let outroVideoUrl: string | null = null;
          const falApiKey = process.env.FAL_API_KEY;

          if (falApiKey && (input.seedanceIntro || input.seedanceOutro)) {
            const generateSeedanceVideo = async (prompt: string, label: string): Promise<string | null> => {
              try {
                console.log(`[Seedance] Generating ${label}: ${prompt}`);
                await db.updateProductionPipeline(pipelineId, {
                  currentStep: `Seedance 2.0 ${label} video generation...`,
                });

                // Submit to fal.ai queue
                const submitResponse = await fetch("https://queue.fal.run/fal-ai/seedance-2.0/text-to-video", {
                  method: "POST",
                  headers: {
                    "Authorization": `Key ${falApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    prompt,
                    duration: "5",
                    aspect_ratio: "16:9",
                  }),
                });

                if (!submitResponse.ok) {
                  const errText = await submitResponse.text();
                  console.error(`[Seedance] Submit failed for ${label}:`, errText);
                  return null;
                }

                const submitData = await submitResponse.json() as any;
                const requestId = submitData.request_id;
                if (!requestId) {
                  console.error(`[Seedance] No request_id for ${label}:`, submitData);
                  return null;
                }

                // Poll for completion (max 120 attempts = 4 min)
                let attempts = 0;
                while (attempts < 120) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  const statusResponse = await fetch(
                    `https://queue.fal.run/fal-ai/seedance-2.0/text-to-video/requests/${requestId}/status`,
                    { headers: { "Authorization": `Key ${falApiKey}` } }
                  );
                  if (statusResponse.ok) {
                    const statusData = await statusResponse.json() as any;
                    if (statusData.status === "COMPLETED") {
                      // Get result
                      const resultResponse = await fetch(
                        `https://queue.fal.run/fal-ai/seedance-2.0/text-to-video/requests/${requestId}`,
                        { headers: { "Authorization": `Key ${falApiKey}` } }
                      );
                      if (resultResponse.ok) {
                        const resultData = await resultResponse.json() as any;
                        const seedVideoUrl = resultData.video?.url;
                        if (seedVideoUrl) {
                          // Download and save locally
                          const videoResponse = await fetch(seedVideoUrl);
                          if (videoResponse.ok) {
                            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                            const localKey = `pipeline/${pipelineId}/${label}-${nanoid(6)}.mp4`;
                            const { url: localUrl } = await storagePut(localKey, videoBuffer, "video/mp4");
                            console.log(`[Seedance] ${label} saved locally: ${localUrl}`);
                            return localUrl;
                          }
                        }
                      }
                      break;
                    } else if (statusData.status === "FAILED") {
                      console.error(`[Seedance] ${label} generation failed:`, statusData);
                      break;
                    }
                  }
                  attempts++;
                }
                return null;
              } catch (err) {
                console.error(`[Seedance] Error generating ${label}:`, err);
                return null;
              }
            };

            if (input.seedanceIntro) {
              const introPrompt = input.seedanceIntroPrompt || `Professional lecture intro animation with modern tech visuals, title: ${input.title}, cinematic quality, smooth camera movement`;
              introVideoUrl = await generateSeedanceVideo(introPrompt, "intro");
            }
            if (input.seedanceOutro) {
              const outroPrompt = input.seedanceOutroPrompt || `Professional lecture outro animation with thank you message, modern tech visuals, smooth fade out, cinematic quality`;
              outroVideoUrl = await generateSeedanceVideo(outroPrompt, "outro");
            }
          }

          // Mark as completed
          await db.updateProductionPipeline(pipelineId, {
            status: "completed",
            progressPercent: 100,
            currentStep: "Complete",
            avatarVideoUrls: avatarVideoUrls.length > 0 ? JSON.stringify(avatarVideoUrls) : null,
            introVideoUrl: introVideoUrl || null,
            outroVideoUrl: outroVideoUrl || null,
            completedAt: new Date(),
          });

          return {
            id: pipelineId,
            status: "completed",
            audioUrls,
            avatarVideoUrls: avatarVideoUrls.length > 0 ? avatarVideoUrls : undefined,
            introVideoUrl: introVideoUrl || undefined,
            outroVideoUrl: outroVideoUrl || undefined,
            totalDurationSec: totalDuration,
          };
        } catch (error) {
          await db.updateProductionPipeline(pipelineId, {
            status: "failed",
            currentStep: "Error occurred",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errMsg.includes("limit") ? "API usage limit exceeded. Please try again later." : `Pipeline execution failed: ${errMsg}` });
        }
      }),

    /** List user's pipelines */
    list: instructorProcedure.query(async ({ ctx }) => db.getProductionPipelines(ctx.user.id)),

    /** Get pipeline by ID */
    getById: instructorProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const pipeline = await db.getProductionPipelineById(input.id);
        if (!pipeline) throw new TRPCError({ code: "NOT_FOUND" });
        return pipeline;
      }),

    /** Cancel a running pipeline */
    cancel: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const pipeline = await db.getProductionPipelineById(input.id);
        if (!pipeline) throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found." });
        if (pipeline.pipeline.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const activeStatuses = ["queued", "script_gen", "tts_gen", "avatar_gen", "compositing"];
        if (!activeStatuses.includes(pipeline.pipeline.status)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pipeline is already completed or cancelled." });
        }
        // Mark as cancelled in DB - running async operations will check this flag
        await db.updateProductionPipeline(input.id, {
          status: "cancelled",
          currentStep: "Cancelled by user",
          errorMessage: "Production cancelled by user.",
          completedAt: new Date(),
        });
        return { success: true, message: "Pipeline has been cancelled." };
      }),

    /** Delete a pipeline */
    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => { await db.deleteProductionPipeline(input.id, ctx.user.id); return { success: true }; }),

    /** Batch start multiple pipelines at once */
    batchStart: instructorProcedure
      .input(z.object({
        items: z.array(z.object({
          scriptId: z.number(),
          title: z.string().min(1),
          ttsVoiceId: z.string().optional(),
          voiceModProfileId: safeOptionalNumber,
          faceSwapProfileId: safeOptionalNumber,
          sampleFaceId: safeOptionalNumber,
        })).min(1).max(10),
        pipEnabled: z.boolean().optional(),
        pptUploadId: z.number().optional(),
        pipPosition: z.string().optional(),
        pipSize: z.string().optional(),
        pipShape: z.string().optional(),
        pipOpacity: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Sanitize NaN values from optional number fields
        const safeNum = (v: number | undefined) => (v != null && !isNaN(v) ? v : undefined);
        for (const item of input.items) {
          item.faceSwapProfileId = safeNum(item.faceSwapProfileId);
          item.voiceModProfileId = safeNum(item.voiceModProfileId);
          item.sampleFaceId = safeNum(item.sampleFaceId);
        }

        const results: { scriptId: number; pipelineId: number | null; status: string; error?: string }[] = [];

        for (const item of input.items) {
          try {
            const script = await db.getLectureScriptById(item.scriptId);
            if (!script || script.status !== "ready") {
              results.push({ scriptId: item.scriptId, pipelineId: null, status: "skipped", error: "Script is not ready." });
              continue;
            }

            const pipelineId = await db.createProductionPipeline({
              userId: ctx.user.id,
              scriptId: item.scriptId,
              title: item.title,
              status: "tts_gen",
              progressPercent: 10,
              currentStep: "Generating TTS audio...",
              voiceModProfileId: item.voiceModProfileId,
              faceSwapProfileId: item.faceSwapProfileId,
              sampleFaceId: item.sampleFaceId,
              ttsVoiceId: item.ttsVoiceId || "alloy",
              startedAt: new Date(),
              ...(input.pipEnabled ? {
                pipEnabled: true,
                pptUploadId: input.pptUploadId,
                pipPosition: input.pipPosition,
                pipSize: input.pipSize,
                pipShape: input.pipShape,
                pipOpacity: input.pipOpacity,
              } : {}),
            });
            if (!pipelineId) {
              results.push({ scriptId: item.scriptId, pipelineId: null, status: "failed", error: "Pipeline creation failed" });
              continue;
            }

            // Process TTS for each section
            const sections = script.sections ? JSON.parse(script.sections) : [];
            const audioUrls: string[] = [];
            let voiceId = item.ttsVoiceId || "alloy";

            if (item.voiceModProfileId) {
              const voiceMod = await db.getVoiceModProfileById(item.voiceModProfileId);
              if (voiceMod?.customTtsVoiceId) voiceId = voiceMod.customTtsVoiceId;
              else if (voiceMod?.voiceCharacter) {
                const charMap: Record<string, string> = { male_deep: "onyx", male_bright: "echo", female_warm: "nova", female_clear: "shimmer", neutral: "alloy" };
                voiceId = charMap[voiceMod.voiceCharacter] || "alloy";
              }
            }

            // Pre-fetch voice modulation data once
            let voiceModData: any = null;
            let speed = 1;
            if (item.voiceModProfileId) {
              voiceModData = await db.getVoiceModProfileById(item.voiceModProfileId);
              speed = voiceModData ? (voiceModData.speedPercent || 100) / 100 : 1;
            }

            // Prepare texts (apply style if needed)
            const preparedTexts: string[] = [];
            for (let i = 0; i < sections.length; i++) {
              let textToSpeak = sections[i].content;
              if (voiceModData?.stylePrompt) {
                const styleResponse = await invokeLLM({
                  messages: [
                    { role: "system", content: `Convert the following text to the specified speaking style. Instruction: ${voiceModData.stylePrompt}\nStyle: ${voiceModData.speakingStyle}` },
                    { role: "user", content: textToSpeak },
                  ],
                });
                const rawStyled = styleResponse.choices?.[0]?.message?.content;
                if (typeof rawStyled === "string") textToSpeak = rawStyled;
              }
              preparedTexts.push(textToSpeak);
            }

            // Parallel TTS generation (max 4 concurrent)
            let totalDuration = 0;
            const BATCH_CONCURRENCY = 4;
            const sectionResults: { index: number; url: string; duration: number }[] = [];
            for (let batch = 0; batch < sections.length; batch += BATCH_CONCURRENCY) {
              const batchSections = sections.slice(batch, batch + BATCH_CONCURRENCY);
              const batchPromises = batchSections.map(async (section: any, batchIdx: number) => {
                const i = batch + batchIdx;
                const ttsResult = await generateGeminiTts({ text: preparedTexts[i], voiceId, speed });
                if ('error' in ttsResult) throw new Error(`TTS failed for section ${i}: ${ttsResult.error}`);
                const fileKey = `pipeline/${pipelineId}/section-${i}-${nanoid(6)}.mp3`;
                const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
                return { index: i, url, duration: section.durationSec || 0 };
              });
              const batchResults = await Promise.allSettled(batchPromises);
              for (const result of batchResults) {
                if (result.status === 'fulfilled') sectionResults.push(result.value);
                else throw new Error(result.reason?.message || 'TTS generation failed');
              }
              const progress = Math.round(10 + (70 * Math.min(batch + BATCH_CONCURRENCY, sections.length) / sections.length));
              await db.updateProductionPipeline(pipelineId, {
                progressPercent: progress,
                currentStep: `Generating TTS... (${Math.min(batch + BATCH_CONCURRENCY, sections.length)}/${sections.length})`,
              });
            }

            sectionResults.sort((a, b) => a.index - b.index);
            for (const r of sectionResults) {
              audioUrls.push(r.url);
              totalDuration += r.duration;
            }

            await db.updateProductionPipeline(pipelineId, {
              status: "completed",
              progressPercent: 100,
              currentStep: "Complete",
              audioUrls: JSON.stringify(audioUrls),
              totalDurationSec: totalDuration,
              completedAt: new Date(),
            });

            results.push({ scriptId: item.scriptId, pipelineId, status: "completed" });
          } catch (error) {
            results.push({ scriptId: item.scriptId, pipelineId: null, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
          }
        }

        const completed = results.filter(r => r.status === "completed").length;
        const failed = results.filter(r => r.status === "failed").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        return { results, summary: { total: input.items.length, completed, failed, skipped } };
      }),

    /** Generate AI thumbnail for a pipeline */
    generateThumbnail: instructorProcedure
      .input(z.object({
        pipelineId: z.number(),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pipelineData = await db.getProductionPipelineById(input.pipelineId);
        if (!pipelineData) throw new TRPCError({ code: "NOT_FOUND" });
        if (pipelineData.pipeline.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        // Build thumbnail prompt from script content
        const script = pipelineData.script;
        const category = script.category || "general";
        const title = script.title || pipelineData.pipeline.title;

        const categoryStyles: Record<string, string> = {
          web3: "futuristic digital art with blockchain nodes, neon blue and purple colors, Web3 technology theme",
          ai: "artificial intelligence concept art, neural networks, glowing circuits, modern tech aesthetic",
          blockchain: "blockchain visualization, connected blocks, cryptographic patterns, dark tech background",
          defi: "decentralized finance concept, digital coins, liquidity pools, modern fintech design",
          nft: "digital art gallery, NFT marketplace, colorful digital collectibles, creative art style",
          metaverse: "virtual reality world, 3D avatar, immersive digital landscape, metaverse concept",
          general: "professional educational content, modern lecture design, clean academic style",
        };

        const styleHint = categoryStyles[category] || categoryStyles.general;
        const thumbnailPrompt = input.customPrompt || `Professional lecture thumbnail for "${title}". Style: ${styleHint}. Clean, modern design suitable for online education platform. Include subtle text area for title overlay. High quality, 16:9 aspect ratio.`;

        try {
          const { url } = await generateImage({ prompt: thumbnailPrompt });
          if (!url) throw new Error("Image generation returned no URL");

          // Save thumbnail URL to pipeline
          await db.updateProductionPipeline(input.pipelineId, { thumbnailUrl: url });

          return { thumbnailUrl: url, success: true };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Thumbnail generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }),

    /** Get pipeline statistics dashboard */
    stats: instructorProcedure.query(async ({ ctx }) => {
      const stats = await db.getPipelineStats(ctx.user.id);
      if (!stats) return { totalPipelines: 0, completedPipelines: 0, failedPipelines: 0, totalDurationSec: 0, totalScripts: 0, categoryDistribution: [], monthlyProduction: [], difficultyDistribution: [], successRate: 0 };
      return stats;
    }),

    /** Generate SRT subtitles from pipeline audio */
    generateSubtitles: instructorProcedure
      .input(z.object({ pipelineId: z.number(), language: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const pipelineData = await db.getProductionPipelineById(input.pipelineId);
        if (!pipelineData) throw new TRPCError({ code: "NOT_FOUND" });
        if (pipelineData.pipeline.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (pipelineData.pipeline.status !== "completed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pipeline is not completed." });

        const audioUrls = pipelineData.pipeline.audioUrls ? JSON.parse(pipelineData.pipeline.audioUrls) : [];
        if (audioUrls.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No audio files found." });

        let srtContent = "";
        let subtitleIndex = 1;
        let timeOffsetSec = 0;

        // Get sections for reference
        const sections = pipelineData.script.sections ? JSON.parse(pipelineData.script.sections) : [];

        for (let i = 0; i < audioUrls.length; i++) {
          try {
            const result = await transcribeAudio({
              audioUrl: audioUrls[i],
              language: input.language || pipelineData.script.language || "ko",
              prompt: sections[i]?.title || "lecture content",
            });

            if ("error" in result) {
              // Fallback: use section content as subtitle
              if (sections[i]) {
                const sectionDur = sections[i].durationSec || 60;
                const startTime = formatSrtTime(timeOffsetSec);
                const endTime = formatSrtTime(timeOffsetSec + sectionDur);
                srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${sections[i].content.substring(0, 200)}\n\n`;
                subtitleIndex++;
                timeOffsetSec += sectionDur;
              }
              continue;
            }

            // Use Whisper segments for precise timestamps
            if (result.segments && result.segments.length > 0) {
              for (const segment of result.segments) {
                const startTime = formatSrtTime(timeOffsetSec + segment.start);
                const endTime = formatSrtTime(timeOffsetSec + segment.end);
                srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n\n`;
                subtitleIndex++;
              }
              const lastSeg = result.segments[result.segments.length - 1];
              timeOffsetSec += lastSeg.end;
            } else if (result.text) {
              // Fallback: whole text as one subtitle
              const sectionDur = sections[i]?.durationSec || 60;
              const startTime = formatSrtTime(timeOffsetSec);
              const endTime = formatSrtTime(timeOffsetSec + sectionDur);
              srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${result.text.trim()}\n\n`;
              subtitleIndex++;
              timeOffsetSec += sectionDur;
            }
          } catch {
            // Skip failed transcription, use section content
            if (sections[i]) {
              const sectionDur = sections[i].durationSec || 60;
              const startTime = formatSrtTime(timeOffsetSec);
              const endTime = formatSrtTime(timeOffsetSec + sectionDur);
              srtContent += `${subtitleIndex}\n${startTime} --> ${endTime}\n${sections[i].title}\n\n`;
              subtitleIndex++;
              timeOffsetSec += sectionDur;
            }
          }
        }

        // Upload SRT file to S3
        const srtBuffer = Buffer.from(srtContent, "utf-8");
        const fileKey = `subtitles/${input.pipelineId}-${nanoid(6)}.srt`;
        const { url: srtUrl } = await storagePut(fileKey, srtBuffer, "text/plain");

        // Also generate VTT format
        const vttContent = "WEBVTT\n\n" + srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
        const vttBuffer = Buffer.from(vttContent, "utf-8");
        const vttKey = `subtitles/${input.pipelineId}-${nanoid(6)}.vtt`;
        const { url: vttUrl } = await storagePut(vttKey, vttBuffer, "text/vtt");

        // Store subtitle URL in pipeline
        await db.updateProductionPipeline(input.pipelineId, {
          subtitleUrl: srtUrl,
        });

        return { srtUrl, vttUrl, subtitleCount: subtitleIndex - 1 };
      }),
    // ============ v2.4: Pipeline Preview ============

    /** Get preview data for a completed pipeline */
    preview: instructorProcedure
      .input(z.object({ pipelineId: z.number() }))
      .query(async ({ ctx, input }) => {
        const pipelines = await db.getProductionPipelines(ctx.user.id);
        const row = pipelines.find((p: any) => p.pipeline.id === input.pipelineId);
        if (!row) throw new TRPCError({ code: "NOT_FOUND" });

        const p = row.pipeline;
        const s = row.script;
        const sections = s?.sections ? JSON.parse(s.sections as string) : [];
        const audioUrls = p.audioUrls ? JSON.parse(p.audioUrls as string) : [];

        return {
          pipeline: {
            id: p.id,
            title: p.title,
            status: p.status,
            totalDurationSec: p.totalDurationSec || 0,
            thumbnailUrl: p.thumbnailUrl,
          },
          script: s ? {
            id: s.id,
            title: s.title,
            category: s.category,
            difficulty: s.difficulty,
          } : null,
          sections: sections.map((sec: any, idx: number) => ({
            index: idx,
            title: sec.title,
            content: sec.content,
            durationSec: sec.durationSec || 0,
            slideNotes: sec.slideNotes || "",
            audioUrl: audioUrls[idx] || null,
          })),
        };
      }),
  }),

  // ============ Live Broadcast (v2.5) ============
  broadcast: router({
    /** Create a new broadcast from a script */
    create: instructorProcedure
      .input(z.object({
        scriptId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        ttsVoiceId: z.string().optional(),
        voiceProfileId: safeOptionalNumber,
        scheduledAt: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.status !== "ready") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Script is not ready." });
        const roomCode = nanoid(8).toUpperCase();
        const id = await db.createBroadcast({
          instructorId: ctx.user.id,
          scriptId: input.scriptId,
          title: input.title,
          description: input.description || null,
          roomCode,
          status: input.scheduledAt ? "scheduled" : "scheduled",
          ttsVoiceId: input.ttsVoiceId || "alloy",
          voiceProfileId: input.voiceProfileId || null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          projectId: input.projectId || null,
        });
        return { id, roomCode };
      }),

    /** List instructor's broadcasts */
    list: instructorProcedure.query(async ({ ctx }) => {
      return db.getInstructorBroadcasts(ctx.user.id);
    }),

    /** Get broadcast details */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const broadcast = await db.getBroadcastById(input.id);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND", message: "Broadcast not found." });
        const script = await db.getLectureScriptById(broadcast.scriptId);
        return { ...broadcast, script };
      }),

    /** Get broadcast by room code (public for joining) */
    getByRoom: publicProcedure
      .input(z.object({ roomCode: z.string() }))
      .query(async ({ input }) => {
        const broadcast = await db.getBroadcastByRoomCode(input.roomCode);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND", message: "Broadcast room not found." });
        const script = await db.getLectureScriptById(broadcast.scriptId);
        return { ...broadcast, script };
      }),

    /** List currently live broadcasts (public) */
    liveList: publicProcedure.query(async () => {
      return db.getLiveBroadcasts();
    }),

    /** Start broadcasting (owner or presenter) */
    start: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND" });
        const isOwner = broadcast.instructorId === ctx.user.id;
        const collabRole = broadcast.projectId ? await db.getCollaboratorRole(broadcast.projectId, ctx.user.id) : null;
        if (!isOwner && collabRole !== "presenter") throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner or presenter can start a broadcast" });
        await db.updateBroadcast(input.broadcastId, {
          status: "live",
          startedAt: new Date(),
          currentSlideIndex: 0,
          isAudioPlaying: false,
          audioPosition: 0,
        });
        return { success: true };
      }),

    /** Pause broadcasting (owner or presenter) */
    pause: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "FORBIDDEN" });
        const isOwner = broadcast.instructorId === ctx.user.id;
        const collabRole = broadcast.projectId ? await db.getCollaboratorRole(broadcast.projectId, ctx.user.id) : null;
        if (!isOwner && collabRole !== "presenter") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, { status: "paused", isAudioPlaying: false });
        return { success: true };
      }),

    /** Resume broadcasting (owner or presenter) */
    resume: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "FORBIDDEN" });
        const isOwner = broadcast.instructorId === ctx.user.id;
        const collabRole = broadcast.projectId ? await db.getCollaboratorRole(broadcast.projectId, ctx.user.id) : null;
        if (!isOwner && collabRole !== "presenter") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, { status: "live" });
        return { success: true };
      }),

    /** End broadcasting (owner or presenter) */
    end: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "FORBIDDEN" });
        const isOwner = broadcast.instructorId === ctx.user.id;
        const collabRole = broadcast.projectId ? await db.getCollaboratorRole(broadcast.projectId, ctx.user.id) : null;
        if (!isOwner && collabRole !== "presenter") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, {
          status: "ended",
          endedAt: new Date(),
          isAudioPlaying: false,
        });
        // Auto-generate recording entry and analytics
        try {
          const { createBroadcastRecording, generateBroadcastAnalytics } = await import("./db");
          // Create recording entry (will be processed async)
          const startTime = broadcast.startedAt?.getTime() || broadcast.createdAt?.getTime() || Date.now();
          const totalDuration = Math.floor((Date.now() - startTime) / 1000);
          await createBroadcastRecording({
            broadcastId: input.broadcastId,
            status: "ready",
            totalDurationSec: totalDuration,
            slideCount: broadcast.currentSlideIndex ? broadcast.currentSlideIndex + 1 : 0,
          });
          // Generate analytics
          await generateBroadcastAnalytics(input.broadcastId);
        } catch (e) {
          console.error("[Broadcast] Failed to generate recording/analytics:", e);
        }
        return { success: true };
      }),

    /** Update slide state (owner or presenter controls) */
    updateSlide: instructorProcedure
      .input(z.object({
        broadcastId: z.number(),
        slideIndex: z.number(),
        isAudioPlaying: z.boolean(),
        audioPosition: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "FORBIDDEN" });
        const isOwner = broadcast.instructorId === ctx.user.id;
        const collabRole = broadcast.projectId ? await db.getCollaboratorRole(broadcast.projectId, ctx.user.id) : null;
        if (!isOwner && collabRole !== "presenter") throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcastSlideState(input.broadcastId, input.slideIndex, input.isAudioPlaying, input.audioPosition);
        return { success: true };
      }),

    /** Sync state polling (viewers call this frequently) */
    syncState: publicProcedure
      .input(z.object({ broadcastId: z.number() }))
      .query(async ({ input }) => {
        const state = await db.getBroadcastState(input.broadcastId);
        if (!state) throw new TRPCError({ code: "NOT_FOUND" });
        return state;
      }),

    /** Save generated audio URLs for the broadcast */
    saveAudioUrls: instructorProcedure
      .input(z.object({
        broadcastId: z.number(),
        audioUrls: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, { audioUrls: JSON.stringify(input.audioUrls) });
        return { success: true };
      }),

    /** Join broadcast as viewer */
    join: protectedProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND" });
        const displayName = ctx.user.name || "Viewer";
        await db.joinBroadcast(input.broadcastId, ctx.user.id, displayName);
        return { success: true };
      }),

    /** Leave broadcast */
    leave: protectedProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.leaveBroadcast(input.broadcastId, ctx.user.id);
        return { success: true };
      }),

    /** Heartbeat to keep viewer active */
    heartbeat: protectedProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.heartbeatViewer(input.broadcastId, ctx.user.id);
        return { success: true };
      }),

    /** Get active viewers */
    viewers: protectedProcedure
      .input(z.object({ broadcastId: z.number() }))
      .query(async ({ input }) => {
        return db.getActiveViewers(input.broadcastId);
      }),

    /** Send chat message */
    chat: protectedProcedure
      .input(z.object({
        broadcastId: z.number(),
        message: z.string().min(1).max(500),
        messageType: z.enum(["chat", "question"]).default("chat"),
      }))
      .mutation(async ({ ctx, input }) => {
        const displayName = ctx.user.name || "Viewer";
        const id = await db.createBroadcastChat({
          broadcastId: input.broadcastId,
          userId: ctx.user.id,
          displayName,
          message: input.message,
          messageType: input.messageType,
        });
        return { id };
      }),

    /** Get chat messages (with polling support via afterId) */
    chatHistory: publicProcedure
      .input(z.object({
        broadcastId: z.number(),
        afterId: z.number().optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        return db.getBroadcastChats(input.broadcastId, input.afterId, input.limit);
      }),

    /** Pin/unpin a chat message (instructor only) */
    pinChat: instructorProcedure
      .input(z.object({ chatId: z.number(), isPinned: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.pinBroadcastChat(input.chatId, input.isPinned);
        return { success: true };
      }),

    /** Translate current slide content to target language (viewer interpretation) */
    translateSlide: protectedProcedure
      .input(z.object({
        broadcastId: z.number(),
        slideIndex: z.number(),
        targetLanguage: z.string().min(2).max(5),
        sourceLanguage: z.string().min(2).max(5).default("ko"),
      }))
      .mutation(async ({ input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND", message: "Broadcast not found." });
        const script = await db.getLectureScriptById(broadcast.scriptId);
        if (!script) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found." });

        let sections: any[] = [];
        try { sections = JSON.parse(script.sections as string); } catch {}
        const section = sections[input.slideIndex];
        if (!section) throw new TRPCError({ code: "BAD_REQUEST", message: "Slide not found." });

        const langNames: Record<string, string> = {
          ko: "Korean", zh: "Chinese", en: "English", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", es: "Spanish", fr: "French",
          de: "German", ar: "Arabic", hi: "Hindi", pt: "Portuguese",
          ru: "Russian", id: "Indonesian", tr: "Turkish",
        };
        const sourceLangName = langNames[input.sourceLanguage] || input.sourceLanguage;
        const targetLangName = langNames[input.targetLanguage] || input.targetLanguage;

        const textToTranslate = `Title: ${section.title}\n\nContent: ${section.content}`;
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional real-time interpreter for a live lecture broadcast. Translate the following ${sourceLangName} lecture slide to ${targetLangName}. Keep the structure (Title and Content). Provide ONLY the translated text.`,
            },
            { role: "user", content: textToTranslate },
          ],
        });
        const translated = (llmResponse.choices?.[0]?.message?.content as string || "").trim();

        // Parse translated title and content
        const titleMatch = translated.match(/Title:\s*(.+?)\n/i) || translated.match(/제목:\s*(.+?)\n/i);
        const contentMatch = translated.match(/Content:\s*([\s\S]+)/i) || translated.match(/내용:\s*([\s\S]+)/i);

        return {
          translatedTitle: titleMatch ? titleMatch[1].trim() : translated.split("\n")[0],
          translatedContent: contentMatch ? contentMatch[1].trim() : translated,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          slideIndex: input.slideIndex,
        };
      }),

    /** List my broadcast recordings (VOD) */
    recordings: instructorProcedure
      .query(async ({ ctx }) => {
        const { listBroadcastRecordings } = await import("./db");
        return listBroadcastRecordings(ctx.user.id);
      }),

    /** Get recording for a specific broadcast */
    getRecording: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .query(async ({ input }) => {
        const { getBroadcastRecording } = await import("./db");
        return getBroadcastRecording(input.broadcastId);
      }),

    /** Get analytics for a specific broadcast */
    getAnalytics: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .query(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { getBroadcastAnalytics } = await import("./db");
        return getBroadcastAnalytics(input.broadcastId);
      }),

    /** List all my broadcast analytics */
    analyticsList: instructorProcedure
      .query(async ({ ctx }) => {
        const { listBroadcastAnalytics } = await import("./db");
        return listBroadcastAnalytics(ctx.user.id);
      }),

    /** Regenerate analytics for a broadcast */
    regenerateAnalytics: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { generateBroadcastAnalytics } = await import("./db");
        return generateBroadcastAnalytics(input.broadcastId);
      }),
  }),

  // ========== Sample Faces Gallery ==========
  sampleFace: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        gender: z.string().optional(),
        isPremium: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listSampleFaces(input ?? undefined);
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSampleFace(input.id);
      }),
    /** Get all project avatars using this face (for current user) */
    avatarsByFace: protectedProcedure
      .input(z.object({ sampleFaceId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.listAvatarsBySampleFace(ctx.user.id, input.sampleFaceId);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        category: z.string().min(1),
        gender: z.string().min(1),
        ethnicity: z.string().optional(),
        ageRange: z.string().optional(),
        imageUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        isPremium: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.createSampleFace(input as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        gender: z.string().optional(),
        imageUrl: z.string().url().optional(),
        description: z.string().optional(),
        isPremium: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await db.updateSampleFace(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteSampleFace(input.id);
        return { success: true };
      }),
  }),

  // ========== Sample Voices Gallery ==========
  sampleVoice: router({
    list: publicProcedure
      .input(z.object({
        language: z.string().optional(),
        gender: z.string().optional(),
        tone: z.string().optional(),
        isPremium: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listSampleVoices(input ?? undefined);
      }),
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSampleVoice(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        language: z.string().min(1),
        gender: z.string().min(1),
        tone: z.string().min(1),
        ttsVoiceId: z.string().min(1),
        sampleAudioUrl: z.string().url().optional(),
        description: z.string().optional(),
        speed: z.string().optional(),
        pitch: z.string().optional(),
        isPremium: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return db.createSampleVoice(input as any);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        language: z.string().optional(),
        gender: z.string().optional(),
        tone: z.string().optional(),
        ttsVoiceId: z.string().optional(),
        description: z.string().optional(),
        isPremium: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await db.updateSampleVoice(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteSampleVoice(input.id);
        return { success: true };
      }),
    preview: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const voice = await db.getSampleVoice(input.id);
        if (!voice) throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found." });
        // If already has a sample audio URL, return it
        if (voice.sampleAudioUrl) {
          return { audioUrl: voice.sampleAudioUrl };
        }
        // Generate a short demo TTS using Gemini
        const demoTexts: Record<string, string> = {
          ko: "Hello, I am an AI lecture voice. I will make your lectures more vivid with this voice.",
          en: "Hello, I am an AI lecture voice. I will make your lectures more engaging and dynamic with this voice.",
          ja: "こんにちは、私はAI講義の音声です。この声であなたの講義をより生き生きとしたものにします。",
          zh: "你好，我是AI讲座语音。我会用这个声音让你的讲座更加生动有趣。",
          vi: "Xin chào, tôi là giọng nói AI cho bài giảng. Tôi sẽ giúp bài giảng của bạn trở nên sinh động và hấp dẫn hơn.",
          th: "สวัสดีครับ ผมเป็นเสียง AI สำหรับการบรรยาย เสียงนี้จะทำให้การบรรยายของคุณมีชีวิตชีวาและน่าสนใจยิ่งขึ้น",
          es: "Hola, soy una voz de IA para conferencias. Haré que sus presentaciones sean más atractivas y dinámicas.",
          fr: "Bonjour, je suis une voix IA pour les cours. Je rendrai vos présentations plus engageantes et dynamiques.",
          de: "Hallo, ich bin eine KI-Stimme für Vorlesungen. Ich werde Ihre Präsentationen lebendiger und dynamischer gestalten.",
          pt: "Olá, sou uma voz de IA para palestras. Vou tornar suas apresentações mais envolventes e dinâmicas.",
          ru: "Здравствуйте, я голос ИИ для лекций. Я сделаю ваши презентации более увлекательными и динамичными.",
          ar: "مرحباً، أنا صوت الذكاء الاصطناعي للمحاضرات. سأجعل عروضك التقديمية أكثر جاذبية وحيوية.",
          hi: "नमस्ते, मैं व्याख्यान के लिए एक AI आवाज़ हूँ। मैं आपकी प्रस्तुतियों को और अधिक आकर्षक और गतिशील बनाऊँगा।",
          id: "Halo, saya adalah suara AI untuk kuliah. Saya akan membuat presentasi Anda lebih menarik dan dinamis.",
        };
        const demoText = demoTexts[voice.language] || demoTexts.ko;
        try {
          const result = await generateGeminiTts({
            text: demoText,
            voiceId: voice.ttsVoiceId,
          });
          if ('error' in result) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "TTS generation failed" });
          }
          // Upload to S3
          const fileKey = `voice-demos/${voice.ttsVoiceId}-${nanoid(6)}.mp3`;
          const { url } = await storagePut(fileKey, result.audioBuffer, "audio/mpeg");
          // Update the sample voice with the audio URL
          await db.updateSampleVoice(voice.id, { sampleAudioUrl: url } as any);
          return { audioUrl: url };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          console.error("[Voice Preview] TTS generation failed:", err.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate voice preview." });
        }
      }),
  }),

  // ========== Subscription Plans ==========
  plan: router({
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
  }),

  // ========== User Subscription ==========
  subscription: router({
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
  }),

  // ========== Credits ==========
  credit: router({
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
        const { CREDIT_COSTS } = await import("./stripe");
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
        const { notifyOwner } = await import("./_core/notification");
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
  }),

  // ========== Payments (Stripe) ==========
  payment: router({
    // Create checkout session for subscription
    createSubscriptionCheckout: protectedProcedure
      .input(z.object({
        planSlug: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getStripe, SUBSCRIPTION_PRODUCTS } = await import("./stripe");
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
        const { getStripe, CREDIT_PACKAGES } = await import("./stripe");
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
        const { getStripe, SUBSCRIPTION_PRODUCTS } = await import("./stripe");
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
        const { getStripe } = await import("./stripe");
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
  }),

  // ========== Crypto Payments ==========
  crypto: router({
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
        const { SUBSCRIPTION_PRODUCTS, CREDIT_PACKAGES } = await import("./stripe");
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
  }),

  // ========== Revenue Dashboard (Admin) ==========
  revenue: router({
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
  }),

  // ========== Face Swap Gallery ==========
  gallery: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().min(0).optional(),
        method: z.enum(["all", "builtin", "did", "heygen"]).optional(),
        sort: z.enum(["latest", "likes"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getGalleryItems(input?.limit ?? 20, input?.offset ?? 0, input?.method ?? "all", input?.sort ?? "latest");
      }),
    myItems: protectedProcedure.query(async ({ ctx }) => {
      return db.getGalleryItemsByUser(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        beforeImageUrl: z.string().url(),
        afterImageUrl: z.string().url(),
        method: z.enum(["builtin", "did", "heygen"]).optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createGalleryItem({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          beforeImageUrl: input.beforeImageUrl,
          afterImageUrl: input.afterImageUrl,
          method: input.method ?? "builtin",
          isPublic: input.isPublic ?? true,
        });
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteGalleryItem(input.id, ctx.user.id);
        return { success: true };
      }),
    like: protectedProcedure
      .input(z.object({ galleryItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await db.toggleGalleryLike(input.galleryItemId, ctx.user.id);
        return { liked };
      }),
    comments: publicProcedure
      .input(z.object({ galleryItemId: z.number() }))
      .query(async ({ input }) => {
        return db.getGalleryComments(input.galleryItemId);
      }),
    addComment: protectedProcedure
      .input(z.object({ galleryItemId: z.number(), content: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        await db.addGalleryComment(input.galleryItemId, ctx.user.id, input.content);
        return { success: true };
      }),
    myLikes: protectedProcedure.query(async ({ ctx }) => {
      const likes = await db.getUserLikes(ctx.user.id);
      return likes.map(l => l.galleryItemId);
    }),
    uploadImage: protectedProcedure
      .input(z.object({
        imageData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageData, "base64");
        const fileKey = `gallery/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ========== PIP Settings ==========
  pip: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getPipSettings(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
        opacity: z.number().min(0).max(100).optional(),
        shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        customX: z.number().min(0).max(100).optional(),
        customY: z.number().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertPipSettings(ctx.user.id, input);
        return { success: true };
      }),
    /** List pip presets */
    presets: protectedProcedure.query(async ({ ctx }) => {
      return db.getPipPresets(ctx.user.id);
    }),
    /** Save a pip preset */
    savePreset: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
        opacity: z.number().min(0).max(100).optional(),
        shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        customX: z.number().min(0).max(100).optional(),
        customY: z.number().min(0).max(100).optional(),
        customWidth: z.number().min(5).max(100).optional(),
        customHeight: z.number().min(5).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createPipPreset({
          userId: ctx.user.id,
          name: input.name,
          position: input.position || "custom",
          size: input.size || "medium",
          opacity: input.opacity ?? 100,
          shape: input.shape || "rounded",
          customX: input.customX ?? 75,
          customY: input.customY ?? 75,
          customWidth: input.customWidth ?? 25,
          customHeight: input.customHeight ?? 25,
        });
        return { id };
      }),
    /** Delete a pip preset */
    deletePreset: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePipPreset(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  ppt: router({
    upload: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload original file to S3
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `ppt/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.mimeType);
        
        // Create DB record
        const id = await db.createPptUpload({
          userId: ctx.user.id,
          title: input.title,
          originalFileUrl: fileUrl,
          originalFileName: input.fileName,
          status: "processing",
        });
        
        // Auto-convert to slide images
        try {
          const { pdfToPng } = await import("pdf-to-png-converter");
          const { execSync } = await import("child_process");
          const fs = await import("fs");
          const path = await import("path");
          const os = await import("os");
          
          const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ppt-"));
          let pdfBuffer: Buffer = fileBuffer;
          
          // If PPTX/PPT, convert to PDF first using LibreOffice
          const ext = input.fileName.toLowerCase().split(".").pop();
          if (ext === "pptx" || ext === "ppt") {
            const inputPath = path.join(tmpDir, input.fileName);
            fs.writeFileSync(inputPath, fileBuffer);
            try {
              execSync(`libreoffice --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`, {
                timeout: 120000,
                env: { ...process.env, HOME: tmpDir },
              });
              const pdfName = input.fileName.replace(/\.(pptx?|PPT[X]?)$/, ".pdf");
              const pdfPath = path.join(tmpDir, pdfName);
              if (fs.existsSync(pdfPath)) {
                pdfBuffer = fs.readFileSync(pdfPath);
              } else {
                // Try finding any PDF in tmpDir
                const files = fs.readdirSync(tmpDir).filter((f: string) => f.endsWith(".pdf"));
                if (files.length > 0) {
                  pdfBuffer = fs.readFileSync(path.join(tmpDir, files[0]));
                } else {
                  throw new Error("LibreOffice PDF conversion failed");
                }
              }
            } catch (e: any) {
              console.error("LibreOffice conversion error:", e.message);
              // Fallback: store as single slide
              await db.updatePptUpload(id, { status: "ready", totalSlides: 1, slideImages: [fileUrl] });
              return { id, fileUrl, slideCount: 1 };
            }
          } else if (ext !== "pdf") {
            // Unsupported format, store as-is
            await db.updatePptUpload(id, { status: "ready", totalSlides: 1, slideImages: [fileUrl] });
            return { id, fileUrl, slideCount: 1 };
          }
          
          // Convert PDF pages to PNG images
          const pngPages = await pdfToPng(pdfBuffer, {
            disableFontFace: false,
            useSystemFonts: true,
            viewportScale: 2.0,
          });
          
          // Upload each slide image to S3
          const slideUrls: string[] = [];
          for (let i = 0; i < pngPages.length; i++) {
            const pageContent = pngPages[i].content;
            if (!pageContent) continue;
            const slideKey = `ppt/${ctx.user.id}/slides/${nanoid()}-slide-${i + 1}.png`;
            const { url: slideUrl } = await storagePut(slideKey, pageContent, "image/png");
            slideUrls.push(slideUrl);
          }
          
          // Clean up temp files
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
          
          await db.updatePptUpload(id, {
            status: "ready",
            totalSlides: slideUrls.length,
            slideImages: slideUrls,
          });
          
          return { id, fileUrl, slideCount: slideUrls.length };
        } catch (conversionError: any) {
          console.error("Slide conversion error:", conversionError.message);
          // Fallback: mark as ready with original file as single slide
          await db.updatePptUpload(id, { status: "ready", totalSlides: 1, slideImages: [fileUrl] });
          return { id, fileUrl, slideCount: 1 };
        }
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPptUploadsByUser(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const ppt = await db.getPptUploadById(input.id);
        if (!ppt || ppt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return ppt;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ppt = await db.getPptUploadById(input.id);
        if (!ppt || ppt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.deletePptUpload(input.id);
        return { success: true };
      }),

    reorderSlides: protectedProcedure
      .input(z.object({
        id: z.number(),
        slideOrder: z.array(z.number()), // array of original indices in new order
      }))
      .mutation(async ({ ctx, input }) => {
        const ppt = await db.getPptUploadById(input.id);
        if (!ppt || ppt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const currentSlides: string[] = typeof ppt.slideImages === 'string' ? JSON.parse(ppt.slideImages) : (ppt.slideImages as unknown as string[]) || [];
        const reordered = input.slideOrder.map(idx => currentSlides[idx]).filter(Boolean);
        await db.updatePptUpload(input.id, {
          slideImages: JSON.stringify(reordered) as any,
          totalSlides: reordered.length,
        });
        return { success: true, totalSlides: reordered.length };
      }),

    deleteSlide: protectedProcedure
      .input(z.object({
        id: z.number(),
        slideIndex: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ppt = await db.getPptUploadById(input.id);
        if (!ppt || ppt.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const currentSlides: string[] = typeof ppt.slideImages === 'string' ? JSON.parse(ppt.slideImages) : (ppt.slideImages as unknown as string[]) || [];
        if (input.slideIndex < 0 || input.slideIndex >= currentSlides.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid slide index" });
        }
        currentSlides.splice(input.slideIndex, 1);
        await db.updatePptUpload(input.id, {
          slideImages: JSON.stringify(currentSlides) as any,
          totalSlides: currentSlides.length,
        });
        return { success: true, totalSlides: currentSlides.length };
      }),
  }),

  // ============ v7.0 Lecture Builder ============
  lectureBuilder: router({
    // --- Format Templates ---
    listFormatTemplates: publicProcedure
      .input(z.object({ category: z.enum(["personnel", "style", "insert"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.listLectureFormatTemplates(input?.category);
      }),
    getFormatTemplate: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getLectureFormatTemplate(input.id);
        if (!template) throw new TRPCError({ code: "NOT_FOUND" });
        return template;
      }),
    // --- Project CRUD ---
    createProject: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        formatSelection: z.object({
          personnelId: z.number().nullable(),
          styleId: z.number().nullable(),
          insertIds: z.array(z.number()),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLectureProject({ userId: ctx.user.id, title: input.title, description: input.description || null, formatSelection: input.formatSelection || null });

        // Auto-configure avatars and scripts based on format selection
        if (input.formatSelection) {
          const { personnelId, styleId, insertIds } = input.formatSelection;

          // Auto-create avatar slots based on personnel format
          if (personnelId) {
            const template = await db.getLectureFormatTemplate(personnelId);
            if (template?.personnelConfig) {
              try {
                const config = typeof template.personnelConfig === 'string'
                  ? JSON.parse(template.personnelConfig)
                  : template.personnelConfig;
                if (Array.isArray(config)) {
                  let sortOrder = 0;
                  for (const person of config) {
                    const count = person.count || 1;
                    for (let i = 0; i < count; i++) {
                      const name = count > 1 ? `${person.label} ${i + 1}` : person.label;
                      const role = person.role || 'instructor';
                      const voiceMap: Record<string, string> = {
                        instructor: 'Kore', host: 'Chae', guest: 'Yuna', narrator: 'Miso',
                      };
                      await db.addProjectAvatar({
                        projectId: id,
                        name,
                        role: role as any,
                        ttsVoiceId: voiceMap[role] || 'Kore',
                        sortOrder: sortOrder++,
                      });
                    }
                  }
                }
              } catch (e) { console.error('Failed to parse personnelConfig:', e); }
            }
          }

          // Auto-create script sections based on style + insert formats
          const scriptSections: { text: string; sortOrder: number }[] = [];
          let order = 0;

          // Check for intro insert
          for (const insertId of insertIds) {
            const insertTpl = await db.getLectureFormatTemplate(insertId);
            if (insertTpl?.insertElements) {
              try {
                const elems = typeof insertTpl.insertElements === 'string'
                  ? JSON.parse(insertTpl.insertElements)
                  : insertTpl.insertElements;
                if (elems.type === 'intro_outro' || elems.position === 'start_end') {
                  scriptSections.push({ text: `[${insertTpl.name} - Opening] Write your intro content here`, sortOrder: order++ });
                }
              } catch (e) {}
            }
          }

          // Main content sections based on style
          if (styleId) {
            const styleTpl = await db.getLectureFormatTemplate(styleId);
            const styleName = styleTpl?.name || 'Lecture';
            scriptSections.push(
              { text: `[Intro] ${styleName} - Topic introduction and goals`, sortOrder: order++ },
              { text: `[Body 1] ${styleName} - Content section 1`, sortOrder: order++ },
              { text: `[Body 2] ${styleName} - Content section 2`, sortOrder: order++ },
              { text: `[Body 3] ${styleName} - Content section 3`, sortOrder: order++ },
            );
          } else {
            scriptSections.push(
              { text: '[Intro] Topic introduction', sortOrder: order++ },
              { text: '[Body 1] First section', sortOrder: order++ },
              { text: '[Body 2] Second section', sortOrder: order++ },
            );
          }

          // Insert elements in the middle
          for (const insertId of insertIds) {
            const insertTpl = await db.getLectureFormatTemplate(insertId);
            if (insertTpl?.insertElements) {
              try {
                const elems = typeof insertTpl.insertElements === 'string'
                  ? JSON.parse(insertTpl.insertElements)
                  : insertTpl.insertElements;
                if (elems.type !== 'intro_outro' && elems.position !== 'start_end') {
                  scriptSections.push({ text: `[${insertTpl.name}] Write your ${insertTpl.name} content here`, sortOrder: order++ });
                }
              } catch (e) {}
            }
          }

          // Closing section
          scriptSections.push({ text: '[Closing] Lecture summary and closing remarks', sortOrder: order++ });

          // Check for outro insert
          for (const insertId of insertIds) {
            const insertTpl = await db.getLectureFormatTemplate(insertId);
            if (insertTpl?.insertElements) {
              try {
                const elems = typeof insertTpl.insertElements === 'string'
                  ? JSON.parse(insertTpl.insertElements)
                  : insertTpl.insertElements;
                if (elems.type === 'intro_outro' || elems.position === 'start_end') {
                  scriptSections.push({ text: `[${insertTpl.name} - Closing] Write your outro content here`, sortOrder: order++ });
                }
              } catch (e) {}
            }
          }

          // Save script sections
          for (const section of scriptSections) {
            await db.setSlideScript({
              projectId: id,
              slideId: 0,
              scriptText: section.text,
              sortOrder: section.sortOrder,
            });
          }
        }

        return { id };
      }),

    listProjects: protectedProcedure.query(async ({ ctx }) => {
      return db.listLectureProjects(ctx.user.id);
    }),

    getProject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return project;
      }),

    updateProject: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        currentStep: z.number().min(1).max(5).optional(),
        status: z.enum(["draft", "in_progress", "ready", "generating", "completed", "failed"]).optional(),
        avatarPosition: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "none"]).optional(),
        avatarSize: z.enum(["small", "medium", "large"]).optional(),
        avatarShape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        avatarOpacity: z.number().min(0).max(100).optional(),
        formatSelection: z.object({
          personnelId: z.number().nullable(),
          styleId: z.number().nullable(),
          insertIds: z.array(z.number()),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const { id, ...data } = input;
        await db.updateLectureProject(id, data as any);
        return { success: true };
      }),

    deleteProject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteLectureProject(input.id);
        return { success: true };
      }),

    // --- Avatars ---
    addAvatar: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sampleFaceId: z.number().optional(),
        customFaceUrl: z.string().optional(),
        name: z.string().min(1),
        role: z.enum(["instructor", "host", "guest", "narrator"]).default("instructor"),
        ttsVoiceId: z.string().default("Kore"),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.addProjectAvatar(input);
        return { id };
      }),

    listAvatars: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.listProjectAvatars(input.projectId);
      }),

    updateAvatar: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.enum(["instructor", "host", "guest", "narrator"]).optional(),
        ttsVoiceId: z.string().optional(),
        sampleFaceId: z.number().nullable().optional(),
        customFaceUrl: z.string().nullable().optional(),
        voiceCloneId: z.number().nullable().optional(),
        voiceSpeed: z.number().min(0.5).max(2.0).optional(),
        voicePitch: z.number().min(-12).max(12).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectAvatar(id, data as any);
        return { success: true };
      }),

    /** Generate AI avatar face from text prompt */
    generateAvatarFace: protectedProcedure
      .input(z.object({
        prompt: z.string().min(3).max(500),
        style: z.enum(["realistic", "anime", "3d", "illustration"]).default("realistic"),
        gender: z.enum(["male", "female", "neutral"]).optional(),
        ageRange: z.enum(["young", "middle", "senior"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const styleMap: Record<string, string> = {
          realistic: "photorealistic portrait, studio lighting, neutral background, high resolution, professional headshot",
          anime: "anime style portrait, clean lines, vibrant colors, detailed face, studio background",
          "3d": "3D rendered portrait, Pixar style, smooth shading, studio lighting, clean background",
          illustration: "digital illustration portrait, clean art style, professional, flat background",
        };
        const genderHint = input.gender ? (input.gender === "male" ? "male person" : input.gender === "female" ? "female person" : "person") : "person";
        const ageHint = input.ageRange ? ({ young: "in their 20s", middle: "in their 30s-40s", senior: "in their 50s-60s" }[input.ageRange]) : "";
        const fullPrompt = `Portrait of a ${genderHint} ${ageHint}, ${input.prompt}. ${styleMap[input.style]}. Face centered, looking at camera, shoulders visible.`;
        const { url } = await generateImage({ prompt: fullPrompt });
        if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI face generation failed" });
        return { imageUrl: url };
      }),

    deleteAvatar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectAvatar(input.id);
        return { success: true };
      }),

    // --- Slides ---
    addSlide: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        imageUrl: z.string(),
        fileKey: z.string(),
        slideOrder: z.number().default(0),
        originalFileName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.addProjectSlide(input);
        return { id };
      }),

    listSlides: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.listProjectSlides(input.projectId);
      }),

    reorderSlides: protectedProcedure
      .input(z.object({ projectId: z.number(), slideIds: z.array(z.number()) }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.reorderProjectSlides(input.projectId, input.slideIds);
        return { success: true };
      }),

    deleteSlide: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectSlide(input.id);
        return { success: true };
      }),

    // --- Upload single image slide (base64) ---
    uploadImageSlide: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string().default("image/png"),
        slideOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const buffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() || "png";
        const fileKey = `lecture-builder/${input.projectId}/slides/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const id = await db.addProjectSlide({
          projectId: input.projectId,
          imageUrl: url,
          fileKey,
          slideOrder: input.slideOrder,
          originalFileName: input.fileName,
        });
        return { id, url, fileKey };
      }),

    // --- Upload slides from file (PPT/PDF/images) ---
    uploadSlides: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string(),
        slideImages: z.array(z.object({ url: z.string(), key: z.string() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        // Get current max slide order
        const existing = await db.listProjectSlides(input.projectId);
        let maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.slideOrder)) + 1 : 0;
        const ids: number[] = [];
        for (const img of input.slideImages) {
          const id = await db.addProjectSlide({
            projectId: input.projectId,
            imageUrl: img.url,
            fileKey: img.key,
            slideOrder: maxOrder++,
            originalFileName: input.fileName,
          });
          ids.push(id);
        }
        return { slideIds: ids, count: ids.length };
      }),

    // --- Slide Scripts ---
    setScript: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        avatarId: z.number().optional(),
        scriptText: z.string(),
        estimatedDurationSec: z.number().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.setSlideScript(input);
        return { id };
      }),

    listScripts: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.listSlideScripts(input.projectId);
      }),

    updateScript: protectedProcedure
      .input(z.object({
        id: z.number(),
        scriptText: z.string().optional(),
        avatarId: z.number().optional(),
        estimatedDurationSec: z.number().optional(),
        emotion: z.enum(["neutral", "happy", "serious", "excited", "empathetic", "confident", "questioning"]).optional(),
        emotionIntensity: z.number().min(1).max(10).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSlideScript(id, data as any);
        return { success: true };
      }),

    /** AI auto-analyze emotions for all scripts in a project */
    analyzeEmotions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scripts = await db.listSlideScripts(input.projectId);
        if (!scripts || scripts.length === 0) return { updated: 0 };
        const { invokeLLM } = await import("./_core/llm");
        const scriptsForAnalysis = scripts.slice(0, 50).map(s => ({
          id: s.id,
          text: s.scriptText?.substring(0, 200) || "",
        }));
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an emotion analyzer for lecture scripts. For each script segment, determine the most appropriate emotion and intensity.
Emotions: neutral, happy, serious, excited, empathetic, confident, questioning
Intensity: 1-10 (1=subtle, 10=very strong)
Respond with JSON array: [{"id": number, "emotion": string, "intensity": number}]`,
            },
            {
              role: "user",
              content: JSON.stringify(scriptsForAnalysis),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "emotion_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        emotion: { type: "string" },
                        intensity: { type: "number" },
                      },
                      required: ["id", "emotion", "intensity"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices?.[0]?.message?.content as string || "{}";
        let results: { id: number; emotion: string; intensity: number }[] = [];
        try {
          const parsed = JSON.parse(content);
          results = parsed.results || [];
        } catch { return { updated: 0 }; }
        const validEmotions = ["neutral", "happy", "serious", "excited", "empathetic", "confident", "questioning"];
        let updated = 0;
        for (const r of results) {
          if (validEmotions.includes(r.emotion) && r.intensity >= 1 && r.intensity <= 10) {
            await db.updateSlideScript(r.id, { emotion: r.emotion as any, emotionIntensity: r.intensity });
            updated++;
          }
        }
        return { updated };
      }),

    deleteScript: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSlideScript(input.id);
        return { success: true };
      }),

    // --- Slide Script Version Management ---
    saveScriptVersion: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        changeDescription: z.string().optional(),
        changeType: z.enum(["manual", "auto"]).default("manual"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        // Get current scripts
        const scripts = await db.listSlideScripts(input.projectId);
        const snapshot = scripts.map((s: any) => ({
          sortOrder: s.sortOrder,
          scriptText: s.scriptText,
          avatarId: s.avatarId,
        }));
        const latestVer = await db.getLatestSlideScriptVersionNumber(input.projectId);
        const versionId = await db.createSlideScriptVersion({
          projectId: input.projectId,
          userId: ctx.user.id,
          versionNumber: latestVer + 1,
          sectionsSnapshot: JSON.stringify(snapshot),
          sectionCount: snapshot.length,
          changeDescription: input.changeDescription || `\uBC84\uC804 ${latestVer + 1}`,
          changeType: input.changeType,
        });
        return { versionId, versionNumber: latestVer + 1 };
      }),

    listScriptVersions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getSlideScriptVersions(input.projectId, ctx.user.id);
      }),

    restoreScriptVersion: protectedProcedure
      .input(z.object({ projectId: z.number(), versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const version = await db.getSlideScriptVersionById(input.versionId);
        if (!version || version.projectId !== input.projectId) throw new TRPCError({ code: "NOT_FOUND" });
        const snapshot = JSON.parse(version.sectionsSnapshot) as { sortOrder: number; scriptText: string; avatarId?: number }[];
        // Delete existing scripts
        const existing = await db.listSlideScripts(input.projectId);
        for (const s of existing) { await db.deleteSlideScript(s.id); }
        // Recreate from snapshot
        for (const sec of snapshot) {
          await db.setSlideScript({
            projectId: input.projectId,
            slideId: 0,
            scriptText: sec.scriptText,
            avatarId: sec.avatarId,
            sortOrder: sec.sortOrder,
          });
        }
        return { success: true, sectionCount: snapshot.length, restoredVersion: version.versionNumber };
      }),

    // --- AI Script Generation ---
    generateScript: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        prompt: z.string().min(1),
        language: z.string().default("ko"),
        slideCount: z.number().min(1).max(50).default(10),
        useFormatContext: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        // Build format context from project avatars and scripts
        let formatContext = '';
        if (input.useFormatContext) {
          const avatars = await db.listProjectAvatars(input.projectId);
          const existingScripts = await db.listSlideScripts(input.projectId);

          if (avatars.length > 0) {
            const roles = avatars.map((a: any) => `${a.name} (${a.role})`).join(', ');
            formatContext += `\n\n## Personnel Configuration\nThis lecture has ${avatars.length} speakers: ${roles}.\nWrite the script with dialogue/narration assigned to each speaker. Mark speaker changes with [Speaker: Name] tags.`;
          }

          if (existingScripts.length > 0) {
            const sectionNames = existingScripts.map((s: any) => s.scriptText).filter((t: string) => t.startsWith('[')).join(', ');
            if (sectionNames) {
              formatContext += `\n\n## Existing Section Structure\nThe lecture already has these section placeholders: ${sectionNames}\nFollow this structure and fill in actual content for each section.`;
            }
          }
        }

        const langMap: Record<string, string> = { ko: 'Korean', en: 'English', zh: 'Chinese', ja: 'Japanese', vi: 'Vietnamese', th: 'Thai' };
        const langName = langMap[input.language] || input.language;

        const systemPrompt = `You are a professional lecture script writer specializing in creating engaging, well-structured educational content.

## Instructions
- Generate a lecture script divided into exactly ${input.slideCount} sections
- Each section should be 3-6 sentences (natural speaking length for 30-60 seconds)
- Write in ${langName}
- Make the content educational, engaging, and natural for spoken delivery
- Include transitions between sections
- Start with an engaging introduction and end with a clear conclusion
- If multiple speakers are specified, write dialogue between them naturally${formatContext}

## Output Format
Return a JSON object with a "sections" array. Each section has:
- "section": section number (integer)
- "text": the script text for that section
- "speaker": (optional) the speaker name if multiple speakers are involved
- "type": section type - one of "intro", "main", "insert", "qa", "closing"`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lecture_scripts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section: { type: "integer" },
                        text: { type: "string" },
                        speaker: { type: "string" },
                        type: { type: "string" },
                      },
                      required: ["section", "text", "speaker", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sections"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = response.choices?.[0]?.message?.content || "{}";
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
        const parsed = JSON.parse(content);
        return { sections: parsed.sections || [] };
      }),

    // --- Split/Classify existing script ---
    splitScript: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fullText: z.string().min(1),
        slideCount: z.number().min(1).max(50).default(10),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const systemPrompt = `You are a script classifier. Split the following text into exactly ${input.slideCount} logical sections for a slide presentation. Each section should cover one topic/point. Return JSON array: [{"section": 1, "text": "..."}]`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.fullText },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "split_scripts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section: { type: "integer" },
                        text: { type: "string" },
                      },
                      required: ["section", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sections"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent2 = response.choices?.[0]?.message?.content || "{}";
        const content2 = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);
        const parsed = JSON.parse(content2);
        return { sections: parsed.sections || [] };
      }),

    // --- Annotations ---
    addAnnotation: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        annotationType: z.enum(["circle", "arrow", "check", "underline", "freehand"]).default("circle"),
        penColor: z.string().default("#FF0000"),
        penThickness: z.number().min(1).max(10).default(3),
        pathData: z.any().optional(),
        showAtSec: z.number().default(0),
        durationSec: z.number().default(3),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.addSlideAnnotation(input);
        return { id };
      }),

    listAnnotations: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.listSlideAnnotations(input.projectId);
      }),

    listAnnotationsBySlide: protectedProcedure
      .input(z.object({ slideId: z.number() }))
      .query(async ({ input }) => {
        return db.listSlideAnnotationsBySlide(input.slideId);
      }),

    updateAnnotation: protectedProcedure
      .input(z.object({
        id: z.number(),
        annotationType: z.enum(["circle", "arrow", "check", "underline", "freehand"]).optional(),
        penColor: z.string().optional(),
        penThickness: z.number().optional(),
        pathData: z.any().optional(),
        showAtSec: z.number().optional(),
        durationSec: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSlideAnnotation(id, data as any);
        return { success: true };
      }),

    deleteAnnotation: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSlideAnnotation(input.id);
        return { success: true };
      }),

    // --- Convert PPT/PDF to slide images ---
    convertFile: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const { convertFileToSlideImages, extractFileText } = await import("./slideConverter");
        const buffer = Buffer.from(input.fileData, "base64");
        const slideImages = await convertFileToSlideImages(buffer, input.fileName, input.mimeType, input.projectId);
        const existing = await db.listProjectSlides(input.projectId);
        let maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.slideOrder)) + 1 : 0;
        const ids: number[] = [];
        for (const img of slideImages) {
          const id = await db.addProjectSlide({
            projectId: input.projectId,
            imageUrl: img.imageUrl,
            fileKey: img.fileKey,
            slideOrder: maxOrder++,
            originalFileName: input.fileName,
          });
          ids.push(id);
        }
        // Extract text from PPT/PDF for script drafts
        let extractedTexts: { pageIndex: number; text: string }[] = [];
        try {
          extractedTexts = await extractFileText(buffer, input.fileName, input.mimeType);
        } catch (err) {
          console.error("Text extraction failed (non-fatal):", err);
        }
        return { slideIds: ids, count: ids.length, images: slideImages, extractedTexts };
      }),

    // --- Upload BGM ---
    uploadBgm: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string().default("audio/mpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `lecture-builder/${input.projectId}/bgm/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, fileKey };
      }),

    // --- Save canvas drawing (pen annotations) ---
    saveCanvasDrawing: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        type: z.enum(["circle", "arrow", "check", "freehand", "rectangle", "line"]),
        color: z.string().default("#ff0000"),
        strokeWidth: z.number().default(3),
        pathData: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.addSlideAnnotation({
          projectId: input.projectId,
          slideId: input.slideId,
          annotationType: input.type as any,
          penColor: input.color,
          penThickness: input.strokeWidth,
          pathData: input.pathData as any,
        });
        return { id };
      }),

    // --- Generate lecture video ---
    generateVideo: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        avatarPosition: z.string().default("bottom-right"),
        avatarSize: z.number().default(25),
        avatarShape: z.string().default("circle"),
        avatarOpacity: z.number().default(100),
        bgmUrl: z.string().optional(),
        bgmVolume: z.number().default(30),
        noiseReduction: z.boolean().default(false),
        resolution: z.string().default("1080p"),
        selectedSlideIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const [avatars, slides, scripts, annotations] = await Promise.all([
          db.listProjectAvatars(input.projectId),
          db.listProjectSlides(input.projectId),
          db.listSlideScripts(input.projectId),
          db.listSlideAnnotations(input.projectId),
        ]);
        let filteredSlides = slides;
        if (input.selectedSlideIds && input.selectedSlideIds.length > 0) {
          filteredSlides = slides.filter(s => input.selectedSlideIds!.includes(s.id));
        }
        const segments = filteredSlides.map(slide => {
          const script = scripts.find(s => s.slideId === slide.id);
          const avatar = avatars.find(a => a.id === (script?.avatarId || avatars[0]?.id));
          const slideAnnotations = annotations.filter(a => a.slideId === slide.id);
          return {
            slideId: slide.id,
            slideOrder: slide.slideOrder,
            imageUrl: slide.imageUrl,
            script: script?.scriptText || "",
            avatarFaceUrl: avatar?.customFaceUrl || "",
            avatarVoiceId: avatar?.ttsVoiceId || "ko-KR-SunHiNeural",
            avatarName: avatar?.name || "Default",
            annotations: slideAnnotations.map(a => ({
              type: a.annotationType, color: a.penColor || '#FF0000', strokeWidth: a.penThickness || 3,
              pathData: a.pathData,
            })),
          };
        }).filter(s => s.script);
        if (segments.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No segments with scripts found" });
        // Create generation history record
        const genId = await db.createVideoGeneration({
          projectId: input.projectId,
          userId: ctx.user.id,
          status: "generating",
          slideCount: segments.length,
          resolution: input.resolution,
          config: {
            avatarPosition: input.avatarPosition, avatarSize: input.avatarSize,
            avatarShape: input.avatarShape, avatarOpacity: input.avatarOpacity,
            bgmUrl: input.bgmUrl, bgmVolume: input.bgmVolume,
            noiseReduction: input.noiseReduction,
          },
        });
        // Update project status
        await db.updateLectureProject(input.projectId, {
          status: "generating" as any,
          generationProgress: 0,
          generationStep: "Preparing video generation...",
        });
        try {
          const totalSegments = segments.length;
          const { generateLectureVideo } = await import("./lectureVideoGenerator");

          // Progress callback to update DB during generation
          const onProgress = async (progress: { phase: string; current: number; total: number; message: string }) => {
            let pct = 0;
            if (progress.phase === "avatar") {
              pct = Math.round((progress.current / progress.total) * 70);
            } else if (progress.phase === "compose") {
              pct = 75;
            } else if (progress.phase === "finalize") {
              pct = 90;
            } else if (progress.phase === "complete") {
              pct = 100;
            }
            await db.updateLectureProject(input.projectId, {
              generationProgress: Math.min(95, pct),
              generationStep: progress.message,
            });
          };

          const result = await generateLectureVideo({
            projectId: input.projectId, segments,
            avatarPosition: input.avatarPosition, avatarSize: input.avatarSize,
            avatarShape: input.avatarShape, avatarOpacity: input.avatarOpacity,
            bgmUrl: input.bgmUrl, bgmVolume: input.bgmVolume,
            noiseReduction: input.noiseReduction, resolution: input.resolution,
          }, onProgress);
          await db.updateLectureProject(input.projectId, {
            status: "completed" as any,
            finalVideoUrl: result.videoUrl,
            generationProgress: 100,
            generationStep: "Complete",
          });
          // Update generation history
          await db.updateVideoGeneration(genId, {
            status: "completed",
            videoUrl: result.videoUrl,
            totalDuration: result.totalDuration,
            completedAt: new Date(),
          });
          return { videoUrl: result.videoUrl, totalDuration: result.totalDuration };
        } catch (error: any) {
          await db.updateLectureProject(input.projectId, {
            status: "failed" as any,
            generationProgress: 0,
            generationStep: undefined,
            errorMessage: error.message,
          });
          // Update generation history with error
          await db.updateVideoGeneration(genId, {
            status: "failed",
            errorMessage: error.message,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
      }),

    // --- List video generation history ---
    listVideoHistory: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.listVideoGenerations(input.projectId);
      }),

    // --- List all user video generations ---
    listAllVideoHistory: protectedProcedure
      .query(async ({ ctx }) => {
        return db.listUserVideoGenerations(ctx.user.id);
      }),

    // --- Delete video generation record ---
    deleteVideoGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const gen = await db.getVideoGeneration(input.id);
        if (!gen || gen.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.updateVideoGeneration(input.id, { status: "failed" as any });
        return { success: true };
      }),

    // --- Apply extracted texts as script drafts ---
    applyExtractedTextsAsScripts: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideTextPairs: z.array(z.object({
          slideId: z.number(),
          text: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        let created = 0;
        for (const pair of input.slideTextPairs) {
          if (!pair.text || pair.text.trim().length === 0) continue;
          // Check if script already exists for this slide
          const existing = await db.listSlideScripts(input.projectId);
          const hasScript = existing.some(s => s.slideId === pair.slideId);
          if (!hasScript) {
            await db.setSlideScript({
              projectId: input.projectId,
              slideId: pair.slideId,
              scriptText: pair.text.trim(),
              estimatedDurationSec: Math.max(10, Math.ceil(pair.text.trim().length / 5)),
              sortOrder: 0,
            });
            created++;
          }
        }
        return { created, total: input.slideTextPairs.length };
      }),

    // --- Get video generation progress ---
    getVideoProgress: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return {
          status: project.status,
          progress: project.generationProgress ?? 0,
          step: project.generationStep ?? "",
          videoUrl: project.finalVideoUrl ?? null,
          errorMessage: project.errorMessage ?? null,
        };
      }),

    // --- Export lecture video as MP4 ---
    exportVideo: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        resolution: z.enum(["720p", "1080p", "1440p"]).default("1080p"),
        includeSubtitles: z.boolean().default(false),
        subtitleStyleId: z.number().optional(),
        subtitleStyle: z.object({
          fontSize: z.number().optional(),
          fontColor: z.string().optional(),
          bgColor: z.string().optional(),
          position: z.enum(["top", "bottom"]).optional(),
          fontFamily: z.string().optional(),
          bold: z.boolean().optional(),
          italic: z.boolean().optional(),
          outline: z.boolean().optional(),
        }).optional(),
        bgmUrl: z.string().optional(),
        bgmVolume: z.number().default(30),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        // Load subtitle style from DB if subtitleStyleId provided
        let resolvedSubtitleStyle = input.subtitleStyle;
        if (!resolvedSubtitleStyle && input.includeSubtitles) {
          const savedStyle = await db.getSubtitleStyle(ctx.user.id);
          if (savedStyle) {
            resolvedSubtitleStyle = {
              fontSize: savedStyle.fontSize,
              fontColor: savedStyle.fontColor,
              bgColor: savedStyle.bgColor,
              position: savedStyle.position === "custom" ? "bottom" : savedStyle.position,
              fontFamily: savedStyle.fontFamily,
              bold: savedStyle.bold,
              italic: savedStyle.italic,
              outline: savedStyle.outline,
            };
          }
        }
        const [avatars, slides, scripts] = await Promise.all([
          db.listProjectAvatars(input.projectId),
          db.listProjectSlides(input.projectId),
          db.listSlideScripts(input.projectId),
        ]);
        if (slides.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No slides found" });
        // Build export segments
        const segments = slides.map(slide => {
          const script = scripts.find(s => s.slideId === slide.id);
          const avatar = avatars.find(a => a.id === (script?.avatarId || avatars[0]?.id));
          return {
            slideImageUrl: slide.imageUrl,
            avatarVideoUrl: undefined as string | undefined, // Will be filled from generation history
            duration: script?.estimatedDurationSec || 30,
            scriptText: script?.scriptText || "",
          };
        });
        // Check if there are generated avatar videos from history
        const videoHistory = await db.listVideoGenerations(input.projectId);
        const latestCompleted = videoHistory.find(v => v.status === "completed" && v.videoUrl);
        // Update project status
        await db.updateLectureProject(input.projectId, {
          status: "generating" as any,
          generationProgress: 0,
          generationStep: "Preparing MP4 export...",
        });
        try {
          const { exportLectureVideo } = await import("./videoExporter");
          const onProgress = async (progress: { phase: string; progress: number; message: string }) => {
            await db.updateLectureProject(input.projectId, {
              generationProgress: Math.min(95, progress.progress),
              generationStep: progress.message,
            });
          };
          const result = await exportLectureVideo({
            projectId: input.projectId,
            segments,
            bgmUrl: input.bgmUrl || undefined,
            bgmVolume: input.bgmVolume || 30,
            resolution: input.resolution as any,
            avatarPosition: project.avatarPosition || "bottom-right",
            avatarSize: project.avatarSize === "small" ? 15 : project.avatarSize === "large" ? 35 : 25,
            avatarShape: project.avatarShape || "circle",
            avatarOpacity: project.avatarOpacity || 100,
            includeSubtitles: input.includeSubtitles,
            subtitleStyle: resolvedSubtitleStyle || undefined,
          }, onProgress);
          await db.updateLectureProject(input.projectId, {
            status: "completed" as any,
            finalVideoUrl: result.videoUrl,
            generationProgress: 100,
            generationStep: "MP4 export complete",
          });
          // Create generation history record
          const genId = await db.createVideoGeneration({
            projectId: input.projectId,
            userId: ctx.user.id,
            status: "completed",
            slideCount: slides.length,
            resolution: input.resolution,
            videoUrl: result.videoUrl,
            totalDuration: result.duration,
            config: { type: "mp4_export", resolution: input.resolution, includeSubtitles: input.includeSubtitles },
            completedAt: new Date(),
          });
          return { videoUrl: result.videoUrl, fileSize: result.fileSize, duration: result.duration };
        } catch (error: any) {
          await db.updateLectureProject(input.projectId, {
            status: "failed" as any,
            generationProgress: 0,
            generationStep: undefined,
            errorMessage: error.message,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
      }),

    // --- AI Script Improvement (LLM) ---
    improveScript: protectedProcedure
      .input(z.object({
        scriptText: z.string().min(1).max(10000),
        slideContext: z.string().optional(),
        style: z.enum(["formal", "casual", "educational", "storytelling"]).default("educational"),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const styleGuides: Record<string, string> = {
          formal: "Write in a formal and professional lecture tone. Use polite language and academic vocabulary appropriately.",
          casual: "Write in a friendly and comfortable tone. Explain naturally as if talking with the audience.",
          educational: "Write in an educational and easy-to-understand tone. Clearly explain key concepts with examples.",
          storytelling: "Write in a storytelling format. Use narrative structure that captures the audience's interest.",
        };
        const systemPrompt = `You are an AI lecture script expert. Improve the given text into a lecture script.

Style: ${styleGuides[input.style] || styleGuides.educational}

Rules:
1. Keep the core content while converting to lecture-appropriate style
2. Write in natural speaking flow (will be read by TTS)
3. Include appropriate pauses and emphasis
4. Simplify unnecessary jargon
5. Output only the improved script (no explanations or comments)
6. Language: ${input.language === "ko" ? "Korean" : input.language}`;

        let userContent = `Please improve the following text into a lecture script:\n\n${input.scriptText}`;
        if (input.slideContext) {
          userContent += `\n\nSlide context: ${input.slideContext}`;
        }

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });
        const improved = (response.choices?.[0]?.message?.content as string) || "";
        return { original: input.scriptText, improved: improved.trim() };
      }),

    // --- Improve ALL scripts at once (batch LLM) ---
    improveAllScripts: protectedProcedure
      .input(z.object({
        projectId: z.number().optional(),
        sections: z.array(z.object({
          id: z.string(),
          text: z.string(),
        })).min(1).max(50),
        style: z.enum(["formal", "casual", "educational", "storytelling"]).default("educational"),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const styleGuides: Record<string, string> = {
          formal: "Write in a formal and professional lecture tone. Use polite language and academic vocabulary appropriately.",
          casual: "Write in a friendly and comfortable tone. Explain naturally as if talking with the audience.",
          educational: "Write in an educational and easy-to-understand tone. Clearly explain key concepts with examples.",
          storytelling: "Write in a storytelling format. Use narrative structure that captures the audience's interest.",
        };
        const results: { id: string; original: string; improved: string }[] = [];
        for (const sec of input.sections) {
          if (!sec.text.trim()) {
            results.push({ id: sec.id, original: sec.text, improved: sec.text });
            continue;
          }
          try {
            const systemPrompt = `You are an AI lecture script expert. Improve the given text into a lecture script.\n\nStyle: ${styleGuides[input.style] || styleGuides.educational}\n\nRules:\n1. Keep the core content while converting to lecture-appropriate style\n2. Write in natural speaking flow (will be read by TTS)\n3. Include appropriate pauses and emphasis\n4. Simplify unnecessary jargon\n5. Output only the improved script (no explanations or comments)\n6. Language: ${input.language === "ko" ? "Korean" : input.language}`;
            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Please improve the following text into a lecture script:\n\n${sec.text}` },
              ],
            });
            const improved = (response.choices?.[0]?.message?.content as string) || sec.text;
            results.push({ id: sec.id, original: sec.text, improved: improved.trim() });
          } catch (err) {
            results.push({ id: sec.id, original: sec.text, improved: sec.text });
          }
        }
        // Save improvement history to DB
        const changedResults = results.filter(r => r.improved !== r.original);
        if (changedResults.length > 0 && input.projectId) {
          const batchId = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          try {
            await db.addBatchScriptImprovementHistory(
              changedResults.map((r, idx) => ({
                userId: ctx.user.id,
                projectId: input.projectId!,
                sectionId: r.id,
                sectionIndex: idx,
                originalText: r.original,
                improvedText: r.improved,
                style: input.style,
                applied: false,
                isBatch: true,
                batchId,
              }))
            );
          } catch (e) { /* non-critical */ }
        }
        return { results, total: input.sections.length, improved: changedResults.length };
      }),

    // --- Script Improvement History ---
    getImprovementHistory: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getScriptImprovementHistory(input.projectId, ctx.user.id);
      }),

    revertImprovement: protectedProcedure
      .input(z.object({ batchId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const batch = await db.getScriptImprovementBatch(input.batchId);
        if (batch.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "History not found" });
        if (batch[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return { sections: batch.map(b => ({ sectionId: b.sectionId, originalText: b.originalText })) };
      }),

    // --- AI Script Proofread - soften/polish existing text ---
    proofreadScript: protectedProcedure
      .input(z.object({
        scriptText: z.string().min(1).max(10000),
        filter: z.enum(["smooth", "news", "presentation", "conversational", "dramatic", "concise"]).default("smooth"),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const filterGuides: Record<string, string> = {
          smooth: "Proofread into a smooth and natural tone. Soften rigid expressions and create a comfortable reading flow.",
          news: "Proofread into a clear and objective tone like a news anchor. Use concise and accurate sentences.",
          presentation: "Proofread into a confident and persuasive tone like a presenter. Use expressions that engage the audience.",
          conversational: "Proofread into a comfortable and friendly tone as if chatting with a friend. Use colloquial language appropriately.",
          dramatic: "Proofread into a dramatic and emotional tone. Add appropriate emphasis, exclamation, and tension.",
          concise: "Keep only the essentials. Remove unnecessary modifiers and repetition, make it short and impactful.",
        };
        const systemPrompt = `You are a professional script proofreading expert. Please proofread the given text.

Proofreading style: ${filterGuides[input.filter]}

Rules:
1. Never change the meaning or core content
2. Fix grammar errors, awkward expressions, and typos
3. Write so it reads naturally when spoken by TTS
4. Output only the proofread text (no explanations)
5. Language: ${input.language === "ko" ? "Korean" : input.language}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please proofread the following text:\n\n${input.scriptText}` },
          ],
        });
        const proofread = (response.choices?.[0]?.message?.content as string) || "";
        return { original: input.scriptText, proofread: proofread.trim(), filter: input.filter };
      }),

    // --- AI Script Autocomplete ---
    scriptAutocomplete: protectedProcedure
      .input(z.object({
        currentText: z.string().min(1).max(5000),
        sectionContext: z.string().optional(),
        lectureTitle: z.string().optional(),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const langName = input.language === "ko" ? "Korean" : input.language === "ja" ? "Japanese" : input.language === "zh" ? "Chinese" : "English";
        const systemPrompt = `You are an AI lecture script assistant. Given the current text being written, suggest the next 1-2 sentences to continue naturally.

Rules:
1. Continue seamlessly from the last sentence
2. Match the tone and style of the existing text
3. Keep suggestions concise (1-2 sentences, max 100 characters)
4. Write in ${langName}
5. Output ONLY the suggested continuation text, nothing else
6. Do not repeat what was already written
7. Make it suitable for TTS (spoken naturally)`;
        let userContent = `Continue this lecture script:\n\n${input.currentText}`;
        if (input.lectureTitle) userContent += `\n\nLecture topic: ${input.lectureTitle}`;
        if (input.sectionContext) userContent += `\n\nSection context: ${input.sectionContext}`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });
        const suggestion = (response.choices?.[0]?.message?.content as string) || "";
        return { suggestion: suggestion.trim() };
      }),

    // --- AI Whiteboard Content Generation ---
    generateWhiteboardContent: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(2000),
        contentType: z.enum(["text", "diagram", "bullet_points", "equation", "timeline"]).default("text"),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const typeGuides: Record<string, string> = {
          text: "Generate key text for the whiteboard. Write with line breaks for readability in large font.",
          diagram: "Express a simple diagram as text art. Use arrows (→, ↓, ↑) and boxes.",
          bullet_points: "Organize key points in bullet form. Keep each item concise in one line.",
          equation: "Write equations or formulas neatly. Express symbols and numbers clearly.",
          timeline: "Organize in timeline format. List dates/timepoints and events in order.",
        };
        const systemPrompt = `You are a whiteboard content expert. Generate content for a lecture whiteboard.

Content type: ${typeGuides[input.contentType]}

Rules:
1. Write in a concise and visual format suitable for whiteboard
2. Emphasize key keywords and structure
3. Keep it short (max 10 lines)
4. Language: ${input.language === "ko" ? "Korean" : input.language}
5. Output only the content (no explanations)`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.prompt },
          ],
        });
        const content = (response.choices?.[0]?.message?.content as string) || "";
        return { content: content.trim(), contentType: input.contentType };
      }),

    // --- Slide Avatar Overrides CRUD ---
    getAvatarOverrides: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getSlideAvatarOverrides(input.projectId);
      }),

    upsertAvatarOverride: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        avatarPosition: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "center-right", "center-left", "none"]).default("bottom-right"),
        avatarSizePercent: z.number().min(5).max(80).default(25),
        offsetX: z.number().default(0),
        offsetY: z.number().default(0),
        avatarShape: z.enum(["circle", "rounded", "rectangle"]).default("circle"),
        avatarOpacity: z.number().min(0).max(100).default(100),
        isHidden: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const id = await db.upsertSlideAvatarOverride(input);
        return { id };
      }),

    deleteAvatarOverride: protectedProcedure
      .input(z.object({ projectId: z.number(), slideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteSlideAvatarOverride(input.projectId, input.slideId);
        return { success: true };
      }),

    // --- Slide Insert Content CRUD ---
    listInsertContent: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.listSlideInsertContent(input.projectId);
      }),

    createInsertContent: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        afterSlideId: z.number().default(0),
        contentType: z.enum(["whiteboard", "video", "image", "design"]),
        title: z.string().optional(),
        contentUrl: z.string().optional(),
        fileKey: z.string().optional(),
        drawingData: z.any().optional(),
        backgroundColor: z.string().default("#ffffff"),
        durationSec: z.number().default(5),
        scriptText: z.string().optional(),
        avatarId: z.number().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const id = await db.createSlideInsertContent(input);
        return { id };
      }),

    updateInsertContent: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        contentUrl: z.string().optional(),
        fileKey: z.string().optional(),
        drawingData: z.any().optional(),
        backgroundColor: z.string().optional(),
        durationSec: z.number().optional(),
        scriptText: z.string().optional(),
        avatarId: z.number().optional(),
        afterSlideId: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getSlideInsertContentById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const project = await db.getLectureProject(existing.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await db.updateSlideInsertContent(id, data);
        return { success: true };
      }),

    deleteInsertContent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getSlideInsertContentById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const project = await db.getLectureProject(existing.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteSlideInsertContent(input.id);
        return { success: true };
      }),

    // --- Slide Transitions ---
    upsertSlideTransition: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        transitionType: z.enum(["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"]),
        durationMs: z.number().min(100).max(3000).default(500),
        easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]).default("ease_in_out"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const id = await db.upsertSlideTransition(input);
        return { id };
      }),

    setAllTransitions: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        transitionType: z.enum(["none", "fade", "slide_left", "slide_right", "slide_up", "zoom_in", "zoom_out", "wipe_left", "wipe_right", "dissolve"]),
        durationMs: z.number().min(100).max(3000).default(500),
        easing: z.enum(["linear", "ease_in", "ease_out", "ease_in_out"]).default("ease_in_out"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const count = await db.setProjectTransitions(input.projectId, input.transitionType, input.durationMs, input.easing);
        return { count };
      }),

    // --- AI Image Generation for Whiteboard ---
    generateWhiteboardImage: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(1000),
        style: z.enum(["illustration", "diagram", "infographic", "sketch", "realistic", "cartoon", "minimalist"]).default("illustration"),
        language: z.string().default("ko"),
      }))
      .mutation(async ({ ctx, input }) => {
        const stylePrompts: Record<string, string> = {
          illustration: "clean digital illustration style, professional, educational",
          diagram: "technical diagram, flowchart style, clear labels, white background",
          infographic: "infographic style, data visualization, modern flat design",
          sketch: "hand-drawn sketch style, pencil drawing, whiteboard aesthetic",
          realistic: "photorealistic, high quality, detailed",
          cartoon: "cartoon style, colorful, fun, educational",
          minimalist: "minimalist design, simple shapes, clean lines, white space",
        };
        const fullPrompt = `${input.prompt}. Style: ${stylePrompts[input.style] || stylePrompts.illustration}. For educational/lecture use.`;
        try {
          const { url } = await generateImage({ prompt: fullPrompt });
          return { imageUrl: url };
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Image generation failed: ${err.message}` });
        }
      }),

    // --- Whiteboard Animation to MP4 ---
    renderWhiteboardMp4: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        insertContentId: z.number(),
        whiteboardData: z.object({
          strokes: z.array(z.object({
            id: z.string(),
            points: z.array(z.object({ x: z.number(), y: z.number(), t: z.number() })),
            color: z.string(),
            width: z.number(),
            tool: z.string(),
          })),
          backgroundColor: z.string().default("#FFFFFF"),
          width: z.number().default(1280),
          height: z.number().default(720),
          durationMs: z.number().optional(),
        }),
        resolution: z.enum(["720p", "1080p"]).default("1080p"),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        
        // Generate whiteboard animation frames using Canvas API on server
        // We'll create a series of PNG frames then compile to MP4
        const { createCanvas } = await import("canvas");
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        const { default: ffmpegLib } = await import("fluent-ffmpeg");
        
        const tmpDir = path.join(os.tmpdir(), `wb-render-${nanoid(8)}`);
        fs.mkdirSync(tmpDir, { recursive: true });
        
        const { strokes, backgroundColor, width, height } = input.whiteboardData;
        const resMap: Record<string, { w: number; h: number }> = {
          "720p": { w: 1280, h: 720 },
          "1080p": { w: 1920, h: 1080 },
        };
        const res = resMap[input.resolution] || resMap["1080p"];
        const scaleX = res.w / width;
        const scaleY = res.h / height;
        
        // Calculate total duration from stroke timestamps
        let maxT = 0;
        for (const stroke of strokes) {
          for (const pt of stroke.points) {
            if (pt.t > maxT) maxT = pt.t;
          }
        }
        const totalDurationMs = input.whiteboardData.durationMs || Math.max(maxT, 3000);
        const fps = 15;
        const totalFrames = Math.ceil((totalDurationMs / 1000) * fps);
        
        // Generate frames
        const canvas = createCanvas(res.w, res.h);
        const ctx2d = canvas.getContext("2d");
        
        for (let frame = 0; frame < totalFrames; frame++) {
          const currentTimeMs = (frame / fps) * 1000;
          
          // Clear with background
          ctx2d.fillStyle = backgroundColor;
          ctx2d.fillRect(0, 0, res.w, res.h);
          
          // Draw strokes up to current time
          for (const stroke of strokes) {
            const visiblePoints = stroke.points.filter(p => p.t <= currentTimeMs);
            if (visiblePoints.length < 2) continue;
            
            ctx2d.beginPath();
            ctx2d.strokeStyle = stroke.tool === "eraser" ? backgroundColor : stroke.color;
            ctx2d.lineWidth = stroke.width * Math.max(scaleX, scaleY);
            ctx2d.lineCap = "round";
            ctx2d.lineJoin = "round";
            ctx2d.moveTo(visiblePoints[0].x * scaleX, visiblePoints[0].y * scaleY);
            for (let i = 1; i < visiblePoints.length; i++) {
              ctx2d.lineTo(visiblePoints[i].x * scaleX, visiblePoints[i].y * scaleY);
            }
            ctx2d.stroke();
          }
          
          // Save frame
          const framePath = path.join(tmpDir, `frame-${String(frame).padStart(5, "0")}.png`);
          const buffer = canvas.toBuffer("image/png");
          fs.writeFileSync(framePath, buffer);
        }
        
        // Compile frames to MP4 using ffmpeg
        const outputPath = path.join(tmpDir, "whiteboard.mp4");
        await new Promise<void>((resolve, reject) => {
          ffmpegLib()
            .input(path.join(tmpDir, "frame-%05d.png"))
            .inputOptions(["-framerate", String(fps)])
            .outputOptions([
              "-c:v", "libx264",
              "-pix_fmt", "yuv420p",
              "-preset", "fast",
              "-movflags", "+faststart",
            ])
            .output(outputPath)
            .on("end", () => resolve())
            .on("error", (err: any) => reject(new Error(`Whiteboard MP4 render failed: ${err.message}`)))
            .run();
        });
        
        // Upload to S3
        const videoBuffer = fs.readFileSync(outputPath);
        const s3Key = `lecture-builder/${input.projectId}/whiteboard/wb-${Date.now()}-${nanoid(6)}.mp4`;
        const { url } = await storagePut(s3Key, videoBuffer, "video/mp4");
        
        // Update insert content with video URL
        await db.updateSlideInsertContent(input.insertContentId, {
          contentUrl: url,
          contentType: "whiteboard" as any,
        });
        
        // Cleanup
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
        
        return { videoUrl: url, duration: totalDurationMs / 1000, frames: totalFrames };
      }),

    // --- Clone project ---
    cloneProject: protectedProcedure
      .input(z.object({
        sourceProjectId: z.number(),
        newTitle: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const source = await db.getLectureProject(input.sourceProjectId);
        if (!source || source.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const result = await db.cloneLectureProject(input.sourceProjectId, ctx.user.id, input.newTitle);
        return result;
      }),

    // --- Get full project data (all steps) ---
    getFullProject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const [avatars, slides, scripts, annotations, avatarOverrides, insertContent, transitions] = await Promise.all([
          db.listProjectAvatars(input.id),
          db.listProjectSlides(input.id),
          db.listSlideScripts(input.id),
          db.listSlideAnnotations(input.id),
          db.getSlideAvatarOverrides(input.id),
          db.listSlideInsertContent(input.id),
          db.getSlideTransitions(input.id),
        ]);
        return { project, avatars, slides, scripts, annotations, avatarOverrides, insertContent, transitions };
      }),

    // --- Interpreter Settings ---
    updateInterpreterSettings: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        interpreterEnabled: z.boolean(),
        interpreterLanguage: z.string().optional(),
        interpreterVoiceId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.updateLectureProjectInterpreter(input.projectId, ctx.user.id, {
          interpreterEnabled: input.interpreterEnabled,
          interpreterLanguage: input.interpreterLanguage,
          interpreterVoiceId: input.interpreterVoiceId,
        });
        return { success: true };
      }),

    // --- Auto-translate all slide scripts ---
    autoTranslateSlides: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        targetLanguage: z.string().min(2).max(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const scripts = await db.listSlideScripts(input.projectId);
        const scriptsWithText = scripts.filter((s: any) => s.scriptText && s.scriptText.trim());
        if (scriptsWithText.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No scripts to translate" });

        const langNames: Record<string, string> = {
          ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese",
          es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
          ru: "Russian", ar: "Arabic", hi: "Hindi", vi: "Vietnamese",
          th: "Thai", id: "Indonesian", tr: "Turkish", pl: "Polish",
          nl: "Dutch", sv: "Swedish", it: "Italian", ms: "Malay",
        };
        const targetLangName = langNames[input.targetLanguage] || input.targetLanguage;

        const sectionsText = scriptsWithText.map((s: any, i: number) => `[Slide ${s.slideId}]\n${s.scriptText}`).join("\n\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional lecture interpreter/translator. Translate the following lecture slide scripts into ${targetLangName}. Maintain the same slide structure. Keep technical terms accurate. The translation should sound natural as if spoken by a native interpreter. Return ONLY a JSON object with a "translations" array of objects with "slideId" (number) and "text" (string) fields.`,
            },
            {
              role: "user",
              content: `Translate these lecture slide scripts to ${targetLangName}:\n\n${sectionsText}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "translated_slides",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  translations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slideId: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["slideId", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["translations"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0].message.content;
        const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        const parsed = JSON.parse(contentStr || '{ "translations": [] }');
        const translations = parsed.translations || [];

        // Save to DB
        await db.bulkUpdateSlideScriptInterpreterTexts(input.projectId, translations.map((t: any) => ({
          slideId: t.slideId,
          interpreterText: t.text,
        })));

        // Update project interpreter settings
        await db.updateLectureProjectInterpreter(input.projectId, ctx.user.id, {
          interpreterEnabled: true,
          interpreterLanguage: input.targetLanguage,
        });

        return { translations, count: translations.length };
      }),

    // --- Update single slide interpreter text ---
    updateSlideInterpreterText: protectedProcedure
      .input(z.object({
        scriptId: z.number(),
        interpreterText: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSlideScriptInterpreterText(input.scriptId, input.interpreterText);
        return { success: true };
      }),

    // Generate TTS audio for interpreter text (single slide)
    generateInterpreterTts: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        scriptId: z.number(),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scripts = await db.listSlideScripts(input.projectId);
        const script = scripts.find(s => s.id === input.scriptId);
        if (!script || !script.interpreterText) throw new TRPCError({ code: "BAD_REQUEST", message: "No interpreter text" });
        const project = await db.getLectureProject(input.projectId);
        const voiceId = input.voiceId || project?.interpreterVoiceId || "Kore";
        const ttsResult = await generateGeminiTts({ text: script.interpreterText, voiceId });
        if ('error' in ttsResult) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: ttsResult.error });
        const fileKey = `interpreter-tts/${input.projectId}/${input.scriptId}-${Date.now()}.mp3`;
        const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
        return { audioUrl: url, scriptId: input.scriptId };
      }),

    // Generate TTS audio for all interpreter texts in a project
    generateAllInterpreterTts: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scripts = await db.listSlideScripts(input.projectId);
        const project = await db.getLectureProject(input.projectId);
        const voiceId = input.voiceId || project?.interpreterVoiceId || "Kore";
        const interpreterScripts = scripts.filter(s => s.interpreterText && s.interpreterText.trim());
        if (interpreterScripts.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No interpreter text. Please run auto-translation first." });
        const results: Array<{ scriptId: number; slideId: number; audioUrl: string }> = [];
        for (const script of interpreterScripts) {
          try {
            const ttsResult = await generateGeminiTts({ text: script.interpreterText!, voiceId });
            if ('error' in ttsResult) continue;
            const fileKey = `interpreter-tts/${input.projectId}/${script.id}-${Date.now()}.mp3`;
            const { url } = await storagePut(fileKey, ttsResult.audioBuffer, ttsResult.mimeType);
            results.push({ scriptId: script.id, slideId: script.slideId!, audioUrl: url });
          } catch (e) { /* skip failed */ }
        }
        return { generated: results.length, total: interpreterScripts.length, results };
      }),

    // Export interpreter scripts as SRT subtitle file
    exportInterpreterSrt: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        mode: z.enum(["interpreter_only", "dual", "original_only"]).default("interpreter_only"),
      }))
      .mutation(async ({ ctx, input }) => {
        const scripts = await db.listSlideScripts(input.projectId);
        const slides = (await db.listProjectSlides(input.projectId)).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        const orderedScripts = slides.map((slide: any) => {
          const script = scripts.find(s => s.slideId === slide.id);
          return { slideId: slide.id, sortOrder: slide.sortOrder, scriptText: script?.scriptText || "", interpreterText: script?.interpreterText || "", durationSec: script?.estimatedDurationSec || 30 };
        }).filter((s: any) => s.scriptText || s.interpreterText);

        let srtContent = "";
        let idx = 1;
        let currentTimeSec = 0;
        for (const s of orderedScripts) {
          const startTime = formatSrtTime(currentTimeSec);
          const endTime = formatSrtTime(currentTimeSec + s.durationSec);
          if (input.mode === "interpreter_only" && s.interpreterText) {
            srtContent += `${idx}\n${startTime} --> ${endTime}\n${s.interpreterText}\n\n`;
            idx++;
          } else if (input.mode === "original_only" && s.scriptText) {
            srtContent += `${idx}\n${startTime} --> ${endTime}\n${s.scriptText}\n\n`;
            idx++;
          } else if (input.mode === "dual") {
            const lines: string[] = [];
            if (s.scriptText) lines.push(s.scriptText);
            if (s.interpreterText) lines.push(s.interpreterText);
            if (lines.length > 0) {
              srtContent += `${idx}\n${startTime} --> ${endTime}\n${lines.join("\n")}\n\n`;
              idx++;
            }
          }
          currentTimeSec += s.durationSec;
        }
        const fileKey = `interpreter-srt/${input.projectId}/${input.mode}-${Date.now()}.srt`;
        const { url } = await storagePut(fileKey, Buffer.from(srtContent, "utf-8"), "text/plain");
        return { srtUrl: url, subtitleCount: idx - 1, mode: input.mode };
      }),

    // --- PPT → AI Script Generation (Premium Feature) ---
    generateScriptFromPPT: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideIds: z.array(z.number()).min(1),
        language: z.string().default("ko"),
        style: z.enum(["professional", "casual", "academic", "storytelling"]).default("professional"),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        // Check credits
        const { CREDIT_COSTS } = await import("./stripe");
        const cost = CREDIT_COSTS.ppt_script_generation;
        const currentCredits = await db.getUserCredits(ctx.user.id);
        if (currentCredits < cost) {
          throw new TRPCError({ code: "FORBIDDEN", message: `INSUFFICIENT_CREDITS:${cost}:${currentCredits}` });
        }

        // Get slide images for AI analysis
        const slides = await db.listProjectSlides(input.projectId);
        const targetSlides = slides.filter(s => input.slideIds.includes(s.id)).sort((a, b) => a.slideOrder - b.slideOrder);
        if (targetSlides.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No matching slides found" });

        const langMap: Record<string, string> = { ko: 'Korean', en: 'English', zh: 'Chinese', ja: 'Japanese', vi: 'Vietnamese', th: 'Thai', es: 'Spanish', fr: 'French', de: 'German' };
        const langName = langMap[input.language] || input.language;

        const styleMap: Record<string, string> = {
          professional: 'professional and authoritative',
          casual: 'friendly and conversational',
          academic: 'academic and detailed',
          storytelling: 'narrative and engaging storytelling'
        };
        const styleDesc = styleMap[input.style];

        // Build messages with slide images for multimodal analysis
        const slideContents: Array<{ type: string; image_url?: { url: string }; text?: string }> = [];
        slideContents.push({ type: "text", text: `Analyze the following ${targetSlides.length} presentation slides and generate a ${styleDesc} lecture script for each slide. Write in ${langName}.${input.additionalContext ? `\n\nAdditional context: ${input.additionalContext}` : ''}\n\nFor each slide, write 3-6 natural sentences (30-60 seconds of speaking). Include smooth transitions between slides. Start with an engaging introduction and end with a clear conclusion.\n\nReturn JSON: {"scripts": [{"slideId": number, "text": "script text", "estimatedDurationSec": number}]}` });

        for (const slide of targetSlides) {
          slideContents.push({ type: "text", text: `--- Slide ${slide.slideOrder + 1} (ID: ${slide.id}) ---` });
          slideContents.push({ type: "image_url", image_url: { url: slide.imageUrl } });
        }

        const { invokeLLM } = await import("./_core/llm");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional lecture script writer. Analyze presentation slides visually and generate natural, engaging lecture scripts. Always respond with valid JSON only." },
            { role: "user", content: slideContents as any },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ppt_scripts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  scripts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slideId: { type: "integer" },
                        text: { type: "string" },
                        estimatedDurationSec: { type: "integer" },
                      },
                      required: ["slideId", "text", "estimatedDurationSec"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scripts"],
                additionalProperties: false,
              },
            },
          },
        });

        let scripts: Array<{ slideId: number; text: string; estimatedDurationSec: number }> = [];
        try {
          const rawContent = response.choices?.[0]?.message?.content || "{}";
          const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
          const parsed = JSON.parse(content);
          scripts = parsed.scripts || [];
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
        }

        // Deduct credits
        await db.deductCredits(ctx.user.id, cost, `PPT Script Generation (${targetSlides.length} slides)`, "ppt_script", input.projectId);

        return { scripts, creditsUsed: cost, creditsRemaining: currentCredits - cost };
      }),

    // --- Get PPT Script Credits Info ---
    getPPTScriptCredits: protectedProcedure
      .query(async ({ ctx }) => {
        const { CREDIT_COSTS } = await import("./stripe");
        const currentCredits = await db.getUserCredits(ctx.user.id);
        return {
          creditsRemaining: currentCredits,
          costPerGeneration: CREDIT_COSTS.ppt_script_generation,
          canGenerate: currentCredits >= CREDIT_COSTS.ppt_script_generation,
        };
      }),

    // --- Set Voice Mode per Slide ---
    setSlideVoiceMode: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        voiceMode: z.enum(["direct_record", "ai_clone", "ai_tts"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        // Update existing script or create placeholder
        const existingScripts = await db.listSlideScripts(input.projectId);
        const existing = existingScripts.find((s: any) => s.slideId === input.slideId);
        if (existing) {
          await db.updateSlideScript(existing.id, { voiceMode: input.voiceMode } as any);
        } else {
          await db.setSlideScript({
            projectId: input.projectId,
            slideId: input.slideId,
            scriptText: "",
            voiceMode: input.voiceMode,
          } as any);
        }
        return { success: true };
      }),

    // --- Upload Slide Recording (direct voice recording per slide) ---
    uploadSlideRecording: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        audioData: z.string(), // base64
        fileName: z.string(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        // Upload audio to S3
        const buffer = Buffer.from(input.audioData, "base64");
        const ext = input.fileName.split(".").pop() || "webm";
        const key = `slide-recordings/${input.projectId}/${input.slideId}-${Date.now()}.${ext}`;
        const mimeType = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : `audio/${ext}`;
        const { url } = await storagePut(key, buffer, mimeType);

        // Update or create slide script with recording
        const existingScripts = await db.listSlideScripts(input.projectId);
        const existing = existingScripts.find((s: any) => s.slideId === input.slideId);
        if (existing) {
          await db.updateSlideScript(existing.id, {
            voiceMode: "direct_record",
            recordedAudioUrl: url,
            recordedAudioDuration: input.duration || null,
          } as any);
        } else {
          await db.setSlideScript({
            projectId: input.projectId,
            slideId: input.slideId,
            scriptText: "",
            voiceMode: "direct_record",
            recordedAudioUrl: url,
            recordedAudioDuration: input.duration || null,
          } as any);
        }

        return { url, duration: input.duration };
      }),

    // --- Delete Slide Recording ---
    deleteSlideRecording: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const existingScripts = await db.listSlideScripts(input.projectId);
        const existing = existingScripts.find((s: any) => s.slideId === input.slideId);
        if (existing) {
          await db.updateSlideScript(existing.id, {
            recordedAudioUrl: null,
            recordedAudioDuration: null,
          } as any);
        }
        return { success: true };
      }),

    // --- Generate Clone Voice TTS for a slide ---
    generateCloneVoice: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slideId: z.number(),
        text: z.string().min(1).max(5000),
        speed: z.number().min(0.5).max(2.0).default(1.0),
        pitch: z.number().min(-12).max(12).default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        // Find user's voice clone profile (use the first ready clone)
        const clones = await db.getVoiceClonesByUser(ctx.user.id);
        const readyClone = clones.find((c: any) => c.status === "ready");
        if (!readyClone) throw new TRPCError({ code: "BAD_REQUEST", message: "NO_VOICE_CLONE: 음성 프로필에서 음성 샘플을 먼저 등록해주세요." });

        // Apply pronunciation guides
        const guides = await db.getPronunciationGuidesByProject(input.projectId);
        let processedText = input.text;
        for (const guide of guides) {
          const regex = new RegExp(guide.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          processedText = processedText.replace(regex, guide.phonetic);
        }

        const voiceId = readyClone.matchedVoiceId || "Kore";
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const result = await generateGeminiTts({
          text: processedText,
          voiceId,
          speed: input.speed,
          pitch: input.pitch,
          _userId: ctx.user.id,
        });

        if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as any).error || "TTS generation failed" });

        const key = `clone-tts/${ctx.user.id}/${input.projectId}/${input.slideId}-${Date.now()}.mp3`;
        const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");

        // Update slide script with clone audio
        const existingScripts = await db.listSlideScripts(input.projectId);
        const existing = existingScripts.find((s: any) => s.slideId === input.slideId);
        if (existing) {
          await db.updateSlideScript(existing.id, {
            voiceMode: "ai_clone",
            recordedAudioUrl: url,
          } as any);
        } else {
          await db.setSlideScript({
            projectId: input.projectId,
            slideId: input.slideId,
            scriptText: input.text,
            voiceMode: "ai_clone",
            recordedAudioUrl: url,
          } as any);
        }

        return { audioUrl: url, voiceName: readyClone.name, matchedVoiceId: voiceId };
      }),

    // --- Apply PPT-generated scripts to slideScripts ---
    applyPPTScripts: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        scripts: z.array(z.object({
          slideId: z.number(),
          text: z.string(),
          estimatedDurationSec: z.number().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const existingScripts = await db.listSlideScripts(input.projectId);
        let applied = 0;

        for (const script of input.scripts) {
          const existing = existingScripts.find((s: any) => s.slideId === script.slideId);
          if (existing) {
            await db.updateSlideScript(existing.id, {
              scriptText: script.text,
              estimatedDurationSec: script.estimatedDurationSec || 30,
            } as any);
          } else {
            await db.setSlideScript({
              projectId: input.projectId,
              slideId: script.slideId,
              scriptText: script.text,
              estimatedDurationSec: script.estimatedDurationSec || 30,
            } as any);
          }
          applied++;
        }

        return { applied, total: input.scripts.length };
      }),

    // --- Auto-save / Manual save slide scripts ---
    saveSlideScripts: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        scripts: z.array(z.object({
          slideId: z.number(),
          scriptText: z.string(),
          estimatedDurationSec: z.number().optional(),
          voiceMode: z.enum(["direct_record", "ai_clone", "ai_tts"]).optional(),
          emotion: z.enum(["neutral", "happy", "serious", "excited", "empathetic", "confident", "questioning"]).optional(),
          emotionIntensity: z.number().min(1).max(10).optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const existingScripts = await db.listSlideScripts(input.projectId);
        let saved = 0;

        for (const script of input.scripts) {
          const existing = existingScripts.find((s: any) => s.slideId === script.slideId);
          const updateData: any = { scriptText: script.scriptText };
          if (script.estimatedDurationSec) updateData.estimatedDurationSec = script.estimatedDurationSec;
          if (script.voiceMode) updateData.voiceMode = script.voiceMode;
          if (script.emotion) updateData.emotion = script.emotion;
          if (script.emotionIntensity) updateData.emotionIntensity = script.emotionIntensity;

          if (existing) {
            await db.updateSlideScript(existing.id, updateData);
          } else {
            await db.setSlideScript({
              projectId: input.projectId,
              slideId: script.slideId,
              ...updateData,
            });
          }
          saved++;
        }

        // Auto-create version snapshot after save
        try {
          const latestVer = await db.getLatestSlideScriptVersionNumber(input.projectId);
          const allScripts = await db.listSlideScripts(input.projectId);
          const snapshot = allScripts.map((s: any) => ({
            sortOrder: s.sortOrder || 0,
            scriptText: s.scriptText,
            avatarId: s.avatarId,
          }));
          await db.createSlideScriptVersion({
            projectId: input.projectId,
            userId: ctx.user.id,
            versionNumber: latestVer + 1,
            sectionsSnapshot: JSON.stringify(snapshot),
            sectionCount: snapshot.length,
            changeDescription: `Auto-save (${saved} slides)`,
            changeType: "auto",
          });
        } catch (e) { /* non-critical, ignore version save errors */ }

        return { saved, savedAt: new Date().toISOString() };
      }),

    // --- Batch generate clone voice for all slides ---
    batchGenerateCloneVoice: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        speed: z.number().min(0.5).max(2.0).default(1.0),
        pitch: z.number().min(-12).max(12).default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        // Find user's voice clone profile
        const clones = await db.getVoiceClonesByUser(ctx.user.id);
        const readyClone = clones.find((c: any) => c.status === "ready");
        if (!readyClone) throw new TRPCError({ code: "BAD_REQUEST", message: "NO_VOICE_CLONE: 음성 프로필에서 음성 샘플을 먼저 등록해주세요." });

        const voiceId = readyClone.matchedVoiceId || "Kore";
        const scripts = await db.listSlideScripts(input.projectId);
        const scriptsWithText = scripts.filter((s: any) => s.scriptText && s.scriptText.trim().length > 0);

        if (scriptsWithText.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "스크립트가 있는 슬라이드가 없습니다. 먼저 스크립트를 작성해주세요." });

        // Apply pronunciation guides to all scripts
        const guides = await db.getPronunciationGuidesByProject(input.projectId);

        const { generateGeminiTts } = await import("./_core/geminiTts");
        const results: { slideId: number; audioUrl: string; success: boolean; error?: string }[] = [];

        for (const script of scriptsWithText) {
          try {
            // Apply pronunciation guides
            let processedText = script.scriptText;
            for (const guide of guides) {
              const regex = new RegExp(guide.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              processedText = processedText.replace(regex, guide.phonetic);
            }

            const result = await generateGeminiTts({
              text: processedText,
              voiceId,
              speed: input.speed,
              pitch: input.pitch,
              _userId: ctx.user.id,
            });

            if ("error" in result) {
              results.push({ slideId: script.slideId, audioUrl: "", success: false, error: (result as any).error });
              continue;
            }

            const key = `clone-tts/${ctx.user.id}/${input.projectId}/${script.slideId}-${Date.now()}.mp3`;
            const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");

            await db.updateSlideScript(script.id, {
              voiceMode: "ai_clone",
              recordedAudioUrl: url,
            } as any);

            results.push({ slideId: script.slideId, audioUrl: url, success: true });
          } catch (e: any) {
            results.push({ slideId: script.slideId, audioUrl: "", success: false, error: e.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        return { results, total: scriptsWithText.length, success: successCount, voiceName: readyClone.name };
      }),

    // --- Pronunciation Guide CRUD ---
    addPronunciationGuide: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        word: z.string().min(1).max(500),
        phonetic: z.string().min(1).max(500),
        language: z.string().max(10).default("ko"),
        description: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const id = await db.addPronunciationGuide({
          userId: ctx.user.id,
          projectId: input.projectId,
          word: input.word,
          phonetic: input.phonetic,
          language: input.language,
          description: input.description || null,
        });
        return { id, success: true };
      }),

    getPronunciationGuides: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return db.getPronunciationGuides(input.projectId, ctx.user.id);
      }),

    updatePronunciationGuide: protectedProcedure
      .input(z.object({
        id: z.number(),
        word: z.string().min(1).max(500).optional(),
        phonetic: z.string().min(1).max(500).optional(),
        language: z.string().max(10).optional(),
        description: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updatePronunciationGuide(id, ctx.user.id, data);
        return { success: true };
      }),

    deletePronunciationGuide: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePronunciationGuide(input.id, ctx.user.id);
        return { success: true };
      }),

    // --- Preview pronunciation for a single word ---
    previewPronunciation: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        word: z.string().min(1).max(500),
        phonetic: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });

        const clones = await db.getVoiceClonesByUser(ctx.user.id);
        const readyClone = clones.find((c: any) => c.status === "ready");
        if (!readyClone) throw new TRPCError({ code: "BAD_REQUEST", message: "NO_VOICE_CLONE" });

        const voiceId = readyClone.matchedVoiceId || "Kore";
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const result = await generateGeminiTts({
          text: input.phonetic,
          voiceId,
          speed: 1.0,
          pitch: 0,
          _userId: ctx.user.id,
        });

        if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as any).error });

        const key = `pronunciation-preview/${ctx.user.id}/${Date.now()}-${nanoid(6)}.mp3`;
        const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");
        return { audioUrl: url, word: input.word, phonetic: input.phonetic };
      }),
  }),

  // ============ Admin Dashboard ============
  admin: router({
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
  }),

  // ========== KLING AI Video Generation ==========
  kling: router({
    isConfigured: publicProcedure.query(() => {
      return { configured: isKlingConfigured() };
    }),
    uploadImage: protectedProcedure
      .input(z.object({ imageData: z.string(), fileName: z.string(), mimeType: z.string().default("image/png") }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageData, "base64");
        const fileKey = `kling-faces/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
    createImageToVideo: protectedProcedure
      .input(z.object({
        imageUrl: z.string().url(),
        prompt: z.string().optional(),
        duration: z.enum(["5", "10"]).default("5"),
        mode: z.enum(["std", "pro"]).default("std"),
        model: z.string().default("kling-v1-6"),
        aspectRatio: z.string().default("16:9"),
        purpose: z.string().default("avatar_preview"),
        projectAvatarId: z.number().optional(),
        sampleFaceId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isKlingConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "KLING API is not configured." });
        const result = await createImageToVideoApi({ imageUrl: input.imageUrl, prompt: input.prompt, duration: input.duration, mode: input.mode, model: input.model, aspectRatio: input.aspectRatio });
        const taskDbId = await db.createKlingTask({ userId: ctx.user.id, taskType: "image2video", klingTaskId: result.taskId, status: result.taskStatus || "submitted", sourceImageUrl: input.imageUrl, prompt: input.prompt || null, model: input.model, mode: input.mode, durationSetting: input.duration, aspectRatio: input.aspectRatio, purpose: input.purpose, projectAvatarId: input.projectAvatarId || null, sampleFaceId: input.sampleFaceId || null });
        return { id: taskDbId, klingTaskId: result.taskId, status: result.taskStatus };
      }),
    createTextToVideo: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        duration: z.enum(["5", "10"]).default("5"),
        mode: z.enum(["std", "pro"]).default("std"),
        model: z.string().default("kling-v1-6"),
        aspectRatio: z.string().default("16:9"),
        purpose: z.string().default("avatar_preview"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isKlingConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "KLING API is not configured." });
        const result = await createTextToVideoApi({ prompt: input.prompt, duration: input.duration, mode: input.mode, model: input.model, aspectRatio: input.aspectRatio });
        const taskDbId = await db.createKlingTask({ userId: ctx.user.id, taskType: "text2video", klingTaskId: result.taskId, status: result.taskStatus || "submitted", prompt: input.prompt, model: input.model, mode: input.mode, durationSetting: input.duration, aspectRatio: input.aspectRatio, purpose: input.purpose });
        return { id: taskDbId, klingTaskId: result.taskId, status: result.taskStatus };
      }),
    checkStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await db.getKlingTask(input.id);
        if (!task || task.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (task.status === "succeed" || task.status === "failed") return task;
        try {
          const apiStatus = task.taskType === "image2video" ? await getImageToVideoStatusApi(task.klingTaskId) : await getTextToVideoStatusApi(task.klingTaskId);
          await db.updateKlingTask(task.id, { status: apiStatus.taskStatus, statusMsg: apiStatus.taskStatusMsg || null, videoUrl: apiStatus.videoUrl || null, videoDuration: apiStatus.videoDuration || null });
          return { ...task, status: apiStatus.taskStatus, statusMsg: apiStatus.taskStatusMsg, videoUrl: apiStatus.videoUrl, videoDuration: apiStatus.videoDuration };
        } catch (err: any) {
          console.error("[KLING] Status check error:", err.message);
          return task;
        }
      }),
    list: protectedProcedure
      .input(z.object({ purpose: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.listKlingTasks(ctx.user.id, input?.purpose);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getKlingTask(input.id);
        if (!task || task.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteKlingTask(input.id);
        return { success: true };
      }),
    /** Register a completed KLING video as a sample face (avatar) */
    registerAsAvatar: protectedProcedure
      .input(z.object({
        klingTaskId: z.number(),
        name: z.string().min(1).max(100),
        category: z.string().default("professional"),
        gender: z.string().default("neutral"),
        ethnicity: z.string().optional(),
        ageRange: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const task = await db.getKlingTask(input.klingTaskId);
        if (!task || task.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (task.status !== "succeed" || !task.videoUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only completed video tasks can be registered as avatars." });
        // Use source image as face image, or video thumbnail
        const imageUrl = task.sourceImageUrl || task.videoUrl;
        const newFace = await db.createSampleFace({
          name: input.name,
          category: input.category,
          gender: input.gender,
          ethnicity: input.ethnicity || null,
          ageRange: input.ageRange || null,
          imageUrl: imageUrl,
          thumbnailUrl: imageUrl,
          description: input.description || `Avatar generated by KLING AI (${task.taskType})`,
          tags: JSON.stringify(["kling-ai", "generated"]),
          languages: JSON.stringify(["ko", "en"]),
          isPremium: false,
          sortOrder: 999,
          isActive: true,
        });
        // Update kling task to link to the new face
        await db.updateKlingTask(task.id, { sampleFaceId: newFace.id });
        return { faceId: newFace.id, name: input.name };
      }),
  }),

  // ============ v6.3: Whiteboard Collaboration ============
  wbCollab: router({
    createSession: instructorProcedure
      .input(z.object({
        projectId: z.number(),
        insertContentId: z.number().optional(),
        title: z.string().optional(),
        maxParticipants: z.number().min(2).max(50).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const { nanoid } = await import("nanoid");
        const sessionCode = nanoid(12);
        const result = await db.createWhiteboardSession({
          projectId: input.projectId,
          insertContentId: input.insertContentId || null,
          hostUserId: ctx.user.id,
          sessionCode,
          title: input.title || `Collaboration session #${Date.now().toString(36)}`,
          maxParticipants: input.maxParticipants,
        });
        return { sessionId: result.id, sessionCode };
      }),

    joinSession: protectedProcedure
      .input(z.object({ sessionCode: z.string() }))
      .query(async ({ ctx, input }) => {
        const session = await db.getWhiteboardSessionByCode(input.sessionCode);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        if (session.status === "ended") throw new TRPCError({ code: "BAD_REQUEST", message: "Session has ended." });
        const participants = await db.getSessionParticipants(session.id);
        return { session, participants };
      }),

    endSession: instructorProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getWhiteboardSession(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND" });
        if (session.hostUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateWhiteboardSession(input.sessionId, {
          status: "ended",
          endedAt: new Date(),
          currentParticipants: 0,
        });
        return { success: true };
      }),

    listSessions: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listWhiteboardSessions(input.projectId);
      }),
  }),

  // ============ v6.3: AI Slide Layout ============
  slideLayout: router({
    recommend: instructorProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Get all slides and scripts for this project
        const slides = await db.listProjectSlides(input.projectId);
        const scripts = await db.listSlideScripts(input.projectId);
        if (!slides.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No slides found." });

        // Build prompt for LLM
        const slideInfo = slides.map((s: any, i: number) => {
          const script = scripts.find((sc: any) => sc.slideId === s.id);
          return `Slide ${i + 1} (ID: ${s.id}): script="${script?.scriptText || '(none)'}"`;
        }).join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a presentation design expert. Analyze each slide's script and recommend the optimal layout.

Available layout types:
- title_only: Large title only (opening/closing)
- title_subtitle: Title + subtitle (section start)
- title_body: Title + body text (general explanation)
- title_bullets: Title + bullet list (key points)
- comparison: Side-by-side comparison (A vs B)
- image_left: Left image + right text
- image_right: Right image + left text
- image_full: Full image background + overlay text
- quote: Quote style
- chart: Chart/data visualization
- diagram: Diagram/flowchart
- timeline: Timeline/chronology
- blank: Empty slide

Respond with a JSON array for each slide.`
            },
            {
              role: "user",
              content: `Please recommend optimal layouts for the following slides:\n\n${slideInfo}`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "slide_layouts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  layouts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        slideId: { type: "number" },
                        layoutType: { type: "string" },
                        reasoning: { type: "string" },
                        config: {
                          type: "object",
                          properties: {
                            titleSize: { type: "string" },
                            bodySize: { type: "string" },
                            alignment: { type: "string" },
                            emphasis: { type: "string" },
                          },
                          required: ["titleSize", "bodySize", "alignment", "emphasis"],
                          additionalProperties: false,
                        },
                      },
                      required: ["slideId", "layoutType", "reasoning", "config"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["layouts"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content as string;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No AI response" });

        const parsed = JSON.parse(content);
        const validTypes = ["title_only", "title_subtitle", "title_body", "title_bullets", "comparison", "image_left", "image_right", "image_full", "quote", "chart", "diagram", "timeline", "blank"];

        // Save layouts to DB
        const results = [];
        for (const layout of parsed.layouts) {
          const layoutType = validTypes.includes(layout.layoutType) ? layout.layoutType : "title_body";
          const id = await db.upsertSlideLayout({
            projectId: input.projectId,
            slideId: layout.slideId,
            layoutType: layoutType as any,
            layoutConfig: layout.config,
            aiReasoning: layout.reasoning,
          });
          results.push({ slideId: layout.slideId, layoutType, reasoning: layout.reasoning, id });
        }

        return { layouts: results, count: results.length };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getSlideLayouts(input.projectId);
      }),

    applyLayout: instructorProcedure
      .input(z.object({ layoutId: z.number() }))
      .mutation(async ({ input }) => {
        await db.applySlideLayout(input.layoutId);
        return { success: true };
      }),

    clear: instructorProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSlideLayouts(input.projectId);
        return { success: true };
      }),
  }),

  // ============ v6.3: Project Watermark ============
  watermark: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectWatermark(input.projectId);
      }),

    upsert: instructorProcedure
      .input(z.object({
        projectId: z.number(),
        watermarkType: z.enum(["logo", "text", "both"]).default("text"),
        logoUrl: z.string().optional(),
        logoFileKey: z.string().optional(),
        textContent: z.string().max(255).optional(),
        fontSize: z.number().min(8).max(72).default(24),
        fontColor: z.string().default("#FFFFFF"),
        position: z.enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]).default("bottom-right"),
        opacity: z.number().min(0).max(100).default(70),
        sizePercent: z.number().min(5).max(50).default(15),
        marginPx: z.number().min(0).max(100).default(20),
        isEnabled: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.upsertProjectWatermark({
          projectId: input.projectId,
          userId: ctx.user.id,
          watermarkType: input.watermarkType,
          logoUrl: input.logoUrl || null,
          logoFileKey: input.logoFileKey || null,
          textContent: input.textContent || null,
          fontSize: input.fontSize,
          fontColor: input.fontColor,
          position: input.position,
          opacity: input.opacity,
          sizePercent: input.sizePercent,
          marginPx: input.marginPx,
          isEnabled: input.isEnabled,
        });
        return { id, success: true };
      }),

    uploadLogo: instructorProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const fileKey = `watermarks/${ctx.user.id}/${input.projectId}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, fileKey };
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectWatermark(input.id);
        return { success: true };
      }),
  }),

  // ============ v7.0: Akool API Integration ============
  akool: router({
    // Get available I2V effects
    getEffects: protectedProcedure
      .query(async () => {
        const akool = await import("./akool");
        const result = await akool.getI2VEffects();
        return result.data || [];
      }),

    // Get Akool avatar list
    getAvatars: protectedProcedure
      .input(z.object({ page: z.number().default(1), size: z.number().default(50) }))
      .query(async ({ input }) => {
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const akool = await import("./akool");
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
        const { GEMINI_VOICES } = await import("./_core/geminiTts");
        return GEMINI_VOICES;
      }),

    ttsGenerate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        voiceId: z.string().default("Kore"),
        speed: z.number().min(0.5).max(2.0).default(1.0),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const { storagePut } = await import("./storage");
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
        const { invokeLLM } = await import("./_core/llm");
        const { generateGeminiTts, GEMINI_VOICES } = await import("./_core/geminiTts");
        const { storagePut } = await import("./storage");

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
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const { storagePut } = await import("./storage");
        const { transcribeAudio } = await import("./_core/voiceTranscription");

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
        const { generateImage } = await import("./_core/imageGeneration");
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
        const { generateImage } = await import("./_core/imageGeneration");
        const prompt = input.newBackground
          ? `Remove the background from this image and replace it with: ${input.newBackground}. Keep the main subject intact.`
          : "Remove the background from this image, making it transparent. Keep the main subject intact with clean edges.";
        const result = await generateImage({
          prompt,
          originalImages: [{ url: input.imageUrl }],
        });
        return { imageUrl: result.url || null };
      }),
  }),

  // ═══════════ v8.1 Video Effects (V2V) ═══════════
  videoEffects: router({
    categories: publicProcedure.query(async () => {
      const { VIDEO_EFFECT_CATEGORIES } = await import("./kling");
      return VIDEO_EFFECT_CATEGORIES;
    }),

    create: protectedProcedure
      .input(z.object({
        effectScene: z.string().min(1),
        imageUrl: z.string().url().optional(),
        imageUrls: z.array(z.string().url()).length(2).optional(),
      }))
      .mutation(async ({ input }) => {
        const { createVideoEffect } = await import("./kling");
        const result = await createVideoEffect({
          effectScene: input.effectScene,
          imageUrl: input.imageUrl,
          imageUrls: input.imageUrls,
        });
        return result;
      }),

    status: publicProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        const { getVideoEffectStatus } = await import("./kling");
        return getVideoEffectStatus(input.taskId);
      }),

    upload: protectedProcedure
      .input(z.object({
        fileData: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `v2v/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ═══════════ v8.1 Community Gallery Posts ═══════════
  community: router({
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        toolUsed: z.string().optional(),
        sort: z.enum(["latest", "popular"]).default("latest"),
        tag: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.listGalleryPosts({
          limit: input?.limit ?? 20,
          offset: input?.offset ?? 0,
          toolUsed: input?.toolUsed,
          sort: input?.sort ?? "latest",
          tag: input?.tag,
        });
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await db.getGalleryPostById(input.id);
        if (post) await db.incrementGalleryPostView(input.id);
        return post;
      }),

    myPosts: protectedProcedure.query(async ({ ctx }) => {
      return db.getMyGalleryPosts(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        mediaType: z.enum(["image", "video", "audio"]).default("image"),
        mediaUrl: z.string().url(),
        mediaFileKey: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        toolUsed: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createGalleryPost({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          mediaType: input.mediaType,
          mediaUrl: input.mediaUrl,
          mediaFileKey: input.mediaFileKey,
          thumbnailUrl: input.thumbnailUrl,
          toolUsed: input.toolUsed,
          tags: input.tags,
          isPublic: input.isPublic,
        });
        return { id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteGalleryPost(input.id, ctx.user.id);
        return { success: true };
      }),

    like: protectedProcedure
      .input(z.object({ postId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await db.toggleGalleryPostLike(input.postId, ctx.user.id);
        return { liked };
      }),

    comments: publicProcedure
      .input(z.object({ postId: z.number() }))
      .query(async ({ input }) => {
        return db.getGalleryPostComments(input.postId);
      }),

    addComment: protectedProcedure
      .input(z.object({ postId: z.number(), content: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await db.addGalleryPostComment(input.postId, ctx.user.id, input.content);
        return { success: true };
      }),

    myLikes: protectedProcedure.query(async ({ ctx }) => {
      const likes = await db.getUserPostLikes(ctx.user.id);
      return likes.map(l => l.galleryItemId);
    }),

    upload: protectedProcedure
      .input(z.object({
        fileData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `community/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url, fileKey };
      }),
  }),

  // ═══════════ v8.3 - User Profile ═══════════
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      const credits = await db.getUserCredits(ctx.user.id);
      const genCount = await db.getAiGenerationCount(ctx.user.id);
      const galleryPosts = await db.getGalleryPostsByUser(ctx.user.id, 6);
      return { user, credits, generationCount: genCount, recentGallery: galleryPosts };
    }),
    update: protectedProcedure
      .input(z.object({ name: z.string().optional(), bio: z.string().optional(), avatarUrl: z.string().optional(), preferredLang: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ═══════════ v8.3 - AI History ═══════════
  aiHistory: router({
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
  }),

  // ═══════════ v8.3 - Admin Analytics ═══════════
  adminAnalytics: router({
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
  }),

  // ── Community Shared Presets (v8.7) ──
  sharedPreset: router({
    list: publicProcedure
      .input(z.object({ sortBy: z.enum(["latest", "popular"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.listSharedPresets(input?.sortBy || "latest");
      }),
    listPaginated: publicProcedure
      .input(z.object({
        sortBy: z.enum(["latest", "popular"]).optional(),
        tagId: z.number().optional(),
        cursor: z.number().optional(),
        limit: z.number().min(1).max(50).optional(),
      }).optional())
      .query(async ({ input }) => {
        const result = await db.listSharedPresetsPaginated(
          input?.sortBy || "latest",
          input?.tagId,
          input?.cursor,
          input?.limit || 20
        );
        const itemsWithTags = await Promise.all(result.items.map(async (p: any) => {
          const tags = await db.getPresetTags("avatar", p.id);
          return { ...p, tags };
        }));
        return { items: itemsWithTags, nextCursor: result.nextCursor };
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const preset = await db.getSharedPresetById(input.id);
        if (!preset) return null;
        const tags = await db.getPresetTags("avatar", preset.id);
        return { ...preset, tags };
      }),
    share: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
        opacity: z.number().min(0).max(100).optional(),
        shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        customX: z.number().optional(),
        customY: z.number().optional(),
        customWidth: z.number().optional(),
        customHeight: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { tagIds, ...presetInput } = input;
        const id = await db.createSharedPreset({
          userId: ctx.user.id,
          userName: ctx.user.name || "Anonymous",
          name: presetInput.name,
          description: presetInput.description,
          position: presetInput.position || "custom",
          size: presetInput.size || "medium",
          opacity: presetInput.opacity ?? 100,
          shape: presetInput.shape || "rounded",
          customX: presetInput.customX ?? 75,
          customY: presetInput.customY ?? 75,
          customWidth: presetInput.customWidth ?? 25,
          customHeight: presetInput.customHeight ?? 25,
        });
        if (tagIds && tagIds.length > 0) {
          await db.addTagsToPreset("avatar", id, tagIds);
        }
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSharedPreset(input.id, ctx.user.id);
        return { success: true };
      }),
    like: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await db.toggleSharedPresetLike(input.id, ctx.user.id);
        return { liked };
      }),
    download: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementSharedPresetDownloads(input.id);
        return { success: true };
      }),
    myLikes: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLikedPresets(ctx.user.id);
    }),
  }),

  // ── Subtitle Styles (v8.7) ──
  subtitleStyle: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getSubtitleStyle(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        fontSize: z.number().min(8).max(48).optional(),
        fontColor: z.string().max(20).optional(),
        bgColor: z.string().max(30).optional(),
        position: z.enum(["top", "bottom", "custom"]).optional(),
        customY: z.number().min(0).max(100).optional(),
        fontFamily: z.string().max(50).optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        outline: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertSubtitleStyle(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ── Shared Subtitle Presets (v8.8) ──
  sharedSubtitlePreset: router({
    list: publicProcedure
      .input(z.object({
        sortBy: z.enum(["latest", "popular"]).optional(),
        tagId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const presets = await db.listSharedSubtitlePresets(input?.sortBy || "latest", input?.tagId);
        const presetsWithTags = await Promise.all(presets.map(async (p) => {
          const tags = await db.getPresetTags("subtitle", p.id);
          return { ...p, tags };
        }));
        return presetsWithTags;
      }),
    listPaginated: publicProcedure
      .input(z.object({
        sortBy: z.enum(["latest", "popular"]).optional(),
        tagId: z.number().optional(),
        cursor: z.number().optional(),
        limit: z.number().min(1).max(50).optional(),
      }).optional())
      .query(async ({ input }) => {
        const result = await db.listSharedSubtitlePresetsPaginated(
          input?.sortBy || "latest",
          input?.tagId,
          input?.cursor,
          input?.limit || 20
        );
        const itemsWithTags = await Promise.all(result.items.map(async (p: any) => {
          const tags = await db.getPresetTags("subtitle", p.id);
          return { ...p, tags };
        }));
        return { items: itemsWithTags, nextCursor: result.nextCursor };
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const preset = await db.getSharedSubtitlePresetById(input.id);
        if (!preset) return null;
        const tags = await db.getPresetTags("subtitle", preset.id);
        return { ...preset, tags };
      }),
    share: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        fontSize: z.number().min(8).max(48).optional(),
        fontColor: z.string().max(20).optional(),
        bgColor: z.string().max(30).optional(),
        position: z.enum(["top", "bottom"]).optional(),
        fontFamily: z.string().max(50).optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        outline: z.boolean().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { tagIds, ...presetData } = input;
        const id = await db.createSharedSubtitlePreset({
          userId: ctx.user.id,
          userName: ctx.user.name || "Anonymous",
          name: presetData.name,
          description: presetData.description,
          fontSize: presetData.fontSize ?? 16,
          fontColor: presetData.fontColor ?? "#FFFFFF",
          bgColor: presetData.bgColor ?? "rgba(0,0,0,0.7)",
          position: presetData.position ?? "bottom",
          fontFamily: presetData.fontFamily ?? "sans-serif",
          bold: presetData.bold ?? false,
          italic: presetData.italic ?? false,
          outline: presetData.outline ?? true,
        });
        if (tagIds && tagIds.length > 0) {
          await db.addTagsToPreset("subtitle", id, tagIds);
        }
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSharedSubtitlePreset(input.id, ctx.user.id);
        return { success: true };
      }),
    like: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await db.toggleSharedSubtitlePresetLike(input.id, ctx.user.id);
        return { liked };
      }),
    download: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementSharedSubtitlePresetDownloads(input.id);
        return { success: true };
      }),
    myLikes: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLikedSubtitlePresets(ctx.user.id);
    }),
  }),

  // ── Preset Tags (v8.8) ──
  presetTag: router({
    list: publicProcedure
      .input(z.object({ category: z.enum(["avatar", "subtitle", "general"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.listPresetTags(input?.category);
      }),
    popular: publicProcedure
      .input(z.object({
        category: z.enum(["avatar", "subtitle", "general"]).optional(),
        limit: z.number().min(1).max(50).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getPopularTags(input?.category, input?.limit || 20);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(50),
        category: z.enum(["avatar", "subtitle", "general"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.getOrCreateTag(input.name, input.category || "general");
        return { id };
      }),
    addToPreset: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
        tagIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.addTagsToPreset(input.presetType, input.presetId, input.tagIds);
        return { success: true };
      }),
    getForPreset: publicProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getPresetTags(input.presetType, input.presetId);
      }),
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(50),
        category: z.enum(["avatar", "subtitle", "general"]).optional(),
      }))
      .query(async ({ input }) => {
        return db.searchTags(input.query, input.category);
      }),
    removeFromPreset: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.removeTagsFromPreset(input.presetType, input.presetId);
        return { success: true };
      }),
  }),

  // ── My Presets Management (v8.9) ──
  myPresets: router({
    avatarList: protectedProcedure.query(async ({ ctx }) => {
      const presets = await db.getMySharedPresets(ctx.user.id);
      const presetsWithTags = await Promise.all(presets.map(async (p) => {
        const tags = await db.getPresetTags("avatar", p.id);
        return { ...p, tags };
      }));
      return presetsWithTags;
    }),
    subtitleList: protectedProcedure.query(async ({ ctx }) => {
      const presets = await db.getMySharedSubtitlePresets(ctx.user.id);
      const presetsWithTags = await Promise.all(presets.map(async (p) => {
        const tags = await db.getPresetTags("subtitle", p.id);
        return { ...p, tags };
      }));
      return presetsWithTags;
    }),
    updateAvatar: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left", "custom"]).optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
        opacity: z.number().min(0).max(100).optional(),
        shape: z.enum(["circle", "rounded", "rectangle"]).optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, tagIds, ...data } = input;
        await db.updateSharedPreset(id, ctx.user.id, data);
        if (tagIds !== undefined) {
          await db.removeTagsFromPreset("avatar", id);
          if (tagIds.length > 0) await db.addTagsToPreset("avatar", id, tagIds);
        }
        return { success: true };
      }),
    updateSubtitle: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        fontSize: z.number().min(8).max(48).optional(),
        fontColor: z.string().max(20).optional(),
        bgColor: z.string().max(30).optional(),
        position: z.enum(["top", "bottom"]).optional(),
        fontFamily: z.string().max(50).optional(),
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        outline: z.boolean().optional(),
        tagIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, tagIds, ...data } = input;
        await db.updateSharedSubtitlePreset(id, ctx.user.id, data);
        if (tagIds !== undefined) {
          await db.removeTagsFromPreset("subtitle", id);
          if (tagIds.length > 0) await db.addTagsToPreset("subtitle", id, tagIds);
        }
        return { success: true };
      }),
    deleteAvatar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeTagsFromPreset("avatar", input.id);
        await db.deleteSharedPreset(input.id, ctx.user.id);
        return { success: true };
      }),
    deleteSubtitle: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.removeTagsFromPreset("subtitle", input.id);
        await db.deleteSharedSubtitlePreset(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ Preset Search (v9.1) ============
  presetSearch: router({
    search: publicProcedure
      .input(z.object({
        keyword: z.string().min(1).max(100),
        type: z.enum(["avatar", "subtitle"]),
        limit: z.number().min(1).max(50).optional(),
      }))
      .query(async ({ input }) => {
        const results = await db.searchSharedPresets(input.keyword, input.type, input.limit || 20);
        const blockedIds = await db.getBlockedPresetIds(input.type);
        return results.filter((r: any) => !blockedIds.includes(r.id));
      }),
  }),

  // ============ Preset Reports (v9.1) ============
  presetReport: router({
    report: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
        reason: z.enum(["inappropriate", "spam", "copyright", "offensive", "other"]),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const alreadyReported = await db.hasUserReported(input.presetType, input.presetId, ctx.user.id);
        if (alreadyReported) return { success: false, error: "already_reported" };
        const id = await db.createPresetReport({ ...input, reporterId: ctx.user.id });
        return { success: true, id };
      }),
    list: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "reviewed", "blocked", "dismissed"]).optional(),
        presetType: z.enum(["avatar", "subtitle"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") return [];
        return db.getPresetReports(input || {});
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "reviewed", "blocked", "dismissed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") return { success: false };
        await db.updatePresetReportStatus(input.id, input.status, ctx.user.id);
        return { success: true };
      }),
    block: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") return { success: false };
        await db.blockPreset(input.presetType, input.presetId, ctx.user.id, input.reason);
        return { success: true };
      }),
    unblock: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") return { success: false };
        await db.unblockPreset(input.presetType, input.presetId);
        return { success: true };
      }),
  }),

  // ============ Preset Versions (v9.1) ============
  presetVersion: router({
    list: publicProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getPresetVersions(input.presetType, input.presetId);
      }),
    restore: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const version = await db.getPresetVersionById(input.versionId);
        if (!version) return { success: false, error: "version_not_found" };
        const data = version.data as any;
        if (version.presetType === "avatar") {
          await db.updateSharedPreset(version.presetId, ctx.user.id, data);
        } else {
          await db.updateSharedSubtitlePreset(version.presetId, ctx.user.id, data);
        }
        return { success: true };
      }),
  }),

  // ============ Notifications (v9.2) ============
  notification: router({
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
  }),

  // ============ Preset Comments (v9.2) ============
  presetComment: router({
    list: publicProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const comments = await db.listPresetComments(input.presetType, input.presetId, input.limit, input.offset);
        const count = await db.getPresetCommentCount(input.presetType, input.presetId);
        const rating = await db.getPresetAverageRating(input.presetType, input.presetId);
        return { comments, total: count, rating };
      }),
    add: protectedProcedure
      .input(z.object({
        presetType: z.enum(["avatar", "subtitle"]),
        presetId: z.number(),
        content: z.string().min(1).max(1000),
        rating: z.number().min(1).max(5).optional(),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const commentId = await db.addPresetComment({
          presetType: input.presetType,
          presetId: input.presetId,
          userId: ctx.user.id,
          content: input.content,
          rating: input.rating ?? null,
          parentId: input.parentId ?? null,
        });
        // Create notification for reply
        if (input.parentId) {
          const parentComments = await db.listPresetComments(input.presetType, input.presetId, 1000, 0);
          const parent = parentComments.find((c: any) => c.comment.id === input.parentId);
          if (parent && parent.comment.userId !== ctx.user.id) {
            await db.createNotification({
              userId: parent.comment.userId,
              type: "reply",
              title: "\uc0c8 \ub2f5\uae00",
              message: `${ctx.user.name || '\uc0ac\uc6a9\uc790'}\ub2d8\uc774 \ud68c\uc6d0\ub2d8\uc758 \ub313\uae00\uc5d0 \ub2f5\uae00\uc744 \ub2ec\uc558\uc2b5\ub2c8\ub2e4.`,
              link: `/studio?presetType=${input.presetType}&presetId=${input.presetId}`,
            });
          }
        }
        return { success: true, commentId };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePresetComment(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ Admin Report Management (v9.2) ============
  adminReport: router({
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
  }),

  // v9.3: Admin Statistics
  adminStats: router({
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
  }),

  // ============ SCORM/xAPI Export (v10.0) ============
  scorm: router({
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
  }),

  // ============ Marketplace (v10.2) ============
  marketplace: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }).optional())
      .query(async ({ input }) => {
        return db.getMarketplaceListings(input || {});
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const listing = await db.getMarketplaceListingById(input.id);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        await db.incrementListingViewCount(input.id);
        return listing;
      }),

    publish: instructorProcedure
      .input(z.object({
        pipelineId: z.number().optional(),
        scriptId: z.number().optional(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        shortDescription: z.string().max(255).optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "programming", "business", "design", "other"]).default("other"),
        priceInCents: z.number().min(50),
        salePriceInCents: z.number().optional(),
        thumbnailUrl: z.string().optional(),
        previewVideoUrl: z.string().optional(),
        tags: z.string().optional(),
        language: z.string().default("ko"),
        durationSec: z.number().default(0),
        acceptCrypto: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const listing = await db.createMarketplaceListing({
          sellerId: ctx.user.id,
          ...input,
          status: "active",
        });
        return listing;
      }),

    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        shortDescription: z.string().max(255).optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "programming", "business", "design", "other"]).optional(),
        priceInCents: z.number().min(50).optional(),
        salePriceInCents: z.number().nullable().optional(),
        tags: z.string().optional(),
        status: z.enum(["draft", "active", "archived"]).optional(),
        acceptCrypto: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const listing = await db.getMarketplaceListingById(input.id);
        if (!listing || listing.sellerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        }
        const { id, ...data } = input;
        await db.updateMarketplaceListing(id, data);
        return { success: true };
      }),

    myListings: instructorProcedure.query(async ({ ctx }) => {
      return db.getMyListings(ctx.user.id);
    }),

    purchase: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        paymentMethod: z.enum(["stripe", "crypto"]).default("stripe"),
      }))
      .mutation(async ({ ctx, input }) => {
        const listing = await db.getMarketplaceListingById(input.listingId);
        if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
        if (listing.sellerId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot purchase your own product." });
        }
        const alreadyPurchased = await db.hasPurchased(ctx.user.id, input.listingId);
        if (alreadyPurchased) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Already purchased." });
        }
        const price = listing.salePriceInCents || listing.priceInCents;
        const platformFee = Math.round(price * 0.15); // 15% platform fee
        const sellerPayout = price - platformFee;

        if (input.paymentMethod === "stripe") {
          // Create Stripe checkout session
          const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
              price_data: {
                currency: listing.currency || "usd",
                product_data: { name: listing.title },
                unit_amount: price,
              },
              quantity: 1,
            }],
            mode: "payment",
            success_url: `${ctx.req.headers.origin}/marketplace?purchased=${listing.id}`,
            cancel_url: `${ctx.req.headers.origin}/marketplace/${listing.id}`,
            client_reference_id: ctx.user.id.toString(),
            metadata: {
              type: "marketplace_purchase",
              listing_id: listing.id.toString(),
              seller_id: listing.sellerId.toString(),
              buyer_id: ctx.user.id.toString(),
              platform_fee: platformFee.toString(),
              seller_payout: sellerPayout.toString(),
            },
          });
          return { checkoutUrl: session.url, sessionId: session.id };
        } else {
          // Crypto payment - create pending purchase
          const purchase = await db.createMarketplacePurchase({
            buyerId: ctx.user.id,
            listingId: input.listingId,
            sellerId: listing.sellerId,
            amountInCents: price,
            platformFeeInCents: platformFee,
            sellerPayoutInCents: sellerPayout,
            paymentMethod: "crypto",
            status: "pending",
          });
          return { purchaseId: purchase.id, amount: price, currency: listing.currency };
        }
      }),

    myPurchases: protectedProcedure.query(async ({ ctx }) => {
      return db.getMyPurchases(ctx.user.id);
    }),

    hasPurchased: protectedProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.hasPurchased(ctx.user.id, input.listingId);
      }),

    earnings: instructorProcedure.query(async ({ ctx }) => {
      return db.getSellerEarnings(ctx.user.id);
    }),

    review: protectedProcedure
      .input(z.object({
        listingId: z.number(),
        purchaseId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().max(255).optional(),
        content: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const purchase = await db.getPurchaseById(input.purchaseId);
        if (!purchase || purchase.buyerId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Purchase record not found." });
        }
        return db.createMarketplaceReview({
          listingId: input.listingId,
          buyerId: ctx.user.id,
          purchaseId: input.purchaseId,
          rating: input.rating,
          title: input.title,
          content: input.content,
        });
      }),

    reviews: publicProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ input }) => {
        return db.getListingReviews(input.listingId);
      }),

    creatorProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getCreatorProfile(input.userId);
      }),

    updateCreatorProfile: instructorProcedure
      .input(z.object({
        displayName: z.string().min(1).max(255).optional(),
        bio: z.string().optional(),
        specialties: z.string().optional(),
        socialLinks: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertCreatorProfile(ctx.user.id, input);
      }),
  }),

  // ============ Payout / Stripe Connect (v10.3) ============
  payout: router({
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
  }),

  // ============ AI Recommendations (v10.4) ============
  recommendation: router({
    getPersonalized: protectedProcedure.query(async ({ ctx }) => {
      // Check cache first
      const cached = await db.getCachedRecommendations(ctx.user.id, "personalized");
      if (cached) return { recommendations: JSON.parse(cached.recommendations), fromCache: true };
      // Get user history and preferences
      const history = await db.getUserLearningHistoryList(ctx.user.id, 50);
      const prefs = await db.getUserPreferences(ctx.user.id);
      // Collaborative filtering: get popular items user hasn't seen
      const viewedIds = history.map(h => h.listingId);
      const popular = await db.getPopularListings(20);
      let recommendations = popular.filter(p => !viewedIds.includes(p.id));
      // Content-based: if user has preferences, boost matching categories
      if (prefs?.preferredCategories) {
        const cats = JSON.parse(prefs.preferredCategories) as string[];
        recommendations.sort((a, b) => {
          const aMatch = cats.includes(a.category || "") ? 1 : 0;
          const bMatch = cats.includes(b.category || "") ? 1 : 0;
          return bMatch - aMatch;
        });
      }
      const result = recommendations.slice(0, 10).map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases }));
      // Cache for 1 hour
      await db.setCachedRecommendations({ userId: ctx.user.id, type: "personalized", recommendations: JSON.stringify(result), expiresAt: new Date(Date.now() + 3600000) });
      return { recommendations: result, fromCache: false };
    }),
    getTrending: publicProcedure.query(async () => {
      const popular = await db.getPopularListings(10);
      return popular.map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases, thumbnailUrl: r.thumbnailUrl }));
    }),
    getSimilar: publicProcedure
      .input(z.object({ listingId: z.number() }))
      .query(async ({ input }) => {
        const listings = await db.getMarketplaceListings({ category: "" }); const listing = listings.find(l => l.id === input.listingId);
        if (!listing) return [];
        // Get listings in same category
        const similar = await db.getListingsByCategory(listing.category || "general", 10);
        return similar.filter(s => s.id !== input.listingId).map(r => ({ id: r.id, title: r.title, category: r.category, price: r.priceInCents, rating: r.avgRating, totalPurchases: r.totalPurchases, thumbnailUrl: r.thumbnailUrl }));
      }),
    trackProgress: protectedProcedure
      .input(z.object({ listingId: z.number(), progressPercent: z.number().min(0).max(100), watchTimeSec: z.number().min(0).optional(), lastPositionSec: z.number().min(0).optional(), isCompleted: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        return db.trackLearningProgress({ userId: ctx.user.id, ...input });
      }),
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLearningHistoryList(ctx.user.id);
    }),
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserPreferences(ctx.user.id);
    }),
    updatePreferences: protectedProcedure
      .input(z.object({
        preferredCategories: z.array(z.string()).optional(),
        preferredLanguages: z.array(z.string()).optional(),
        preferredDifficulty: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
        interests: z.array(z.string()).optional(),
        learningGoal: z.string().optional(),
        weeklyTargetMinutes: z.number().min(0).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const data: any = {};
        if (input.preferredCategories) data.preferredCategories = JSON.stringify(input.preferredCategories);
        if (input.preferredLanguages) data.preferredLanguages = JSON.stringify(input.preferredLanguages);
        if (input.preferredDifficulty) data.preferredDifficulty = input.preferredDifficulty;
        if (input.interests) data.interests = JSON.stringify(input.interests);
        if (input.learningGoal) data.learningGoal = input.learningGoal;
        if (input.weeklyTargetMinutes !== undefined) data.weeklyTargetMinutes = input.weeklyTargetMinutes;
        return db.upsertUserPreferences(ctx.user.id, data);
      }),
  }),

  // ============ Real-time AI Interpretation (v12.0) ============
  interpretation: router({
    // Get all supported languages (public)
    getSupportedLanguages: publicProcedure.query(async () => {
      return db.getSupportedLanguages();
    }),

    // Start a new interpretation session
    startSession: protectedProcedure
      .input(z.object({
        broadcastId: z.number().optional(),
        pipelineId: z.number().optional(),
        sourceLanguage: z.string().default("ko"),
        targetLanguages: z.array(z.string()).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = await db.createInterpretationSession({
          hostUserId: ctx.user.id,
          broadcastId: input.broadcastId ?? null,
          pipelineId: input.pipelineId ?? null,
          sourceLanguage: input.sourceLanguage,
          targetLanguages: JSON.stringify(input.targetLanguages),
          status: "active",
        });
        return { sessionId };
      }),

    // Translate a text segment using AI (LLM)
    translate: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        sourceText: z.string().min(1),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        startTimeSec: z.number().optional(),
        endTimeSec: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify session exists and belongs to user
        const session = await db.getInterpretationSession(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        if (session.hostUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Permission denied." });
        }

        // Language name mapping for better LLM translation
        const langNames: Record<string, string> = {
          ko: "Korean", zh: "Chinese", en: "English", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", es: "Spanish", fr: "French",
          de: "German", ar: "Arabic", hi: "Hindi", pt: "Portuguese",
          ru: "Russian", id: "Indonesian", tr: "Turkish",
        };
        const sourceLangName = langNames[input.sourceLanguage] || input.sourceLanguage;
        const targetLangName = langNames[input.targetLanguage] || input.targetLanguage;

        // Use LLM for high-quality translation
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional real-time interpreter. Translate the following ${sourceLangName} text to ${targetLangName}. Provide ONLY the translated text, no explanations or notes. Maintain the original tone, formality level, and meaning. For technical terms, use the most commonly accepted translation in the target language.`,
            },
            { role: "user", content: input.sourceText },
          ],
        });

        const translatedText = (llmResponse.choices?.[0]?.message?.content as string || "").trim();
        if (!translatedText) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Translation failed." });
        }

        // Save translation segment
        const segmentId = await db.addTranslationSegment({
          sessionId: input.sessionId,
          sourceText: input.sourceText,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          translatedText,
          startTimeSec: input.startTimeSec ?? null,
          endTimeSec: input.endTimeSec ?? null,
          confidence: 90, // LLM translations are generally high confidence
        });

        // Update session stats
        const segmentCount = await db.getSessionSegmentCount(input.sessionId);
        await db.updateInterpretationSessionStats(input.sessionId, segmentCount, input.endTimeSec ?? 0);

        return { segmentId, translatedText };
      }),

    // Batch translate to multiple languages at once
    batchTranslate: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        sourceText: z.string().min(1),
        sourceLanguage: z.string(),
        targetLanguages: z.array(z.string()).min(1),
        startTimeSec: z.number().optional(),
        endTimeSec: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterpretationSession(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        if (session.hostUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Permission denied." });
        }

        const langNames: Record<string, string> = {
          ko: "Korean", zh: "Chinese", en: "English", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", es: "Spanish", fr: "French",
          de: "German", ar: "Arabic", hi: "Hindi", pt: "Portuguese",
          ru: "Russian", id: "Indonesian", tr: "Turkish",
        };

        // Translate to all target languages in parallel
        const results = await Promise.all(
          input.targetLanguages.map(async (targetLang) => {
            const sourceLangName = langNames[input.sourceLanguage] || input.sourceLanguage;
            const targetLangName = langNames[targetLang] || targetLang;
            try {
              const llmResponse = await invokeLLM({
                messages: [
                  {
                    role: "system",
                    content: `You are a professional real-time interpreter. Translate the following ${sourceLangName} text to ${targetLangName}. Provide ONLY the translated text, no explanations.`,
                  },
                  { role: "user", content: input.sourceText },
                ],
              });
              const translatedText = (llmResponse.choices?.[0]?.message?.content as string || "").trim();
              const segmentId = await db.addTranslationSegment({
                sessionId: input.sessionId,
                sourceText: input.sourceText,
                sourceLanguage: input.sourceLanguage,
                targetLanguage: targetLang,
                translatedText,
                startTimeSec: input.startTimeSec ?? null,
                endTimeSec: input.endTimeSec ?? null,
                confidence: 90,
              });
              return { targetLanguage: targetLang, translatedText, segmentId, success: true };
            } catch (e) {
              return { targetLanguage: targetLang, translatedText: "", segmentId: 0, success: false };
            }
          })
        );

        const segmentCount = await db.getSessionSegmentCount(input.sessionId);
        await db.updateInterpretationSessionStats(input.sessionId, segmentCount, input.endTimeSec ?? 0);

        return { results };
      }),

    // End an interpretation session
    endSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await db.getInterpretationSession(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        if (session.hostUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Permission denied." });
        }
        await db.endInterpretationSession(input.sessionId);
        return { success: true };
      }),

    // Get session history with segments
    getHistory: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        targetLanguage: z.string().optional(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ ctx, input }) => {
        const session = await db.getInterpretationSession(input.sessionId);
        if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found." });
        if (session.hostUserId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Permission denied." });
        }
        const segments = await db.getSessionSegments(input.sessionId, input.targetLanguage, input.limit);
        return { session, segments };
      }),

    // Get user's interpretation sessions list
    mySessions: protectedProcedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ ctx, input }) => {
        return db.getUserInterpretationSessions(ctx.user.id, input.limit);
      }),

    // Translate chat message (for multilingual chat)
    translateChat: protectedProcedure
      .input(z.object({
        text: z.string().min(1),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
      }))
      .mutation(async ({ input }) => {
        const langNames: Record<string, string> = {
          ko: "Korean", zh: "Chinese", en: "English", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", es: "Spanish", fr: "French",
          de: "German", ar: "Arabic", hi: "Hindi", pt: "Portuguese",
          ru: "Russian", id: "Indonesian", tr: "Turkish",
        };
        const sourceLangName = langNames[input.sourceLanguage] || input.sourceLanguage;
        const targetLangName = langNames[input.targetLanguage] || input.targetLanguage;

        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Translate the following ${sourceLangName} chat message to ${targetLangName}. Keep it natural and conversational. Provide ONLY the translation.`,
            },
            { role: "user", content: input.text },
          ],
        });
        const translatedText = (llmResponse.choices?.[0]?.message?.content as string || "").trim();
        return { translatedText };
      }),

    // Upload audio and transcribe using Whisper API (server-side STT)
    transcribeAudioUpload: protectedProcedure
      .input(z.object({
        audioData: z.string(), // base64 encoded audio
        fileName: z.string().default("recording.webm"),
        mimeType: z.string().default("audio/webm"),
        language: z.string().optional(), // ISO 639-1 language code hint
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Decode base64 audio
        const buffer = Buffer.from(input.audioData, "base64");
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `File size is ${sizeMB.toFixed(1)}MB. Maximum 16MB allowed.` });
        }

        // 2. Upload to S3
        const fileKey = `stt-audio/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: audioUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // 3. Transcribe using Whisper API
        const result = await transcribeAudio({
          audioUrl,
          language: input.language,
        });

        if ("error" in result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error,
            cause: result,
          });
        }

        return {
          text: result.text,
          language: result.language,
          duration: result.duration,
          segments: result.segments,
          audioUrl,
        };
      }),

    // Transcribe audio and translate to multiple languages in one call
    transcribeAndTranslate: protectedProcedure
      .input(z.object({
        audioData: z.string(), // base64 encoded audio
        fileName: z.string().default("recording.webm"),
        mimeType: z.string().default("audio/webm"),
        sourceLanguage: z.string().default("ko"),
        targetLanguages: z.array(z.string()).min(1),
        sessionId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Decode and validate
        const buffer = Buffer.from(input.audioData, "base64");
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `File size is ${sizeMB.toFixed(1)}MB. Maximum 16MB allowed.` });
        }

        // 2. Upload to S3
        const fileKey = `stt-audio/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: audioUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // 3. Transcribe using Whisper API
        const sttResult = await transcribeAudio({
          audioUrl,
          language: input.sourceLanguage,
        });

        if ("error" in sttResult) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Speech recognition failed: ${sttResult.error}`,
            cause: sttResult,
          });
        }

        const sourceText = sttResult.text.trim();
        if (!sourceText) {
          return {
            sourceText: "",
            detectedLanguage: sttResult.language,
            duration: sttResult.duration,
            translations: [],
            audioUrl,
          };
        }

        // 4. Translate to all target languages in parallel
        const langNames: Record<string, string> = {
          ko: "Korean", zh: "Chinese", en: "English", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", es: "Spanish", fr: "French",
          de: "German", ar: "Arabic", hi: "Hindi", pt: "Portuguese",
          ru: "Russian", id: "Indonesian", tr: "Turkish",
        };
        const sourceLangName = langNames[input.sourceLanguage] || input.sourceLanguage;

        const translations = await Promise.all(
          input.targetLanguages.map(async (targetLang) => {
            const targetLangName = langNames[targetLang] || targetLang;
            try {
              const llmResponse = await invokeLLM({
                messages: [
                  {
                    role: "system",
                    content: `You are a professional real-time interpreter. Translate the following ${sourceLangName} lecture content to ${targetLangName}. Maintain the original meaning, tone, and technical terminology. Provide ONLY the translation without any explanation.`,
                  },
                  { role: "user", content: sourceText },
                ],
              });
              const translatedText = (llmResponse.choices?.[0]?.message?.content as string || "").trim();

              // Save segment to DB if session is active
              if (input.sessionId) {
                try {
                  await db.addTranslationSegment({
                    sessionId: input.sessionId,
                    sourceText,
                    translatedText,
                    sourceLanguage: input.sourceLanguage,
                    targetLanguage: targetLang,
                    startTimeSec: 0,
                    endTimeSec: sttResult.duration ?? 0,
                  });
                } catch (_) { /* ignore DB errors for real-time flow */ }
              }

              return { language: targetLang, languageName: targetLangName, text: translatedText, success: true };
            } catch (err) {
              return { language: targetLang, languageName: targetLangName, text: "", success: false, error: err instanceof Error ? err.message : "Translation failed" };
            }
          })
        );

        return {
          sourceText,
          detectedLanguage: sttResult.language,
          duration: sttResult.duration,
          translations,
          audioUrl,
        };
      }),
  }),

  // ============ v12.3 - Collaboration ============
  collaboration: router({
    // Search user by email
    searchUser: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const user = await db.findUserByEmail(input.email);
        return user;
      }),

    // Invite collaborator to project
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email(),
     role: z.enum(["presenter", "editor", "viewer"]).default("editor"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only project owner can invite
       const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can invite" });
        }
        // Find user to invite
        const targetUser = await db.findUserByEmail(input.email);
        if (!targetUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No user found with this email" });
        }
        if (targetUser.id === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot invite yourself" });
        }
        // Check if user is already invited
        const existing = await db.getProjectCollaborators(input.projectId);
        if (existing.some(c => c.userId === targetUser.id)) {
          throw new TRPCError({ code: "CONFLICT", message: "User already invited" });
        }
        const id = await db.addCollaborator({
          projectId: input.projectId,
          userId: targetUser.id,
          role: input.role,
          invitedBy: ctx.user.id,
          inviteStatus: "pending",
          inviteEmail: input.email,
        });
        // Send notification to invitee
        try {
          await db.createNotification({
            userId: targetUser.id,
            type: "system",
            title: "Collaboration Invite",
            message: `${ctx.user.name || 'User'} invited you as ${input.role === 'presenter' ? 'presenter' : input.role === 'editor' ? 'editor' : 'viewer'} to project "${project.title || 'Untitled'}".`,
            link: "/lecture-builder",
          });
        } catch (_) { /* Ignore notification failure */ }
        return { id, userName: targetUser.name };
      }),

    // List project collaborators
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Only owner or collaborators can view
        const project = await db.getLectureProject(input.projectId);
        if (!project) throw new TRPCError({ code: "NOT_FOUND" });
        const isOwner = project.userId === ctx.user.id;
        const isCollab = await db.isProjectCollaborator(input.projectId, ctx.user.id);
        if (!isOwner && !isCollab) throw new TRPCError({ code: "FORBIDDEN" });
        const collaborators = await db.getProjectCollaborators(input.projectId);
        // Include owner as first entry with isMe flag
        const ownerUser = await db.getUserById(project.userId);
        const ownerEntry = {
          id: 0,
          projectId: input.projectId,
          userId: project.userId,
          role: "owner" as const,
          inviteStatus: "accepted" as const,
          inviteEmail: ownerUser?.email || null,
          createdAt: project.createdAt,
          userName: ownerUser?.name || "Owner",
          userEmail: ownerUser?.email || null,
          userAvatar: ownerUser?.avatarUrl || null,
          isMe: project.userId === ctx.user.id,
        };
        return [ownerEntry, ...collaborators.map(c => ({ ...c, isMe: c.userId === ctx.user.id }))];
      }),

    // List my collaborative projects
    myCollaborations: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getMyCollaborations(ctx.user.id);
      }),

    // List received invitations
    pendingInvitations: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getPendingInvitations(ctx.user.id);
      }),

    // Accept/decline invitation
    respondToInvite: protectedProcedure
      .input(z.object({
        inviteId: z.number(),
        accept: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get invitation info (for notification)
        const dbConn = await db.getDb();
        let inviterUserId: number | null = null;
        let projectTitle = "";
        if (dbConn) {
          const rows = await dbConn.select({
            invitedBy: projectCollaborators.invitedBy,
            projectId: projectCollaborators.projectId,
          }).from(projectCollaborators).where(eq(projectCollaborators.id, input.inviteId)).limit(1);
          if (rows[0]) {
            inviterUserId = rows[0].invitedBy;
            const project = await db.getLectureProject(rows[0].projectId);
            projectTitle = project?.title || "Untitled";
          }
        }

        await db.updateCollaboratorStatus(input.inviteId, input.accept ? "accepted" : "rejected");

        // Send accept/decline notification to inviter
        if (inviterUserId) {
          try {
            await db.createNotification({
              userId: inviterUserId,
              type: "system",
              title: input.accept ? "Collaboration invite accepted" : "Collaboration invite declined",
              message: `${ctx.user.name || 'User'} ${input.accept ? 'accepted' : 'declined'} the collaboration invite for project "${projectTitle}".`,
              link: "/lecture-builder",
            });
          } catch (_) { /* Ignore notification failure */ }
        }

        return { success: true };
      }),

    // Remove collaborator (owner only)
    remove: protectedProcedure
      .input(z.object({ collaboratorId: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can remove members" });
        }
        await db.removeCollaborator(input.collaboratorId);
        return { success: true };
      }),

    // Change collaborator role (owner only)
    updateRole: protectedProcedure
      .input(z.object({
        collaboratorId: z.number(),
        projectId: z.number(),
        role: z.enum(["presenter", "editor", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await dbConn.update(projectCollaborators)
          .set({ role: input.role })
          .where(eq(projectCollaborators.id, input.collaboratorId));
        return { success: true };
      }),
  }),

  // ============ Voice Clones (v12.6) =============
  voiceClone: router({
    /** Upload voice sample, analyze with AI, and create clone with matched voice */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        audioData: z.string(), // base64
        fileName: z.string(),
        language: z.string().default("ko"),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Decode base64 and upload to S3
        const buffer = Buffer.from(input.audioData, "base64");
        const ext = input.fileName.split(".").pop() || "mp3";
        const key = `voice-clones/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const mimeType = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : ext === "webm" ? "audio/webm" : ext === "ogg" ? "audio/ogg" : `audio/${ext}`;
        const { url } = await storagePut(key, buffer, mimeType);

        // 2. Create DB record with "processing" status
        const id = await db.createVoiceClone({
          userId: ctx.user.id,
          name: input.name,
          sampleUrl: url,
          language: input.language,
          description: input.description,
        });
        if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create voice clone record" });

        // 3. AI Voice Analysis - analyze the uploaded sample to find best matching Gemini voice
        try {
          const { GEMINI_VOICES } = await import("./_core/geminiTts");
          const { transcribeAudio } = await import("./_core/voiceTranscription");

          // Transcribe to detect language and get audio characteristics
          const transcription = await transcribeAudio({ audioUrl: url, language: input.language });
          const detectedLang = ("language" in transcription && transcription.language) || input.language;

          // Use LLM to analyze voice characteristics from the audio sample
          const voiceListStr = GEMINI_VOICES.map(v => 
            `${v.id}: ${v.gender}, ${v.style} (${v.desc})`
          ).join("\n");

          const analysisPrompt = `You are a voice analysis expert. Analyze the following voice sample information and match it to the best Gemini TTS voice.

Voice sample info:
- File format: ${ext}
- Language: ${detectedLang}
- Transcribed text: ${"text" in transcription ? (transcription as any).text?.slice(0, 200) : "(transcription unavailable)"}
- User description: ${input.description || "none"}
- Clone name: ${input.name}

Available Gemini voices:
${voiceListStr}

Based on the clone name, description, and detected language, select the BEST matching Gemini voice ID.
Also provide a voice analysis.

Respond in JSON format:
{
  "matchedVoiceId": "<Gemini voice ID>",
  "gender": "male" or "female",
  "tone": "<description of tone>",
  "style": "<speaking style>",
  "confidence": 0.0-1.0,
  "reason": "<why this voice was selected>"
}`;

          const { invokeLLM } = await import("./_core/llm");
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a voice analysis AI. Always respond with valid JSON only." },
              { role: "user", content: analysisPrompt },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "voice_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    matchedVoiceId: { type: "string", description: "Gemini voice ID" },
                    gender: { type: "string", description: "male or female" },
                    tone: { type: "string", description: "Voice tone description" },
                    style: { type: "string", description: "Speaking style" },
                    confidence: { type: "number", description: "Confidence score 0-1" },
                    reason: { type: "string", description: "Reason for selection" },
                  },
                  required: ["matchedVoiceId", "gender", "tone", "style", "confidence", "reason"],
                  additionalProperties: false,
                },
              },
            },
          });

          let analysis: any = {};
          try {
            analysis = JSON.parse((llmResponse.choices[0]?.message?.content as string) || "{}");
          } catch { analysis = { matchedVoiceId: "Kore", gender: "female", tone: "neutral", style: "firm", confidence: 0.5, reason: "Default fallback" }; }

          // Validate matched voice exists
          const matchedVoice = GEMINI_VOICES.find(v => v.id === analysis.matchedVoiceId);
          const finalVoiceId = matchedVoice ? analysis.matchedVoiceId : "Kore";

          // 4. Update clone with analysis results
          await db.updateVoiceClone(id, {
            status: "ready",
            cloneVoiceId: `clone-${ctx.user.id}-${id}`,
            matchedVoiceId: finalVoiceId,
            voiceAnalysis: JSON.stringify(analysis),
          });

          return { id, sampleUrl: url, matchedVoiceId: finalVoiceId, analysis };
        } catch (err: any) {
          // If analysis fails, still mark as ready with default voice
          console.error("Voice analysis error:", err?.message);
          await db.updateVoiceClone(id, {
            status: "ready",
            cloneVoiceId: `clone-${ctx.user.id}-${id}`,
            matchedVoiceId: "Kore",
            voiceAnalysis: JSON.stringify({ matchedVoiceId: "Kore", gender: "female", tone: "neutral", style: "firm", confidence: 0.3, reason: "Fallback due to analysis error: " + (err?.message || "") }),
          });
          return { id, sampleUrl: url, matchedVoiceId: "Kore", analysis: null };
        }
      }),

    /** List user's voice clones */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getVoiceClonesByUser(ctx.user.id);
    }),

    /** Get single voice clone */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const clone = await db.getVoiceCloneById(input.id);
        if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        return clone;
      }),

    /** Update voice clone metadata */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clone = await db.getVoiceCloneById(input.id);
        if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const { id, ...data } = input;
        await db.updateVoiceClone(id, data as any);
        return { success: true };
      }),

    /** Delete voice clone */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const clone = await db.getVoiceCloneById(input.id);
        if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        await db.deleteVoiceClone(input.id);
        return { success: true };
      }),

    /** Preview cloned voice with TTS - uses matched Gemini voice */
    preview: protectedProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().min(1).max(500),
        speed: z.number().min(0.5).max(2.0).optional(),
        pitch: z.number().min(-12).max(12).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clone = await db.getVoiceCloneById(input.id);
        if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (clone.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "Voice clone is not ready yet" });

        // Use the AI-matched Gemini voice for TTS
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const voiceId = clone.matchedVoiceId || "Kore";
        const result = await generateGeminiTts({
          text: input.text,
          voiceId,
          speed: input.speed,
          pitch: input.pitch,
          _userId: ctx.user.id,
        });

        if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as any).error || "TTS generation failed" });

        const key = `voice-clone-preview/${ctx.user.id}/${Date.now()}.mp3`;
        const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");
        return { audioUrl: url, voiceName: clone.name, matchedVoiceId: voiceId };
      }),

    /** Generate full TTS for a script using cloned voice with speed/pitch */
    generateTTS: protectedProcedure
      .input(z.object({
        cloneId: z.number(),
        text: z.string().min(1).max(5000),
        speed: z.number().min(0.5).max(2.0).optional(),
        pitch: z.number().min(-12).max(12).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clone = await db.getVoiceCloneById(input.cloneId);
        if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        if (clone.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "Voice clone is not ready" });

        const { generateGeminiTts } = await import("./_core/geminiTts");
        const voiceId = clone.matchedVoiceId || "Kore";
        const result = await generateGeminiTts({
          text: input.text,
          voiceId,
          speed: input.speed,
          pitch: input.pitch,
          _userId: ctx.user.id,
        });

        if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as any).error || "TTS generation failed" });

        const key = `voice-clone-tts/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
        const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");
        return { audioUrl: url, voiceName: clone.name, matchedVoiceId: voiceId };
      }),

    /** Test voice: generate TTS with a specific preset voice for comparison */
    testVoice: protectedProcedure
      .input(z.object({
        voiceId: z.string(),
        text: z.string().min(1).max(500),
        speed: z.number().min(0.5).max(2.0).optional(),
        pitch: z.number().min(-12).max(12).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { generateGeminiTts } = await import("./_core/geminiTts");
        const result = await generateGeminiTts({
          text: input.text,
          voiceId: input.voiceId,
          speed: input.speed,
          pitch: input.pitch,
          _userId: ctx.user.id,
        });

        if ("error" in result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (result as any).error || "TTS generation failed" });

        const key = `voice-test/${ctx.user.id}/${Date.now()}.mp3`;
        const { url } = await storagePut(key, (result as any).audioBuffer, "audio/mpeg");
        return { audioUrl: url, voiceId: input.voiceId };
      }),

    /** Get available voice presets (5 curated default voices) */
    presets: publicProcedure.query(() => {
      return [
        { id: "Kore", name: "Kore", style: "Firm", gender: "female" as const, desc: "Calm and professional", emoji: "\uD83D\uDC69\u200D\uD83C\uDFEB", color: "blue" },
        { id: "Puck", name: "Puck", style: "Upbeat", gender: "male" as const, desc: "Clear and objective", emoji: "\uD83D\uDCFA", color: "slate" },
        { id: "Aoede", name: "Aoede", style: "Breezy", gender: "female" as const, desc: "Fresh and friendly", emoji: "\uD83C\uDF1F", color: "emerald" },
        { id: "Charon", name: "Charon", style: "Informative", gender: "male" as const, desc: "Deep and authoritative", emoji: "\uD83C\uDFA4", color: "violet" },
        { id: "Sulafat", name: "Sulafat", style: "Warm", gender: "female" as const, desc: "Warm and empathetic", emoji: "\u2764\uFE0F", color: "rose" },
      ];
    }),
  }),
  // ========== Voice Effect Presets ==========
  voiceEffectPreset: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        voiceId: z.string().min(1),
        speed: z.number().min(0.5).max(2.0),
        pitch: z.number().min(-12).max(12),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVoiceEffectPreset({
          userId: ctx.user.id,
          name: input.name,
          voiceId: input.voiceId,
          speed: input.speed,
          pitch: input.pitch,
          description: input.description ?? null,
        });
        return { id };
      }),
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listVoiceEffectPresets(ctx.user.id);
    }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVoiceEffectPreset(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Publish/unpublish a preset to the community */
    publish: protectedProcedure
      .input(z.object({ id: z.number(), isPublic: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.publishPreset(input.id, ctx.user.id, input.isPublic, ctx.user.name || "Anonymous");
        return { success: true };
      }),
    /** Get community presets (public, sorted) */
    community: publicProcedure
      .input(z.object({
        sortBy: z.enum(["popular", "newest", "mostUsed"]).default("popular"),
        search: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const presets = await db.getCommunityPresets(input?.sortBy || "popular", input?.search);
        const likedIds = ctx.user ? await db.getUserPresetLikes(ctx.user.id) : [];
        return presets.map(p => ({ ...p, isLiked: likedIds.includes(p.id) }));
      }),
    /** Toggle like on a preset */
    like: protectedProcedure
      .input(z.object({ presetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const liked = await db.togglePresetLike(ctx.user.id, input.presetId);
        return { liked };
      }),
    /** Copy a community preset to own collection */
    copy: protectedProcedure
      .input(z.object({ presetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.copyPreset(input.presetId, ctx.user.id);
        return { id };
      }),
  }),
  // ========== Voice Clone Multi-Sample ==========
  voiceCloneSample: router({
    /** Add an additional sample to an existing voice clone */
    add: protectedProcedure
      .input(z.object({
        voiceCloneId: z.number(),
        audioData: z.string(), // base64
        fileName: z.string(),
        durationSec: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload to S3
        const buffer = Buffer.from(input.audioData, "base64");
        const key = `voice-samples/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, "audio/webm");
        // Get current sample count for ordering
        const existing = await db.getVoiceCloneSamples(input.voiceCloneId);
        const id = await db.addVoiceCloneSample({
          voiceCloneId: input.voiceCloneId,
          userId: ctx.user.id,
          sampleUrl: url,
          durationSec: input.durationSec || null,
          orderIndex: existing.length,
        });
        return { id, sampleUrl: url };
      }),
    /** List all samples for a voice clone */
    list: protectedProcedure
      .input(z.object({ voiceCloneId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getVoiceCloneSamples(input.voiceCloneId);
      }),
    /** Delete a sample */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVoiceCloneSample(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Analyze all samples combined for better voice matching */
    analyzeCombined: protectedProcedure
      .input(z.object({ voiceCloneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const samples = await db.getVoiceCloneSamples(input.voiceCloneId);
        if (samples.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No samples to analyze" });
        // Analyze each sample with LLM (audio analysis)
        const sampleAnalyses: string[] = [];
        for (const sample of samples) {
          try {
            const resp = await invokeLLM({
              messages: [
                { role: "system", content: `You are a voice analysis expert. Analyze this audio sample and describe the voice characteristics in JSON format: { "gender": "male|female", "ageRange": "young|middle|senior", "tone": "warm|cool|neutral", "pitch": "high|medium|low", "speed": "fast|medium|slow", "style": "professional|casual|energetic|calm", "accent": "description", "quality": 1-10 }` },
                { role: "user", content: [{ type: "file_url" as const, file_url: { url: sample.sampleUrl, mime_type: "audio/mpeg" as const } }] },
              ],
            });
            const content = resp.choices?.[0]?.message?.content;
            if (typeof content === "string") {
              sampleAnalyses.push(content);
              await db.updateVoiceCloneSampleAnalysis(sample.id, content);
            }
          } catch (e) {
            console.error("Sample analysis error:", e);
          }
        }
        // Combine analyses with LLM
        const combinedResp = await invokeLLM({
          messages: [
            { role: "system", content: `You are a voice matching expert. Given multiple voice sample analyses, determine the BEST matching Gemini TTS voice. Available voices: Kore (female, firm, professional), Puck (male, upbeat, clear), Aoede (female, breezy, friendly), Charon (male, informative, deep), Sulafat (female, warm, empathetic), Fenrir (male, excitable, energetic), Leda (female, youthful, bright), Orus (male, firm, authoritative). Return JSON: { "matchedVoiceId": "voiceName", "confidence": 0-100, "combinedAnalysis": { "gender": "...", "tone": "...", "style": "...", "averagePitch": "...", "averageSpeed": "..." }, "reasoning": "why this voice matches" }` },
            { role: "user", content: `Here are ${sampleAnalyses.length} voice sample analyses:\n${sampleAnalyses.map((a, i) => `Sample ${i + 1}: ${a}`).join("\n")}` },
          ],
        });
        const combinedContent = combinedResp.choices?.[0]?.message?.content;
        let matchedVoiceId = "Kore";
        let analysisResult = combinedContent;
        if (typeof combinedContent === "string") {
          try {
            const jsonMatch = combinedContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.matchedVoiceId) matchedVoiceId = parsed.matchedVoiceId;
            }
          } catch (e) { /* use default */ }
        }
        // Update the voice clone with combined analysis
        await db.updateVoiceClone(input.voiceCloneId, {
          matchedVoiceId,
          voiceAnalysis: typeof analysisResult === "string" ? analysisResult : JSON.stringify(analysisResult),
          status: "ready",
        });
        return { matchedVoiceId, analysis: analysisResult, sampleCount: samples.length };
      }),
    /** Real-time analysis of a single audio sample (quick analysis without saving) */
    analyzeRealtime: protectedProcedure
      .input(z.object({
        audioData: z.string(), // base64
        fileName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload temporarily to S3 for LLM analysis
        const buffer = Buffer.from(input.audioData, "base64");
        const key = `voice-realtime/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, "audio/webm");
        // Quick AI analysis
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: `You are a voice analysis expert. Analyze this audio and return a JSON object with: { "gender": "male|female", "ageRange": "young|middle|senior", "tone": "warm|cool|neutral", "pitch": "high|medium|low", "pitchHz": number, "speed": "fast|medium|slow", "speedWpm": number, "style": "professional|casual|energetic|calm", "clarity": 1-10, "emotion": "neutral|happy|serious|excited", "bestMatchVoice": "one of: Kore, Puck, Aoede, Charon, Sulafat, Fenrir, Leda, Orus", "matchConfidence": 0-100, "waveformDescription": "brief description of the audio waveform characteristics" }` },
            { role: "user", content: [{ type: "file_url" as const, file_url: { url, mime_type: "audio/mpeg" as const } }] },
          ],
        });
        const content = resp.choices?.[0]?.message?.content;
        let analysis: Record<string, unknown> = {};
        if (typeof content === "string") {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
          } catch (e) { analysis = { raw: content }; }
        }
        return { analysis, audioUrl: url };
      }),
  }),
  // ========== User Custom Avatars ==========
  userAvatar: router({
    /** List all custom avatars for the current user (with sort option) */
    list: protectedProcedure
      .input(z.object({ sortBy: z.enum(["favorite", "recent", "name", "created"]).default("favorite") }).optional())
      .query(async ({ ctx, input }) => {
        const sortBy = input?.sortBy || "favorite";
        return db.listUserAvatarsSorted(ctx.user.id, sortBy);
      }),
    /** Toggle favorite status of a custom avatar */
    toggleFavorite: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const newVal = await db.toggleUserAvatarFavorite(input.id, ctx.user.id);
        return { isFavorite: newVal };
      }),
    /** Record avatar usage (called when avatar is selected for a project) */
    recordUsage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.recordUserAvatarUsage(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Create a new custom avatar (upload photo or AI-generated) */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        imageData: z.string(), // base64
        fileName: z.string(),
        mimeType: z.string().default("image/png"),
        type: z.enum(["photo", "ai", "custom"]).default("photo"),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageData, "base64");
        const fileKey = `user-avatars/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const id = await db.createUserAvatar({
          userId: ctx.user.id,
          name: input.name,
          imageUrl: url,
          fileKey,
          type: input.type,
          description: input.description || null,
        });
        return { id, imageUrl: url };
      }),
    /** Update a custom avatar */
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateUserAvatar(id, ctx.user.id, data);
        return { success: true };
      }),
    /** Delete a custom avatar */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteUserAvatar(input.id, ctx.user.id);
        return { success: true };
      }),
    /** Generate AI avatar face from text prompt */
    generateFace: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(500),
        name: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const fullPrompt = `Professional headshot portrait photo of ${input.prompt}. Clean background, high quality, photorealistic, suitable for use as a video presenter avatar. Front-facing, well-lit, neutral expression, shoulders visible.`;
        const { url: generatedUrl } = await generateImage({ prompt: fullPrompt });
        if (!generatedUrl) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed. Please try again." });
        }
        // Download generated image and save to S3
        const response = await fetch(generatedUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileKey = `user-avatars/${ctx.user.id}/ai-${nanoid()}.png`;
        const { url } = await storagePut(fileKey, buffer, "image/png");
        const id = await db.createUserAvatar({
          userId: ctx.user.id,
          name: input.name,
          imageUrl: url,
          fileKey,
          type: "ai",
          description: input.prompt,
        });
        return { id, imageUrl: url };
      }),
    /** Create a D-ID talking avatar preview video */
    createDidPreview: protectedProcedure
      .input(z.object({
        imageUrl: z.string().url(),
        text: z.string().min(1).max(1000),
        voiceId: z.string().default("en-US-JennyNeural"),
        voiceProvider: z.enum(["microsoft", "amazon"]).default("microsoft"),
      }))
      .mutation(async ({ ctx, input }) => {
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "D-ID API key is not configured. Please contact the administrator." });
        }
        try {
          const didResponse = await fetch("https://api.d-id.com/talks", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${didApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source_url: input.imageUrl,
              script: {
                type: "text",
                input: input.text,
                provider: {
                  type: input.voiceProvider,
                  voice_id: input.voiceId,
                },
              },
              config: { stitch: true, result_format: "mp4" },
            }),
          });
          if (!didResponse.ok) {
            const errBody = await didResponse.text();
            console.error("[D-ID] Create talk failed:", errBody);
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `D-ID API error: ${didResponse.status}` });
          }
          const didData = await didResponse.json() as any;
          return { talkId: didData.id, status: didData.status };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          console.error("[D-ID] API error:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create D-ID video" });
        }
      }),
    /** Poll D-ID talk status and get result video URL */
    getDidPreviewStatus: protectedProcedure
      .input(z.object({ talkId: z.string() }))
      .query(async ({ ctx, input }) => {
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "D-ID API key is not configured." });
        }
        try {
          const response = await fetch(`https://api.d-id.com/talks/${input.talkId}`, {
            headers: { "Authorization": `Basic ${didApiKey}` },
          });
          if (!response.ok) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `D-ID status check failed: ${response.status}` });
          }
          const data = await response.json() as any;
          let videoUrl: string | null = null;
          if (data.status === "done" && data.result_url) {
            // Upload to S3 to prevent D-ID URL expiration
            try {
              const videoResponse = await fetch(data.result_url);
              if (videoResponse.ok) {
                const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                const videoKey = `did-previews/${ctx.user.id}/${input.talkId}-${Date.now()}.mp4`;
                const { url: s3Url } = await storagePut(videoKey, videoBuffer, "video/mp4");
                videoUrl = s3Url;
              } else {
                videoUrl = data.result_url;
              }
            } catch {
              videoUrl = data.result_url;
            }
          }
          return { status: data.status as string, videoUrl, error: data.error?.description || null };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to check D-ID status" });
        }
      }),
    /** Check D-ID API key validity and remaining credits */
    checkDidCredits: protectedProcedure
      .query(async () => {
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) return { available: false, credits: 0 };
        try {
          const response = await fetch("https://api.d-id.com/credits", {
            headers: { "Authorization": `Basic ${didApiKey}` },
          });
          if (response.ok) {
            const data = await response.json() as any;
            return { available: true, credits: data.remaining || 0 };
          }
          return { available: false, credits: 0 };
        } catch {
          return { available: false, credits: 0 };
        }
      }),
  }),
  // ========== D-ID Video History ==========
  didHistory: router({
    /** List all DID videos for the current user */
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return db.listDidVideoHistory(ctx.user.id, input?.limit || 50);
      }),
    /** Get a single DID video by ID */
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getDidVideoById(input.id, ctx.user.id);
      }),
    /** Create a DID video and start generation */
    create: protectedProcedure
      .input(z.object({
        avatarImageUrl: z.string().url(),
        avatarName: z.string().optional(),
        spokenText: z.string().min(1).max(2000),
        voiceId: z.string().default("en-US-JennyNeural"),
        voiceProvider: z.enum(["microsoft", "amazon"]).default("microsoft"),
        scriptId: z.number().optional(),
        sectionIndex: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "D-ID API key is not configured." });
        }
        // Create DB record first
        const recordId = await db.createDidVideoRecord({
          userId: ctx.user.id,
          avatarImageUrl: input.avatarImageUrl,
          avatarName: input.avatarName || null,
          spokenText: input.spokenText,
          voiceId: input.voiceId,
          voiceProvider: input.voiceProvider,
          status: "pending",
          scriptId: input.scriptId || null,
          sectionIndex: input.sectionIndex ?? null,
        });
        if (!recordId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create record" });
        // Call D-ID API
        try {
          const didResponse = await fetch("https://api.d-id.com/talks", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${didApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source_url: input.avatarImageUrl,
              script: {
                type: "text",
                input: input.spokenText,
                provider: { type: input.voiceProvider, voice_id: input.voiceId },
              },
              config: { stitch: true, result_format: "mp4" },
            }),
          });
          if (!didResponse.ok) {
            const errBody = await didResponse.text();
            console.error("[D-ID History] Create talk failed:", errBody);
            await db.updateDidVideoRecord(recordId, ctx.user.id, { status: "error", errorMessage: `D-ID API error: ${didResponse.status}` });
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `D-ID API error: ${didResponse.status}` });
          }
          const didData = await didResponse.json() as any;
          await db.updateDidVideoRecord(recordId, ctx.user.id, { didTalkId: didData.id, status: "processing" });
          return { id: recordId, talkId: didData.id, status: "processing" };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          await db.updateDidVideoRecord(recordId, ctx.user.id, { status: "error", errorMessage: error.message });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create D-ID video" });
        }
      }),
    /** Poll status and finalize video */
    pollStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const record = await db.getDidVideoById(input.id, ctx.user.id);
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        if (record.status === "done" || record.status === "error") return record;
        if (!record.didTalkId) return record;
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) return record;
        try {
          const response = await fetch(`https://api.d-id.com/talks/${record.didTalkId}`, {
            headers: { "Authorization": `Basic ${didApiKey}` },
          });
          if (!response.ok) return record;
          const data = await response.json() as any;
          if (data.status === "done" && data.result_url) {
            let videoUrl = data.result_url;
            let videoFileKey: string | null = null;
            try {
              const videoResponse = await fetch(data.result_url);
              if (videoResponse.ok) {
                const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
                const key = `did-history/${ctx.user.id}/${record.didTalkId}-${Date.now()}.mp4`;
                const { url: s3Url } = await storagePut(key, videoBuffer, "video/mp4");
                videoUrl = s3Url;
                videoFileKey = key;
              }
            } catch { /* fallback to D-ID URL */ }
            await db.updateDidVideoRecord(record.id, ctx.user.id, {
              status: "done",
              videoUrl,
              videoFileKey,
              durationSec: data.duration ? Math.round(data.duration) : null,
            });
            return { ...record, status: "done" as const, videoUrl, videoFileKey, durationSec: data.duration ? Math.round(data.duration) : null };
          } else if (data.status === "error" || data.status === "rejected") {
            const errMsg = data.error?.description || "D-ID generation failed";
            await db.updateDidVideoRecord(record.id, ctx.user.id, { status: "error", errorMessage: errMsg });
            return { ...record, status: "error" as const, errorMessage: errMsg };
          }
          return record;
        } catch {
          return record;
        }
      }),
    /** Delete a DID video record */
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteDidVideo(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  // ========== DID Auto Lecture Pipeline ==========
  didPipeline: router({
    /** Generate DID videos for all sections of a script */
    generateAll: protectedProcedure
      .input(z.object({
        scriptId: z.number(),
        avatarImageUrl: z.string().url(),
        avatarName: z.string().optional(),
        voiceId: z.string().default("ko-KR-SunHiNeural"),
        voiceProvider: z.enum(["microsoft", "amazon"]).default("microsoft"),
      }))
      .mutation(async ({ ctx, input }) => {
        const didApiKey = process.env.DID_API_KEY;
        if (!didApiKey) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "D-ID API key is not configured." });
        }
        // Fetch script sections
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
        }
        let sections: Array<{ title?: string; content: string }> = [];
        try {
          // Use script.sections (JSON array) or fall back to scriptContent (full text)
          const rawSections = script.sections;
          if (rawSections) {
            const parsed = typeof rawSections === "string" ? JSON.parse(rawSections) : rawSections;
            if (Array.isArray(parsed)) {
              sections = parsed.map((s: any) => ({ title: s.title || s.heading, content: s.content || s.text || s.script || "" }));
            }
          }
          if (sections.length === 0 && script.scriptContent) {
            // Fall back to full script content as single section
            sections = [{ title: script.title || "Section 1", content: script.scriptContent }];
          }
        } catch {
          if (script.scriptContent) {
            sections = [{ title: script.title || "Section 1", content: script.scriptContent }];
          }
        }
        if (sections.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Script has no sections" });
        }
        // Create records and start generation for each section
        const results: Array<{ id: number; sectionIndex: number; talkId: string | null; status: string }> = [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          const text = section.content.substring(0, 2000); // D-ID text limit
          if (!text.trim()) continue;
          const recordId = await db.createDidVideoRecord({
            userId: ctx.user.id,
            avatarImageUrl: input.avatarImageUrl,
            avatarName: input.avatarName || null,
            spokenText: text,
            voiceId: input.voiceId,
            voiceProvider: input.voiceProvider,
            status: "pending",
            scriptId: input.scriptId,
            sectionIndex: i,
          });
          if (!recordId) continue;
          try {
            const didResponse = await fetch("https://api.d-id.com/talks", {
              method: "POST",
              headers: {
                "Authorization": `Basic ${didApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                source_url: input.avatarImageUrl,
                script: {
                  type: "text",
                  input: text,
                  provider: { type: input.voiceProvider, voice_id: input.voiceId },
                },
                config: { stitch: true, result_format: "mp4" },
              }),
            });
            if (didResponse.ok) {
              const didData = await didResponse.json() as any;
              await db.updateDidVideoRecord(recordId, ctx.user.id, { didTalkId: didData.id, status: "processing" });
              results.push({ id: recordId, sectionIndex: i, talkId: didData.id, status: "processing" });
            } else {
              await db.updateDidVideoRecord(recordId, ctx.user.id, { status: "error", errorMessage: `API error: ${didResponse.status}` });
              results.push({ id: recordId, sectionIndex: i, talkId: null, status: "error" });
            }
          } catch (error: any) {
            await db.updateDidVideoRecord(recordId, ctx.user.id, { status: "error", errorMessage: error.message });
            results.push({ id: recordId, sectionIndex: i, talkId: null, status: "error" });
          }
        }
        return { scriptId: input.scriptId, totalSections: sections.length, results };
      }),
    /** Get all DID videos for a specific script */
    getByScript: protectedProcedure
      .input(z.object({ scriptId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.listDidVideosByScript(input.scriptId, ctx.user.id);
      }),
  }),
});

// SRT time formatter
function formatSrtTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const ms = Math.round((totalSec % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

// Certificate HTML generator
function generateCertificateHtml(studentName: string, lectureTitle: string, code: string, completion: number): string {
  const date = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:40px;font-family:'Noto Sans KR',sans-serif;background:#f8f9fa}
    .cert{max-width:800px;margin:0 auto;background:white;border:3px solid #1a1a2e;padding:60px;text-align:center;position:relative}
    .cert::before{content:'';position:absolute;top:10px;left:10px;right:10px;bottom:10px;border:1px solid #e0e0e0}
    h1{color:#1a1a2e;font-size:36px;margin-bottom:10px;letter-spacing:4px}
    .subtitle{color:#6c63ff;font-size:14px;letter-spacing:8px;margin-bottom:40px}
    .name{font-size:32px;color:#1a1a2e;border-bottom:2px solid #6c63ff;display:inline-block;padding:10px 40px;margin:20px 0}
    .lecture{font-size:18px;color:#444;margin:20px 0}
    .completion{font-size:16px;color:#6c63ff;margin:10px 0}
    .date{color:#888;margin-top:30px}
    .code{font-family:monospace;color:#aaa;font-size:12px;margin-top:20px}
    .badge{display:inline-block;background:#6c63ff;color:white;padding:8px 24px;border-radius:20px;margin-top:20px;font-size:14px}
  </style></head><body><div class="cert">
    <h1>Certificate of Completion</h1>
    <div class="subtitle">CERTIFICATE OF COMPLETION</div>
    <p>This certifies that the following student has successfully completed the lecture.</p>
    <div class="name">${studentName}</div>
    <div class="lecture">「${lectureTitle}」</div>
    <div class="completion">Completion: ${completion}%</div>
    <div class="badge">AI Lecture Platform</div>
    <div class="date">${date}</div>
    <div class="code">Certificate Code: ${code}</div>
  </div></body></html>`;
}

// ============ SCORM Helper Functions ============

function generateScormManifest(title: string, version: string, sections: any[], language: string): string {
  const orgId = `ORG-${Date.now()}`;
  const itemId = `ITEM-${Date.now()}`;
  const resourceId = `RES-${Date.now()}`;
  
  if (version === "1.2") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${orgId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      ${sections.map((s: any, i: number) => `<item identifier="${itemId}-${i}" identifierref="${resourceId}"><title>${s.title || `Section ${i+1}`}</title></item>`).join('\n      ')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${orgId}" version="1.3"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      ${sections.map((s: any, i: number) => `<item identifier="${itemId}-${i}" identifierref="${resourceId}"><title>${s.title || `Section ${i+1}`}</title></item>`).join('\n      ')}
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resourceId}" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>`;
}

function generateScoHtml(title: string, pipeline: any, sections: any[], version: string, includeSubtitles: boolean): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; margin: 0; padding: 20px; background: #0f0f23; color: #e0e0e0; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #6c63ff; text-align: center; }
    .video-container { background: #1a1a2e; border-radius: 12px; padding: 20px; margin: 20px 0; }
    video { width: 100%; border-radius: 8px; }
    .sections { margin-top: 20px; }
    .section { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #6c63ff; }
    .section h3 { color: #6c63ff; margin: 0 0 8px 0; }
    .section p { margin: 0; line-height: 1.6; }
    .progress-bar { height: 4px; background: #333; border-radius: 2px; margin: 20px 0; }
    .progress-fill { height: 100%; background: #6c63ff; border-radius: 2px; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <div class="video-container">
      ${pipeline.finalVideoUrl ? `<video controls src="${pipeline.finalVideoUrl}"></video>` : '<p>Video is not ready.</p>'}
    </div>
    <div class="progress-bar"><div class="progress-fill" id="progress" style="width:0%"></div></div>
    <div class="sections">
      ${sections.map((s: any, i: number) => `<div class="section"><h3>${i+1}. ${s.title || ''}</h3><p>${s.content || ''}</p></div>`).join('')}
    </div>
  </div>
  <script>
    // SCORM ${version} API Communication
    var API = null;
    function findAPI(win) {
      var attempts = 0;
      while ((!win.${version === '1.2' ? 'API' : 'API_1484_11'}) && (win.parent) && (win.parent != win) && (attempts < 10)) {
        attempts++; win = win.parent;
      }
      return win.${version === '1.2' ? 'API' : 'API_1484_11'} || null;
    }
    API = findAPI(window);
    if (API) {
      API.${version === '1.2' ? 'LMSInitialize' : 'Initialize'}("");
      API.${version === '1.2' ? 'LMSSetValue' : 'SetValue'}("${version === '1.2' ? 'cmi.core.lesson_status' : 'cmi.completion_status'}", "incomplete");
    }
    // Track completion
    var sectionsViewed = new Set();
    document.querySelectorAll('.section').forEach(function(el, i) {
      new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) {
          sectionsViewed.add(i);
          var pct = (sectionsViewed.size / ${sections.length || 1}) * 100;
          document.getElementById('progress').style.width = pct + '%';
          if (pct >= 100 && API) {
            API.${version === '1.2' ? 'LMSSetValue' : 'SetValue'}("${version === '1.2' ? 'cmi.core.lesson_status' : 'cmi.completion_status'}", "completed");
            API.${version === '1.2' ? 'LMSCommit' : 'Commit'}("");
          }
        }
      }).observe(el);
    });
    window.onbeforeunload = function() { if (API) API.${version === '1.2' ? 'LMSFinish' : 'Terminate'}(""); };
  </script>
</body>
</html>`;
}

function generateXapiStatements(title: string, pipeline: any, sections: any[]): object[] {
  const activityId = `https://virtualspeaker.ai/lectures/${pipeline.id}`;
  return [
    {
      verb: { id: "http://adlnet.gov/expapi/verbs/launched", display: { "en-US": "launched" } },
      object: { id: activityId, definition: { name: { "ko": title }, type: "http://adlnet.gov/expapi/activities/course" } },
    },
    {
      verb: { id: "http://adlnet.gov/expapi/verbs/completed", display: { "en-US": "completed" } },
      object: { id: activityId, definition: { name: { "ko": title }, type: "http://adlnet.gov/expapi/activities/course" } },
      result: { completion: true, duration: `PT${pipeline.totalDurationSec || 0}S` },
    },
    ...sections.map((s: any, i: number) => ({
      verb: { id: "http://adlnet.gov/expapi/verbs/experienced", display: { "en-US": "experienced" } },
      object: {
        id: `${activityId}/section/${i}`,
        definition: { name: { "ko": s.title || `Section ${i+1}` }, type: "http://adlnet.gov/expapi/activities/module" },
      },
    })),
  ];
}

export type AppRouter = typeof appRouter;
