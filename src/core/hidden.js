// Hidden rooms and secrets.
//
// A hidden room is a room tag with `hidden: true`. Its doors are secret doors. The GM sees it
// like any other room (marked hidden); the player map leaves it out altogether, as if the wall
// were solid rock. Foundry gets it drawn (fog of war hides it until the secret door opens).
//
// planHiddenRoom finds room for a small chamber behind one of a room's walls: empty squares,
// clear of every other room by a square, joined to the host by one secret door away from its
// other doors. addHiddenRoom builds it: a walled rect shape, a hidden room tag and the door.

import { regionAt, STEP as SAMPLE } from './rooms.js';
import { newId, newSeed } from './model.js';
import { distToSegment } from './geom.js';

const SIDES = ['n', 'e', 's', 'w'];
const STEP = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const key = (x, y) => `${x},${y}`;

/** Ids of the hidden rooms on a level. */
export function hiddenRoomIds(level) {
  return new Set(level.rooms.filter((r) => r.hidden).map((r) => r.id));
}

/**
 * The level as the players see it: hidden rooms gone (their shapes, inner walls, pieces and
 * the doors into them), so the wall they sit behind reads as solid. The level itself is not
 * changed. Rooms that share a shape with another room can't be cut out; they stay.
 */
export function playerLevel(level, geo) {
  const hidden = hiddenRoomIds(level);
  if (!hidden.size) return level;
  const regionOf = (p) => geo.rooms.regions[regionAt(geo.rooms, p)];
  const isHidden = (p) => {
    const r = regionOf(p);
    return !!(r?.tag && hidden.has(r.tag.id));
  };
  const centre = (ring) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [(x0 + x1) / 2, (y0 + y1) / 2];
  };
  const shapes = level.shapes.filter((s, i) => {
    if (s.hiddenRoom && hidden.has(s.hiddenRoom)) return false;
    const rings = geo.shapeRings?.[i];
    if (!rings?.length || s.op !== 'add') return true;
    return !isHidden(centre(rings[0]));
  });
  if (shapes.length === level.shapes.length) return level;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const touchesHidden = (d) => {
    const m = mid(d.a, d.b);
    const dx = d.b[0] - d.a[0];
    const dy = d.b[1] - d.a[1];
    const len = Math.hypot(dx, dy) || 1;
    const n = [-dy / len, dx / len];
    return isHidden([m[0] + n[0] * 0.5, m[1] + n[1] * 0.5]) || isHidden([m[0] - n[0] * 0.5, m[1] - n[1] * 0.5]);
  };
  return {
    ...level,
    shapes,
    walls: (level.walls || []).filter((w) => !(w.hiddenRoom && hidden.has(w.hiddenRoom)) && !(w.a && w.b && isHidden(w.a) && isHidden(w.b))),
    doors: level.doors.filter((d) => !touchesHidden(d)),
    rooms: level.rooms.filter((r) => !hidden.has(r.id)),
    placements: level.placements.filter((p) => !hidden.has(p.room) && !isHidden([p.x, p.y])),
  };
}

/**
 * Where a hidden room could go behind a wall of the host room (region index): up to `limit`
 * places, best first. random: () => [0, 1). Each is {rect: {x, y, w, h}, door: {a, b}}.
 */
