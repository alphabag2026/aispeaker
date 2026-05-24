import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { generateImage } from "../_core/imageGeneration";
import { generateGeminiTts, GEMINI_VOICES } from "../_core/geminiTts";

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

export const avatarRouter = router({
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
});

export const sampleFaceRouter = router({
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
});

export const sampleVoiceRouter = router({
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
});

export const userAvatarRouter = router({
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
      defaultTtsVoiceId: z.string().nullable().optional(),
      defaultVoiceCloneId: z.number().nullable().optional(),
      defaultRole: z.enum(["instructor", "host", "guest", "narrator"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateUserAvatar(id, ctx.user.id, data);
      return { success: true };
    }),
  /** Update default voice and role for a user avatar */
  updateDefaultVoice: protectedProcedure
    .input(z.object({
      id: z.number(),
      defaultTtsVoiceId: z.string().nullable(),
      defaultVoiceCloneId: z.number().nullable(),
      defaultRole: z.enum(["instructor", "host", "guest", "narrator"]).optional(),
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
});

export const didHistoryRouter = router({
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
});

export const didPipelineRouter = router({
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
});

