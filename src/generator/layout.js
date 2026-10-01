// Layout generator: a whole level from a style, a room count and a seed.
//
// Layouts (a setting's styles each pick one, plus the room types to use):
//   rooms     rooms scattered in a cluster, joined by corridors (dungeons, stations)
//   building  a footprint split into rooms, with a hallway down the middle when big enough
//   ship      a spine corridor with compartments either side, engines aft, bridge forward
//   caves     rough chambers joined by rough tunnels
//
// Returns {shapes, rooms} for a level: shapes in drawing order and room tags. Corridors are
// 'path' shapes joined Behind, so the rooms they reach keep their walls (doors go there).
// Room types come from the style's pool: {type, weight, max, size: [small|medium|large],
// place: front|back}. Doors and decoration are left to the caller.

import { rng, hash } from '../core/rng.js';
import { newId } from '../core/model.js';
import { computeLevelGeometry } from '../core/level-geometry.js';
import { strokePath } from '../core/clip.js';
import { lerp, dist } from '../core/geom.js';

export const LAYOUTS = ['rooms', 'building', 'ship', 'caves'];

const SIZES = {
  small: { min: 3, max: 5 },
  medium: { min: 5, max: 8 },
  large: { min: 8, max: 12 },
};

const sizeOfArea = (a) => (a < 20 ? 'small' : a <= 48 ? 'medium' : 'large');

function tools(seed) {
  const random = rng(hash('layout', seed));
  const int = (a, b) => a + Math.floor(random() * (b - a + 1));
  const pick = (list) => list[Math.floor(random() * list.length)];
  const chance = (p) => random() < p;
  const weighted = (list, w = (x) => x.weight ?? 1) => {
    const total = list.reduce((s, x) => s + w(x), 0);
    let r = random() * total;
    for (const x of list) if ((r -= w(x)) < 0) return x;
    return list[list.length - 1];
  };
  return { random, int, pick, chance, weighted };
}

/**
 * Choose a type for each room. rooms: [{area, place?}] (any order). Fills room.type.
 * Rooms with a place (front/back) take matching entries first, then the largest rooms take
 * one-off large types, then the rest are drawn by weight, within each entry's max and sizes.
 */
export function assignTypes(rooms, pool, t) {
  const used = new Map();
  const free = (e) => !e.max || (used.get(e.type) || 0) < e.max;
  const fits = (e, room) => !e.size || e.size.includes(sizeOfArea(room.area));
  const give = (room, e) => {
    room.type = e.type;
    used.set(e.type, (used.get(e.type) || 0) + 1);
  };
  for (const room of rooms) {
    const e = room.place && pool.find((x) => x.place === room.place && free(x));
    if (e) give(room, e);
  }
  const bySize = rooms.filter((r) => !r.type).sort((a, b) => b.area - a.area);
  for (const e of pool.filter((x) => x.max === 1 && x.size?.length === 1 && x.size[0] === 'large' && !x.place)) {
    const room = bySize.find((r) => !r.type && r.area >= 24);
    if (room && t.chance(0.9)) give(room, e);
  }
  for (const room of rooms) {
    if (room.type) continue;
    let options = pool.filter((e) => !e.place && free(e) && fits(e, room));
    if (!options.length) options = pool.filter((e) => !e.place && free(e));
    if (!options.length) options = pool.filter((e) => !e.place);
    if (options.length) give(room, t.weighted(options));
  }
  return rooms;
}

/** Sizes to draw a room from, for a type (or any). */
function sizeFor(entry, t) {
  const names = entry?.size || ['small', 'medium', 'medium', 'large'];
  const s = SIZES[t.pick(names)];
  return [t.int(s.min, s.max), t.int(s.min, s.max)];
}

const overlaps = (a, b, gap) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
const centreOf = (r) => [r.x + r.w / 2, r.y + r.h / 2];