export function planHiddenRoom(level, map, geo, hostIndex, random, limit = 8) {
  const host = geo.rooms.regions[hostIndex];
  const found = [];
  if (!host) return found;
  // A square counts as built on if any of the room grid's samples inside it is floor (read
  // straight from the grid: regionAt looks round a point, which spills over walls). Sample
  // (i, j) sits at (OX + i * SAMPLE, OY + j * SAMPLE), so a square's samples start at x / SAMPLE.
  const { grid, labels } = geo.rooms;
  const per = Math.round(1 / SAMPLE);
  /** Which rooms (region indexes) have floor in square (x, y): 'none', 'host' or 'other'. */
  const whose = (x, y) => {
    let found = 'none';
    for (let j = 0; j < per; j++) {
      for (let i = 0; i < per; i++) {
        const si = Math.round((x + i * SAMPLE) / SAMPLE);
        const sj = Math.round((y + j * SAMPLE) / SAMPLE);
        if (si < 0 || sj < 0 || si >= grid.nx || sj >= grid.ny) continue;
        const l = labels[sj * grid.nx + si];
        if (l < 0) continue;
        if (l !== hostIndex) return 'other';
        found = 'host';
      }
    }
    return found;
  };
  const built = (x, y) => whose(x, y) !== 'none';
  const inMap = (x, y) => x >= 1 && y >= 1 && x < map.size.w - 1 && y < map.size.h - 1;
  const doorMids = level.doors.map((d) => [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2]);
  const nearDoor = (x, y, r) => doorMids.some(([mx, my]) => Math.hypot(mx - (x + 0.5), my - (y + 0.5)) < r);
  const links = (map.links || []).filter((k) => k.from === level.id || k.to === level.id);
  const onLink = (x, y) => links.some((k) => x + 1 > k.x && x < k.x + k.w && y + 1 > k.y && y < k.y + k.h);

  // Contact squares: host squares with nothing built beyond one side.
  const contacts = [];
  for (const [x, y] of host.cells) {
    for (const s of SIDES) {
      const [dx, dy] = STEP[s];
      if (built(x + dx, y + dy) || nearDoor(x, y, 1.6) || onLink(x, y)) continue;
      contacts.push({ x, y, s });
    }
  }
  // Shuffle.
  for (let i = contacts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [contacts[i], contacts[j]] = [contacts[j], contacts[i]];
  }
  const sizes = [[4, 3], [3, 4], [5, 3], [3, 3], [4, 4], [3, 2], [2, 3]];
  const used = new Set();
  for (const { x, y, s } of contacts.slice(0, 120)) {
    if (found.length >= limit) break;
    if (used.has(`${x},${y}`)) continue;
    sizing: for (const [a, b] of sizes) {
      // depth: how far the room goes back from the wall; span: along the wall.
      const span = s === 'n' || s === 's' ? a : b;
      const depth = s === 'n' || s === 's' ? b : a;
      for (let off = 0; off < span; off++) {
        let rect;
        if (s === 'n') rect = { x: x - off, y: y - depth, w: span, h: depth };
        else if (s === 's') rect = { x: x - off, y: y + 1, w: span, h: depth };
        else if (s === 'w') rect = { x: x - depth, y: y - off, w: depth, h: span };
        else rect = { x: x + 1, y: y - off, w: depth, h: span };
        if (fits(rect)) {
          const door = s === 'n' ? { a: [x, y], b: [x + 1, y] }
            : s === 's' ? { a: [x, y + 1], b: [x + 1, y + 1] }
              : s === 'w' ? { a: [x, y], b: [x, y + 1] }
                : { a: [x + 1, y], b: [x + 1, y + 1] };
          found.push({ rect, door });
          used.add(`${x},${y}`);
          break sizing;
        }
      }
    }
  }
  return found;

  function fits(r) {
    for (let j = r.y - 1; j <= r.y + r.h; j++) {
      for (let i = r.x - 1; i <= r.x + r.w; i++) {
        const inside = i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h;
        if (inside) {
          if (!inMap(i, j) || built(i, j)) return false;
          continue;
        }
        // The ring round it stays clear of every room but the host (which may wrap round it:
        // the caller checks the two still come out as separate rooms).
        if (whose(i, j) === 'other') return false;
      }
    }
    return true;
  }
}

/**
 * Build a hidden room on the level in place (call inside a commit). Returns the new tag, or
 * null if there's no room for one. kinds: [{type, name}] to choose from.
 */
