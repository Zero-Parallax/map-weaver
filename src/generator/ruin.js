// Ruins: the same map, abandoned. The structural part lives here and runs once per level;
// the furniture part (lights out, pieces lost or knocked askew, rubble and fallen beams) is
// done by the decorator from each room's `ruin` amount, so redecorating keeps the ruin.
//
// amount 0..1:
//   breaches     stretches of inner wall collapse (a 'breach' opening)
//   doors        some doors are broken through, some gone (archways)
//   floor        on the ground (or outdoors) a sinkhole opens (chasm); upstairs the floor falls
//                through to the level below (open-to-below holes)
//   overgrowth   grass creeps over ground-floor rooms and outdoors

import { rng, hash } from '../core/rng.js';
import { newId } from '../core/model.js';
import { computeLevelGeometry } from '../core/level-geometry.js';
import { doorOptions } from '../core/auto-doors.js';
import { pointInRings, dist, lerp } from '../core/geom.js';
import { linksOnLevel } from '../core/links.js';
import { shapeRings } from '../core/shapes.js';

const blob = (c, r, random) => {
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const j = 0.75 + random() * 0.5;
    pts.push([+(c[0] + Math.cos(a) * r * j).toFixed(2), +(c[1] + Math.sin(a) * r * j).toFixed(2)]);
  }
  return pts;
};

/** Ruin one level in place (call inside a commit, then redecorate its rooms). */
export function ruinLevel(map, level, { amount = 0.5, seed = 1 } = {}) {
  const random = rng(hash('ruin', seed, level.id));
  const geo = computeLevelGeometry(level, map);
  const index = map.levels.indexOf(level);
  const ground = index === 0 || !!level.ground;
  const mid = (d) => lerp(d.a, d.b, 0.5);

  // Doors: broken through, or gone altogether.
  for (const d of level.doors) {
    if (['archway', 'window', 'breach', 'secret'].includes(d.type)) continue;
    const r = random();
    if (r < amount * 0.45) d.type = 'breach';
    else if (r < amount * 0.7) d.type = 'archway';
  }

  // Breaches in shared walls, away from doors.
  const spans = [...doorOptions(geo, 1).values()].flatMap((e) => e.options.filter((o) => o.clear >= 1));
  const want = Math.round(amount * (level.rooms.length * 0.7 + 1));
  for (let i = 0; i < want && spans.length; i++) {
    const o = spans.splice(Math.floor(random() * spans.length), 1)[0];
    if (level.doors.some((d) => dist(mid(d), lerp(o.a, o.b, 0.5)) < 2)) continue;
    level.doors.push({ id: newId('d'), type: 'breach', a: o.a, b: o.b });
  }

  // Collapsed floor: inside rooms, clear of stairs and doors.
  const links = linksOnLevel(map, level).map(({ link }) => link);
  const nearLink = (p, r) => links.some((k) => p[0] > k.x - r - 1 && p[0] < k.x + k.w + r + 1 && p[1] > k.y - r - 1 && p[1] < k.y + k.h + r + 1);
  const holes = amount >= 0.3 ? Math.max(1, Math.round(amount * 2)) : 0;
  const rooms = geo.rooms.regions.filter((r) => r.tag && r.cells.length >= 16);
  // Overgrowth on the ground floor and outdoors (before the holes, so it can't cover them).
  if (ground && amount >= 0.4) {
    const patches = Math.round(amount * 4);
    for (let i = 0; i < patches && rooms.length; i++) {
      const room = rooms[Math.floor(random() * rooms.length)];
      const [x, y] = room.cells[Math.floor(random() * room.cells.length)];
      level.terrain ??= [];
      level.terrain.push({ id: newId('t'), kind: 'grass', op: 'add', shape: { kind: 'cave', points: blob([x + 0.5, y + 0.5], 1.5 + random() * 2, random), roughness: 0.6, seed: Math.floor(random() * 1e6) } });
    }
  }

  for (let i = 0; i < holes && rooms.length; i++) {
    const r = 1.2 + random() * 1.2;
    const fits = (p, clearance) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dy]) => pointInRings([p[0] + dx * 1.3, p[1] + dy * 1.3], geo.floor)) &&
      !nearLink(p, r) && level.doors.every((d) => dist(mid(d), p) > r + clearance);
    // Any room will do; well clear of doors if possible.
    const all = rooms.flatMap((room) => room.cells);
    let cells = all.filter(([x, y]) => fits([x + 0.5, y + 0.5], 1));
    if (!cells.length) cells = all.filter(([x, y]) => fits([x + 0.5, y + 0.5], 0.3));
    if (!cells.length) continue;
    const [x, y] = cells[Math.floor(random() * cells.length)];
    const points = blob([x + 0.5, y + 0.5], r, random);
    if (ground) {
      level.terrain ??= [];
      level.terrain.push({ id: newId('t'), kind: 'chasm', op: 'add', shape: { kind: 'cave', points, roughness: 0.5, seed: Math.floor(random() * 1e6) } });
    } else {
      const shape = { id: newId('s'), kind: 'cave', op: 'void', points, roughness: 0.5, seed: Math.floor(random() * 1e6) };
      level.shapes.push(shape);
      // A broken edge, not a railing.
      const ring = shapeRings(shape)[0];
      if (ring) level.edges.push({ at: ring[0], kind: 'drop' });
    }
  }

  for (const t of level.rooms) t.ruin = amount;
  level.ruin = amount;
}
