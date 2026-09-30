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
      const relevant = meta.roomTypes.filter((t) => t === '*' || known.includes(t));
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
