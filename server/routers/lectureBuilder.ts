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
import { eq } from "drizzle-orm";
import { projectCollaborators } from "../../drizzle/schema";

// Instructor-only procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor permission required." });
  }
  return next({ ctx });
});

export const lectureBuilderRouter = router({
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

      // Auto-apply favorite avatar's default voice to project avatars (role-based matching)
      try {
        const favoriteAvatars = await db.getFavoriteUserAvatarsWithVoice(ctx.user.id);
        if (favoriteAvatars.length > 0) {
          const projectAvatarsList = await db.listProjectAvatars(id);
          for (const pAvatar of projectAvatarsList) {
            // Priority 1: Match by same role (instructor→instructor, host→host, etc.)
            let matchingFav = favoriteAvatars.find(f => 
              (f.defaultRole === pAvatar.role || (!f.defaultRole && pAvatar.role === 'instructor')) &&
              (f.defaultTtsVoiceId || f.defaultVoiceCloneId)
            );
            // Priority 2: Fall back to any favorite with voice settings
            if (!matchingFav) {
              matchingFav = favoriteAvatars.find(f => f.defaultTtsVoiceId || f.defaultVoiceCloneId);
            }
            if (matchingFav) {
              const updateData: any = {};
              if (matchingFav.defaultTtsVoiceId) updateData.ttsVoiceId = matchingFav.defaultTtsVoiceId;
              if (matchingFav.defaultVoiceCloneId) updateData.voiceCloneId = matchingFav.defaultVoiceCloneId;
              if (Object.keys(updateData).length > 0) {
                await db.updateProjectAvatar(pAvatar.id, updateData);
              }
            }
          }
        }
      } catch (e) { console.error('Failed to apply favorite avatar voice:', e); }

      return { id };
    }),

  listProjects: protectedProcedure.query(async ({ ctx }) => {
    return db.listLectureProjects(ctx.user.id);
  }),

  togglePin: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.getLectureProject(input.projectId);
      if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const isPinned = await db.toggleProjectPin(input.projectId, ctx.user.id);
      return { isPinned };
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
      migrateScripts: z.boolean().optional(), // auto-rearrange scripts to new format
    }))
    .mutation(async ({ ctx, input }) => {
      const project = await db.getLectureProject(input.id);
      if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, migrateScripts, ...data } = input;
      await db.updateLectureProject(id, data as any);

      // Auto-rearrange scripts when format changes
      if (migrateScripts && input.formatSelection) {
        try {
          const existingScripts = await db.listSlideScripts(id);
          if (existingScripts.length > 0) {
            const { styleId, insertIds } = input.formatSelection;
            // Build new section structure based on format
            const newSections: string[] = [];
            // Check for intro inserts
            for (const insertId of insertIds) {
              const insertTpl = await db.getLectureFormatTemplate(insertId);
              if (insertTpl?.insertElements) {
                try {
                  const elems = typeof insertTpl.insertElements === 'string' ? JSON.parse(insertTpl.insertElements) : insertTpl.insertElements;
                  if (elems.type === 'intro_outro' || elems.position === 'start_end') {
                    newSections.push(`[${insertTpl.name} - Opening]`);
                  }
                } catch (e) {}
              }
            }
            // Main body sections from style
            if (styleId) {
              const styleTpl = await db.getLectureFormatTemplate(styleId);
              const styleName = styleTpl?.name || 'Lecture';
              newSections.push(`[Intro] ${styleName}`, `[Body 1] ${styleName}`, `[Body 2] ${styleName}`, `[Body 3] ${styleName}`);
            } else {
              newSections.push('[Intro]', '[Body 1]', '[Body 2]');
            }
            // Middle inserts
            for (const insertId of insertIds) {
              const insertTpl = await db.getLectureFormatTemplate(insertId);
              if (insertTpl?.insertElements) {
                try {
                  const elems = typeof insertTpl.insertElements === 'string' ? JSON.parse(insertTpl.insertElements) : insertTpl.insertElements;
                  if (elems.type !== 'intro_outro' && elems.position !== 'start_end') {
                    newSections.push(`[${insertTpl.name}]`);
                  }
                } catch (e) {}
              }
            }
            newSections.push('[Closing]');
            // Outro inserts
            for (const insertId of insertIds) {
              const insertTpl = await db.getLectureFormatTemplate(insertId);
              if (insertTpl?.insertElements) {
                try {
                  const elems = typeof insertTpl.insertElements === 'string' ? JSON.parse(insertTpl.insertElements) : insertTpl.insertElements;
                  if (elems.type === 'intro_outro' || elems.position === 'start_end') {
                    newSections.push(`[${insertTpl.name} - Closing]`);
                  }
                } catch (e) {}
              }
            }
            // Redistribute existing scripts into new sections
            // Strategy: map existing scripts to closest matching section, or redistribute evenly
            const newScriptCount = newSections.length;
            const existingTexts = existingScripts.map(s => s.scriptText);
            // Try to match by section markers [Intro], [Body], [Closing]
            const redistributed: { text: string; sortOrder: number }[] = [];
            const usedExisting = new Set<number>();
            for (let i = 0; i < newScriptCount; i++) {
              const sectionLabel = newSections[i].toLowerCase();
              // Find matching existing script by label
              let matched = -1;
              for (let j = 0; j < existingTexts.length; j++) {
                if (usedExisting.has(j)) continue;
                const existingLower = existingTexts[j].toLowerCase();
                if (sectionLabel.includes('intro') && existingLower.includes('intro')) { matched = j; break; }
                if (sectionLabel.includes('body 1') && (existingLower.includes('body 1') || existingLower.includes('section 1'))) { matched = j; break; }
                if (sectionLabel.includes('body 2') && (existingLower.includes('body 2') || existingLower.includes('section 2'))) { matched = j; break; }
                if (sectionLabel.includes('body 3') && (existingLower.includes('body 3') || existingLower.includes('section 3'))) { matched = j; break; }
                if (sectionLabel.includes('closing') && existingLower.includes('clos')) { matched = j; break; }
              }
              if (matched >= 0) {
                usedExisting.add(matched);
                redistributed.push({ text: existingTexts[matched], sortOrder: i });
              } else {
                // Use next unmatched existing script or create placeholder
                const nextUnused = existingTexts.findIndex((_, idx) => !usedExisting.has(idx));
                if (nextUnused >= 0) {
                  usedExisting.add(nextUnused);
                  redistributed.push({ text: existingTexts[nextUnused], sortOrder: i });
                } else {
                  redistributed.push({ text: `${newSections[i]} - Write your content here`, sortOrder: i });
                }
              }
            }
            // Append any remaining unmatched scripts at the end
            for (let j = 0; j < existingTexts.length; j++) {
              if (!usedExisting.has(j)) {
                redistributed.push({ text: existingTexts[j], sortOrder: redistributed.length });
              }
            }
            // Delete old scripts and insert new ones
            await db.deleteSlideScripts(id);
            for (const section of redistributed) {
              await db.setSlideScript({ projectId: id, slideId: 0, scriptText: section.text, sortOrder: section.sortOrder });
            }
          }
        } catch (e) { console.error('Failed to migrate scripts:', e); }
      }

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
      const { invokeLLM } = await import("../_core/llm");
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
      const { convertFileToSlideImages, extractFileText } = await import("../slideConverter");
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
      // Check if scripts use slideId=0 (legacy: matched by sortOrder)
      const hasLegacyScripts = scripts.length > 0 && scripts.every(s => s.slideId === 0);
      const segments = filteredSlides.map((slide, slideIdx) => {
        let script;
        if (hasLegacyScripts) {
          // Match by sortOrder (index) when slideId is 0
          script = scripts.find(s => s.sortOrder === slideIdx);
        } else {
          script = scripts.find(s => s.slideId === slide.id);
        }
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
        const { generateLectureVideo } = await import("../lectureVideoGenerator");

        // Progress callback to update DB + push via WebSocket
        const { pushVideoProgress } = await import("../websocket");
        const onProgress = async (progress: { phase: string; current: number; total: number; message: string }) => {
          let pct = 0;
          if (progress.phase === "tts") {
            pct = Math.round((progress.current / progress.total) * 40);
          } else if (progress.phase === "avatar") {
            pct = Math.round((progress.current / progress.total) * 70);
          } else if (progress.phase === "compose") {
            pct = 75;
          } else if (progress.phase === "finalize") {
            pct = 90;
          } else if (progress.phase === "complete") {
            pct = 100;
          }
          const clampedPct = Math.min(95, pct);
          await db.updateLectureProject(input.projectId, {
            generationProgress: clampedPct,
            generationStep: progress.message,
          });
          // Push real-time update via WebSocket
          pushVideoProgress(input.projectId, {
            phase: progress.phase,
            progress: clampedPct,
            step: progress.message,
            status: "generating",
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
        // Push completion via WebSocket
        pushVideoProgress(input.projectId, {
          phase: "complete",
          progress: 100,
          step: "Complete",
          status: "completed",
          videoUrl: result.videoUrl,
        });
        // Update generation history
        await db.updateVideoGeneration(genId, {
          status: "completed",
          videoUrl: result.videoUrl,
          totalDuration: result.totalDuration,
          completedAt: new Date(),
        });
        // Send notification to owner on completion
        try {
          const { notifyOwner } = await import("../_core/notification");
          const durationMin = Math.floor((result.totalDuration || 0) / 60);
          const durationSec = Math.round((result.totalDuration || 0) % 60);
          await notifyOwner({
            title: `🎬 영상 생성 완료`,
            content: `프로젝트 #${input.projectId} 영상 생성이 완료되었습니다.\n슬라이드: ${segments.length}장\n총 길이: ${durationMin}분 ${durationSec}초\n사용자: ${ctx.user.name || ctx.user.email}`,
          });
        } catch (notifErr) {
          console.error("[Notification] Failed to send completion notice:", notifErr);
        }
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
        // Push failure via WebSocket
        try {
          const { pushVideoProgress: pushFail } = await import("../websocket");
          pushFail(input.projectId, {
            phase: "error",
            progress: 0,
            step: error.message,
            status: "failed",
            errorMessage: error.message,
          });
        } catch (_) {}
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

  // --- List all user video generations (with project info) ---
  listAllVideoHistory: protectedProcedure
    .query(async ({ ctx }) => {
      return db.listUserVideoGenerationsWithProject(ctx.user.id);
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

  // --- Regenerate video with same settings ---
  regenerateVideo: protectedProcedure
    .input(z.object({ generationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const gen = await db.getVideoGeneration(input.generationId);
      if (!gen || gen.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      const project = await db.getLectureProject(gen.projectId);
      if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const config = (gen.config as any) || {};
      // Return the config so frontend can call generateVideo with same settings
      return {
        projectId: gen.projectId,
        avatarPosition: config.avatarPosition || "bottom-right",
        avatarSize: config.avatarSize || 25,
        avatarShape: config.avatarShape || "circle",
        avatarOpacity: config.avatarOpacity || 100,
        bgmUrl: config.bgmUrl || undefined,
        bgmVolume: config.bgmVolume || 30,
        noiseReduction: config.noiseReduction || false,
        resolution: gen.resolution || "1080p",
      };
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
      // Check if scripts use slideId=0 (legacy: matched by sortOrder)
      const hasLegacyScripts = scripts.length > 0 && scripts.every(s => s.slideId === 0);
      // Build export segments
      const segments = slides.map((slide, slideIdx) => {
        const script = hasLegacyScripts ? scripts.find(s => s.sortOrder === slideIdx) : scripts.find(s => s.slideId === slide.id);
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
        const { exportLectureVideo } = await import("../videoExporter");
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
      const hasLegacyScripts = scripts.length > 0 && scripts.every(s => s.slideId === 0);
      const orderedScripts = slides.map((slide: any, slideIdx: number) => {
        const script = hasLegacyScripts ? scripts.find(s => s.sortOrder === slideIdx) : scripts.find(s => s.slideId === slide.id);
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
      const { CREDIT_COSTS } = await import("../stripe");
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

      // Resolve relative storage URLs to absolute public URLs for Gemini API
      const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get('host')}`;
      const resolveImageUrl = (url: string) => {
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        // Relative path like /storage/... needs full origin prefix
        return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
      };

      for (const slide of targetSlides) {
        slideContents.push({ type: "text", text: `--- Slide ${slide.slideOrder + 1} (ID: ${slide.id}) ---` });
        slideContents.push({ type: "image_url", image_url: { url: resolveImageUrl(slide.imageUrl) } });
      }

      const { invokeLLM } = await import("../_core/llm");
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
      const { CREDIT_COSTS } = await import("../stripe");
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
      const { generateGeminiTts } = await import("../_core/geminiTts");
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

      const { generateGeminiTts } = await import("../_core/geminiTts");
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
      const { generateGeminiTts } = await import("../_core/geminiTts");
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
});

export const wbCollabRouter = router({
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
});

export const slideLayoutRouter = router({
  recommend: instructorProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get all slides and scripts for this project
      const slides = await db.listProjectSlides(input.projectId);
      const scripts = await db.listSlideScripts(input.projectId);
      if (!slides.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No slides found." });

      // Build prompt for LLM
      const hasLegacyScripts = scripts.length > 0 && scripts.every((sc: any) => sc.slideId === 0);
      const slideInfo = slides.map((s: any, i: number) => {
        const script = hasLegacyScripts ? scripts.find((sc: any) => sc.sortOrder === i) : scripts.find((sc: any) => sc.slideId === s.id);
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
});

export const watermarkRouter = router({
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
});

export const interpretationRouter = router({
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
});

export const collaborationRouter = router({
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
});

