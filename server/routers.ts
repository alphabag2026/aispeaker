import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storagePut } from "./storage";
import * as db from "./db";
import { nanoid } from "nanoid";

// Instructor-only procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== 'instructor' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '강사 권한이 필요합니다.' });
  }
  return next({ ctx });
});

// Supported languages for translation
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

    switchRole: protectedProcedure
      .input(z.object({ platformRole: z.enum(["instructor", "student"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPlatformRole(ctx.user.id, input.platformRole);
        return { success: true };
      }),

    setLanguage: protectedProcedure
      .input(z.object({ lang: z.string().min(2).max(10) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferredLang(ctx.user.id, input.lang);
        return { success: true };
      }),
  }),

  // ============ Voice Profiles ============
  voiceProfile: router({
    list: instructorProcedure.query(async ({ ctx }) => {
      return db.getVoiceProfiles(ctx.user.id);
    }),

    create: instructorProcedure
      .input(z.object({
        name: z.string().min(1),
        voiceDescription: z.string().optional(),
        teachingStyle: z.string().optional(),
        ttsVoiceId: z.string().optional(),
        avatarImageUrl: z.string().optional(),
        avatarStyle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createVoiceProfile({
          userId: ctx.user.id,
          name: input.name,
          voiceDescription: input.voiceDescription ?? null,
          teachingStyle: input.teachingStyle ?? null,
          ttsVoiceId: input.ttsVoiceId ?? "alloy",
          avatarImageUrl: input.avatarImageUrl ?? null,
          avatarStyle: input.avatarStyle ?? "rectangular",
        });
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
        isDefault: z.boolean().optional(),
        avatarImageUrl: z.string().optional(),
        avatarStyle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateVoiceProfile(id, ctx.user.id, data as any);
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
        profileId: z.number(),
        audioBase64: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.audioBase64, 'base64');
        const fileKey = `voice-samples/${ctx.user.id}/${input.profileId}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, 'audio/webm');
        await db.updateVoiceProfile(input.profileId, ctx.user.id, { sampleUrl: url });

        const analysisResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert voice and teaching style analyst. Analyze the uploaded voice sample description and generate a system prompt that will help an AI mimic this instructor's teaching style. Respond in Korean."
            },
            {
              role: "user",
              content: `강사의 음성 샘플이 업로드되었습니다. 이 강사의 강의 스타일을 분석하고, AI가 이 강사처럼 강의할 수 있도록 시스템 프롬프트를 생성해주세요. 파일명: ${input.filename}`
            }
          ]
        });
        const rawSp = analysisResponse.choices?.[0]?.message?.content;
        const systemPrompt = typeof rawSp === 'string' ? rawSp : "";
        await db.updateVoiceProfile(input.profileId, ctx.user.id, { systemPrompt });

        return { url, systemPrompt };
      }),

    uploadAvatarImage: instructorProcedure
      .input(z.object({
        profileId: z.number(),
        imageBase64: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.imageBase64, 'base64');
        const fileKey = `avatars/${ctx.user.id}/${input.profileId}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(fileKey, buffer, 'image/png');
        await db.updateVoiceProfile(input.profileId, ctx.user.id, { avatarImageUrl: url });
        return { url };
      }),

    analyzeStyle: instructorProcedure
      .input(z.object({
        profileId: z.number(),
        description: z.string(),
        teachingStyle: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `당신은 AI 강사 시스템입니다. 강사의 특성을 분석하여 AI가 이 강사의 스타일로 강의할 수 있도록 상세한 시스템 프롬프트를 생성합니다.`
            },
            {
              role: "user",
              content: `다음 강사 정보를 바탕으로 AI 강사 시스템 프롬프트를 생성해주세요:\n\n음성 특성: ${input.description}\n강의 스타일: ${input.teachingStyle}\n\n이 강사처럼 자연스럽게 강의하는 AI를 위한 상세한 시스템 프롬프트를 작성해주세요.`
            }
          ]
        });
        const rawSp2 = response.choices?.[0]?.message?.content;
        const systemPrompt = typeof rawSp2 === 'string' ? rawSp2 : "";
        await db.updateVoiceProfile(input.profileId, ctx.user.id, {
          voiceDescription: input.description,
          teachingStyle: input.teachingStyle,
          systemPrompt,
        });
        return { systemPrompt };
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

    myLectures: instructorProcedure.query(async ({ ctx }) => {
      return db.getLectures({ instructorId: ctx.user.id });
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const lecture = await db.getLectureById(input.id);
        if (!lecture) throw new TRPCError({ code: 'NOT_FOUND', message: '강의를 찾을 수 없습니다.' });
        return lecture;
      }),

    create: instructorProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["web3", "ai", "blockchain", "defi", "nft", "metaverse", "general"]).optional(),
        aiMode: z.enum(["voice", "text", "avatar"]).optional(),
        voiceProfileId: z.number().optional(),
        aiContext: z.string().optional(),
        maxParticipants: z.number().optional(),
        autoRecord: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createLecture({
          instructorId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? "web3",
          aiMode: input.aiMode ?? "voice",
          voiceProfileId: input.voiceProfileId ?? null,
          aiContext: input.aiContext ?? null,
          maxParticipants: input.maxParticipants ?? 0,
          autoRecord: input.autoRecord ?? true,
        });
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
        // End the lecture
        await db.updateLectureStatus(input.id, 'completed');

        // Auto-create VOD recording from lecture data
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
            // Archive Q&A messages as timeline events
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
              offsetSec += 10; // approximate spacing
            }

            // Archive whiteboard snapshots
            for (let i = 0; i < snapshots.length; i++) {
              await db.createVodTimelineEvent({
                vodId,
                eventType: 'whiteboard_snapshot',
                offsetSeconds: i * 30,
                content: snapshots[i].snapshotData,
              });
            }

            // Calculate duration
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
          pdf: 'application/pdf',
          ppt: 'application/vnd.ms-powerpoint',
          image: 'image/png',
          video: 'video/mp4',
          other: 'application/octet-stream',
        };
        const { url } = await storagePut(fileKey, buffer, mimeMap[input.fileType] || 'application/octet-stream');
        const id = await db.createLectureMaterial({
          lectureId: input.lectureId,
          title: input.title,
          fileType: input.fileType,
          fileUrl: url,
          fileKey,
          pageCount: input.pageCount ?? 0,
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
          lectureId: input.lectureId,
          userId: ctx.user.id,
          messageType: "question",
          inputMethod: input.inputMethod ?? "text",
          content: input.content,
        });

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
          lectureId: input.lectureId,
          userId: null,
          messageType: "answer",
          inputMethod: "text",
          content: aiAnswer,
        });

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
          headers: {
            'Authorization': `Bearer ${forgeKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: input.text,
            voice: input.voiceId || 'alloy',
            response_format: 'mp3',
          }),
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

  // ============ AI Avatar ============
  avatar: router({
    /** Generate avatar video from text using TTS + animated avatar */
    generate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(4096),
        voiceProfileId: z.number().optional(),
        lectureId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Step 1: Generate TTS audio
        const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;

        if (!forgeUrl || !forgeKey) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 서비스가 설정되지 않았습니다.' });
        }

        let voiceId = "alloy";
        let avatarImageUrl: string | null = null;

        if (input.voiceProfileId) {
          const profile = await db.getVoiceProfileById(input.voiceProfileId);
          if (profile) {
            voiceId = profile.ttsVoiceId || "alloy";
            avatarImageUrl = profile.avatarImageUrl;
          }
        }

        const ttsResponse = await fetch(`${forgeUrl}/v1/audio/speech`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${forgeKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: input.text,
            voice: voiceId,
            response_format: 'mp3',
          }),
        });

        if (!ttsResponse.ok) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'TTS 생성에 실패했습니다.' });
        }

        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
        const audioKey = `avatar-audio/${nanoid()}.mp3`;
        const { url: audioUrl } = await storagePut(audioKey, audioBuffer, 'audio/mpeg');

        // Return audio + avatar image info for frontend to render animated avatar
        return {
          audioUrl,
          avatarImageUrl,
          voiceId,
          text: input.text,
        };
      }),
  }),

  // ============ Whiteboard ============
  whiteboard: router({
    save: instructorProcedure
      .input(z.object({
        lectureId: z.number(),
        snapshotData: z.string(),
      }))
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
        // Increment view count
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

    /** Manually create VOD from a completed lecture */
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
    languages: publicProcedure.query(() => {
      return SUPPORTED_LANGUAGES;
    }),

    translate: protectedProcedure
      .input(z.object({
        text: z.string().min(1),
        targetLang: z.string().min(2).max(10),
        sourceLang: z.string().optional(),
        sourceType: z.enum(["qa_message", "lecture_title", "lecture_description"]).optional(),
        sourceId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check cache first
        if (input.sourceType && input.sourceId) {
          const cached = await db.getTranslation(input.sourceType, input.sourceId, input.targetLang);
          if (cached) {
            return { translatedText: cached.translatedText, cached: true };
          }
        }

        const sourceLang = input.sourceLang || "ko";
        const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === input.targetLang);
        const targetLangName = targetLangInfo?.name || input.targetLang;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following text to ${targetLangName} (${input.targetLang}). Only output the translated text, nothing else. Maintain the original formatting and technical terms where appropriate.`
            },
            {
              role: "user",
              content: input.text,
            }
          ],
        });

        const rawTranslation = response.choices?.[0]?.message?.content;
        const translatedText = typeof rawTranslation === 'string' ? rawTranslation : input.text;

        // Cache the translation
        if (input.sourceType && input.sourceId) {
          await db.createTranslation({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            sourceLang,
            targetLang: input.targetLang,
            originalText: input.text,
            translatedText,
          });
        }

        return { translatedText, cached: false };
      }),

    /** Batch translate Q&A messages for a lecture */
    translateMessages: protectedProcedure
      .input(z.object({
        lectureId: z.number(),
        targetLang: z.string().min(2).max(10),
      }))
      .mutation(async ({ input }) => {
        const messages = await db.getQaMessages(input.lectureId);
        const results: { messageId: number; translatedText: string }[] = [];

        for (const msg of messages) {
          // Check cache
          const cached = await db.getTranslation("qa_message", msg.message.id, input.targetLang);
          if (cached) {
            results.push({ messageId: msg.message.id, translatedText: cached.translatedText });
            continue;
          }

          const targetLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === input.targetLang);
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Translate to ${targetLangInfo?.name || input.targetLang}. Output only the translation.`
              },
              { role: "user", content: msg.message.content }
            ],
          });

          const rawT = response.choices?.[0]?.message?.content;
          const translated = typeof rawT === 'string' ? rawT : msg.message.content;

          await db.createTranslation({
            sourceType: "qa_message",
            sourceId: msg.message.id,
            sourceLang: "ko",
            targetLang: input.targetLang,
            originalText: msg.message.content,
            translatedText: translated,
          });

          results.push({ messageId: msg.message.id, translatedText: translated });
        }

        return { translations: results };
      }),
  }),
});

export type AppRouter = typeof appRouter;
