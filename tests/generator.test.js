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
        assert.ok(rooms.length >= 5, `seed ${seed}: only ${rooms.length} rooms`);
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
