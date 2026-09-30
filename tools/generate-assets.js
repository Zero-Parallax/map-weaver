// Writes the starter asset sets to assets/<folder>/<id>.svg, metadata included.
// Usage: node tools/generate-assets.js
// Files you add yourself are left alone; only starter files are (re)written.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStarterAssets } from '../src/assets/starter.js';
import { assetSvg } from '../src/assets/svg.js';
import { normalizeMeta } from '../src/assets/meta.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = buildStarterAssets();
const counts = {};
const seen = new Set();
for (const { meta, drawing, folder } of assets) {
  const { errors } = normalizeMeta(meta);
  if (errors.length) throw new Error(`${meta.id}: ${errors.join(', ')}`);
  if (seen.has(meta.id)) throw new Error(`Duplicate asset id ${meta.id}`);
  seen.add(meta.id);
  const dir = path.join(ROOT, 'assets', folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${meta.id}.svg`), assetSvg(meta, drawing));
  for (const s of meta.settings) counts[s] = (counts[s] || 0) + 1;
}
console.log(`Wrote ${assets.length} assets.`, counts);
