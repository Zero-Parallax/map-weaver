// Layout generator: a whole level from a style, a room count and a seed.
//
// Layouts (a setting's styles each pick one, plus the room types to use):
//   rooms     rooms scattered in a cluster, joined by corridors (dungeons, stations)
//   building  an organic floor plan (floorplan.js): wings, branching hallway, grown rooms
//   ship      a spine corridor with compartments either side, engines aft, bridge forward
//   caves     rough chambers joined by rough tunnels
//   outdoor   open ground with a river (water, lava or a chasm), a road with a bridge where
//             they cross, ponds and pools, a campsite and small buildings
//
// Returns {shapes, rooms} for a level: shapes in drawing order and room tags. Corridors are
// 'path' shapes joined Behind, so the rooms they reach keep their walls (doors go there).
// Room types come from the style's pool: {type, weight, max, size: [small|medium|large],
// place: front|back}. Doors and decoration are left to the caller.

import { rng, hash } from '../core/rng.js';
import { newId } from '../core/model.js';
import { computeLevelGeometry } from '../core/level-geometry.js';
import { strokePath } from '../core/clip.js';
import { lerp, dist, projectOnSegment, segmentsIntersect, sub, norm } from '../core/geom.js';
import { chaikinOpen } from '../core/shapes.js';
import { organicBuilding } from './floorplan.js';

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
function placeCluster(n, size, t, sizeOf, gap, anchor = null) {
  const placed = [];
  const margin = 2;
  // With an anchor (the stair room of the level below) the first room goes exactly there.
  if (anchor) placed.push({ x: anchor.x, y: anchor.y, w: anchor.w, h: anchor.h, index: 0 });
  for (let i = placed.length; i < n; i++) {
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

/**
 * Floor shapes for a room and where its label goes. Mostly rectangles, but also rounded,
 * round, octagonal or L-shaped rooms, and rooms with alcoves or a rounded apse at one end
 * (those are unwalled shapes that merge into the room, opening its wall).
 */
function roomShapes(r, shapes, t) {
  const { x, y, w, h } = r;
  const centre = centreOf(r);
  const square = Math.abs(w - h) <= 1 && Math.min(w, h) >= 5;
  if (square && t.chance(shapes.circle ?? 0)) {
    const d = Math.min(w, h);
    return { shapes: [{ kind: 'circle', cx: centre[0], cy: centre[1], r: d / 2, walled: true }], at: centre };
  }
  if (Math.min(w, h) >= 5 && t.chance(shapes.octagon ?? 0)) {
    const c = Math.floor(Math.min(w, h) / 3);
    return { shapes: [{ kind: 'poly', walled: true, points: [[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]] }], at: centre };
  }
  const out = [];
  let at = centre;
  if (Math.min(w, h) >= 6 && t.chance(shapes.l ?? 0.2)) {
    // An L: a corner taken out.
    const cw = Math.round(w * (0.35 + t.random() * 0.15));
    const ch = Math.round(h * (0.35 + t.random() * 0.15));
    const left = t.chance(0.5);
    const top = t.chance(0.5);
    const cx = left ? x + cw : x + w - cw;
    const cy = top ? y + ch : y + h - ch;
    const pts = left && top ? [[cx, y], [x + w, y], [x + w, y + h], [x, y + h], [x, cy], [cx, cy]]
      : !left && top ? [[x, y], [cx, y], [cx, cy], [x + w, cy], [x + w, y + h], [x, y + h]]
        : left && !top ? [[x, y], [x + w, y], [x + w, y + h], [cx, y + h], [cx, cy], [x, cy]]
          : [[x, y], [x + w, y], [x + w, cy], [cx, cy], [cx, y + h], [x, y + h]];
    out.push({ kind: 'poly', walled: true, points: pts });
    at = [x + w * (left ? 0.68 : 0.32), y + h * (top ? 0.68 : 0.32)];
  } else {
    const radius = Math.min(w, h) >= 4 && t.chance(shapes.round ?? 0) ? 1 : 0;
    out.push({ kind: 'rect', x, y, w, h, radius, walled: true });
    // A rounded apse on one of the short ends (chapels, halls).
    if (!radius && Math.min(w, h) >= 4 && t.chance(shapes.apse ?? 0.12)) {
      const wide = w >= h;
      const end = t.chance(0.5);
      const rr = Math.min(2, Math.floor((wide ? h : w) / 2) - 0.5);
      const c = wide ? [end ? x + w : x, y + h / 2] : [x + w / 2, end ? y + h : y];
      out.push({ kind: 'circle', cx: c[0], cy: c[1], r: rr, walled: false });
    }
  }
  // Alcoves: little niches off the walls.
  if (Math.min(w, h) >= 4 && t.chance(shapes.alcoves ?? 0.3)) {
    const count = t.int(1, 3);
    for (let i = 0; i < count; i++) {
      const side = t.pick(['n', 's', 'e', 'w']);
      const along = side === 'n' || side === 's' ? w : h;
      const len = Math.min(t.pick([1, 2, 2]), along - 2);
      const off = t.int(1, Math.max(1, along - len - 1));
      const niche = side === 'n' ? { x: x + off, y: y - 1, w: len, h: 1 }
        : side === 's' ? { x: x + off, y: y + h, w: len, h: 1 }
          : side === 'w' ? { x: x - 1, y: y + off, w: 1, h: len }
            : { x: x + w, y: y + off, w: 1, h: len };
      // Only where the room's own wall is (not across an L's missing corner).
      const probe = [niche.x + niche.w / 2 - (side === 'e' ? 1 : side === 'w' ? -1 : 0) * 0.6, niche.y + niche.h / 2 - (side === 's' ? 1 : side === 'n' ? -1 : 0) * 0.6];
      if (out[0].kind === 'poly' && !pointInRingsSimple(probe, out[0].points)) continue;
      out.push({ kind: 'rect', ...niche, radius: 0, walled: false });
    }
  }
  return { shapes: out, at };
}

function pointInRingsSimple([px, py], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---- layouts --------------------------------------------------------------------

function roomsLayout(style, n, size, t, anchor) {
  const pool = style.rooms;
  const types = assignTypes(Array.from({ length: n }, () => ({ area: 30 })), pool, t).map((r) => r.type);
  const widths = style.corridor?.width || [1, 2];
  const width = t.pick(widths);
  const gap = width + 2;
  const placed = placeCluster(n, size, t, (i) => sizeFor(pool.find((e) => e.type === types[i]), t), gap, anchor);
  // Retype by the sizes rooms actually got.
  const rooms = placed.map((r) => ({ ...r, area: r.w * r.h }));
  assignTypes(rooms, pool, t);
  // The anchored room (over the stairs below) stays a plain rectangle so the stairs fit.
  const made = rooms.map((r, i) => (anchor && i === 0 ? { shapes: [{ kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, radius: 0, walled: true }], at: centreOf(r) } : roomShapes(r, style.shapes || {}, t)));
  const shapes = made.flatMap((m) => m.shapes);
  const tags = rooms.map((r, i) => ({ type: r.type, at: made[i].at }));
  const corridors = rooms.length > 1 ? connections(rooms, t, style.loops ?? 0.15).map(([i, j]) => corridorPath(rooms[i], rooms[j], width, t)) : [];
  // One shape for all corridors, so where they meet or run side by side they join up.
  if (corridors.length) shapes.push({ kind: 'path', paths: corridors, width, walled: true, under: true });
  return { shapes, tags, corridors: corridors.map((points) => ({ points, width })) };
}

function buildingLayout(style, n, size, t) {
  return organicBuilding(style, n, size, t, assignTypes);
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

function cavesLayout(style, n, size, t, anchor) {
  const width = 2;
  const placed = placeCluster(n, size, t, () => [t.int(5, 10), t.int(5, 9)], 3, anchor && { x: anchor.x - 1, y: anchor.y - 1, w: anchor.w + 2, h: anchor.h + 2 });
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

// ---- outdoor ------------------------------------------------------------------------------

const distToLine = (p, pts) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, projectOnSegment(p, pts[i - 1], pts[i]).dist);
  return best;
};

/** A wandering line across the map: horizontal (along x) or vertical. */
function wander(size, horizontal, t, sway) {
  const along = horizontal ? size.w : size.h;
  const across = horizontal ? size.h : size.w;
  let off = across * (0.3 + t.random() * 0.4);
  const pts = [];
  const steps = Math.max(3, Math.round(along / 8));
  for (let i = 0; i <= steps; i++) {
    const a = -2 + ((along + 4) * i) / steps;
    off = Math.max(4, Math.min(across - 4, off + (t.random() - 0.5) * sway * 2));
    pts.push(horizontal ? [+a.toFixed(2), +off.toFixed(2)] : [+off.toFixed(2), +a.toFixed(2)]);
  }
  return pts;
}

/** Where two polylines cross, with the direction of the second there. */
function crossing(a, b) {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const [p, q, r, s2] = [a[i - 1], a[i], b[j - 1], b[j]];
      if (!segmentsIntersect(p, q, r, s2)) continue;
      const d1 = sub(q, p);
      const d2 = sub(s2, r);
      const den = d1[0] * d2[1] - d1[1] * d2[0];
      const u = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / den;
      return { at: lerp(p, q, u), dir: norm(d2) };
    }
  }
  return null;
}

function blobPoints(c, rx, ry, t) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const j = 0.8 + t.random() * 0.4;
    pts.push([+(c[0] + Math.cos(a) * rx * j).toFixed(2), +(c[1] + Math.sin(a) * ry * j).toFixed(2)]);
  }
  return pts;
}

