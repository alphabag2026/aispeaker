import { formatSrtTime } from "./helpers";
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

export const pipelineRouter = router({
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
});

export const broadcastRouter = router({
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
        const { createBroadcastRecording, generateBroadcastAnalytics } = await import("../db");
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
      const { listBroadcastRecordings } = await import("../db");
      return listBroadcastRecordings(ctx.user.id);
    }),

  /** Get recording for a specific broadcast */
  getRecording: instructorProcedure
    .input(z.object({ broadcastId: z.number() }))
    .query(async ({ input }) => {
      const { getBroadcastRecording } = await import("../db");
      return getBroadcastRecording(input.broadcastId);
    }),

  /** Get analytics for a specific broadcast */
  getAnalytics: instructorProcedure
    .input(z.object({ broadcastId: z.number() }))
    .query(async ({ ctx, input }) => {
      const broadcast = await db.getBroadcastById(input.broadcastId);
      if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { getBroadcastAnalytics } = await import("../db");
      return getBroadcastAnalytics(input.broadcastId);
    }),

  /** List all my broadcast analytics */
  analyticsList: instructorProcedure
    .query(async ({ ctx }) => {
      const { listBroadcastAnalytics } = await import("../db");
      return listBroadcastAnalytics(ctx.user.id);
    }),

  /** Regenerate analytics for a broadcast */
  regenerateAnalytics: instructorProcedure
    .input(z.object({ broadcastId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const broadcast = await db.getBroadcastById(input.broadcastId);
      if (!broadcast || broadcast.instructorId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const { generateBroadcastAnalytics } = await import("../db");
      return generateBroadcastAnalytics(input.broadcastId);
    }),
});

export const pipRouter = router({
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
});

export const pptRouter = router({
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
});

export const klingRouter = router({
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
});

export const videoEffectsRouter = router({
  categories: publicProcedure.query(async () => {
    const { VIDEO_EFFECT_CATEGORIES } = await import("../kling");
    return VIDEO_EFFECT_CATEGORIES;
  }),

  create: protectedProcedure
    .input(z.object({
      effectScene: z.string().min(1),
      imageUrl: z.string().url().optional(),
      imageUrls: z.array(z.string().url()).length(2).optional(),
    }))
    .mutation(async ({ input }) => {
      const { createVideoEffect } = await import("../kling");
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
      const { getVideoEffectStatus } = await import("../kling");
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
});

