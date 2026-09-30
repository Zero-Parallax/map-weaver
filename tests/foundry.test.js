import test from 'node:test';
import assert from 'node:assert/strict';

import { createMap, insertLevel } from '../src/core/model.js';
import { computeLevelGeometry } from '../src/core/level-geometry.js';
import { createLink } from '../src/core/links.js';
import { buildFoundryScene, cutDoors, chainSegments, foundryId } from '../src/export/foundry.js';

function twoLevelMap() {
  const map = createMap({ name: 'Keep', size: { w: 20, h: 16 } });
  const ground = map.levels[0];
  ground.shapes.push({ id: 'a', kind: 'rect', op: 'add', walled: true, x: 2, y: 2, w: 10, h: 8 });
  ground.shapes.push({ id: 'b', kind: 'rect', op: 'add', walled: true, x: 12, y: 2, w: 4, h: 8 });
  ground.doors.push({ id: 'd1', type: 'door', a: [12, 5], b: [12, 6] });
  ground.doors.push({ id: 'd2', type: 'secret', a: [2, 4], b: [2, 5] });
  ground.doors.push({ id: 'd3', type: 'archway', a: [16, 4], b: [16, 5] });
  const upper = insertLevel(map, 1, 'Gallery');
  upper.shapes.push({ id: 'c', kind: 'rect', op: 'add', walled: true, x: 2, y: 2, w: 10, h: 8 });
  upper.shapes.push({ id: 'v', kind: 'rect', op: 'void', x: 5, y: 4, w: 4, h: 4 });
  map.links.push(createLink('stairs', ground.id, upper.id, { x: 3, y: 6, w: 1, h: 3 }, 'n'));
  return map;
}

const geometry = (map) => (lv) => computeLevelGeometry(lv, map);

test('scene has one Level per map level with stacked elevations and lower levels visible', () => {
  const map = twoLevelMap();
  const scene = buildFoundryScene(map, { geometry: geometry(map), imagePath: (i) => `maps/keep-${i}.png`, pps: 100 });
  assert.equal(scene.width, 2000);
  assert.equal(scene.height, 1600);
  assert.deepEqual(scene.grid, { type: 1, size: 100, distance: 5, units: 'ft' });
  assert.equal(scene.levels.length, 2);
  assert.deepEqual(scene.levels[0].elevation, { bottom: 0, top: 10 });
  assert.deepEqual(scene.levels[1].elevation, { bottom: 10, top: 20 });
  assert.deepEqual(scene.levels[1].visibility.levels, [scene.levels[0]._id]);
  assert.deepEqual(scene.levels[0].visibility.levels, []);
  assert.equal(scene.levels[1].background.src, 'maps/keep-1.png');
  assert.equal(scene.initialLevel, scene.levels[0]._id);
  assert.match(scene.levels[0]._id, /^[A-Za-z0-9]{16}$/);
  // Ids are stable between exports.
  assert.equal(foundryId(map.id, map.levels[0].id), scene.levels[0]._id);
});

test('walls: integer pixel coordinates, tagged with their level, doors cut out of walls', () => {
  const map = twoLevelMap();
  const scene = buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, pps: 100 });
  const ground = scene.levels[0]._id;
  const gw = scene.walls.filter((w) => w.levels[0] === ground);
  for (const w of scene.walls) {
    assert.equal(w.c.length, 4);
    assert.ok(w.c.every(Number.isInteger));
    assert.equal(w.levels.length, 1);
  }
  const door = gw.find((w) => w.door === 1);
  assert.deepEqual(door.c, [1200, 500, 1200, 600]);
  assert.equal(gw.find((w) => w.door === 2).ds, 0);
  // No solid wall runs across the door opening at x = 1200, y 500..600.
  const across = gw.filter((w) => w.door === 0 && w.c[0] === 1200 && w.c[2] === 1200 && Math.min(w.c[1], w.c[3]) < 600 && Math.max(w.c[1], w.c[3]) > 500);
  assert.deepEqual(across, []);
  // Archway leaves a gap with no wall.
  const arch = gw.filter((w) => w.c[0] === 1600 && w.c[2] === 1600 && Math.min(w.c[1], w.c[3]) < 500 && Math.max(w.c[1], w.c[3]) > 400);
  assert.deepEqual(arch, []);
});

