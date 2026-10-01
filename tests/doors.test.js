import test from 'node:test';
import assert from 'node:assert/strict';

import { createMap } from '../src/core/model.js';
import { computeLevelGeometry } from '../src/core/level-geometry.js';
import { regionAt } from '../src/core/rooms.js';
import { planDoors } from '../src/core/auto-doors.js';

function level(shapes, doors = []) {
  const map = createMap({ setting: 'classic', size: { w: 30, h: 30 } });
  const lv = map.levels[0];
  lv.shapes = shapes.map((s, i) => ({ id: 's' + i, kind: 'rect', op: 'add', walled: true, ...s }));
  lv.doors = doors;
  return { map, lv, geo: computeLevelGeometry(lv, map) };
}

const all = (geo) => geo.rooms.regions.map((r) => r.index);

test('two rooms side by side get one door in the middle of their shared wall', () => {
  const { geo } = level([{ x: 2, y: 2, w: 5, h: 5 }, { x: 7, y: 2, w: 5, h: 5 }]);
  const doors = planDoors({ geo, targets: [regionAt(geo.rooms, [3, 3])] });
  assert.equal(doors.length, 1);
  const [d] = doors;
  assert.deepEqual([d.a[0], d.b[0]], [7, 7]);
  assert.equal(Math.abs(d.b[1] - d.a[1]), 1);
  assert.ok(Math.min(d.a[1], d.b[1]) >= 3 && Math.max(d.a[1], d.b[1]) <= 6, 'away from the corners');
});

test('rooms already joined by a door get no second one', () => {
  const { geo, lv } = level([{ x: 2, y: 2, w: 5, h: 5 }, { x: 7, y: 2, w: 5, h: 5 }], [{ id: 'd', type: 'door', a: [7, 3], b: [7, 4] }]);
  assert.equal(planDoors({ geo, doors: lv.doors, targets: all(geo) }).length, 0);
});

test('a window does not count as a way through', () => {
  const { geo, lv } = level([{ x: 2, y: 2, w: 5, h: 5 }, { x: 7, y: 2, w: 5, h: 5 }], [{ id: 'd', type: 'window', a: [7, 3], b: [7, 4] }]);
  const doors = planDoors({ geo, doors: lv.doors, targets: all(geo) });
  assert.equal(doors.length, 1);
  assert.ok(Math.abs(doors[0].a[1] - 3) >= 1, 'not on top of the window');
});

test('rooms along a corridor all open onto the corridor, not each other', () => {
  const rooms = [0, 1, 2].map((i) => ({ x: 2 + i * 5, y: 2, w: 5, h: 5 }));
  const corridor = { x: 2, y: 7, w: 15, h: 2 };
  const { geo } = level([...rooms, corridor]);
  const hall = regionAt(geo.rooms, [5, 8]);
  const doors = planDoors({ geo, targets: all(geo), hub: (r) => r.index === hall });
  assert.equal(doors.length, 3);
  for (const d of doors) assert.ok(d.pair.includes(hall));
});

test('tagging a side room first still only joins it to the corridor', () => {
  const rooms = [0, 1, 2].map((i) => ({ x: 2 + i * 5, y: 2, w: 5, h: 5 }));
  const { geo } = level([...rooms, { x: 2, y: 7, w: 15, h: 2 }]);
  const hall = regionAt(geo.rooms, [5, 8]);
  const doors = planDoors({ geo, targets: [regionAt(geo.rooms, [9, 4])], hub: (r) => r.index === hall });
  assert.equal(doors.length, 1);
  assert.ok(doors[0].pair.includes(hall));
});

test('a narrow corridor end still gets its door', () => {
  const { geo } = level([{ x: 2, y: 2, w: 6, h: 6 }, { x: 8, y: 4, w: 4, h: 1 }]);
  const doors = planDoors({ geo, targets: all(geo) });
  assert.equal(doors.length, 1);
  assert.deepEqual(doors[0].a[0], 8);
});

test('doors keep clear of things standing in front of them', () => {
  const { geo } = level([{ x: 2, y: 2, w: 5, h: 5 }, { x: 7, y: 2, w: 5, h: 5 }]);
  const free = planDoors({ geo, targets: all(geo) })[0];
  const y = (free.a[1] + free.b[1]) / 2;
  const blocked = (p) => Math.abs(p[1] - y) < 0.6;
  const moved = planDoors({ geo, targets: all(geo), blocked })[0];
  assert.ok(Math.abs((moved.a[1] + moved.b[1]) / 2 - y) >= 1);
});

test('round rooms get a door on the curve', () => {
  const { geo } = level([{ x: 2, y: 2, w: 8, h: 8 }, { kind: 'circle', cx: 12, cy: 6, r: 3 }]);
  const doors = planDoors({ geo, targets: all(geo) });
  assert.equal(doors.length, 1);
  assert.ok(Math.abs(Math.hypot(doors[0].b[0] - doors[0].a[0], doors[0].b[1] - doors[0].a[1]) - 1) < 0.05);
});
