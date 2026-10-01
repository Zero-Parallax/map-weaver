import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';

import { createMap } from '../src/core/model.js';
import { computeLevelGeometry } from '../src/core/level-geometry.js';
import { planDoors, roomGroups } from '../src/core/auto-doors.js';
import { generateLayout } from '../src/generator/layout.js';

const settings = ['classic', 'fantasy', 'scifi'].map((id) => JSON.parse(fs.readFileSync(new URL(`../settings/${id}/setting.json`, import.meta.url))));

for (const setting of settings) {
  for (const style of setting.generator) {
    test(`${setting.id} ${style.name}: every room is tagged and reachable`, () => {
      const types = new Set(setting.roomTypes.map((t) => t.id));
      for (const seed of [1, 2, 3, 4]) {
        const map = createMap({ setting: setting.id, size: { w: 48, h: 36 } });
        const out = generateLayout({ style, map, count: 9, seed });
        const level = { ...map.levels[0], ...out };
        const geo = computeLevelGeometry(level, map);
        const rooms = geo.rooms.regions.filter((r) => r.area >= 2);
        assert.ok(rooms.length >= (style.layout === 'outdoor' ? 1 : 5), `seed ${seed}: only ${rooms.length} rooms`);
        for (const r of rooms) assert.ok(r.tag, `seed ${seed}: untagged space of ${r.area} sq`);
        for (const t of out.rooms) assert.ok(types.has(t.type), `unknown room type ${t.type}`);
        const doors = planDoors({ geo, doors: out.doors, targets: rooms.map((r) => r.index) });
        assert.equal(roomGroups(geo, [...out.doors, ...doors]), 1, `seed ${seed}: rooms left unreachable`);
      }
    });
  }
}

test('the same seed gives the same layout', () => {
  const style = settings[0].generator[0];
  const map = createMap({ setting: 'classic' });
  const strip = (o) => JSON.stringify(o.shapes.map(({ id, ...s }) => s));
  assert.equal(strip(generateLayout({ style, map, seed: 9 })), strip(generateLayout({ style, map, seed: 9 })));
  assert.notEqual(strip(generateLayout({ style, map, seed: 9 })), strip(generateLayout({ style, map, seed: 10 })));
});

test('outdoor styles: ground, terrain, a bridge where the road crosses the river', () => {
  const fantasy = settings.find((s) => s.id === 'fantasy');
  const style = { ...fantasy.generator.find((g) => g.id === 'forest-road'), road: 1, river: 1 };
  let bridges = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const map = createMap({ setting: 'fantasy', size: { w: 40, h: 30 } });
    const out = generateLayout({ style, map, count: 4, seed });
    assert.equal(out.ground, 'grass');
    assert.ok(out.terrain.some((t) => t.kind === 'water'));
    assert.ok(out.terrain.some((t) => t.kind === 'road'));
    bridges += out.placements.filter((p) => p.asset === 'wooden-bridge').length;
    const level = { ...map.levels[0], ...out };
    const geo = computeLevelGeometry(level, map);
    assert.equal(geo.outerSegments.length, 0, 'no wall along the map edge');
    assert.ok(out.rooms.some((r) => r.type === 'forest'));
  }
  assert.ok(bridges >= 5, `${bridges} bridges in 6 maps`);
});

