#!/usr/bin/env node
/**
 * Fails if a class toggled from JS has no CSS rule behind it.
 *
 * Such a class is invisible to the type checker and to the eye — the animation
 * simply never plays. This check exists because `duel-arena__slash--across`
 * shipped in exactly that state.
 *
 * Runs in plain Node rather than vitest: Vite's CSS pipeline returns an empty
 * string for `?raw`/`?inline` stylesheet imports, so a test cannot read them.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const cssFiles = globSync('src/**/*.css');
const srcFiles = globSync('src/**/*.{ts,tsx}').filter((f) => !f.includes('.test.'));

const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const defined = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]));

const runtime = new Map();
for (const file of srcFiles) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(\s*'([^']+)'/g)) runtime.set(m[1], file);
  for (const m of src.matchAll(/replayClass\([^,]+,\s*'([^']+)'\)/g)) runtime.set(m[1], file);
}

const missing = [...runtime.entries()].filter(([cls]) => !defined.has(cls));

if (missing.length > 0) {
  console.error(`\n✗ ${missing.length} runtime-toggled class(es) have no CSS rule:\n`);
  for (const [cls, file] of missing) console.error(`    .${cls}  —  ${file}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ all ${runtime.size} runtime-toggled classes have CSS rules (${cssFiles.length} stylesheets)`);
