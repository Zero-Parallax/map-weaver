import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { readMeta, normalizeMeta, suitsRoom } from '../src/assets/meta.js';
import { assetSvg, recolour, Drawing } from '../src/assets/svg.js';
import { GENERATORS, runGenerator } from '../src/assets/generators.js';
import { buildStarterAssets } from '../src/assets/starter.js';
import { rotatedFootprint, snapCentre, placementContains } from '../src/assets/library.js';

const settings = {};
for (const id of ['classic', 'fantasy', 'scifi']) {
  settings[id] = JSON.parse(await fs.readFile(new URL(`../settings/${id}/setting.json`, import.meta.url), 'utf8'));
}

test('metadata survives a write and read through the SVG', () => {
  const meta = { id: 't', name: 'T', settings: ['classic'], footprint: { w: 2, h: 1 }, placement: 'wall' };
  const svg = assetSvg(meta, new Drawing().rect(0, 0, 10, 10));
  assert.deepEqual(readMeta(svg), meta);
  const { meta: norm, errors } = normalizeMeta(readMeta(svg));
  assert.deepEqual(errors, []);
  assert.equal(norm.wallSide, 'n');
  assert.equal(norm.blocksMovement, true);
  assert.ok(suitsRoom(norm, 'anything'));
});

test('files without metadata or with bad metadata are reported', () => {
  assert.equal(readMeta('<svg></svg>'), null);
  assert.ok(normalizeMeta({ name: 'x' }).errors.length >= 2);
});

test('recolouring defines the palette on the SVG root', () => {
  const svg = assetSvg({ id: 'a', name: 'A', settings: ['x'], footprint: { w: 1, h: 1 } }, new Drawing());
  const out = recolour(svg, { ink: '#123456', paper: '#fedcba', shade: '#aaaaaa', mid: '#777777' });
  assert.match(out, /--ink:#123456/);
});

test('generators size their footprint from the parameters', () => {
  assert.deepEqual(runGenerator('table', { w: 3, h: 2, chairs: true }).footprint, { w: 4, h: 3 });
  assert.deepEqual(runGenerator('table', { w: 3, h: 2, chairs: false }).footprint, { w: 3, h: 2 });
  assert.deepEqual(runGenerator('shelf', { len: 4 }).footprint, { w: 4, h: 1 });
  for (const [id, gen] of Object.entries(GENERATORS)) {
    const params = Object.fromEntries(Object.entries(gen.params).map(([k, [lo]]) => [k, lo]));
    assert.ok(String(runGenerator(id, params).drawing).length > 0, id);
  }
});

test('starter sets: valid, unique, 30+ per setting, room types exist', () => {
  const assets = buildStarterAssets();
  const ids = new Set();
  const perSetting = {};
  for (const { meta } of assets) {
    assert.deepEqual(normalizeMeta(meta).errors, [], meta.id);
    assert.ok(!ids.has(meta.id), `duplicate ${meta.id}`);
    ids.add(meta.id);
    for (const s of meta.settings) {
      perSetting[s] = (perSetting[s] || 0) + 1;
      const known = settings[s].roomTypes.map((t) => t.id);
      const relevant = meta.roomTypes.filter((t) => t === '*' || t === 'by-hand' || known.includes(t));
      assert.ok(relevant.length, `${meta.id} suits no ${s} room type`);
    }
  }
  for (const s of Object.keys(settings)) assert.ok(perSetting[s] >= 30, `${s} has ${perSetting[s]}`);
  // Every room type has something to decorate it with.
  for (const [s, setting] of Object.entries(settings)) {
    for (const t of setting.roomTypes) {
      const n = assets.filter(({ meta }) => meta.settings.includes(s) && (meta.roomTypes.includes(t.id) || meta.roomTypes.includes('*'))).length;
      assert.ok(n >= 3, `${s}/${t.id} has only ${n} assets`);
    }
  }
});

test('asset files on disk match the starter definitions (run tools/generate-assets.js)', async () => {
  for (const { meta, drawing, folder } of buildStarterAssets()) {
    const onDisk = await fs.readFile(new URL(`../assets/${folder}/${meta.id}.svg`, import.meta.url), 'utf8');
    assert.equal(onDisk, assetSvg(meta, drawing), meta.id);
  }
});

test('rotation swaps footprints and keeps assets on the grid', () => {
  assert.deepEqual(rotatedFootprint({ w: 1, h: 2 }, 90), { w: 2, h: 1 });
  assert.deepEqual(rotatedFootprint({ w: 1, h: 2 }, 180), { w: 1, h: 2 });
  assert.deepEqual(snapCentre([4.2, 7.9], { w: 1, h: 2 }, 0), [4.5, 8]);
  assert.deepEqual(snapCentre([4.2, 7.9], { w: 1, h: 2 }, 90), [4, 7.5]);
  const pl = { x: 4, y: 7.5, rot: 90 };
  assert.ok(placementContains(pl, { w: 1, h: 2 }, [4.9, 7.6]));
  assert.ok(!placementContains(pl, { w: 1, h: 2 }, [4.2, 8.2]));
});

// ---- PNG metadata ---------------------------------------------------------

import { readPngMeta, writePngMeta, pngSize, isPng } from '../src/assets/png-meta.js';

const TINY_PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));

test('PNG metadata round trip, replacing rather than stacking', () => {
  assert.ok(isPng(TINY_PNG));
  assert.deepEqual(pngSize(TINY_PNG), { width: 1, height: 1 });
  assert.equal(readPngMeta(TINY_PNG), null);
  const meta = { id: 'user.statue', name: 'Stätue', settings: ['fantasy'], footprint: { w: 2, h: 2 } };
  const once = writePngMeta(TINY_PNG, meta);
  assert.deepEqual(readPngMeta(once), meta);
  const twice = writePngMeta(once, { ...meta, name: 'Statue 2' });
  assert.equal(readPngMeta(twice).name, 'Statue 2');
  assert.equal(twice.length, once.length - Buffer.byteLength('Stätue') + Buffer.byteLength('Statue 2'));
  // The image data survives untouched and the file still ends with IEND.
  assert.deepEqual(pngSize(twice), { width: 1, height: 1 });
  assert.equal(Buffer.from(twice.subarray(-8, -4)).toString('latin1'), 'IEND');
});

test('assets/index.json lists every starter asset (for hosting without the server)', async () => {
  const index = JSON.parse(await fs.readFile(new URL('../assets/index.json', import.meta.url), 'utf8'));
  const starter = buildStarterAssets();
  assert.equal(index.length, starter.length);
  for (const { meta, folder } of starter) {
    const entry = index.find((e) => e.meta.id === meta.id);
    assert.ok(entry, meta.id);
    assert.equal(entry.path, `assets/${folder}/${meta.id}.svg`);
    assert.deepEqual(entry.meta, normalizeMeta(meta).meta);
  }
});

import { ASSET_ALIASES } from '../src/assets/meta.js';

test('merged asset ids point at assets that exist', () => {
  const ids = new Set(buildStarterAssets().map(({ meta }) => meta.id));
  for (const [from, to] of Object.entries(ASSET_ALIASES)) {
    assert.ok(!ids.has(from), `${from} still exists`);
    assert.ok(ids.has(to), `${from} -> ${to} is missing`);
  }
});
