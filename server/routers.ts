import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ============ Auth helpers ============
const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "강사 권한이 필요합니다." });
  }
  return next({ ctx });
});

// ============ Supported Languages ============
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
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ User / Profile ============
  user: router({
    setRole: protectedProcedure
      .input(z.object({ platformRole: z.enum(["instructor", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPlatformRole(ctx.user.id, input.platformRole);
        return { success: true };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
        preferredLang: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    setPreferredLang: protectedProcedure
      .input(z.object({ lang: z.string().min(2).max(10) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferredLang(ctx.user.id, input.lang);
        return { success: true };
      }),
  }),

  // ============ Voice Profile ============
  voiceProfile: router({
    list: instructorProcedure.query(async ({ ctx }) => {
      return db.getVoiceProfiles(ctx.user.id);
    }),

    create: instructorProcedure
      .input(z.object({
        name: z.string().min(1),
        voiceDescription: z.string().optional(),
        teachingStyle: z.string().optional(),
        systemPrompt: z.string().optional(),
        ttsVoiceId: z.string().optional(),
        avatarImageUrl: z.string().optional(),
        avatarStyle: z.string().optional(),
        didApiKey: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVoiceProfile({ ...input, userId: ctx.user.id });
        return { id };
      }),

    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        voiceDescription: z.string().optional(),
        teachingStyle: z.string().optional(),
        systemPrompt: z.string().optional(),
        ttsVoiceId: z.string().optional(),
        avatarImageUrl: z.string().optional(),
        avatarStyle: z.string().optional(),
        didApiKey: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateVoiceProfile(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVoiceProfile(input.id, ctx.user.id);
        return { success: true };
      }),

    uploadSample: instructorProcedure
      .input(z.object({
        id: z.number(),
        audioBase64: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.audioBase64, 'base64');
        const fileKey = `voice-samples/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, 'audio/mpeg');
        await db.updateVoiceProfile(input.id, ctx.user.id, { sampleUrl: url });
        return { url };
      }),
  }),

  // ============ Lectures ============
  lecture: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getLectures(input ?? {});
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lecture = await db.getLectureById(input.id);
        if (!lecture) throw new TRPCError({ code: 'NOT_FOUND', message: '강의를 찾을 수 없습니다.' });
        return lecture;
      }),

    myLectures: instructorProcedure.query(async ({ ctx }) => {
      return db.getLectures({ instructorId: ctx.user.id });
    }),

    create: instructorProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        aiMode: z.enum(["voice", "text", "avatar"]).optional(),
        voiceProfileId: z.number().optional(),
        maxParticipants: z.number().optional(),
        aiContext: z.string().optional(),
        autoRecord: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLecture({ ...input, instructorId: ctx.user.id });
        return { id };
      }),

    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        aiMode: z.enum(["voice", "text", "avatar"]).optional(),
        voiceProfileId: z.number().optional(),
        status: z.enum(["draft", "scheduled", "live", "completed", "archived"]).optional(),
        aiContext: z.string().optional(),
        maxParticipants: z.number().optional(),
        autoRecord: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateLecture(id, ctx.user.id, data as any);
        return { success: true };
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteLecture(input.id, ctx.user.id);
        return { success: true };
      }),

    goLive: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateLectureStatus(input.id, 'live');
        return { success: true };
      }),

    endLecture: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateLectureStatus(input.id, 'completed');
        const lecture = await db.getLectureById(input.id);
        if (lecture?.autoRecord) {
          const messages = await db.getQaMessages(input.id);
          const snapshots = await db.getWhiteboardSnapshots(input.id);
          const vodId = await db.createVodRecording({
            lectureId: input.id,
            title: `${lecture.title} - 녹화본`,
            description: lecture.description,
            messageCount: messages.length,
            snapshotCount: snapshots.length,
            status: "processing",
            startedAt: lecture.createdAt,
            endedAt: new Date(),
          });
          if (vodId) {
            let offsetSec = 0;
            for (const msg of messages) {
              await db.createVodTimelineEvent({
                vodId,
                eventType: msg.message.messageType === 'question' ? 'qa_question' : 'qa_answer',
                offsetSeconds: offsetSec,
                content: msg.message.content,
                userId: msg.message.userId,
                audioUrl: msg.message.audioUrl,
                avatarVideoUrl: msg.message.avatarVideoUrl,
              });
              offsetSec += 10;
            }
            for (let i = 0; i < snapshots.length; i++) {
              await db.createVodTimelineEvent({
                vodId,
                eventType: 'whiteboard_snapshot',
                offsetSeconds: i * 30,
                content: snapshots[i].snapshotData,
              });
            }
            const duration = messages.length * 10 + snapshots.length * 30;
            await db.updateVodRecording(vodId, { status: "ready", duration });
          }
        }
        return { success: true };
      }),

    stats: instructorProcedure.query(async ({ ctx }) => {
      return db.getLectureStats(ctx.user.id);
    }),
  }),

  // ============ Lecture Materials ============
  material: router({
    list: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ input }) => {
        return db.getLectureMaterials(input.lectureId);
      }),

    upload: instructorProcedure
      .input(z.object({
        lectureId: z.number(),
        title: z.string(),
        fileBase64: z.string(),
        filename: z.string(),
        fileType: z.enum(["pdf", "ppt", "image", "video", "other"]),
        pageCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const fileKey = `materials/${input.lectureId}/${nanoid()}-${input.filename}`;
        const mimeMap: Record<string, string> = {
          pdf: 'application/pdf', ppt: 'application/vnd.ms-powerpoint',
          image: 'image/png', video: 'video/mp4', other: 'application/octet-stream',
        };
        const { url } = await storagePut(fileKey, buffer, mimeMap[input.fileType] || 'application/octet-stream');
        const id = await db.createLectureMaterial({
          lectureId: input.lectureId, title: input.title, fileType: input.fileType,
          fileUrl: url, fileKey, pageCount: input.pageCount ?? 0,
        });
        return { id, url };
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLectureMaterial(input.id);
        return { success: true };
      }),
  }),

  // ============ Enrollment ============
  enrollment: router({
    enroll: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.enrollInLecture(input.lectureId, ctx.user.id);
        return { id };
      }),

    isEnrolled: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isEnrolled(input.lectureId, ctx.user.id);
      }),

    myEnrollments: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserEnrollments(ctx.user.id);
    }),

    participants: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ input }) => {
        return db.getLectureEnrollments(input.lectureId);
      }),
  }),

  // ============ Q&A / AI Chat ============
  qa: router({
    messages: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ input }) => {
        return db.getQaMessages(input.lectureId);
      }),

    ask: protectedProcedure
      .input(z.object({
        lectureId: z.number(),
        content: z.string().min(1),
        inputMethod: z.enum(["text", "voice"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createQaMessage({
          lectureId: input.lectureId, userId: ctx.user.id,
          messageType: "question", inputMethod: input.inputMethod ?? "text",
          content: input.content,
        });

        // Track learning progress
        await db.incrementQuestionCount(ctx.user.id, input.lectureId);

        const lecture = await db.getLectureById(input.lectureId);
        let voiceProfile = null;
        if (lecture?.voiceProfileId) {
          voiceProfile = await db.getVoiceProfileById(lecture.voiceProfileId);
        }

        const recentMessages = await db.getQaMessages(input.lectureId, 20);
        const chatHistory = recentMessages.map(m => ({
          role: m.message.messageType === 'question' ? 'user' as const : 'assistant' as const,
          content: m.message.content,
        }));

        const basePrompt = voiceProfile?.systemPrompt ||
          `당신은 전문적인 AI 강사입니다. ${lecture?.category || 'Web3'} 분야의 전문가로서 학생들의 질문에 친절하고 상세하게 답변합니다.`;

        const systemPrompt = `${basePrompt}\n\n강의 제목: ${lecture?.title || '알 수 없음'}\n강의 설명: ${lecture?.description || ''}\n${lecture?.aiContext ? `추가 컨텍스트: ${lecture.aiContext}` : ''}\n\n학생의 질문에 한국어로 답변하세요. 답변은 명확하고 교육적이어야 합니다.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory.slice(-10),
            { role: "user", content: input.content },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const aiAnswer = typeof rawContent === 'string' ? rawContent : "죄송합니다. 답변을 생성할 수 없습니다.";

        const answerId = await db.createQaMessage({
          lectureId: input.lectureId, userId: null,
          messageType: "answer", inputMethod: "text", content: aiAnswer,
        });

        // Track answer received
        await db.incrementAnswerCount(ctx.user.id, input.lectureId);

        return { answer: aiAnswer, answerId };
      }),

    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        language: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language || "ko",
        });
        if ('error' in result) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: result.error });
        }
        return { text: result.text };
      }),
  }),

  // ============ TTS (Text-to-Speech) ============
  tts: router({
    generate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(4096),
        voiceId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
        if (!forgeUrl || !forgeKey) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 서비스가 설정되지 않았습니다.' });
        }
        const response = await fetch(`${forgeUrl}/v1/audio/speech`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${forgeKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'tts-1', input: input.text, voice: input.voiceId || 'alloy', response_format: 'mp3' }),
        });
        if (!response.ok) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 생성에 실패했습니다.' });
        }
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const fileKey = `tts/${nanoid()}.mp3`;
        const { url } = await storagePut(fileKey, audioBuffer, 'audio/mpeg');
        return { audioUrl: url };
      }),
  }),

  // ============ AI Avatar (D-ID Integration) ============
  avatar: router({
    /** Generate avatar video using D-ID API or fallback to TTS + animated avatar */
    generate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(4096),
        voiceProfileId: z.number().optional(),
        lectureId: z.number().optional(),
        /** If true, attempt D-ID API for real avatar video */
        useDid: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
        if (!forgeUrl || !forgeKey) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 서비스가 설정되지 않았습니다.' });
        }

        let voiceId = "alloy";
        let avatarImageUrl: string | null = null;
        let didApiKey: string | null = null;
        let avatarStyle = "rectangular";

        if (input.voiceProfileId) {
          const profile = await db.getVoiceProfileById(input.voiceProfileId);
          if (profile) {
            voiceId = profile.ttsVoiceId || "alloy";
            avatarImageUrl = profile.avatarImageUrl;
            didApiKey = profile.didApiKey;
            avatarStyle = profile.avatarStyle || "rectangular";
          }
        }

        // Step 1: Generate TTS audio
        const ttsResponse = await fetch(`${forgeUrl}/v1/audio/speech`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${forgeKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'tts-1', input: input.text, voice: voiceId, response_format: 'mp3' }),
        });
        if (!ttsResponse.ok) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 생성에 실패했습니다.' });
        }
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        const audioKey = `avatar-audio/${nanoid()}.mp3`;
        const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/mpeg');

        // Step 2: If D-ID is requested and API key is available, create talking head video
        let videoUrl: string | null = null;
        const globalDidKey = process.env.DID_API_KEY;
        const effectiveDidKey = didApiKey || globalDidKey;

        if (input.useDid && effectiveDidKey && avatarImageUrl) {
          try {
            // Create D-ID talk
            const didResponse = await fetch('https://api.d-id.com/talks', {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${effectiveDidKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                source_url: avatarImageUrl,
                script: {
                  type: 'audio',
                  audio_url: audioUrl,
                },
                config: {
                  stitch: true,
                  result_format: 'mp4',
                },
              }),
            });

            if (didResponse.ok) {
              const didData = await didResponse.json() as any;
              const talkId = didData.id;

              // Poll for result (max 60 seconds)
              let attempts = 0;
              while (attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                  headers: { 'Authorization': `Basic ${effectiveDidKey}` },
                });
                if (statusResponse.ok) {
                  const statusData = await statusResponse.json() as any;
                  if (statusData.status === 'done' && statusData.result_url) {
                    videoUrl = statusData.result_url;
                    break;
                  } else if (statusData.status === 'error') {
                    console.error('[D-ID] Video generation failed:', statusData);
                    break;
                  }
                }
                attempts++;
              }
            }
          } catch (error) {
            console.error('[D-ID] API error:', error);
            // Fall back to audio-only avatar
          }
        }

        return {
          audioUrl,
          videoUrl,
          avatarImageUrl,
          avatarStyle,
          voiceId,
          text: input.text,
          usedDid: !!videoUrl,
        };
      }),

    /** Check D-ID API key validity */
    checkDidKey: instructorProcedure
      .input(z.object({ apiKey: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const response = await fetch('https://api.d-id.com/credits', {
            headers: { 'Authorization': `Basic ${input.apiKey}` },
          });
          if (response.ok) {
            const data = await response.json() as any;
            return { valid: true, credits: data.remaining || 0 };
          }
          return { valid: false, credits: 0 };
        } catch {
          return { valid: false, credits: 0 };
        }
      }),
  }),

  // ============ Whiteboard ============
  whiteboard: router({
    save: instructorProcedure
      .input(z.object({ lectureId: z.number(), snapshotData: z.string() }))
      .mutation(async ({ input }) => {
        await db.saveWhiteboardSnapshot(input.lectureId, input.snapshotData);
        return { success: true };
      }),

    load: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ input }) => {
        return db.getLatestWhiteboardSnapshot(input.lectureId);
      }),
  }),

  // ============ VOD (Video on Demand) ============
  vod: router({
    list: publicProcedure
      .input(z.object({
        lectureId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getVodRecordings(input ?? {});
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const vod = await db.getVodById(input.id);
        if (!vod) throw new TRPCError({ code: 'NOT_FOUND', message: 'VOD를 찾을 수 없습니다.' });
        await db.incrementVodViewCount(input.id);
        return vod;
      }),

    timeline: publicProcedure
      .input(z.object({ vodId: z.number() }))
      .query(async ({ input }) => {
        return db.getVodTimelineEvents(input.vodId);
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVodRecording(input.id);
        return { success: true };
      }),

    createFromLecture: instructorProcedure
      .input(z.object({ lectureId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const lecture = await db.getLectureById(input.lectureId);
        if (!lecture) throw new TRPCError({ code: 'NOT_FOUND' });
        const messages = await db.getQaMessages(input.lectureId);
        const snapshots = await db.getWhiteboardSnapshots(input.lectureId);
        const vodId = await db.createVodRecording({
          lectureId: input.lectureId,
          title: `${lecture.title} - 녹화본`,
          description: lecture.description,
          messageCount: messages.length,
          snapshotCount: snapshots.length,
          status: "processing",
          startedAt: lecture.createdAt,
          endedAt: new Date(),
        });
        if (vodId) {
          let offsetSec = 0;
          for (const msg of messages) {
            await db.createVodTimelineEvent({
              vodId,
              eventType: msg.message.messageType === 'question' ? 'qa_question' : 'qa_answer',
              offsetSeconds: offsetSec,
              content: msg.message.content,
              userId: msg.message.userId,
              audioUrl: msg.message.audioUrl,
              avatarVideoUrl: msg.message.avatarVideoUrl,
            });
            offsetSec += 10;
          }
          for (let i = 0; i < snapshots.length; i++) {
            await db.createVodTimelineEvent({
              vodId,
              eventType: 'whiteboard_snapshot',
              offsetSeconds: i * 30,
              content: snapshots[i].snapshotData,
            });
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
      .input(z.object({
        text: z.string().min(1),
        targetLang: z.string().min(2).max(10),
        sourceLang: z.string().optional(),
        sourceType: z.enum(["qa_message", "lecture_title", "lecture_description"]).optional(),
        sourceId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.sourceType && input.sourceId) {
          const cached = await db.getTranslation(input.sourceType, input.sourceId, input.targetLang);
          if (cached) return { translatedText: cached.translatedText, cached: true };
        }
        const sourceLang = input.sourceLang || "ko";
        const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === input.targetLang);
        const targetLangName = targetLangInfo?.name || input.targetLang;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional translator. Translate the following text to ${targetLangName} (${input.targetLang}). Only output the translated text, nothing else.` },
            { role: "user", content: input.text },
          ],
        });
        const rawTranslation = response.choices?.[0]?.message?.content;
        const translatedText = typeof rawTranslation === 'string' ? rawTranslation : input.text;
        if (input.sourceType && input.sourceId) {
          await db.createTranslation({
            sourceType: input.sourceType, sourceId: input.sourceId,
            sourceLang, targetLang: input.targetLang,
            originalText: input.text, translatedText,
          });
        }
        return { translatedText, cached: false };
      }),

    translateMessages: protectedProcedure
      .input(z.object({ lectureId: z.number(), targetLang: z.string().min(2).max(10) }))
      .mutation(async ({ input }) => {
        const messages = await db.getQaMessages(input.lectureId);
        const results: { messageId: number; translatedText: string }[] = [];
        for (const msg of messages) {
          const cached = await db.getTranslation("qa_message", msg.message.id, input.targetLang);
          if (cached) {
            results.push({ messageId: msg.message.id, translatedText: cached.translatedText });
            continue;
          }
          const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === input.targetLang);
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `Translate to ${targetLangInfo?.name || input.targetLang}. Output only the translation.` },
              { role: "user", content: msg.message.content }
            ],
          });
          const rawT = response.choices?.[0]?.message?.content;
          const translated = typeof rawT === 'string' ? rawT : msg.message.content;
          await db.createTranslation({
            sourceType: "qa_message", sourceId: msg.message.id,
            sourceLang: "ko", targetLang: input.targetLang,
            originalText: msg.message.content, translatedText: translated,
          });
          results.push({ messageId: msg.message.id, translatedText: translated });
        }
        return { translations: results };
      }),
  }),

  // ============ Learning Progress ============
  progress: router({
    get: protectedProcedure
      .input(z.object({ lectureId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getLearningProgressForLecture(ctx.user.id, input.lectureId);
      }),

    update: protectedProcedure
      .input(z.object({
        lectureId: z.number(),
        timeSpentSeconds: z.number().optional(),
        lastSlideIndex: z.number().optional(),
        completionPercent: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { lectureId, ...data } = input;
        await db.getOrCreateLearningProgress(ctx.user.id, lectureId);
        await db.updateLearningProgress(ctx.user.id, lectureId, data);
        return { success: true };
      }),

    myProgress: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLearningProgress(ctx.user.id);
    }),

    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const progressList = await db.getUserLearningProgress(ctx.user.id);
      const vodHistory = await db.getUserVodWatchHistory(ctx.user.id);
      const bookmarks = await db.getUserQaBookmarks(ctx.user.id);
      const enrollments = await db.getUserEnrollments(ctx.user.id);

      const totalTimeSpent = progressList.reduce((sum, p) => sum + (p.progress.timeSpentSeconds || 0), 0);
      const totalQuestionsAsked = progressList.reduce((sum, p) => sum + (p.progress.questionsAsked || 0), 0);
      const avgCompletion = progressList.length > 0
        ? Math.round(progressList.reduce((sum, p) => sum + (p.progress.completionPercent || 0), 0) / progressList.length)
        : 0;

      return {
        stats: {
          totalEnrollments: enrollments.length,
          totalTimeSpent,
          totalQuestionsAsked,
          avgCompletion,
          totalVodsWatched: vodHistory.length,
          totalBookmarks: bookmarks.length,
        },
        recentProgress: progressList.slice(0, 5),
        recentVodHistory: vodHistory.slice(0, 5),
        recentBookmarks: bookmarks.slice(0, 5),
      };
    }),
  }),

  // ============ VOD Watch History ============
  vodHistory: router({
    update: protectedProcedure
      .input(z.object({
        vodId: z.number(),
        watchedSeconds: z.number(),
        totalSeconds: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateVodWatchProgress(ctx.user.id, input.vodId, input.watchedSeconds, input.totalSeconds);
        return { success: true };
      }),

    myHistory: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserVodWatchHistory(ctx.user.id);
    }),
  }),

  // ============ Q&A Bookmarks ============
  bookmark: router({
    add: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        lectureId: z.number(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createQaBookmark({
          userId: ctx.user.id,
          messageId: input.messageId,
          lectureId: input.lectureId,
          note: input.note,
        });
        return { id };
      }),

    remove: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteQaBookmark(ctx.user.id, input.messageId);
        return { success: true };
      }),

    isBookmarked: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isBookmarked(ctx.user.id, input.messageId);
      }),

    myBookmarks: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserQaBookmarks(ctx.user.id);
    }),
  }),

  // ============ AI Context Templates ============
  template: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return db.getAiContextTemplates(input?.category);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const template = await db.getAiContextTemplateById(input.id);
        if (!template) throw new TRPCError({ code: 'NOT_FOUND', message: '템플릿을 찾을 수 없습니다.' });
        return template;
      }),

    create: instructorProcedure
      .input(z.object({
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]),
        name: z.string().min(1),
        description: z.string().optional(),
        systemPrompt: z.string().min(1),
        topics: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAiContextTemplate({
          ...input, isBuiltIn: false, creatorId: ctx.user.id,
        });
        return { id };
      }),

    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        systemPrompt: z.string().optional(),
        topics: z.string().optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAiContextTemplate(id, data);
        return { success: true };
      }),

    delete: instructorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAiContextTemplate(input.id);
        return { success: true };
      }),

    /** Apply a template to a lecture */
    applyToLecture: instructorProcedure
      .input(z.object({ templateId: z.number(), lectureId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const template = await db.getAiContextTemplateById(input.templateId);
        if (!template) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateLecture(input.lectureId, ctx.user.id, {
          aiContext: template.systemPrompt,
          category: template.category as any,
        });
        await db.incrementTemplateUsage(input.templateId);
        return { success: true };
      }),

    /** Seed built-in templates */
    seed: publicProcedure.mutation(async () => {
      await db.seedBuiltInTemplates();
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
