import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
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
    throw new TRPCError({ code: "FORBIDDEN", message: "강사 권한이 필요합니다." });
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
          throw new TRPCError({ code: "CONFLICT", message: "이미 등록된 이메일입니다." });
        }
        const passwordHash = await bcrypt.hash(input.password, 12);
        const userId = await db.createUserWithEmail({
          email: input.email,
          passwordHash,
          name: input.name,
        });
        const user = await db.getUserById(userId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "회원가입 실패" });
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
          throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다." });
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
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Google 인증에 실패했습니다." });
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
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "로그인 실패" });

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
          return { success: true, message: "등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다." };
        }
        // Generate a secure random token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.savePasswordResetToken(user.id, token, expiresAt);
        // In production, send email with reset link
        // For now, return token (development mode)
        console.log(`[Password Reset] Token for ${input.email}: ${token}`);
        return { success: true, message: "등록된 이메일이라면 비밀번호 재설정 링크가 발송됩니다.", resetToken: token };
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
          throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 재설정 토큰입니다." });
        }
        if (new Date() > resetRecord.expiresAt) {
          await db.deletePasswordResetToken(input.token);
          throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 재설정 토큰입니다. 다시 요청해주세요." });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(resetRecord.userId, passwordHash);
        await db.deletePasswordResetToken(input.token);
        return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." };
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
          throw new TRPCError({ code: "BAD_REQUEST", message: "비밀번호 변경이 불가능한 계정입니다." });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "현재 비밀번호가 올바르지 않습니다." });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(user.id, passwordHash);
        return { success: true, message: "비밀번호가 성공적으로 변경되었습니다." };
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
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND", message: "강의를 찾을 수 없습니다." });
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
        const systemPrompt = lecture?.aiContext || "당신은 Web3와 AI 전문 강사입니다. 학생의 질문에 정확하고 이해하기 쉽게 답변합니다.";

        // Apply voice modulation style if configured
        let styleInstruction = "";
        if (lecture?.voiceModProfileId) {
          const voiceMod = await db.getVoiceModProfileById(lecture.voiceModProfileId);
          if (voiceMod?.stylePrompt) {
            styleInstruction = `\n\n말투 지시: ${voiceMod.stylePrompt}`;
          }
          if (voiceMod?.speakingStyle) {
            const styleMap: Record<string, string> = {
              formal: "격식체로 정중하게", casual: "친근하고 편안하게", academic: "학술적이고 전문적으로",
              friendly: "따뜻하고 친절하게", authoritative: "권위있고 확신에 찬 어조로"
            };
            styleInstruction += `\n답변 스타일: ${styleMap[voiceMod.speakingStyle] || "자연스럽게"} 답변하세요.`;
          }
        }

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt + styleInstruction },
            { role: "user", content: input.content },
          ],
        });
        const rawAnswer = response.choices?.[0]?.message?.content;
        const answerContent = typeof rawAnswer === "string" ? rawAnswer : "죄송합니다, 답변을 생성하지 못했습니다.";
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
        const sampleText = `안녕하세요, 저는 ${voiceName}입니다. ${voiceDesc} 스타일로 AI 강의를 진행해 드리겠습니다.`;
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
                  { role: "system", content: `다음 텍스트를 지정된 말투로 변환하세요. 내용은 유지하되 말투만 변경합니다. 변환 지시: ${voiceMod.stylePrompt}\n스타일: ${voiceMod.speakingStyle}` },
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
                  if (statusData.status === "done" && statusData.result_url) { videoUrl = statusData.result_url; break; }
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
        if (!vod) throw new TRPCError({ code: "NOT_FOUND", message: "VOD를 찾을 수 없습니다." });
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
        const vodId = await db.createVodRecording({ lectureId: input.lectureId, title: `${lecture.title} - 녹화본`, description: lecture.description, messageCount: messages.length, snapshotCount: snapshots.length, status: "processing", startedAt: lecture.createdAt, endedAt: new Date() });
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
        const sampleText = input.sampleText || "안녕하세요, 저는 AI 강사입니다. 오늘 Web3에 대해 알아보겠습니다.";
        let textToSpeak = sampleText;
        // Apply style transformation
        if (profile.stylePrompt) {
          const styleResponse = await invokeLLM({
            messages: [
              { role: "system", content: `다음 텍스트를 지정된 말투로 변환하세요. 변환 지시: ${profile.stylePrompt}\n스타일: ${profile.speakingStyle}` },
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
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "강의 진도 70% 이상 달성해야 수료증을 발급받을 수 있습니다." });
        }
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: "NOT_FOUND" });
        const certificateCode = `CERT-${nanoid(12).toUpperCase()}`;
        const studentName = ctx.user.name || "수강생";
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
    list: instructorProcedure
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
        if (!templateId) throw new TRPCError({ code: "NOT_FOUND", message: "스크립트를 찾을 수 없습니다." });
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
        if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "템플릿을 찾을 수 없습니다." });

        // Increment usage
        await db.incrementScriptTemplateUsage(input.templateId);

        const structure = JSON.parse(template.structure);
        const durationMin = input.targetDurationMin || template.targetDurationMin || 10;
        const langMap: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
        const lang = langMap[input.language || "ko"] || "한국어";

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
            return `섹션 ${i + 1}: "${s.title}" - ${s.description || ""} (약 ${secDuration}초)`;
          }).join("\n");

          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `당신은 전문 강의 스크립트 작성가입니다. ${lang}로 작성하세요.
주어진 템플릿 구조에 맞춰 ${durationMin}분 분량의 강의 스크립트를 작성합니다.

템플릿 구조:\n${sectionPrompts}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "sections": [
    {
      "title": "섹션 제목",
      "content": "강사가 말할 전체 스크립트 텍스트 (자연스러운 구어체로)",
      "durationSec": 예상_초,
      "slideNotes": "이 섹션의 슬라이드에 표시할 핵심 키워드/요약"
    }
  ]
}`
              },
              { role: "user", content: `주제: ${input.title}\n상세 요청: ${input.prompt}\n카테고리: ${template.category}\n난이도: ${template.difficulty}\n목표 시간: ${durationMin}분` },
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "템플릿 기반 스크립트 생성에 실패했습니다." });
        }
      }),

    /** Seed built-in script templates */
    seedBuiltIn: instructorProcedure.mutation(async () => {
      const builtInTemplates = [
        {
          name: "기본 강의 (도입-본론-결론)",
          description: "가장 기본적인 3단계 강의 구조. 도입부에서 주제를 소개하고, 본론에서 핵심 내용을 전달하며, 결론에서 요약합니다.",
          category: "general" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "도입 - 주제 소개", description: "강의 주제와 학습 목표를 소개합니다.", durationPercent: 15, slideNotes: "주제 소개, 학습 목표" },
            { title: "본론 - 핵심 내용", description: "주요 개념과 이론을 상세히 설명합니다.", durationPercent: 60, slideNotes: "핵심 개념, 이론 설명" },
            { title: "결론 - 요약 및 정리", description: "핵심 내용을 요약하고 다음 학습 방향을 안내합니다.", durationPercent: 25, slideNotes: "요약, 핵심 포인트" },
          ]),
          sectionCount: 3,
          targetDurationMin: 10,
          tags: "기본,입문,3단계",
        },
        {
          name: "Q&A 포함 강의",
          description: "도입, 본론, 중간 Q&A, 심화 내용, 최종 Q&A 및 정리를 포함한 인터랙티브 강의 구조.",
          category: "general" as const,
          difficulty: "intermediate" as const,
          structure: JSON.stringify([
            { title: "도입 - 배경 설명", description: "주제의 배경과 중요성을 설명합니다.", durationPercent: 10, slideNotes: "배경, 중요성" },
            { title: "핵심 개념 설명", description: "기본 개념과 원리를 설명합니다.", durationPercent: 25, slideNotes: "기본 개념" },
            { title: "중간 Q&A - 개념 확인", description: "학습자의 이해도를 확인하는 질문과 답변 시간.", durationPercent: 10, slideNotes: "Q&A, 이해도 확인" },
            { title: "심화 내용", description: "고급 개념과 실제 적용 사례를 다룹니다.", durationPercent: 30, slideNotes: "심화, 사례" },
            { title: "최종 Q&A 및 정리", description: "전체 내용 요약과 최종 질의응답.", durationPercent: 25, slideNotes: "요약, 최종 Q&A" },
          ]),
          sectionCount: 5,
          targetDurationMin: 20,
          tags: "Q&A,인터랙티브,5단계",
        },
        {
          name: "실습형 워크숍",
          description: "이론 설명 후 단계별 실습을 진행하는 핸즈온 워크숍 구조.",
          category: "ai" as const,
          difficulty: "intermediate" as const,
          structure: JSON.stringify([
            { title: "개요 및 환경 설정", description: "실습 목표와 필요한 도구/환경을 안내합니다.", durationPercent: 10, slideNotes: "환경 설정, 도구 안내" },
            { title: "이론 배경", description: "실습에 필요한 핵심 이론을 간략히 설명합니다.", durationPercent: 15, slideNotes: "핵심 이론" },
            { title: "실습 Step 1", description: "첫 번째 실습 단계를 진행합니다.", durationPercent: 20, slideNotes: "실습 1단계" },
            { title: "실습 Step 2", description: "두 번째 실습 단계를 진행합니다.", durationPercent: 20, slideNotes: "실습 2단계" },
            { title: "실습 Step 3", description: "세 번째 실습 단계를 진행합니다.", durationPercent: 20, slideNotes: "실습 3단계" },
            { title: "결과 확인 및 마무리", description: "실습 결과를 확인하고 추가 학습 자료를 안내합니다.", durationPercent: 15, slideNotes: "결과 확인, 추가 자료" },
          ]),
          sectionCount: 6,
          targetDurationMin: 30,
          tags: "실습,워크숍,핸즈온,6단계",
        },
        {
          name: "Web3 프로젝트 분석",
          description: "Web3 프로젝트를 체계적으로 분석하는 구조. 프로젝트 개요, 기술 스택, 토크노믹스, 로드맵, 투자 관점 분석.",
          category: "web3" as const,
          difficulty: "advanced" as const,
          structure: JSON.stringify([
            { title: "프로젝트 개요", description: "프로젝트의 비전, 미션, 팀 소개.", durationPercent: 15, slideNotes: "비전, 미션, 팀" },
            { title: "기술 스택 분석", description: "사용된 블록체인, 합의 메커니즘, 스마트 컨트랙트 구조.", durationPercent: 20, slideNotes: "기술, 블록체인, 컨트랙트" },
            { title: "토크노믹스", description: "토큰 분배, 유틸리티, 인플레이션/디플레이션 메커니즘.", durationPercent: 20, slideNotes: "토큰, 분배, 유틸리티" },
            { title: "로드맵 및 파트너십", description: "개발 로드맵, 주요 파트너십, 생태계 확장 계획.", durationPercent: 20, slideNotes: "로드맵, 파트너" },
            { title: "투자 관점 분석", description: "SWOT 분석, 리스크 요인, 경쟁사 비교.", durationPercent: 25, slideNotes: "SWOT, 리스크, 경쟁" },
          ]),
          sectionCount: 5,
          targetDurationMin: 15,
          tags: "Web3,프로젝트분석,토크노믹스,5단계",
        },
        {
          name: "DeFi 프로토콜 튜토리얼",
          description: "DeFi 프로토콜 사용법을 단계별로 안내하는 튜토리얼 구조.",
          category: "defi" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "DeFi 기초 개념", description: "DeFi의 기본 개념과 전통 금융과의 차이점.", durationPercent: 15, slideNotes: "DeFi 기초, 차이점" },
            { title: "지갑 연결 및 준비", description: "메타마스크 설정, 네트워크 추가, 토큰 준비.", durationPercent: 15, slideNotes: "지갑, 메타마스크" },
            { title: "프로토콜 사용법", description: "스왑, 유동성 공급, 스테이킹 등 핵심 기능 사용법.", durationPercent: 30, slideNotes: "스왑, 유동성, 스테이킹" },
            { title: "수익률 계산 및 리스크", description: "APY/APR 이해, 임시 손실, 스마트 컨트랙트 리스크.", durationPercent: 25, slideNotes: "수익률, 리스크" },
            { title: "보안 팁 및 마무리", description: "피싱 방지, 승인 관리, 안전한 DeFi 사용법.", durationPercent: 15, slideNotes: "보안, 피싱 방지" },
          ]),
          sectionCount: 5,
          targetDurationMin: 15,
          tags: "DeFi,튜토리얼,프로토콜,5단계",
        },
        {
          name: "뉴스 브리핑 형식",
          description: "최신 뉴스를 빠르게 전달하는 브리핑 형식. 헤드라인, 상세 분석, 시장 영향, 전망.",
          category: "blockchain" as const,
          difficulty: "beginner" as const,
          structure: JSON.stringify([
            { title: "오늘의 헤드라인", description: "주요 뉴스 3-5개를 간략히 소개합니다.", durationPercent: 20, slideNotes: "헤드라인, 주요 뉴스" },
            { title: "심층 분석", description: "가장 중요한 뉴스를 상세히 분석합니다.", durationPercent: 35, slideNotes: "심층 분석" },
            { title: "시장 영향", description: "뉴스가 시장에 미치는 영향을 분석합니다.", durationPercent: 25, slideNotes: "시장 영향, 가격" },
            { title: "전망 및 정리", description: "향후 전망과 투자자 시사점을 정리합니다.", durationPercent: 20, slideNotes: "전망, 시사점" },
          ]),
          sectionCount: 4,
          targetDurationMin: 10,
          tags: "뉴스,브리핑,시장분석,4단계",
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
        const langMap: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
        const lang = langMap[input.language || "ko"] || "한국어";

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `당신은 전문 강의 스크립트 작성가입니다. ${lang}로 작성하세요.
주어진 주제에 대해 ${durationMin}분 분량의 강의 스크립트를 작성합니다.
${sectionCount}개의 섹션으로 나누어 작성하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "sections": [
    {
      "title": "섹션 제목",
      "content": "강사가 말할 전체 스크립트 텍스트 (자연스러운 구어체로)",
      "durationSec": 예상_초,
      "slideNotes": "이 섹션의 슬라이드에 표시할 핵심 키워드/요약"
    }
  ]
}`
              },
              { role: "user", content: `주제: ${input.title}\n상세 요청: ${input.prompt}\n카테고리: ${input.category || "web3"}\n난이도: ${input.difficulty || "beginner"}\n목표 시간: ${durationMin}분` },
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `스크립트 생성에 실패했습니다: ${error?.message || 'Unknown error'}` });
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
          const title = titleMatch ? titleMatch[1].substring(0, 100) : `섹션 ${idx + 1}`;
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
          prompt: `[직접 작성] ${input.title}`,
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
        if (input.sectionIndex >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "잘못된 섹션 인덱스" });

        const section = sections[input.sectionIndex];
        const langMap: Record<string, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
        const lang = langMap[script.language || "ko"] || "한국어";

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `당신은 전문 강의 스크립트 작성가입니다. ${lang}로 작성하세요.\n기존 섹션을 개선하여 다시 작성합니다.\n반드시 아래 JSON 형식으로만 응답하세요:\n{"title":"섹션 제목","content":"강사가 말할 스크립트","durationSec":예상초,"slideNotes":"핵심 키워드"}` },
            { role: "user", content: `기존 섹션 제목: ${section.title}\n기존 내용: ${section.content}\n${input.customPrompt ? `수정 요청: ${input.customPrompt}` : "더 자연스럽고 전문적으로 개선해주세요."}` },
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
        if (typeof rawContent !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM 응답 오류" });
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
        if (input.newOrder.length !== sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "섹션 수가 일치하지 않습니다." });

        const reordered = input.newOrder.map(idx => {
          if (idx < 0 || idx >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "잘못된 인덱스" });
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
          title: input.title || `섹션 ${sections.length + 1}`,
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
        if (input.sectionIndex >= sections.length) throw new TRPCError({ code: "BAD_REQUEST", message: "잘못된 섹션 인덱스" });
        if (sections.length <= 1) throw new TRPCError({ code: "BAD_REQUEST", message: "최소 1개 섹션이 필요합니다." });
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
        if (!versionId) throw new TRPCError({ code: "NOT_FOUND", message: "스크립트를 찾을 수 없습니다." });
        return { versionId };
      }),

    /** Rollback script to a specific version */
    rollback: instructorProcedure
      .input(z.object({ scriptId: z.number(), versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.rollbackScriptToVersion(input.scriptId, input.versionId, ctx.user.id);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "버전을 찾을 수 없습니다." });
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
        if (!script.scriptContent) throw new TRPCError({ code: "BAD_REQUEST", message: "스크립트 내용이 없습니다." });

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
                content: `당신은 교육 콘텐츠 품질 분석 전문가입니다. 강의 스크립트를 분석하여 다음 항목을 0-100점으로 평가하고 개선 제안을 제공하세요.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "scores": {
    "readability": 0-100,
    "difficulty": 0-100,
    "keyword": 0-100,
    "structure": 0-100,
    "engagement": 0-100
  },
  "analysis": {
    "readability": { "avgSentenceLength": number, "complexWords": number, "summary": "설명" },
    "difficulty": { "level": "beginner|intermediate|advanced", "appropriateness": "설명" },
    "keywords": { "topKeywords": ["키워드1", "키워드2", ...], "density": number, "summary": "설명" },
    "structure": { "sectionBalance": "설명", "hasIntro": boolean, "hasConclusion": boolean },
    "engagement": { "questionCount": number, "exampleCount": number, "summary": "설명" }
  },
  "metrics": {
    "totalWords": number,
    "uniqueWords": number,
    "avgSentenceLength": number,
    "sectionCount": number,
    "estimatedReadingTime": number
  },
  "suggestions": [
    { "category": "readability|difficulty|keyword|structure|engagement", "suggestion": "구체적 개선 제안", "priority": "high|medium|low" }
  ]
}`
              },
              {
                role: "user",
                content: `제목: ${script.title}\n카테고리: ${script.category}\n난이도: ${script.difficulty}\n섹션 수: ${sections.length}\n\n스크립트 내용:\n${script.scriptContent}`
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "분석 중 오류가 발생했습니다." });
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
  }),

  // ============ Production Pipeline (v2.1) ============
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
        if (!script || script.status !== "ready") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "스크립트가 준비되지 않았습니다." });

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
          currentStep: "TTS 음성 생성 중...",
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
                  { role: "system", content: `다음 텍스트를 지정된 말투로 변환하세요. 변환 지시: ${voiceModData.stylePrompt}\n스타일: ${voiceModData.speakingStyle}` },
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
            currentStep: `TTS 병렬 생성 중... (${sections.length}개 섹션)`,
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
              currentStep: `TTS 생성 중... (${Math.min(batch + CONCURRENCY, sections.length)}/${sections.length})`,
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
                currentStep: `${engineLabel} 아바타 영상 생성 중... (0/${audioUrls.length})`,
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
                    currentStep: `${engineLabel} 아바타 영상 생성 중... (${i + 1}/${audioUrls.length})`,
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
                  currentStep: `Seedance 2.0 ${label} 영상 생성 중...`,
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
            currentStep: "완료",
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
            currentStep: "오류 발생",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          });
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errMsg.includes("한도") ? "API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요." : `파이프라인 실행에 실패했습니다: ${errMsg}` });
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
        if (!pipeline) throw new TRPCError({ code: "NOT_FOUND", message: "파이프라인을 찾을 수 없습니다." });
        if (pipeline.pipeline.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const activeStatuses = ["queued", "script_gen", "tts_gen", "avatar_gen", "compositing"];
        if (!activeStatuses.includes(pipeline.pipeline.status)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "이미 완료되었거나 취소된 파이프라인입니다." });
        }
        // Mark as cancelled in DB - running async operations will check this flag
        await db.updateProductionPipeline(input.id, {
          status: "cancelled",
          currentStep: "사용자에 의해 취소됨",
          errorMessage: "사용자가 제작을 취소했습니다.",
          completedAt: new Date(),
        });
        return { success: true, message: "파이프라인이 취소되었습니다." };
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
              results.push({ scriptId: item.scriptId, pipelineId: null, status: "skipped", error: "스크립트가 준비되지 않았습니다." });
              continue;
            }

            const pipelineId = await db.createProductionPipeline({
              userId: ctx.user.id,
              scriptId: item.scriptId,
              title: item.title,
              status: "tts_gen",
              progressPercent: 10,
              currentStep: "TTS 음성 생성 중...",
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
              results.push({ scriptId: item.scriptId, pipelineId: null, status: "failed", error: "파이프라인 생성 실패" });
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
                    { role: "system", content: `다음 텍스트를 지정된 말투로 변환하세요. 변환 지시: ${voiceModData.stylePrompt}\n스타일: ${voiceModData.speakingStyle}` },
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
                currentStep: `TTS 생성 중... (${Math.min(batch + BATCH_CONCURRENCY, sections.length)}/${sections.length})`,
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
              currentStep: "완료",
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
            message: `썸네일 생성에 실패했습니다: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        if (pipelineData.pipeline.status !== "completed") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "파이프라인이 완료되지 않았습니다." });

        const audioUrls = pipelineData.pipeline.audioUrls ? JSON.parse(pipelineData.pipeline.audioUrls) : [];
        if (audioUrls.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "오디오 파일이 없습니다." });

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
              prompt: sections[i]?.title || "강의 내용",
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
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getLectureScriptById(input.scriptId);
        if (!script || script.status !== "ready") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "스크립트가 준비되지 않았습니다." });
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
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND", message: "방송을 찾을 수 없습니다." });
        const script = await db.getLectureScriptById(broadcast.scriptId);
        return { ...broadcast, script };
      }),

    /** Get broadcast by room code (public for joining) */
    getByRoom: publicProcedure
      .input(z.object({ roomCode: z.string() }))
      .query(async ({ input }) => {
        const broadcast = await db.getBroadcastByRoomCode(input.roomCode);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND", message: "방송방을 찾을 수 없습니다." });
        const script = await db.getLectureScriptById(broadcast.scriptId);
        return { ...broadcast, script };
      }),

    /** List currently live broadcasts (public) */
    liveList: publicProcedure.query(async () => {
      return db.getLiveBroadcasts();
    }),

    /** Start broadcasting */
    start: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast) throw new TRPCError({ code: "NOT_FOUND" });
        if (broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, {
          status: "live",
          startedAt: new Date(),
          currentSlideIndex: 0,
          isAudioPlaying: false,
          audioPosition: 0,
        });
        return { success: true };
      }),

    /** Pause broadcasting */
    pause: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, { status: "paused", isAudioPlaying: false });
        return { success: true };
      }),

    /** Resume broadcasting */
    resume: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, { status: "live" });
        return { success: true };
      }),

    /** End broadcasting */
    end: instructorProcedure
      .input(z.object({ broadcastId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await db.updateBroadcast(input.broadcastId, {
          status: "ended",
          endedAt: new Date(),
          isAudioPlaying: false,
        });
        return { success: true };
      }),

    /** Update slide state (instructor controls) */
    updateSlide: instructorProcedure
      .input(z.object({
        broadcastId: z.number(),
        slideIndex: z.number(),
        isAudioPlaying: z.boolean(),
        audioPosition: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const broadcast = await db.getBroadcastById(input.broadcastId);
        if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
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
        const displayName = ctx.user.name || "시청자";
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
        const displayName = ctx.user.name || "시청자";
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
        if (!voice) throw new TRPCError({ code: "NOT_FOUND", message: "음성을 찾을 수 없습니다." });
        // If already has a sample audio URL, return it
        if (voice.sampleAudioUrl) {
          return { audioUrl: voice.sampleAudioUrl };
        }
        // Generate a short demo TTS using Gemini
        const demoTexts: Record<string, string> = {
          ko: "안녕하세요, 저는 AI 강의 음성입니다. 이 목소리로 여러분의 강의를 더욱 생동감 있게 만들어 드리겠습니다.",
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
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "TTS 생성 실패" });
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
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "음성 미리듣기 생성에 실패했습니다." });
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
        if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "플랜을 찾을 수 없습니다." });
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
        feature: z.enum(["script_generation", "tts_conversion", "avatar_video", "deepfake_transform", "thumbnail_generation", "subtitle_generation", "voice_modulation", "live_broadcast"]),
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
            message: `크레딧이 부족합니다. 필요: ${cost}, 보유: ${currentCredits}`,
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
          description: `${input.feature} 사용`,
          resourceType: input.feature,
          resourceId: input.resourceId,
        });
        return { success: true, creditsUsed: cost, remaining: balanceAfter };
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
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 시스템이 설정되지 않았습니다." });
        const product = SUBSCRIPTION_PRODUCTS[input.planSlug as keyof typeof SUBSCRIPTION_PRODUCTS];
        if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 플랜입니다." });
        const priceCents = input.billingCycle === "yearly" ? product.priceYearly : product.priceMonthly;
        // Create payment record
        const paymentRecord = await db.createPayment({
          userId: ctx.user.id,
          paymentType: "subscription",
          paymentMethod: "stripe",
          amountCents: priceCents,
          currency: "usd",
          status: "pending",
          description: `${product.name} 구독 (${input.billingCycle})`,
          metadata: { planSlug: input.planSlug, billingCycle: input.billingCycle },
        });
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: { name: `AI Speaker ${product.name} (${input.billingCycle === "yearly" ? "연간" : "월간"})` },
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
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 시스템이 설정되지 않았습니다." });
        const pkg = CREDIT_PACKAGES.find(p => p.id === input.packageId);
        if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 패키지입니다." });
        const paymentRecord = await db.createPayment({
          userId: ctx.user.id,
          paymentType: "credit_package",
          paymentMethod: "stripe",
          amountCents: pkg.priceCents,
          currency: "usd",
          creditAmount: pkg.credits,
          status: "pending",
          description: `${pkg.name} 크레딧 패키지`,
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
          if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 플랜" });
          amountCents = input.billingCycle === "yearly" ? product.priceYearly : product.priceMonthly;
          description = `${product.name} 구독 (${input.billingCycle || "monthly"}) - 암호화폐`;
        } else if (input.type === "credit_package" && input.packageId) {
          const pkg = CREDIT_PACKAGES.find(p => p.id === input.packageId);
          if (!pkg) throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않은 패키지" });
          amountCents = pkg.priceCents;
          creditAmount = pkg.credits;
          description = `${pkg.name} 크레딧 패키지 - 암호화폐`;
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
            description: `크레딧 ${payment.creditAmount}개 구매 (암호화폐)`,
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
    // --- Project CRUD ---
    createProject: protectedProcedure
      .input(z.object({ title: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLectureProject({ userId: ctx.user.id, title: input.title, description: input.description || null });
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
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectAvatar(id, data as any);
        return { success: true };
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSlideScript(id, data as any);
        return { success: true };
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
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.projectId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const systemPrompt = `You are a professional lecture script writer. Generate a lecture script divided into exactly ${input.slideCount} sections. Each section should be 2-4 sentences. Language: ${input.language}. Return JSON array: [{"section": 1, "text": "..."}]`;
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
          generationStep: "영상 생성 준비 중...",
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
            generationStep: "완료",
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
          formal: "격식적이고 전문적인 강의 톤으로 작성하세요. 존댓말을 사용하고 학술적 어휘를 적절히 활용하세요.",
          casual: "친근하고 편안한 톤으로 작성하세요. 청중과 대화하듯이 자연스럽게 설명하세요.",
          educational: "교육적이고 이해하기 쉬운 톤으로 작성하세요. 핵심 개념을 명확히 설명하고 예시를 들어주세요.",
          storytelling: "스토리텔링 형식으로 작성하세요. 청중의 흥미를 끌 수 있는 내러티브 구조를 사용하세요.",
        };
        const systemPrompt = `당신은 AI 강의 스크립트 전문가입니다. 주어진 텍스트를 강의용 스크립트로 개선해주세요.

스타일: ${styleGuides[input.style] || styleGuides.educational}

규칙:
1. 원문의 핵심 내용을 유지하면서 강의에 적합한 문체로 변환
2. 자연스러운 말하기 흐름으로 작성 (TTS로 읽혀질 예정)
3. 적절한 쉬어가기와 강조 표현 포함
4. 불필요한 전문 용어는 쉽게 풀어서 설명
5. 개선된 스크립트만 출력하세요 (설명이나 주석 없이)
6. 언어: ${input.language === "ko" ? "한국어" : input.language}`;

        let userContent = `다음 텍스트를 강의용 스크립트로 개선해주세요:\n\n${input.scriptText}`;
        if (input.slideContext) {
          userContent += `\n\n슬라이드 컨텍스트: ${input.slideContext}`;
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
          formal: "격식적이고 전문적인 강의 톤으로 작성하세요. 존댓말을 사용하고 학술적 어휘를 적절히 활용하세요.",
          casual: "친근하고 편안한 톤으로 작성하세요. 청중과 대화하듯이 자연스럽게 설명하세요.",
          educational: "교육적이고 이해하기 쉬운 톤으로 작성하세요. 핵심 개념을 명확히 설명하고 예시를 들어주세요.",
          storytelling: "스토리텔링 형식으로 작성하세요. 청중의 흥미를 끌 수 있는 내러티브 구조를 사용하세요.",
        };
        const results: { id: string; original: string; improved: string }[] = [];
        for (const sec of input.sections) {
          if (!sec.text.trim()) {
            results.push({ id: sec.id, original: sec.text, improved: sec.text });
            continue;
          }
          try {
            const systemPrompt = `당신은 AI 강의 스크립트 전문가입니다. 주어진 텍스트를 강의용 스크립트로 개선해주세요.\n\n스타일: ${styleGuides[input.style] || styleGuides.educational}\n\n규칙:\n1. 원문의 핵심 내용을 유지하면서 강의에 적합한 문체로 변환\n2. 자연스러운 말하기 흐름으로 작성 (TTS로 읽혀질 예정)\n3. 적절한 쉬어가기와 강조 표현 포함\n4. 불필요한 전문 용어는 쉽게 풀어서 설명\n5. 개선된 스크립트만 출력하세요 (설명이나 주석 없이)\n6. 언어: ${input.language === "ko" ? "한국어" : input.language}`;
            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `다음 텍스트를 강의용 스크립트로 개선해주세요:\n\n${sec.text}` },
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
        if (batch.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "이력을 찾을 수 없습니다" });
        if (batch[0].userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return { sections: batch.map(b => ({ sectionId: b.sectionId, originalText: b.originalText })) };
      }),

    // --- Get full project data (all steps) ---
    getFullProject: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getLectureProject(input.id);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
        const [avatars, slides, scripts, annotations] = await Promise.all([
          db.listProjectAvatars(input.id),
          db.listProjectSlides(input.id),
          db.listSlideScripts(input.id),
          db.listSlideAnnotations(input.id),
        ]);
        return { project, avatars, slides, scripts, annotations };
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
        if (!isKlingConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "KLING API가 설정되지 않았습니다." });
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
        if (!isKlingConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "KLING API가 설정되지 않았습니다." });
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
    <h1>수료증</h1>
    <div class="subtitle">CERTIFICATE OF COMPLETION</div>
    <p>아래의 수강생이 다음 강의를 성공적으로 수료하였음을 증명합니다.</p>
    <div class="name">${studentName}</div>
    <div class="lecture">「${lectureTitle}」</div>
    <div class="completion">수료율: ${completion}%</div>
    <div class="badge">AI Lecture Platform</div>
    <div class="date">${date}</div>
    <div class="code">인증코드: ${code}</div>
  </div></body></html>`;
}

export type AppRouter = typeof appRouter;
