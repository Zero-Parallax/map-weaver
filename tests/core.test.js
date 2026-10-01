import test from 'node:test';
import assert from 'node:assert/strict';

import { signedArea, roundPolygon, classifySegments, pointInRings } from '../src/core/geom.js';
import { createMap, createLevel, loadMap, saveMap } from '../src/core/model.js';
import { computeLevelGeometry } from '../src/core/level-geometry.js';
import { snapDoor } from '../src/core/doors.js';
import { regionAt } from '../src/core/rooms.js';

const area = (rings) => Math.abs(rings.reduce((s, r) => s + signedArea(r), 0));

function level(shapes, walls = [], rooms = []) {
  const lv = createLevel();
  lv.shapes = shapes.map((s, i) => ({ id: 's' + i, op: 'add', walled: true, ...s }));
  lv.walls = walls.map((w, i) => ({ id: 'w' + i, ...w }));
  lv.rooms = rooms;
  return lv;
}

const map = createMap({ size: { w: 30, h: 30 } });

test('rounded polygon has smaller area than the square', () => {
  const sq = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const r = roundPolygon(sq, 1);
  const expected = 16 - (4 - Math.PI);
  assert.ok(Math.abs(Math.abs(signedArea(r)) - expected) < 0.05);
});

test('classifySegments splits at polygon edges', () => {
  const ring = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const parts = classifySegments([[[-2, 2], [6, 2]]], [ring]);
  assert.deepEqual(parts.map((p) => p.where), ['outside', 'inside', 'outside']);
  const onEdge = classifySegments([[[0, 0], [4, 0]]], [ring]);
  assert.deepEqual(onEdge.map((p) => p.where), ['edge']);
});

test('union and subtract build the floor', () => {
  const lv = level([
    { kind: 'rect', x: 0, y: 0, w: 10, h: 10 },
    { kind: 'rect', x: 5, y: 5, w: 10, h: 10 },
    { kind: 'rect', x: 2, y: 2, w: 2, h: 2, op: 'subtract' },
  ]);
  const geo = computeLevelGeometry(lv, map);
  assert.ok(Math.abs(area(geo.floor) - (100 + 100 - 25 - 4)) < 1e-6);
  assert.ok(!pointInRings([3, 3], geo.floor));
  assert.ok(pointInRings([1, 1], geo.floor));
});

test('two walled rooms side by side share one wall and are separate rooms', () => {
  const lv = level([
    { kind: 'rect', x: 1, y: 1, w: 5, h: 5 },
    { kind: 'rect', x: 6, y: 1, w: 5, h: 5 },
  ]);
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.rooms.regions.length, 2);
  const total = geo.inner.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0);
  assert.ok(Math.abs(total - 5) < 1e-6, `shared wall length ${total}`);
  assert.equal(geo.rooms.regions[0].cells.length, 25);
});

test('an unwalled extension merges with the room', () => {
  const lv = level([
    { kind: 'rect', x: 1, y: 1, w: 5, h: 5 },
    { kind: 'rect', x: 6, y: 2, w: 2, h: 3, walled: false },
  ]);
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.rooms.regions.length, 1);
  assert.equal(geo.inner.length, 0);
});

test('diagonal hand-drawn wall splits a room', () => {
  const lv = level([{ kind: 'rect', x: 0, y: 0, w: 6, h: 6 }], [{ kind: 'line', a: [0, 0], b: [6, 6] }]);
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.rooms.regions.length, 2);
  // Cells cut by the diagonal are not "full" cells.
  const cells = geo.rooms.regions.reduce((s, r) => s + r.cells.length, 0);
  assert.equal(cells, 36 - 6);
});

test('circle room with an arc wall', () => {
  const lv = level(
    [{ kind: 'circle', cx: 10, cy: 10, r: 5 }],
    [{ kind: 'arc', c: [10, 10], r: 3, start: 0, sweep: Math.PI * 2 }],
  );
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.rooms.regions.length, 2);
  assert.ok(Math.abs(area(geo.floor) - Math.PI * 25) < 0.2);
});

test('cave shapes are deterministic', () => {
  const pts = [[2, 2], [10, 3], [12, 9], [6, 12], [1, 8]];
  const a = computeLevelGeometry(level([{ kind: 'cave', points: pts, roughness: 0.6, seed: 7 }]), map);
  const b = computeLevelGeometry(level([{ kind: 'cave', points: pts, roughness: 0.6, seed: 7 }]), map);
  assert.deepEqual(a.floor, b.floor);
  assert.equal(a.rooms.regions.length, 1);
});

test('room tags find their region', () => {
  const tags = [{ id: 't1', type: 'crypt', at: [3, 3] }];
  const lv = level([{ kind: 'rect', x: 1, y: 1, w: 5, h: 5 }, { kind: 'rect', x: 6, y: 1, w: 5, h: 5 }], [], tags);
  const geo = computeLevelGeometry(lv, map);
  const idx = geo.rooms.tagRegion.get('t1');
  assert.equal(geo.rooms.regions[idx].tag.type, 'crypt');
  assert.notEqual(regionAt(geo.rooms, [8, 3]), idx);
});

