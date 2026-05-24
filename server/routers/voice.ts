import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import { transcribeAudio } from "../_core/voiceTranscription";
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

const TTS_VOICES = GEMINI_VOICES;

export const voiceProfileRouter = router({
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
});

export const ttsRouter = router({
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
});

export const sttRouter = router({
  transcribe: protectedProcedure
    .input(z.object({ audioUrl: z.string(), language: z.string().optional() }))
    .mutation(async ({ input }) => {
      const result = await transcribeAudio({ audioUrl: input.audioUrl, language: input.language });
      if ('error' in result) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return { text: result.text, language: result.language };
    }),
});

export const voiceCloneRouter = router({
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
        const { GEMINI_VOICES } = await import("../_core/geminiTts");
        const { transcribeAudio } = await import("../_core/voiceTranscription");

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

        const { invokeLLM } = await import("../_core/llm");
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
      const { generateGeminiTts } = await import("../_core/geminiTts");
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

      const { generateGeminiTts } = await import("../_core/geminiTts");
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
      const { generateGeminiTts } = await import("../_core/geminiTts");
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

  /** Apply voice clone to recent project's avatar(s) */
  applyToRecentProject: protectedProcedure
    .input(z.object({
      cloneId: z.number(),
      projectId: z.number().optional(), // if not provided, use most recent project
      avatarId: z.number().optional(), // if not provided, apply to all avatars in project
    }))
    .mutation(async ({ ctx, input }) => {
      const clone = await db.getVoiceCloneById(input.cloneId);
      if (!clone || clone.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Voice clone not found" });
      if (clone.status !== "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "Voice clone is not ready" });
      // Get target project
      let projectId = input.projectId;
      if (!projectId) {
        const projects = await db.listLectureProjects(ctx.user.id);
        if (projects.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No projects found" });
        projectId = projects[0].id;
      }
      const project = await db.getLectureProject(projectId);
      if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      // Get avatars
      const avatars = await db.listProjectAvatars(projectId);
      if (avatars.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "No avatars in project" });
      const matchedVoiceId = clone.matchedVoiceId || "Kore";
      let updatedCount = 0;
      if (input.avatarId) {
        const target = avatars.find(a => a.id === input.avatarId);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found in project" });
        await db.updateProjectAvatar(input.avatarId, { ttsVoiceId: matchedVoiceId, voiceCloneId: input.cloneId });
        updatedCount = 1;
      } else {
        for (const avatar of avatars) {
          await db.updateProjectAvatar(avatar.id, { ttsVoiceId: matchedVoiceId, voiceCloneId: input.cloneId });
          updatedCount++;
        }
      }
      // Log the application
      try {
        const appliedAvatars = input.avatarId 
          ? avatars.filter(a => a.id === input.avatarId)
          : avatars;
        const avatarNames = appliedAvatars.map(a => a.name || 'Avatar').join(', ');
        await db.addVoiceCloneApplyLog({
          userId: ctx.user.id,
          voiceCloneId: input.cloneId,
          cloneName: clone.name,
          projectId,
          projectTitle: project.title,
          avatarCount: updatedCount,
          avatarNames,
          applyMode: input.avatarId ? 'selected' : 'all',
        });
      } catch (e) { console.error('Failed to log voice clone apply:', e); }
      return { success: true, updatedCount, projectId, projectTitle: project.title };
    }),
  /** Get recent projects with avatars for voice clone apply UI */
  recentProjectsForApply: protectedProcedure.query(async ({ ctx }) => {
    const projects = await db.listLectureProjects(ctx.user.id);
    const recentProjects = projects.slice(0, 5);
    const result = [];
    for (const p of recentProjects) {
      const avatars = await db.listProjectAvatars(p.id);
      result.push({
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt,
        avatars: avatars.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          customFaceUrl: a.customFaceUrl,
          ttsVoiceId: a.ttsVoiceId,
          voiceCloneId: a.voiceCloneId,
        })),
      });
    }
    return result;
  }),
  /** Get voice clone apply history logs */
  applyLogs: protectedProcedure.query(async ({ ctx }) => {
    return db.listVoiceCloneApplyLogs(ctx.user.id);
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
});

export const voiceEffectPresetRouter = router({
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
});

export const voiceCloneSampleRouter = router({
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
});

