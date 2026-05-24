/**
 * Fix import paths in split router files.
 * Files moved from server/ to server/routers/, so relative imports need adjustment:
 * - "./_core/..." → "../_core/..."  (already done by split script for top-level imports)
 * - "./db" → "../db"
 * - "./storage" → "../storage"
 * - "./stripe" → "../stripe"
 * - "./akool" → "../akool"
 * - "./kling" → "../kling"
 * - "./slideConverter" → "../slideConverter"
 * - "./lectureVideoGenerator" → "../lectureVideoGenerator"
 * - "./websocket" → "../websocket"
 * - "./videoExporter" → "../videoExporter"
 * 
 * Also need to handle inline imports (dynamic imports within procedures)
 */
import fs from 'fs';
import path from 'path';

const ROUTERS_DIR = path.join(process.cwd(), 'server/routers');

// Path mappings for inline imports
const pathReplacements = [
  [/from ["']\.\/(_core\/[^"']+)["']/g, 'from "../$1"'],
  [/from ["']\.\/db["']/g, 'from "../db"'],
  [/from ["']\.\/storage["']/g, 'from "../storage"'],
  [/from ["']\.\/stripe["']/g, 'from "../stripe"'],
  [/from ["']\.\/akool["']/g, 'from "../akool"'],
  [/from ["']\.\/kling["']/g, 'from "../kling"'],
  [/from ["']\.\/slideConverter["']/g, 'from "../slideConverter"'],
  [/from ["']\.\/lectureVideoGenerator["']/g, 'from "../lectureVideoGenerator"'],
  [/from ["']\.\/websocket["']/g, 'from "../websocket"'],
  [/from ["']\.\/videoExporter["']/g, 'from "../videoExporter"'],
  // require() patterns
  [/require\(["']\.\/(_core\/[^"']+)["']\)/g, 'require("../$1")'],
  [/require\(["']\.\/db["']\)/g, 'require("../db")'],
  [/require\(["']\.\/storage["']\)/g, 'require("../storage")'],
  [/require\(["']\.\/stripe["']\)/g, 'require("../stripe")'],
  [/require\(["']\.\/akool["']\)/g, 'require("../akool")'],
  [/require\(["']\.\/kling["']\)/g, 'require("../kling")'],
  // Dynamic import() patterns
  [/import\(["']\.\/(_core\/[^"']+)["']\)/g, 'import("../$1")'],
  [/import\(["']\.\/db["']\)/g, 'import("../db")'],
  [/import\(["']\.\/storage["']\)/g, 'import("../storage")'],
  [/import\(["']\.\/stripe["']\)/g, 'import("../stripe")'],
  [/import\(["']\.\/akool["']\)/g, 'import("../akool")'],
  [/import\(["']\.\/kling["']\)/g, 'import("../kling")'],
];

const files = fs.readdirSync(ROUTERS_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'shared.ts');

for (const file of files) {
  const filePath = path.join(ROUTERS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [pattern, replacement] of pathReplacements) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  Fixed: ${file}`);
  }
}

// Fix helpers.ts - it references appRouter which is now in index.ts
const helpersPath = path.join(ROUTERS_DIR, 'helpers.ts');
if (fs.existsSync(helpersPath)) {
  let helpers = fs.readFileSync(helpersPath, 'utf8');
  // Remove the AppRouter type export line if present (it's in index.ts now)
  helpers = helpers.replace(/export type AppRouter = typeof appRouter;\n?/, '');
  // Remove appRouter reference
  helpers = helpers.replace(/.*appRouter.*/g, '// [removed - appRouter reference moved to index.ts]');
  fs.writeFileSync(helpersPath, helpers);
  console.log('  Fixed: helpers.ts');
}

// Now handle formatSrtTime, generateCertificateHtml, generateScormManifest, generateScoHtml, generateXapiStatements
// These are helper functions that need to be imported where used
const helpersContent = fs.readFileSync(helpersPath, 'utf8');

// Check which files need these helpers
const helperFunctions = ['formatSrtTime', 'generateCertificateHtml', 'generateScormManifest', 'generateScoHtml', 'generateXapiStatements'];

for (const file of files) {
  const filePath = path.join(ROUTERS_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const neededHelpers = helperFunctions.filter(fn => content.includes(fn) && !content.includes(`function ${fn}`));
  
  if (neededHelpers.length > 0) {
    // Add import at top
    const importLine = `import { ${neededHelpers.join(', ')} } from "./helpers";\n`;
    if (!content.includes('from "./helpers"')) {
      content = importLine + content;
      fs.writeFileSync(filePath, content);
      console.log(`  Added helpers import to ${file}: ${neededHelpers.join(', ')}`);
    }
  }
}

// Make helper functions exported in helpers.ts
let helpersFixed = fs.readFileSync(helpersPath, 'utf8');
for (const fn of helperFunctions) {
  helpersFixed = helpersFixed.replace(new RegExp(`^function ${fn}`, 'm'), `export function ${fn}`);
}
fs.writeFileSync(helpersPath, helpersFixed);
console.log('  Exported helper functions in helpers.ts');

console.log('\nDone fixing imports!');