function outdoorLayout(style, n, size, t) {
  const terrain = [];
  const placements = [];
  const lines = []; // [{pts, clear}] to keep things away from
  const paint = (kind, shape) => terrain.push({ id: newId('t'), kind, op: 'add', shape });
  const horizontal = t.chance(0.5);
  let road = null;
  if (t.chance(style.road ?? 0)) {
    road = chaikinOpen(wander(size, !horizontal, t, 3), 3);
    paint(style.roadKind || 'road', { kind: 'path', points: road, width: 2 });
    lines.push({ pts: road, clear: 2.5 });
  }
  if (t.chance(style.river ?? 0)) {
    const kind = style.riverKind || 'water';
    const w = t.int(2, 4);
    const river = chaikinOpen(wander(size, horizontal, t, 4), 3);
    if (kind === 'water') {
      paint('water', { kind: 'path', points: river, width: w + 2 });
      if (w >= 3) paint('deep-water', { kind: 'path', points: river, width: w });
    } else paint(kind, { kind: 'path', points: river, width: w + 1 });
    lines.push({ pts: river, clear: w / 2 + 2.5 });
    const x = road && crossing(river, road);
    if (x && style.bridge) {
      const angle = Math.round(((Math.atan2(x.dir[1], x.dir[0]) * 180) / Math.PI) / 15) * 15;
      placements.push({ id: newId('a'), asset: style.bridge, x: +x.at[0].toFixed(2), y: +x.at[1].toFixed(2), rot: (angle + 360) % 360, params: { len: w + 4, width: 2 }, auto: false });
    }
  }
  const blobs = [];
  const clearOf = (p, r) => p[0] > r + 1 && p[1] > r + 1 && p[0] < size.w - r - 1 && p[1] < size.h - r - 1 &&
    lines.every((l) => distToLine(p, l.pts) > l.clear + r) && blobs.every((b) => dist(p, b.c) > b.r + r + 1.5);
  const spot = (r) => {
    for (let i = 0; i < 60; i++) {
      const p = [t.int(2, size.w - 2), t.int(2, size.h - 2)];
      if (clearOf(p, r)) return p;
    }
    return null;
  };
  for (const [kind, chance] of Object.entries(style.pools || {})) {
    if (!t.chance(chance)) continue;
    const r = t.int(3, 5);
    const c = spot(r);
    if (!c) continue;
    paint(kind, { kind: 'cave', points: blobPoints(c, r, r * (0.7 + t.random() * 0.4), t), roughness: 0.3, seed: t.int(1, 1e6) });
    blobs.push({ c, r });
  }
  if (style.camp && t.chance(style.camp)) {
    const c = spot(4);
    if (c) {
      // A trodden clearing with a fire, tents round it and bedrolls.
      paint('road', { kind: 'cave', points: blobPoints(c, 4.2, 3.6, t), roughness: 0.3, seed: t.int(1, 1e6) });
      blobs.push({ c, r: 4.5 });
      placements.push({ id: newId('a'), asset: 'campfire', x: c[0] + 0.5, y: c[1] + 0.5, rot: 0, auto: false });
      const tents = t.int(2, 3);
      for (let i = 0; i < tents; i++) {
        const a = (i / tents) * Math.PI * 2 + t.random();
        placements.push({ id: newId('a'), asset: 'tent', x: Math.round(c[0] + Math.cos(a) * 3.5), y: Math.round(c[1] + Math.sin(a) * 3.5), rot: t.int(0, 3) * 90, auto: false });
        placements.push({ id: newId('a'), asset: 'bedroll', x: +(c[0] + Math.cos(a + 0.9) * 2.2).toFixed(1), y: +(c[1] + Math.sin(a + 0.9) * 2.2).toFixed(1), rot: Math.round((((a + 0.9) * 180) / Math.PI) / 15) * 15 % 360, auto: false });
      }
    }
  }
  // Buildings: one room each, away from water and the road.
  const shapes = [];
  const tags = [];
  const houses = [];
  const want = style.buildings ? Math.min(style.buildings.max ?? 4, Math.max(style.buildings.min ?? 0, Math.round(n / 2))) : 0;
  for (let i = 0; i < want; i++) {
    for (let k = 0; k < 80; k++) {
      const w = t.int(5, 8);
      const h = t.int(4, 7);
      const x = t.int(2, size.w - w - 2);
      const y = t.int(2, size.h - h - 2);
      const r = { x, y, w, h };
      const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]];
      if (houses.some((o) => overlaps(o, r, 3))) continue;
      if (!pts.every((p) => lines.every((l) => distToLine(p, l.pts) > l.clear) && blobs.every((b) => dist(p, b.c) > b.r + 1))) continue;
      houses.push({ ...r, area: w * h });
      break;
    }
  }
  if (houses.length) assignTypes(houses, style.buildings.rooms, t);
  for (const r of houses) {
    shapes.push({ kind: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, radius: 0, walled: true });
    tags.push({ type: r.type, at: centreOf(r) });
  }
  // The open ground: one region round everything, tagged with the style's outdoor type.
  const inside = (p) => houses.some((r) => p[0] > r.x && p[0] < r.x + r.w && p[1] > r.y && p[1] < r.y + r.h);
  let at = null;
  for (let i = 0; i < 200 && !at; i++) {
    const p = [t.int(1, size.w - 2) + 0.37, t.int(1, size.h - 2) + 0.41];
    if (!inside(p)) at = p;
  }
  if (at) tags.push({ type: style.region.type, at, density: style.region.density });
  return { shapes, tags, corridors: [], terrain, placements, ground: style.ground || 'grass' };
}

