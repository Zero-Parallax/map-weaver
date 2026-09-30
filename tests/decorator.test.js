import test from 'node:test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

import { createMap, insertLevel } from '../src/core/model.js';
import { computeLevelGeometry } from '../src/core/level-geometry.js';
import { createLink, linksOnLevel } from '../src/core/links.js';
import { buildStarterAssets } from '../src/assets/starter.js';
import { normalizeMeta } from '../src/assets/meta.js';
import { decorateRoom, analyseRoom, footprintOf, rotateSide, DENSITY } from '../src/decorator/decorate.js';
import { rotatedFootprint } from '../src/assets/library.js';

const metas = buildStarterAssets().map(({ meta }) => normalizeMeta(meta).meta);
const forSetting = (s) => metas.filter((m) => m.settings.includes(s));

function setup({ setting = 'classic', type = 'throne-room', w = 10, h = 8, density, doors = true } = {}) {
  const map = createMap({ setting, size: { w: 30, h: 30 } });
  map.seed = 7;
  const level = map.levels[0];
  level.shapes.push({ id: 's1', kind: 'rect', op: 'add', walled: true, x: 2, y: 2, w, h });
  if (doors) {
    level.doors.push({ id: 'd1', type: 'door', a: [2, 5], b: [2, 6] });
    level.doors.push({ id: 'd2', type: 'door', a: [2 + w, 4], b: [2 + w, 5] });
  }
  const tag = { id: 't1', type, at: [4, 4], seed: 42, reroll: 0, density };
  level.rooms.push(tag);
  return { map, level, tag };
}

function run({ map, level, tag }, extra = {}) {
  const geo = computeLevelGeometry(level, map);
  const region = geo.rooms.regions[geo.rooms.tagRegion.get(tag.id)];
  const args = { geo, region, tag, assets: forSetting(map.setting), doors: level.doors, links: linksOnLevel(map, level), mapSeed: map.seed, ...extra };
  return { ...decorateRoom(args), geo, region, room: analyseRoom(args) };
}

function squaresOf(p) {
  const meta = metas.find((m) => m.id === p.asset);
  const f = rotatedFootprint(footprintOf(meta, p.params), p.rot);
  const x0 = p.x - f.w / 2;
  const y0 = p.y - f.h / 2;
  const out = [];
  for (let y = y0; y < y0 + f.h; y++) for (let x = x0; x < x0 + f.w; x++) out.push(`${x},${y}`);
  return { meta, f, x0, y0, squares: out };
}

test('decorates a throne room: required throne, no overlaps, doors kept clear', () => {
  const s = setup();
  const { placements, room } = run(s);
  assert.ok(placements.length >= 3, `placed ${placements.length}`);
  assert.ok(placements.some((p) => p.asset === 'throne'), 'throne placed');
  const used = { floor: new Set(), object: new Set(), overhead: new Set() };
  for (const p of placements) {
    const { meta, squares } = squaresOf(p);
    for (const k of squares) {
      assert.ok(room.cells.has(k), `${p.asset} inside room`);
      assert.ok(!used[meta.layer].has(k), `${p.asset} overlaps at ${k}`);
      used[meta.layer].add(k);
      if (meta.layer !== 'floor') assert.ok(!room.keepClear.has(k), `${p.asset} blocks a door at ${k}`);
    }
  }
});

test('wall pieces have their backs against a wall', () => {
  for (const type of ['library', 'barracks', 'storeroom']) {
    const s = setup({ type, density: DENSITY.heavy });
    const { placements, room } = run(s);
    for (const p of placements) {
      const { meta, f, x0, y0 } = squaresOf(p);
      if (meta.placement !== 'wall') continue;
      const side = rotateSide(meta.wallSide, p.rot);
      const edge = [];
      if (side === 'n') for (let x = x0; x < x0 + f.w; x++) edge.push(`${x},${y0}`);
      if (side === 's') for (let x = x0; x < x0 + f.w; x++) edge.push(`${x},${y0 + f.h - 1}`);
      if (side === 'w') for (let y = y0; y < y0 + f.h; y++) edge.push(`${x0},${y}`);
      if (side === 'e') for (let y = y0; y < y0 + f.h; y++) edge.push(`${x0 + f.w - 1},${y}`);
      for (const k of edge) assert.equal(room.cells.get(k).sides[side], 'wall', `${p.asset} at ${k} faces ${side}`);
    }
  }
});

test('the same seed gives the same room; a reroll changes it', () => {
  const a = run(setup()).placements;
  const b = run(setup()).placements;
  assert.deepEqual(a, b);
  const s = setup();
  s.tag.reroll = 1;
  assert.notDeepEqual(run(s).placements, a);
});

test('heavier density places more', () => {
  const light = run(setup({ type: 'barracks', density: DENSITY.light, w: 12, h: 10 })).placements.length;
  const heavy = run(setup({ type: 'barracks', density: DENSITY.heavy, w: 12, h: 10 })).placements.length;
  assert.ok(heavy > light, `light ${light}, heavy ${heavy}`);
});

test('every room type in every setting gets something and stays walkable between doors', async () => {
  for (const setting of ['classic', 'fantasy', 'scifi']) {
    const types = JSON.parse(await fs.readFile(new URL(`../settings/${setting}/setting.json`, import.meta.url), 'utf8')).roomTypes.map((t) => t.id);
    for (const type of types) {
      for (const reroll of [0, 1, 2]) {
        const s = setup({ setting, type, density: DENSITY.heavy });
        s.tag.reroll = reroll;
        const { placements, room } = run(s);
        assert.ok(placements.length > 0, `${setting}/${type} empty`);
        // Walk from one door to the other around blocking furniture.
        const blocked = new Set(placements.flatMap((p) => (squaresOf(p).meta.blocksMovement ? squaresOf(p).squares : [])));
        const [start, goal] = room.anchors;
        const seen = new Set([start]);
        const queue = [start];
        while (queue.length) {
          const [x, y] = queue.pop().split(',').map(Number);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = `${x + dx},${y + dy}`;
            if (!seen.has(k) && room.cells.has(k) && !blocked.has(k)) {
              seen.add(k);
              queue.push(k);
            }
          }
        }
        assert.ok(seen.has(goal), `${setting}/${type} reroll ${reroll}: doors cut off`);
      }
    }
  }
});

test('stairs and their surroundings stay clear', () => {
  const s = setup({ type: 'barracks', density: DENSITY.heavy });
  const upper = insertLevel(s.map, 1, 'Upper');
  s.map.links.push(createLink('stairs', s.level.id, upper.id, { x: 6, y: 5, w: 2, h: 3 }, 'n'));
  const { placements } = run(s);
  for (const p of placements) {
    const { meta, squares } = squaresOf(p);
    if (meta.layer === 'floor') continue;
    for (const k of squares) {
      const [x, y] = k.split(',').map(Number);
      assert.ok(!(x >= 5 && x <= 8 && y >= 4 && y <= 8), `${p.asset} at ${k} crowds the stairs`);
    }
  }
});

test('hand-placed pieces are respected', () => {
  const s = setup({ type: 'barracks', density: DENSITY.heavy });
  const throne = metas.find((m) => m.id === 'chest');
  const { placements } = run(s, { existing: [{ meta: throne, footprint: { w: 1, h: 1 }, x: 5, y: 2 }] });
  for (const p of placements) {
    const { meta, squares } = squaresOf(p);
    if (meta.layer === 'object') assert.ok(!squares.includes('5,2'), `${p.asset} placed on the hand-placed chest`);
  }
});
