import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { transcribeAudio } from "../_core/voiceTranscription";

// Instructor-only procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor permission required." });
  }
  return next({ ctx });
});

export const scriptTemplateRouter = router({
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
});

export const scriptRouter = router({
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
});