test('doors snap to grid points along straight and diagonal walls', () => {
  assert.deepEqual(snapDoor([0, 0], [6, 0], [2.3, 0.1], 1), { a: [2, 0], b: [3, 0] });
  assert.deepEqual(snapDoor([0, 0], [6, 0], [2.3, 0.1], 2), { a: [1, 0], b: [3, 0] });
  assert.deepEqual(snapDoor([0, 0], [4, 4], [1.6, 1.4], 1), { a: [1, 1], b: [2, 2] });
});

test('maps round-trip through save and load', () => {
  const m = createMap({ name: 'Test' });
  m.levels[0].shapes.push({ id: 'a', kind: 'rect', op: 'add', x: 0, y: 0, w: 3, h: 3 });
  const loaded = loadMap(JSON.parse(saveMap(m)));
  assert.deepEqual(loaded, m);
  assert.throws(() => loadMap({ format: 'other' }), /not a Map Weaver map/);
});

// ---- levels, openings, links ----------------------------------------------

import { insertLevel, removeLevel } from '../src/core/model.js';
import { createLink, linksOnLevel } from '../src/core/links.js';

test('an open-to-below area inside a room gets railings on all four sides', () => {
  const lv = level([
    { kind: 'rect', x: 2, y: 2, w: 10, h: 10 },
    { kind: 'rect', x: 5, y: 5, w: 4, h: 3, op: 'void' },
  ]);
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.edgeRuns.length, 4);
  assert.ok(geo.edgeRuns.every((r) => r.kind === 'railing'));
  assert.ok(Math.abs(area(geo.open) - 12) < 1e-6);
  assert.ok(Math.abs(area(geo.structure) - 100) < 1e-6);
  // The railings are not walls, so doors cannot go there.
  assert.ok(!geo.wallSegments.some(([a, b]) => a[0] === 5 && b[0] === 5));
});

test('a gallery along a wall keeps the outer wall and rails the inner side', () => {
  const lv = level([
    { kind: 'rect', x: 0, y: 0, w: 10, h: 10 },
    { kind: 'rect', x: 0, y: 3, w: 10, h: 7, op: 'void' },
  ]);
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.edgeRuns.length, 1);
  const pts = geo.edgeRuns[0].points;
  assert.ok(pts.every((p) => Math.abs(p[1] - 3) < 1e-9));
  // The outer outline still includes the open part.
  assert.ok(Math.abs(area(geo.structure) - 100) < 1e-6);
});

test('edge overrides turn a run into a wall or a drop', () => {
  const lv = level([
    { kind: 'rect', x: 2, y: 2, w: 10, h: 10 },
    { kind: 'rect', x: 5, y: 5, w: 4, h: 3, op: 'void' },
  ]);
  lv.edges = [{ at: [7, 5], kind: 'wall' }, { at: [5, 6.5], kind: 'drop' }];
  const geo = computeLevelGeometry(lv, map);
  const kinds = geo.edgeRuns.map((r) => r.kind).sort();
  assert.deepEqual(kinds, ['drop', 'railing', 'railing', 'wall']);
  assert.ok(geo.wallSegments.some(([a, b]) => a[1] === 5 && b[1] === 5));
});

test('stairs open the floor above with no railing on the arrival side', () => {
  const m = createMap({ size: { w: 30, h: 30 } });
  const upper = insertLevel(m, 1, 'Upper');
  const lower = m.levels[0];
  lower.shapes.push({ id: 'a', kind: 'rect', op: 'add', x: 0, y: 0, w: 12, h: 12 });
  upper.shapes.push({ id: 'b', kind: 'rect', op: 'add', x: 0, y: 0, w: 12, h: 12 });
  m.links.push(createLink('stairs', lower.id, upper.id, { x: 4, y: 4, w: 2, h: 3 }, 'n'));
  assert.deepEqual(linksOnLevel(m, upper).map((x) => x.role), ['top']);
  const geo = computeLevelGeometry(upper, m);
  assert.ok(Math.abs(area(geo.open) - 6) < 1e-6);
  // Three railed sides; the north (arrival) side is a gap.
  assert.equal(geo.edgeRuns.length, 3);
  assert.ok(!geo.edgeRuns.some((r) => r.points.every((p) => Math.abs(p[1] - 4) < 1e-9)));
  // The lower level is untouched.
  assert.equal(computeLevelGeometry(lower, m).open.length, 0);
});

test('spiral stairs leave a gap in a round railing', () => {
  const m = createMap({ size: { w: 30, h: 30 } });
  const upper = insertLevel(m, 1, 'Upper');
  upper.shapes.push({ id: 'b', kind: 'rect', op: 'add', x: 0, y: 0, w: 12, h: 12 });
  m.links.push(createLink('spiral', m.levels[0].id, upper.id, { x: 4, y: 4, w: 3, h: 3 }, 'e'));
  const geo = computeLevelGeometry(upper, m);
  assert.equal(geo.edgeRuns.length, 1);
  const pts = geo.edgeRuns[0].points;
  assert.ok(pts.every((p) => !(p[0] > 6.8 && Math.abs(p[1] - 5.5) < 0.4)), 'gap on the east side');
});