// ---- tower ------------------------------------------------------------------------------

/** A round tower: a central hub and rooms like slices round it, the same outline every floor. */
function towerLayout(style, n, size, t) {
  const R = Math.min(Math.floor(Math.min(size.w, size.h) / 2) - 2, 6 + Math.ceil(n / 3));
  const c = [Math.round(size.w / 2), Math.round(size.h / 2)];
  const k = Math.max(2, Math.min(6, n - 1));
  const hub = 2.5;
  const shapes = [
    { kind: 'circle', cx: c[0], cy: c[1], r: R, walled: true },
    { kind: 'circle', cx: c[0], cy: c[1], r: hub, walled: true },
  ];
  const walls = [];
  // The same slices on every floor (only the room types change), so stairs can line up.
  const turn = ((size.w * 7 + size.h * 3) % 12) * (Math.PI / 6) + 0.26;
  const rooms = [];
  for (let i = 0; i < k; i++) {
    const a = turn + (i / k) * Math.PI * 2;
    walls.push({ kind: 'line', a: [+(c[0] + Math.cos(a) * hub).toFixed(3), +(c[1] + Math.sin(a) * hub).toFixed(3)], b: [+(c[0] + Math.cos(a) * (R + 1)).toFixed(3), +(c[1] + Math.sin(a) * (R + 1)).toFixed(3)] });
    const mid = a + Math.PI / k;
    rooms.push({ at: [c[0] + Math.cos(mid) * (R + hub) / 2, c[1] + Math.sin(mid) * (R + hub) / 2], area: (Math.PI * (R * R - hub * hub)) / k });
  }
  assignTypes(rooms, style.rooms, t);
  const tags = [...rooms.map((r) => ({ type: r.type, at: r.at })), { type: style.corridor?.type || style.rooms[0].type, at: [c[0] + 0.3, c[1] + 0.4] }];
  return { shapes, walls, tags, corridors: [], entrances: [{ a: [c[0] - 0.5, c[1] + R], b: [c[0] + 0.5, c[1] + R] }] };
}

