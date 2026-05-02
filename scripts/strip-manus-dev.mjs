/**
 * Post-build script: Remove Manus dev-only scripts from production index.html
 * - Removes <script id="manus-runtime">...</script> (inline React devtools)
 * - Removes <script src="/__manus__/debug-collector.js" defer></script>
 * These are only needed in Manus preview environment, not on custom domains.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, '..', 'dist', 'public', 'index.html');

let html = readFileSync(indexPath, 'utf-8');

// Remove manus-runtime inline script (can be multiline)
html = html.replace(/<script id="manus-runtime">[\s\S]*?<\/script>/g, '');

// Remove debug-collector.js reference
html = html.replace(/<script src="\/__manus__\/debug-collector\.js"[^>]*><\/script>/g, '');

// Clean up empty lines
html = html.replace(/\n\s*\n\s*\n/g, '\n\n');

writeFileSync(indexPath, html, 'utf-8');
console.log('[strip-manus-dev] Removed manus-runtime and debug-collector from production build');