test('removing a level drops links that no longer span two levels', () => {
  const m = createMap();
  const l2 = insertLevel(m, 1, 'L2');
  const l3 = insertLevel(m, 2, 'L3');
  m.links.push(createLink('stairs', m.levels[0].id, l2.id, { x: 0, y: 0, w: 1, h: 2 }));
  m.links.push(createLink('lift', m.levels[0].id, l3.id, { x: 5, y: 5, w: 2, h: 2 }));
  assert.deepEqual(m.levels.map((l) => l.elevation), [0, 2, 4]);
  removeLevel(m, l2.id);
  assert.equal(m.links.length, 1);
  assert.equal(m.links[0].type, 'lift');
  assert.deepEqual(m.levels.map((l) => l.elevation), [0, 2]);
});

test('join modes: merge, on top and overlap', () => {
  const a = { kind: 'rect', x: 0, y: 0, w: 6, h: 6 };
  const b = { kind: 'rect', x: 4, y: 2, w: 6, h: 2 };
  const regions = (bExtra) => computeLevelGeometry(level([a, { ...b, ...bExtra }]), map).rooms.regions.length;
  assert.equal(regions({ walled: false }), 1); // merge: one big room
  assert.equal(regions({ walled: true }), 2); // on top: B cuts its own room out of A
  assert.equal(regions({ walled: true, overlap: true }), 3); // overlap: A, B and where they cross
  // A room inside a room, either way.
  const inner = { kind: 'rect', x: 2, y: 2, w: 2, h: 2 };
  assert.equal(computeLevelGeometry(level([a, inner]), map).rooms.regions.length, 2);
});

import { wallGroups } from '../src/render/walls.js';

test('walls take their room look; a shared wall takes the thicker', () => {
  const lv = level([
    { kind: 'rect', x: 0, y: 0, w: 5, h: 5 },
    { kind: 'rect', x: 5, y: 0, w: 5, h: 5 },
  ]);
  lv.wallStyles = [
    { at: [2, 2], texture: 'stone', width: 0.3 },
    { at: [7, 2], texture: 'wood', width: 0.1 },
  ];
  const geo = computeLevelGeometry(lv, map);
  lv.doors = [{ id: 'd', a: [5, 2], b: [5, 3], type: 'door' }];
  const { groups, doorWidth } = wallGroups(geo, lv, { texture: 'solid', width: 0.14 });
  const byTexture = Object.fromEntries(groups.map((g) => [g.texture, g]));
  assert.ok(byTexture.stone && byTexture.wood);
  assert.equal(byTexture.solid, undefined);
  // The shared wall at x = 5 is stone (the thicker).
  const shared = byTexture.stone.segments.some(([a, b]) => a[0] === 5 && b[0] === 5);
  assert.ok(shared);
  assert.ok(!byTexture.wood.segments.some(([a, b]) => a[0] === 5 && b[0] === 5));
  assert.equal(doorWidth.get('d'), 0.3);
  // Without room looks everything uses the default.
  lv.wallStyles = [];
  assert.deepEqual(wallGroups(geo, lv, { texture: 'solid', width: 0.14 }).groups.map((g) => g.texture), ['solid']);
});

test('a long outer wall is split where the room beside it changes', () => {
  const lv = level([
    { kind: 'rect', x: 0, y: 0, w: 5, h: 5 },
    { kind: 'rect', x: 5, y: 0, w: 5, h: 5 },
  ]);
  lv.wallStyles = [{ at: [2, 2], texture: 'stone', width: 0.3 }];
  const geo = computeLevelGeometry(lv, map);
  const { groups } = wallGroups(geo, lv, { texture: 'solid', width: 0.14 });
  const stone = groups.find((g) => g.texture === 'stone');
  const topStone = stone.segments.filter(([a, b]) => a[1] === 0 && b[1] === 0);
  const maxX = Math.max(...topStone.flat().map((p) => p[0]));
  assert.ok(Math.abs(maxX - 5) < 0.51, `stone top edge ends near x = 5, got ${maxX}`);
});

test('a corridor stops behind the walls of the rooms it reaches', () => {
  const map = createMap({ setting: 'classic', size: { w: 30, h: 30 } });
  const lv = map.levels[0];
  lv.shapes = [
    { id: 'a', kind: 'rect', op: 'add', walled: true, x: 2, y: 2, w: 5, h: 5 },
    { id: 'b', kind: 'rect', op: 'add', walled: true, x: 14, y: 2, w: 5, h: 5 },
    { id: 'c', kind: 'path', op: 'add', walled: true, under: true, points: [[4, 4], [16, 4]], width: 2 },
  ];
  const geo = computeLevelGeometry(lv, map);
  assert.equal(geo.rooms.regions.length, 3); // two rooms and the corridor between them
  // The rooms keep their walls where the corridor meets them; no stubs inside the rooms.
  const walls = geo.inner.map(([a, b]) => [a, b].map((p) => p.map((v) => +v.toFixed(3))));
  assert.equal(walls.length, 2);
  assert.ok(walls.every(([a, b]) => a[0] === b[0] && [7, 14].includes(a[0])));
});