export function addHiddenRoom(level, map, geo, hostIndex, { kinds = [], random = Math.random, mood, check } = {}) {
  const hostTag = geo.rooms.regions[hostIndex]?.tag;
  const kind = kinds.length ? kinds[Math.floor(random() * kinds.length)] : { type: 'storeroom', name: 'Hidden room' };
  for (const { rect, door } of planHiddenRoom(level, map, geo, hostIndex, random)) {
    const tag = {
      id: newId('r'), type: kind.type, name: kind.name, at: [rect.x + rect.w / 2, rect.y + rect.h / 2], seed: newSeed(), reroll: 0,
      hidden: true, autoDoors: true,
      // A well-kept secret, or long forgotten.
      mood: mood || (random() < 0.5 ? 'pristine' : 'neglected'),
    };
    const shape = { id: newId('s'), op: 'add', kind: 'rect', ...rect, radius: 0, walled: true, hiddenRoom: tag.id };
    const d = { id: newId('d'), type: 'secret', ...door };
    level.shapes.push(shape);
    level.rooms.push(tag);
    level.doors.push(d);
    // It must come out as a room of its own with a wall (and the door) between it and the host:
    // rough cave walls or curves can run into it and merge the two.
    if (!check || check(level, tag, hostTag, d)) return tag;
    // Rough cave walls and curves can wrap round its corners and leak in: wall it in fully.
    const { x, y, w, h } = rect;
    const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const added = corners.map((a, i) => {
      const b = corners[(i + 1) % 4];
      const onDoor = [door.a, door.b].every((p) => (a[0] === b[0] ? p[0] === a[0] : p[1] === a[1]));
      // The side with the door is the host's wall: it stays on the player map.
      return { id: newId('w'), kind: 'line', a, b, ...(onDoor ? {} : { hiddenRoom: tag.id }) };
    });
    level.walls.push(...added);
    if (check(level, tag, hostTag, d)) return tag;
    for (const wl of added) level.walls.splice(level.walls.indexOf(wl), 1);
    level.shapes.splice(level.shapes.indexOf(shape), 1);
    level.rooms.splice(level.rooms.indexOf(tag), 1);
    level.doors.splice(level.doors.indexOf(d), 1);
  }
  return null;
}

/** A check for addHiddenRoom, given the level's geometry function. */
export function hiddenRoomCheck(geometryOf) {
  return (level, tag, hostTag, door) => {
    const geo = geometryOf(level);
    const mine = regionAt(geo.rooms, tag.at);
    if (mine < 0 || geo.rooms.regions[mine]?.tag !== tag) return false;
    if (hostTag && geo.rooms.regions[mine] === geo.rooms.regions[geo.rooms.tagRegion.get(hostTag.id)]) return false;
    const m = [(door.a[0] + door.b[0]) / 2, (door.a[1] + door.b[1]) / 2];
    return geo.wallSegments.some(([a, b]) => distToSegment(m, a, b) < 0.08);
  };
}

/** Region indexes on either side of a door. */
export function doorSides(geo, d) {
  const m = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];
  const dx = d.b[0] - d.a[0];
  const dy = d.b[1] - d.a[1];
  const len = Math.hypot(dx, dy) || 1;
  const n = [-dy / len, dx / len];
  return [regionAt(geo.rooms, [m[0] + n[0] * 0.5, m[1] + n[1] * 0.5]), regionAt(geo.rooms, [m[0] - n[0] * 0.5, m[1] - n[1] * 0.5])];
}

/**
 * Rooms with a single way in (one door, no stairs): they can be made hidden without cutting
 * anything off. Returns region indexes, smallest first.
 */
export function deadEnds(level, map, geo, skipTypes = []) {
  const doorsOf = new Map();
  for (const d of level.doors) {
    for (const i of new Set(doorSides(geo, d))) if (i >= 0) doorsOf.set(i, (doorsOf.get(i) || 0) + 1);
  }
  const links = (map.links || []).filter((k) => k.from === level.id || k.to === level.id);
  return geo.rooms.regions
    .map((r, index) => ({ r, index }))
    .filter(({ r, index }) => r.tag && !r.tag.hidden && !skipTypes.includes(r.tag.type) && doorsOf.get(index) === 1 && r.cells.length <= 70)
    .filter(({ r }) => !links.some((k) => r.cells.some(([x, y]) => x + 1 > k.x && x < k.x + k.w && y + 1 > k.y && y < k.y + k.h)))
    .sort((a, b) => a.r.cells.length - b.r.cells.length)
    .map(({ index }) => index);
}
