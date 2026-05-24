/**
 * Split routers.ts into domain-based files under server/routers/
 * Strategy: Use brace depth tracking to accurately find router boundaries
 */
import fs from 'fs';
import path from 'path';

const ROUTERS_FILE = path.join(process.cwd(), 'server/routers.ts');
const OUTPUT_DIR = path.join(process.cwd(), 'server/routers');

const content = fs.readFileSync(ROUTERS_FILE, 'utf8');
const lines = content.split('\n');

// Find appRouter start
const appRouterStart = lines.findIndex(l => l.startsWith('export const appRouter = router({'));
console.log(`appRouter starts at line ${appRouterStart + 1}`);

// Find each top-level router by tracking brace depth within appRouter
const routerDefs = [];
let depth = 0;
let inAppRouter = false;
let currentRouter = null;

for (let i = appRouterStart; i < lines.length; i++) {
  const line = lines[i];
  
  if (i === appRouterStart) {
    inAppRouter = true;
    depth = 1; // Opening { of router({
    continue;
  }
  
  if (!inAppRouter) continue;
  
  // Check for router start at depth 1 (top-level within appRouter)
  const routerMatch = line.match(/^  (\w+): router\(\{/);
  if (routerMatch && depth === 1) {
    currentRouter = { name: routerMatch[1], startLine: i, lines: [line] };
    // Count braces on this line
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    continue;
  }
  
  // Track system: systemRouter, line
  if (depth === 1 && !currentRouter && line.match(/^\s+\w+:\s+\w+,?\s*$/)) {
    // Simple reference like "system: systemRouter,"
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    continue;
  }
  
  if (currentRouter) {
    currentRouter.lines.push(line);
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    
    // When depth returns to 1, router block is complete
    if (depth === 1) {
      currentRouter.endLine = i;
      routerDefs.push(currentRouter);
      currentRouter = null;
    }
  } else {
    // Track braces outside routers
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
  }
  
  // appRouter closing
  if (depth === 0 && inAppRouter) {
    console.log(`appRouter ends at line ${i + 1}`);
    break;
  }
}

console.log(`Found ${routerDefs.length} routers`);

// Extract helper functions after appRouter
const appRouterEndLine = routerDefs[routerDefs.length - 1].endLine + 2; // +2 for }); closing
const helperFunctions = lines.slice(appRouterEndLine + 1).join('\n');

// Domain groupings
const domainGroups = {
  'auth': ['auth', 'user'],
  'lecture': ['lecture', 'material', 'enrollment', 'qa', 'progress', 'vodHistory', 'bookmark', 'vod'],
  'voice': ['voiceProfile', 'tts', 'stt', 'voiceClone', 'voiceEffectPreset', 'voiceCloneSample'],
  'avatar': ['avatar', 'sampleFace', 'sampleVoice', 'userAvatar', 'didHistory', 'didPipeline'],
  'script': ['script', 'scriptTemplate'],
  'pipeline': ['pipeline', 'broadcast', 'kling', 'videoEffects', 'pip', 'ppt'],
  'lectureBuilder': ['lectureBuilder', 'slideLayout', 'watermark', 'wbCollab', 'interpretation', 'collaboration'],
  'payment': ['plan', 'subscription', 'credit', 'payment', 'crypto', 'revenue', 'payout'],
  'community': ['community', 'profile', 'gallery', 'marketplace', 'recommendation', 'sharedPreset', 'presetComment', 'presetSearch', 'presetReport', 'presetVersion', 'presetTag', 'myPresets', 'sharedSubtitlePreset', 'subtitleStyle'],
  'admin': ['admin', 'adminAnalytics', 'adminReport', 'adminStats'],
  'misc': ['translation', 'whiteboard', 'certificate', 'faceSwap', 'voiceMod', 'platform', 'session', 'template', 'notification', 'scorm', 'aiHistory', 'akool'],
};

// Verify all routers are assigned
const allAssigned = Object.values(domainGroups).flat();
const unassigned = routerDefs.filter(r => !allAssigned.includes(r.name));
if (unassigned.length > 0) {
  console.log('Unassigned routers:', unassigned.map(r => r.name));
  unassigned.forEach(r => domainGroups.misc.push(r.name));
}

// Create output directory
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Generate each domain file
for (const [domain, routerNames] of Object.entries(domainGroups)) {
  const routers = routerDefs.filter(r => routerNames.includes(r.name));
  if (routers.length === 0) continue;

  // Collect all code for this domain
  const allCode = routers.map(r => r.lines.join('\n')).join('\n');

  // Build imports
  let imports = `import { publicProcedure, router, protectedProcedure } from "../_core/trpc";\nimport { z } from "zod";\nimport { TRPCError } from "@trpc/server";\nimport * as db from "../db";\n`;
  
  if (allCode.includes('invokeLLM')) imports += `import { invokeLLM } from "../_core/llm";\n`;
  if (allCode.includes('storagePut')) imports += `import { storagePut } from "../storage";\n`;
  if (allCode.includes('nanoid')) imports += `import { nanoid } from "nanoid";\n`;
  if (allCode.includes('transcribeAudio')) imports += `import { transcribeAudio } from "../_core/voiceTranscription";\n`;
  if (allCode.includes('generateImage')) imports += `import { generateImage } from "../_core/imageGeneration";\n`;
  if (allCode.includes('generateGeminiTts') || allCode.includes('GEMINI_VOICES')) imports += `import { generateGeminiTts, GEMINI_VOICES } from "../_core/geminiTts";\n`;
  if (allCode.includes('bcrypt')) imports += `import bcrypt from "bcryptjs";\n`;
  if (allCode.includes('sdk')) imports += `import { sdk } from "../_core/sdk";\n`;
  if (allCode.includes('axios')) imports += `import axios from "axios";\n`;
  if (allCode.includes('crypto.')) imports += `import crypto from "crypto";\n`;
  if (allCode.includes('createImageToVideo') || allCode.includes('isKlingConfigured')) imports += `import { createImageToVideo as createImageToVideoApi, getImageToVideoStatus as getImageToVideoStatusApi, createTextToVideo as createTextToVideoApi, getTextToVideoStatus as getTextToVideoStatusApi, isKlingConfigured } from "../kling";\n`;
  if (allCode.includes('eq(')) imports += `import { eq } from "drizzle-orm";\n`;
  if (allCode.includes('projectCollaborators')) imports += `import { projectCollaborators } from "../../drizzle/schema";\n`;
  if (allCode.includes('COOKIE_NAME')) imports += `import { COOKIE_NAME } from "@shared/const";\nimport { getSessionCookieOptions } from "../_core/cookies";\n`;

  let fileContent = imports + '\n';

  // Add shared constants if needed
  if (allCode.includes('safeOptionalNumber')) {
    fileContent += `// Helper: coerce NaN/null/string to undefined for optional number fields\nconst safeOptionalNumber = z.union([z.number(), z.null(), z.undefined()]).optional().transform((val): number | undefined => {\n  if (val === undefined || val === null) return undefined;\n  if (typeof val !== 'number' || isNaN(val)) return undefined;\n  return val;\n});\n\n`;
  }
  if (allCode.includes('instructorProcedure')) {
    fileContent += `// Instructor-only procedure\nconst instructorProcedure = protectedProcedure.use(({ ctx, next }) => {\n  if (ctx.user.platformRole !== "instructor" && ctx.user.role !== "admin") {\n    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor permission required." });\n  }\n  return next({ ctx });\n});\n\n`;
  }
  if (allCode.includes('SUPPORTED_LANGUAGES') && !allCode.includes('const SUPPORTED_LANGUAGES')) {
    fileContent += `import { SUPPORTED_LANGUAGES } from "./shared";\n\n`;
  } else if (allCode.includes('SUPPORTED_LANGUAGES')) {
    fileContent += `const SUPPORTED_LANGUAGES = [\n  { code: "ko", name: "한국어", flag: "🇰🇷" },\n  { code: "en", name: "English", flag: "🇺🇸" },\n  { code: "ja", name: "日本語", flag: "🇯🇵" },\n  { code: "zh", name: "中文", flag: "🇨🇳" },\n  { code: "es", name: "Español", flag: "🇪🇸" },\n  { code: "fr", name: "Français", flag: "🇫🇷" },\n  { code: "de", name: "Deutsch", flag: "🇩🇪" },\n  { code: "pt", name: "Português", flag: "🇧🇷" },\n  { code: "ru", name: "Русский", flag: "🇷🇺" },\n  { code: "ar", name: "العربية", flag: "🇸🇦" },\n  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },\n  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },\n  { code: "th", name: "ไทย", flag: "🇹🇭" },\n  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },\n  { code: "tr", name: "Türkçe", flag: "🇹🇷" },\n  { code: "pl", name: "Polski", flag: "🇵🇱" },\n  { code: "nl", name: "Nederlands", flag: "🇳🇱" },\n  { code: "it", name: "Italiano", flag: "🇮🇹" },\n  { code: "uk", name: "Українська", flag: "🇺🇦" },\n  { code: "sv", name: "Svenska", flag: "🇸🇪" },\n];\n\n`;
  }
  if (allCode.includes('TTS_VOICES') && !allCode.includes('GEMINI_VOICES')) {
    fileContent += `import { TTS_VOICES } from "./shared";\n\n`;
  } else if (allCode.includes('TTS_VOICES')) {
    fileContent += `const TTS_VOICES = GEMINI_VOICES;\n\n`;
  }

  // Export each router - extract the inner content from the captured lines
  for (const r of routers) {
    // The captured lines include "  routerName: router({" at start and "  })," at end
    // We need to transform to "export const routerNameRouter = router({ ... });"
    const routerLines = [...r.lines];
    
    // Replace first line
    routerLines[0] = `export const ${r.name}Router = router({`;
    
    // Replace last line (remove trailing comma)
    const lastLine = routerLines[routerLines.length - 1];
    if (lastLine.trim() === '}),') {
      routerLines[routerLines.length - 1] = '});';
    }
    
    // Remove 2 spaces of indentation from inner lines (they were indented within appRouter)
    const dedented = routerLines.map((l, idx) => {
      if (idx === 0) return l; // First line already handled
      if (idx === routerLines.length - 1) return l; // Last line already handled
      return l.startsWith('  ') ? l.slice(2) : l;
    });
    
    fileContent += dedented.join('\n') + '\n\n';
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, `${domain}.ts`), fileContent);
  console.log(`  Created ${domain}.ts (${routers.length} routers, ${fileContent.split('\n').length} lines)`);
}

// Create shared.ts
const sharedContent = `import { GEMINI_VOICES } from "../_core/geminiTts";\n\nexport const SUPPORTED_LANGUAGES = [\n  { code: "ko", name: "한국어", flag: "🇰🇷" },\n  { code: "en", name: "English", flag: "🇺🇸" },\n  { code: "ja", name: "日本語", flag: "🇯🇵" },\n  { code: "zh", name: "中文", flag: "🇨🇳" },\n  { code: "es", name: "Español", flag: "🇪🇸" },\n  { code: "fr", name: "Français", flag: "🇫🇷" },\n  { code: "de", name: "Deutsch", flag: "🇩🇪" },\n  { code: "pt", name: "Português", flag: "🇧🇷" },\n  { code: "ru", name: "Русский", flag: "🇷🇺" },\n  { code: "ar", name: "العربية", flag: "🇸🇦" },\n  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },\n  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },\n  { code: "th", name: "ไทย", flag: "🇹🇭" },\n  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },\n  { code: "tr", name: "Türkçe", flag: "🇹🇷" },\n  { code: "pl", name: "Polski", flag: "🇵🇱" },\n  { code: "nl", name: "Nederlands", flag: "🇳🇱" },\n  { code: "it", name: "Italiano", flag: "🇮🇹" },\n  { code: "uk", name: "Українська", flag: "🇺🇦" },\n  { code: "sv", name: "Svenska", flag: "🇸🇪" },\n];\n\nexport const TTS_VOICES = GEMINI_VOICES;\n`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'shared.ts'), sharedContent);

// Create helpers.ts
if (helperFunctions.trim()) {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'helpers.ts'), helperFunctions + '\n');
  console.log(`  Created helpers.ts`);
}

// Create index.ts
let indexContent = `import { systemRouter } from "../_core/systemRouter";\nimport { router } from "../_core/trpc";\n`;
for (const [domain, routerNames] of Object.entries(domainGroups)) {
  const routers = routerDefs.filter(r => routerNames.includes(r.name));
  if (routers.length === 0) continue;
  const imports = routers.map(r => `${r.name}Router`).join(', ');
  indexContent += `import { ${imports} } from "./${domain}";\n`;
}
indexContent += `\nexport const appRouter = router({\n  system: systemRouter,\n`;
for (const [domain, routerNames] of Object.entries(domainGroups)) {
  const routers = routerDefs.filter(r => routerNames.includes(r.name));
  for (const r of routers) {
    indexContent += `  ${r.name}: ${r.name}Router,\n`;
  }
}
indexContent += `});\n\nexport type AppRouter = typeof appRouter;\n`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
console.log(`  Created index.ts`);

console.log('\nDone! Verify with: npx tsc --noEmit');