/** Rooms placed in a cluster: each new room near one already placed. */
function placeCluster(n, size, t, sizeOf, gap) {
  const placed = [];
  const margin = 2;
  for (let i = 0; i < n; i++) {
    for (let attempt = 0; attempt < 120; attempt++) {
      let [w, h] = sizeOf(i);
      if (attempt > 60) [w, h] = [Math.max(3, w - 2), Math.max(3, h - 2)];
      let x;
      let y;
      if (!placed.length) {
        x = Math.round((size.w - w) / 2);
        y = Math.round((size.h - h) / 2);
      } else {
        const near = t.pick(placed);
        const d = gap + t.int(0, 4);
        const side = t.int(0, 3);
        if (side === 0) [x, y] = [near.x + near.w + d, near.y + t.int(-h + 2, near.h - 2)];
        else if (side === 1) [x, y] = [near.x - w - d, near.y + t.int(-h + 2, near.h - 2)];
        else if (side === 2) [x, y] = [near.x + t.int(-w + 2, near.w - 2), near.y + near.h + d];
        else [x, y] = [near.x + t.int(-w + 2, near.w - 2), near.y - h - d];
      }
      const r = { x, y, w, h, index: i };
      if (x < margin || y < margin || x + w > size.w - margin || y + h > size.h - margin) continue;
      if (placed.some((p) => overlaps(p, r, gap))) continue;
      placed.push(r);
      break;
    }
  }
  return placed;
}

/** Minimum spanning tree over room centres, plus a few short extra links for loops. */
function connections(rooms, t, loops = 0.15) {
  const n = rooms.length;
  const d = (i, j) => dist(centreOf(rooms[i]), centreOf(rooms[j]));
  const inTree = new Set([0]);
  const edges = [];
  while (inTree.size < n) {
    let best = null;
    for (const i of inTree) {
      for (let j = 0; j < n; j++) {
        if (inTree.has(j)) continue;
        if (!best || d(i, j) < best.d) best = { i, j, d: d(i, j) };
      }
    }
    edges.push([best.i, best.j]);
    inTree.add(best.j);
  }
  const extra = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (!edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) extra.push({ i, j, d: d(i, j) });
  }
  extra.sort((a, b) => a.d - b.d);
  const count = Math.round(n * loops);
  for (const e of extra.slice(0, count)) if (t.chance(0.7)) edges.push([e.i, e.j]);
  return edges;
}

/** Corridor centre line from room a to room b: straight where they line up, else one bend. */
function corridorPath(a, b, width, t) {
  const off = width % 2 ? 0.5 : 0;
  const snapC = (v) => Math.round(v - off) + off;
  const ox0 = Math.max(a.x, b.x) + width / 2 + 1;
  const ox1 = Math.min(a.x + a.w, b.x + b.w) - width / 2 - 1;
  if (ox1 >= ox0) {
    const x = snapC((ox0 + ox1) / 2);
    return [[x, snapC(a.y + a.h / 2)], [x, snapC(b.y + b.h / 2)]];
  }
  const oy0 = Math.max(a.y, b.y) + width / 2 + 1;
  const oy1 = Math.min(a.y + a.h, b.y + b.h) - width / 2 - 1;
  if (oy1 >= oy0) {
    const y = snapC((oy0 + oy1) / 2);
    return [[snapC(a.x + a.w / 2), y], [snapC(b.x + b.w / 2), y]];
  }
  const [ax, ay] = centreOf(a).map(snapC);
  const [bx, by] = centreOf(b).map(snapC);
  return t.chance(0.5) ? [[ax, ay], [bx, ay], [bx, by]] : [[ax, ay], [ax, by], [bx, by]];
}

/** Floor shape for a room: a rectangle, or now and then rounded, round or octagonal. */
function roomShape(r, shapes, t) {
  const square = Math.abs(r.w - r.h) <= 1 && Math.min(r.w, r.h) >= 5;
  if (square && t.chance(shapes.circle || 0)) {
    const d = Math.min(r.w, r.h);
    return { kind: 'circle', cx: r.x + r.w / 2, cy: r.y + r.h / 2, r: d / 2 };
  }
  if (Math.min(r.w, r.h) >= 5 && t.chance(shapes.octagon || 0)) {
    const c = Math.floor(Math.min(r.w, r.h) / 3);
    const { x, y, w, h } = r;
    return { kind: 'poly', points: [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]] };
  }
  const radius = Math.min(r.w, r.h) >= 4 && t.chance(shapes.round || 0) ? 1 : 0;
  return { kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, radius };
}

// ---- layouts --------------------------------------------------------------------