test('railings are two walls: movement both ways, sight one way from the open side', () => {
  const map = twoLevelMap();
  const scene = buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, pps: 100 });
  const upper = scene.levels[1]._id;
  const uw = scene.walls.filter((w) => w.levels[0] === upper);
  const moveOnly = uw.filter((w) => w.move === 20 && w.sight === 0 && w.dir === 0);
  const sightOnly = uw.filter((w) => w.move === 0 && w.sight === 20);
  assert.ok(moveOnly.length >= 4, `${moveOnly.length} movement railings`);
  assert.equal(sightOnly.length, moveOnly.length);
  // The top edge of the opening (y = 400, x 500..900). The open side is south (down), which is
  // the right of a wall drawn west->east and the left of one drawn east->west.
  const top = sightOnly.find((w) => w.c[1] === 400 && w.c[3] === 400);
  const westToEast = top.c[0] < top.c[2];
  assert.equal(top.dir, westToEast ? 2 : 1);
  for (const w of sightOnly) assert.equal(w.light, 20);
});

test('stairs opening on the upper level is railed except at the top step', () => {
  const map = twoLevelMap();
  const scene = buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, pps: 100 });
  const upper = scene.levels[1]._id;
  const rails = scene.walls.filter((w) => w.levels[0] === upper && w.move === 20 && w.sight === 0);
  // Stair top side is y = 600 between x 300 and 400: no railing there.
  assert.ok(!rails.some((w) => w.c[1] === 600 && w.c[3] === 600 && Math.min(w.c[0], w.c[2]) < 400 && Math.max(w.c[0], w.c[2]) > 300));
});

test('complexity changes how many walls a curve becomes', () => {
  const map = createMap({ size: { w: 30, h: 30 } });
  map.levels[0].shapes.push({ id: 'c', kind: 'circle', op: 'add', cx: 15, cy: 15, r: 8 });
  const count = (complexity) => buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, complexity }).walls.length;
  const high = count('high');
  const medium = count('medium');
  const low = count('low');
  assert.ok(high > medium && medium > low, `high ${high}, medium ${medium}, low ${low}`);
  assert.ok(low >= 8);
});

test('cutDoors splits a straight wall and chainSegments joins pieces', () => {
  const cut = cutDoors([[[0, 0], [6, 0]]], [{ a: [2, 0], b: [3, 0] }], 0.05);
  assert.deepEqual(cut, [[[0, 0], [2, 0]], [[3, 0], [6, 0]]]);
  assert.deepEqual(chainSegments([[[0, 0], [1, 0]], [[1, 0], [1, 1]], [[5, 5], [6, 5]]]), [[[0, 0], [1, 0], [1, 1]], [[5, 5], [6, 5]]]);
});

test('vision-blocking assets get walls round them', () => {
  const map = createMap({ size: { w: 20, h: 20 } });
  map.levels[0].shapes.push({ id: 'r', kind: 'rect', op: 'add', x: 0, y: 0, w: 10, h: 10 });
  map.levels[0].placements.push({ id: 'p', asset: 'pillar', x: 5.5, y: 5.5, rot: 0 });
  const resolve = () => ({ meta: { blocksVision: true }, footprint: { w: 1, h: 1 } });
  const withAssets = buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, resolve }).walls.length;
  const without = buildFoundryScene(map, { geometry: geometry(map), imagePath: () => null, resolve, assetWalls: false }).walls.length;
  assert.equal(withAssets - without, 4);
});