const BUILDERS = { rooms: roomsLayout, building: buildingLayout, ship: shipLayout, caves: cavesLayout, outdoor: outdoorLayout, tower: towerLayout };

/**
 * Generate a level layout.
 *  style: {layout, rooms: pool, corridor: {type, width}, shapes, loops}
 *  map:   the map (size; geometry needs it), seed: number, count: rooms wanted
 * Returns {shapes, rooms, doors, terrain, placements, ground} ready to put on an empty level
 * (doors: ways in from outside; placements: bridges and camps the layout puts down itself).
 */
export function generateLayout({ style, map, count = 8, seed = 1, doorType = 'door', anchor = null }) {
  const t = tools(seed);
  const build = BUILDERS[style.layout] || roomsLayout;
  const out = build(style, Math.max(2, count), map.size, t, anchor);
  const shapes = out.shapes.map((s) => ({ id: newId('s'), op: 'add', ...s }));
  const rooms = out.tags.filter((g) => g.type).map((g) => ({ id: newId('r'), type: g.type, at: g.at, seed: t.int(1, 2 ** 30), reroll: 0, ...(g.density != null ? { density: g.density } : {}) }));
  // Tag what is left: corridors (every other space in a generated layout comes from them), or
  // pieces a layout knows the type of (a room a tower cut a corner off).
  const corridorType = style.corridor?.type || style.rooms?.[0]?.type;
  if ((corridorType && out.corridors.length) || out.typeAt) {
    const level = { shapes, walls: out.walls || [], doors: [], edges: [], rooms, placements: [] };
    const geo = computeLevelGeometry(level, map);
    for (const r of geo.rooms.regions) {
      if (r.tag || r.area < 2 || !r.cells.length) continue;
      const type = out.typeAt?.(r.labelAt) || corridorType;
      if (type) rooms.push({ id: newId('r'), type, at: r.labelAt, seed: t.int(1, 2 ** 30), reroll: 0 });
    }
  }
  const doors = (out.entrances || []).map((e) => ({ id: newId('d'), type: e.wide ? (doorType === 'door' ? 'double' : doorType) : doorType, a: e.a, b: e.b }));
  const walls = (out.walls || []).map((w) => ({ id: newId('w'), ...w }));
  return { shapes, walls, rooms, doors, terrain: out.terrain || [], placements: out.placements || [], ground: out.ground || null };
}