function roomsLayout(style, n, size, t) {
  const pool = style.rooms;
  const types = assignTypes(Array.from({ length: n }, () => ({ area: 30 })), pool, t).map((r) => r.type);
  const widths = style.corridor?.width || [1, 2];
  const width = t.pick(widths);
  const gap = width + 2;
  const placed = placeCluster(n, size, t, (i) => sizeFor(pool.find((e) => e.type === types[i]), t), gap);
  // Retype by the sizes rooms actually got.
  const rooms = placed.map((r) => ({ ...r, area: r.w * r.h }));
  assignTypes(rooms, pool, t);
  const shapes = rooms.map((r) => ({ ...roomShape(r, style.shapes || {}, t), walled: true }));
  const tags = rooms.map((r) => ({ type: r.type, at: centreOf(r) }));
  const corridors = rooms.length > 1 ? connections(rooms, t, style.loops ?? 0.15).map(([i, j]) => corridorPath(rooms[i], rooms[j], width, t)) : [];
  // One shape for all corridors, so where they meet or run side by side they join up.
  if (corridors.length) shapes.push({ kind: 'path', paths: corridors, width, walled: true, under: true });
  return { shapes, tags, corridors: corridors.map((points) => ({ points, width })) };
}

function buildingLayout(style, n, size, t) {
  const area = n * t.int(28, 38);
  const aspect = 1.2 + t.random() * 0.5;
  let W = Math.min(size.w - 4, Math.round(Math.sqrt(area * aspect)));
  let H = Math.min(size.h - 4, Math.round(area / W));
  W = Math.max(W, 6);
  H = Math.max(H, 6);
  const x0 = Math.round((size.w - W) / 2);
  const y0 = Math.round((size.h - H) / 2);
  const horizontal = W >= H;
  const hall = n >= 5 && Math.min(W, H) >= 10 && style.corridor;
  const hallWidth = 2;
  const leaves = [];
  const drop = n >= 5 && t.chance(0.4); // an L-shaped building: one end room left out
  const want = n + (drop ? 1 : 0);
  // Split a strip into k rooms with cuts across it (so each still touches the hallway).
  // One room in the first strip is made about twice as big: the hall, tavern or throne room.
  const strip = (r, k, big) => {
    const along = horizontal ? r.w : r.h;
    const share = Array.from({ length: k }, () => 0.8 + t.random() * 0.4);
    if (big && k > 1) share[t.int(0, k - 1)] = 2;
    const total = share.reduce((a, b) => a + b, 0);
    const cuts = [];
    let sum = 0;
    for (let i = 0; i < k - 1; i++) cuts.push(Math.round(((sum += share[i]) / total) * along));
    let prev = 0;
    for (const c of [...cuts, along]) {
      if (c - prev >= 3) leaves.push(horizontal ? { x: r.x + prev, y: r.y, w: c - prev, h: r.h } : { x: r.x, y: r.y + prev, w: r.w, h: c - prev });
      prev = c;
    }
  };
  let corridor = null;
  if (hall) {
    const depth = horizontal ? H : W;
    const at = Math.round((depth - hallWidth) / 2 + t.int(-1, 1));
    const a = horizontal ? { x: x0, y: y0, w: W, h: at } : { x: x0, y: y0, w: at, h: H };
    const b = horizontal ? { x: x0, y: y0 + at + hallWidth, w: W, h: H - at - hallWidth } : { x: x0 + at + hallWidth, y: y0, w: W - at - hallWidth, h: H };
    corridor = horizontal ? { x: x0, y: y0 + at, w: W, h: hallWidth } : { x: x0 + at, y: y0, w: hallWidth, h: H };
    const ka = Math.ceil(want / 2);
    strip(a, ka, true);
    strip(b, want - ka, false);
  } else {
    // Binary space partition: split the biggest room along its longer side.
    leaves.push({ x: x0, y: y0, w: W, h: H });
    while (leaves.length < want) {
      leaves.sort((p, q) => q.w * q.h - p.w * p.h);
      const r = leaves[0];
      const vertical = r.w > r.h || (r.w === r.h && t.chance(0.5));
      const len = vertical ? r.w : r.h;
      if (len < 6) break;
      const cut = t.int(Math.max(3, Math.round(len * 0.35)), Math.min(len - 3, Math.round(len * 0.65)));
      leaves.shift();
      if (vertical) leaves.push({ x: r.x, y: r.y, w: cut, h: r.h }, { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h });
      else leaves.push({ x: r.x, y: r.y, w: r.w, h: cut }, { x: r.x, y: r.y + cut, w: r.w, h: r.h - cut });
    }
  }
  if (drop && leaves.length > 3) {
    // Leave out a corner room.
    const corner = (r) => (r.x === x0 || r.x + r.w === x0 + W) && (r.y === y0 || r.y + r.h === y0 + H);
    const i = leaves.findIndex(corner);
    if (i >= 0) leaves.splice(i, 1);
  }
  const rooms = leaves.map((r) => ({ ...r, area: r.w * r.h }));
  assignTypes(rooms, style.rooms, t);
  const shapes = rooms.map((r) => ({ kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, radius: 0, walled: true }));
  const tags = rooms.map((r) => ({ type: r.type, at: centreOf(r) }));
  const corridors = [];
  // A way in from outside: double doors at the end of the hallway, else into the biggest room.
  const entrances = [];
  if (corridor) {
    const points = horizontal
      ? [[corridor.x, corridor.y + 1], [corridor.x + corridor.w, corridor.y + 1]]
      : [[corridor.x + 1, corridor.y], [corridor.x + 1, corridor.y + corridor.h]];
    shapes.push({ kind: 'rect', x: corridor.x, y: corridor.y, w: corridor.w, h: corridor.h, radius: 0, walled: true });
    corridors.push({ points, width: hallWidth });
    entrances.push(horizontal
      ? { a: [corridor.x, corridor.y], b: [corridor.x, corridor.y + 2], wide: true }
      : { a: [corridor.x, corridor.y + corridor.h], b: [corridor.x + 2, corridor.y + corridor.h], wide: true });
  } else if (rooms.length) {
    const r = [...rooms].sort((p, q) => q.area - p.area)[0];
    if (r.y + r.h === y0 + H) entrances.push({ a: [r.x + Math.floor(r.w / 2), r.y + r.h], b: [r.x + Math.floor(r.w / 2) + 1, r.y + r.h] });
    else if (r.y === y0) entrances.push({ a: [r.x + Math.floor(r.w / 2), r.y], b: [r.x + Math.floor(r.w / 2) + 1, r.y] });
    else if (r.x === x0) entrances.push({ a: [r.x, r.y + Math.floor(r.h / 2)], b: [r.x, r.y + Math.floor(r.h / 2) + 1] });
    else entrances.push({ a: [r.x + r.w, r.y + Math.floor(r.h / 2)], b: [r.x + r.w, r.y + Math.floor(r.h / 2) + 1] });
  }
  return { shapes, tags, corridors, entrances };
}