test('multi-level maps: every pair of levels is joined where both have room', async () => {
  const { generateLevels } = await import('../src/generator/levels.js');
  const { linksOnLevel } = await import('../src/core/links.js');
  for (const setting of settings) {
    for (const style of setting.generator.filter((g) => g.layout !== 'outdoor')) {
      for (const seed of [1, 2]) {
        const map = createMap({ setting: setting.id, size: { w: 48, h: 36 } });
        const linkType = style.layout === 'tower' ? 'spiral' : 'stairs';
        const out = generateLevels({ style, map, count: 7, levels: 3, seed, linkType });
        assert.equal(out.levels.length, 3);
        assert.equal(out.links.length, 2, `${setting.id} ${style.id} seed ${seed}: ${out.links.length} links`);
        const work = { ...map, levels: out.levels, links: out.links };
        for (const link of out.links) {
          for (const id of [link.from, link.to]) {
            const lv = out.levels.find((l) => l.id === id);
            const geo = computeLevelGeometry({ ...lv, rooms: lv.rooms }, { ...work, links: [] });
            for (let y = link.y; y < link.y + link.h; y++) {
              for (let x = link.x; x < link.x + link.w; x++) {
                assert.ok(geo.rooms.regions.some((r) => r.cells.some(([cx, cy]) => cx === x && cy === y)), `${style.id}: link square ${x},${y} not on floor`);
              }
            }
          }
        }
        for (const lv of out.levels) {
          const geo = computeLevelGeometry(lv, work);
          assert.ok(linksOnLevel(work, lv).length >= 1);
          for (const r of geo.rooms.regions.filter((r) => r.area >= 2 && r.cells.length)) assert.ok(r.tag, `${style.id} ${lv.name}: untagged space`);
        }
      }
    }
  }
});

test('ruining a level breaches walls, breaks doors, opens the floor and marks every room', async () => {
  const { ruinLevel } = await import('../src/generator/ruin.js');
  const style = settings[0].generator.find((g) => g.id === 'keep');
  const map = createMap({ setting: 'classic', size: { w: 48, h: 36 } });
  const out = generateLayout({ style, map, count: 8, seed: 3 });
  const level = { ...map.levels[0], ...out, doors: [...out.doors] };
  map.levels[0] = level;
  const geo = computeLevelGeometry(level, map);
  level.doors.push(...planDoors({ geo, targets: geo.rooms.regions.map((r) => r.index) }).map((d, i) => ({ id: 'd' + i, type: 'door', a: d.a, b: d.b })));
  const before = level.doors.length;
  ruinLevel(map, level, { amount: 0.8, seed: 5 });
  assert.ok(level.doors.filter((d) => d.type === 'breach').length >= 2, 'breaches');
  assert.ok(level.doors.length > before, 'new breaches in walls');
  assert.ok(level.terrain.some((t) => t.kind === 'chasm'), 'a sinkhole on the ground floor');
  assert.ok(level.rooms.every((r) => r.ruin === 0.8));
});

test('ruined rooms lose lights and gain rubble, the same on reroll-free redecoration', async () => {
  const { buildStarterAssets } = await import('../src/assets/starter.js');
  const { normalizeMeta } = await import('../src/assets/meta.js');
  const { decorateRoom } = await import('../src/decorator/decorate.js');
  const metas = buildStarterAssets().map(({ meta }) => normalizeMeta(meta).meta).filter((m) => m.settings.includes('fantasy'));
  const map = createMap({ setting: 'fantasy', size: { w: 30, h: 30 } });
  const level = map.levels[0];
  level.shapes.push({ id: 's', kind: 'rect', op: 'add', walled: true, x: 2, y: 2, w: 12, h: 10 });
  level.doors.push({ id: 'd', type: 'door', a: [2, 5], b: [2, 6] });
  const run = (ruin) => {
    const tag = { id: 't', type: 'great-hall', at: [5, 5], seed: 9, reroll: 0, density: 0.6, ruin };
    level.rooms = [tag];
    const geo = computeLevelGeometry(level, map);
    return decorateRoom({ geo, region: geo.rooms.regions[geo.rooms.tagRegion.get('t')], tag, assets: metas, doors: level.doors, mapSeed: 1 }).placements;
  };
  const meta = (p) => metas.find((m) => m.id === p.asset);
  const fresh = run(0);
  const ruined = run(0.9);
  const lights = (ps) => ps.filter((p) => meta(p).light).length;
  assert.ok(lights(ruined) <= lights(fresh));
  assert.ok(ruined.some((p) => meta(p).roomTypes.includes('ruin')), 'ruin pieces');
  assert.deepEqual(run(0.9), ruined, 'same result again');
});
