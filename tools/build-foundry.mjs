// Builds the Foundry VTT module: dist/foundry/map-weaver/ (module.json at its root, the editor
// in app/), ready to zip, or to copy into Foundry's Data/modules/ for testing.
// Usage: node tools/build-foundry.mjs [version] [repoUrl]
// With a version, module.json gets it, and its manifest/download point at that release.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'foundry', 'map-weaver');
const [version, repoUrl = 'https://github.com/Zero-Parallax/map-weaver'] = process.argv.slice(2);

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
await fs.cp(path.join(ROOT, 'foundry'), OUT, { recursive: true });
// The editor itself: the same files the web version serves.
for (const item of ['index.html', 'src', 'assets', 'settings', 'styles']) {
  await fs.cp(path.join(ROOT, item), path.join(OUT, 'app', item), { recursive: true });
}

const manifestPath = path.join(OUT, 'module.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
if (version) {
  manifest.version = version;
  // Inside the zip, the manifest names this exact release; the copy attached to the release
  // (dist/foundry/module.json) points at "latest" so Foundry can notice updates.
  manifest.manifest = `${repoUrl}/releases/download/v${version}/module.json`;
  manifest.download = `${repoUrl}/releases/download/v${version}/map-weaver.zip`;
}
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const published = { ...manifest, manifest: `${repoUrl}/releases/latest/download/module.json` };
await fs.writeFile(path.join(ROOT, 'dist', 'foundry', 'module.json'), JSON.stringify(published, null, 2) + '\n');
console.log(`Built ${path.relative(ROOT, OUT)} (v${manifest.version}).`);