function shipLayout(style, n, size, t) {
  const spine = 2;
  const mid = n - 2; // compartments between engines and bridge
  const engineW = t.int(5, 7);
  const bridgeW = t.int(6, 8);
  const per = t.int(4, 6);
  const top = Math.ceil(mid / 2);
  const bottom = mid - top;
  let middle = Math.max(top, 1) * per;
  const length = Math.min(size.w - 4, engineW + middle + bridgeW);
  middle = length - engineW - bridgeW;
  const maxDepth = Math.max(3, Math.floor((size.h - 4 - spine) / 2));
  const depth = () => Math.min(maxDepth, t.int(4, 6));
  const x0 = Math.round((size.w - length) / 2);
  const sy = Math.round(size.h / 2 - spine / 2);
  const xm = x0 + engineW;
  const xf = xm + middle;
  const rooms = [];
  const side = (count, above) => {
    if (!count) return;
    let prev = 0;
    for (let i = 1; i <= count; i++) {
      const end = i === count ? middle : Math.round((middle * i) / count + (t.random() - 0.5) * 2);
      const w = end - prev;
      if (w >= 3) {
        const d = depth();
        rooms.push({ x: xm + prev, y: above ? sy - d : sy + spine, w, h: d });
      }
      prev = end;
    }
  };
  side(top, true);
  side(bottom, false);
  const tallest = Math.max(4, ...rooms.map((r) => r.h));
  // Engines aft (left), full height with chamfered corners; bridge forward with a pointed nose.
  const ey0 = sy - tallest;
  const ey1 = sy + spine + tallest;
  const engine = { x: x0, y: ey0, w: engineW, h: ey1 - ey0, place: 'back' };
  const by0 = sy - Math.max(3, tallest - 1);
  const by1 = sy + spine + Math.max(3, tallest - 1);
  const bridge = { x: xf, y: by0, w: bridgeW, h: by1 - by0, place: 'front' };
  const all = [...rooms, engine, bridge].map((r) => ({ ...r, area: r.w * r.h }));
  assignTypes(all, style.rooms, t);
  const shapes = rooms.map((r) => ({ kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, radius: 0, walled: true }));
  shapes.push({ kind: 'rect', x: xm, y: sy, w: middle, h: spine, radius: 0, walled: true });
  const c = 2;
  shapes.push({ kind: 'poly', walled: true, points: [[x0 + c, ey0], [xm, ey0], [xm, ey1], [x0 + c, ey1], [x0, ey1 - c], [x0, ey0 + c]] });
  const nose = Math.min(bridgeW - 2, Math.floor((by1 - by0) / 2));
  shapes.push({ kind: 'poly', walled: true, points: [[xf, by0], [xf + bridgeW - nose, by0], [xf + bridgeW, by0 + nose], [xf + bridgeW, by1 - nose], [xf + bridgeW - nose, by1], [xf, by1]] });
  const tags = all.map((r) => ({ type: r.type, at: r.place === 'front' ? [r.x + 2.5, r.y + r.h / 2 + 0.01] : centreOf(r) }));
  return { shapes, tags, corridors: [{ points: [[xm, sy + 1], [xf, sy + 1]], width: spine }] };
}

function blob(c, rx, ry, t) {
  const pts = [];
  const k = 18;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const j = 0.85 + t.random() * 0.3;
    pts.push([+(c[0] + Math.cos(a) * rx * j).toFixed(2), +(c[1] + Math.sin(a) * ry * j).toFixed(2)]);
  }
  return pts;
}

function cavesLayout(style, n, size, t) {
  const width = 2;
  const placed = placeCluster(n, size, t, () => [t.int(5, 10), t.int(5, 9)], 3);
  const rooms = placed.map((r) => ({ ...r, area: Math.round(r.w * r.h * 0.75) }));
  assignTypes(rooms, style.rooms, t);
  const shapes = rooms.map((r) => ({ kind: 'cave', points: blob(centreOf(r), r.w / 2, r.h / 2, t), roughness: 0.6, seed: t.int(1, 1e6), walled: true }));
  const tags = rooms.map((r) => ({ type: r.type, at: centreOf(r) }));
  const corridors = [];
  if (rooms.length > 1) {
    for (const [i, j] of connections(rooms, t, 0.2)) {
      const a = centreOf(rooms[i]);
      const b = centreOf(rooms[j]);
      // A tunnel with a gentle kink, roughened like the chambers.
      const m = lerp(a, b, 0.5);
      const kink = [m[0] + t.int(-2, 2), m[1] + t.int(-2, 2)];
      const points = [a, kink, b];
      const outline = strokePath(points, width)[0];
      if (!outline) continue;
      shapes.push({ kind: 'cave', points: outline.map((p) => [+p[0].toFixed(2), +p[1].toFixed(2)]), roughness: 0.35, seed: t.int(1, 1e6), walled: true, under: true });
      corridors.push({ points, width });
    }
  }
  return { shapes, tags, corridors };
}

const BUILDERS = { rooms: roomsLayout, building: buildingLayout, ship: shipLayout, caves: cavesLayout };

/**
 * Generate a level layout.
 *  style: {layout, rooms: pool, corridor: {type, width}, shapes, loops}
 *  map:   the map (size; geometry needs it), seed: number, count: rooms wanted
 * Returns {shapes, rooms, doors} ready to put on an empty level (doors: ways in from outside).
 */
export function generateLayout({ style, map, count = 8, seed = 1, doorType = 'door' }) {
  const t = tools(seed);
  const build = BUILDERS[style.layout] || roomsLayout;
  const out = build(style, Math.max(2, count), map.size, t);
  const shapes = out.shapes.map((s) => ({ id: newId('s'), op: 'add', ...s }));
  const rooms = out.tags.filter((g) => g.type).map((g) => ({ id: newId('r'), type: g.type, at: g.at, seed: t.int(1, 2 ** 30), reroll: 0 }));
  // Tag the corridors: in a generated layout every other space comes from them.
  const corridorType = style.corridor?.type || style.rooms[0]?.type;
  if (corridorType && out.corridors.length) {
    const level = { shapes, walls: [], doors: [], edges: [], rooms, placements: [] };
    const geo = computeLevelGeometry(level, map);
    for (const r of geo.rooms.regions) {
      if (r.tag || r.area < 2 || !r.cells.length) continue;
      rooms.push({ id: newId('r'), type: corridorType, at: r.labelAt, seed: t.int(1, 2 ** 30), reroll: 0 });
    }
  }
  const doors = (out.entrances || []).map((e) => ({ id: newId('d'), type: e.wide ? (doorType === 'door' ? 'double' : doorType) : doorType, a: e.a, b: e.b }));
  return { shapes, rooms, doors };
}


