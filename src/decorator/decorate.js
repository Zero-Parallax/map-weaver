// The decorator: furnishes one tagged room with suitable assets, following each asset's
// placement rule, without overlaps, keeping doors, stairs and balcony edges clear and every
// entrance reachable. Seeded, so the same room + seed + reroll count gives the same result.
//
// It also follows house rules so rooms read as lived in:
//   - walkways (flow.js) join the doors and lead to the room's showpiece; nothing that blocks
//     movement stands on them, so you can always walk straight through
//   - furniture you use from the front (shelves, counters, wardrobes) keeps that square free
//   - companions come with their anchors: a nightstand by the bed head, stools at the bar,
//     an anvil by the forge, candelabras either side of the altar (relations.js)
//   - beds and wardrobes keep away from doors, storage goes to the far corners, coat racks
//     and suit lockers stand by the door, lights spread out, beds and racks form rows
// Every legal spot gets a score from these rules; the decorator picks among the best few.
//
// Works on the room's full squares (region.cells). Each square side is classified as
//   inside (same room), wall, door, balcony (railing or drop edge) or open.

import { rng, hash } from '../core/rng.js';
import { distToSegment, projectOnSegment, polylineSegments, add, scale } from '../core/geom.js';
import { suitsRoom } from '../assets/meta.js';
import { TERRAIN, terrainAt } from '../core/terrain.js';
import { runGenerator, GENERATORS } from '../assets/generators.js';
import { DEFAULT_MOOD, MOOD_CLUTTER, MOOD_ANYWHERE, SUPPLY_AMOUNT, STOCKED_ROOMS, moodIndex, clutterSuitsMood } from '../assets/moods.js';
import { walkways } from './flow.js';
import { RELATIONS, ROWS, PRIVATE, STORAGE, ENTRANCE, ROOM_NEEDS, companionsOf } from './relations.js';

export const SIDES = ['n', 'e', 's', 'w'];
const STEP = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const EDGE_MID = { n: [0.5, 0], e: [1, 0.5], s: [0.5, 1], w: [0, 0.5] };

/** Light, medium, heavy presets for the per-room density (0..1). */
export const DENSITY = { light: 0.25, medium: 0.5, heavy: 0.8 };
export const DEFAULT_DENSITY = DENSITY.light;

/** None, light, heavy presets for the per-room clutter (0..1). */
export const CLUTTER = { none: 0, light: 0.4, heavy: 1 };
export const DEFAULT_CLUTTER = CLUTTER.light;

export const rotateSide = (side, rot) => SIDES[(SIDES.indexOf(side) + Math.round(rot / 90)) % 4];
const key = (x, y) => `${x},${y}`;

// ---- room analysis ---------------------------------------------------------

/** Squares of a room with the kind of each side, plus doors and keep-clear squares. */
export function analyseRoom({ geo, region, doors, links = [] }) {
  const cells = new Map();
  for (const [x, y] of region.cells) cells.set(key(x, y), { x, y, sides: {} });
  const wallSegs = geo.wallSegments;
  const balconySegs = geo.edgeRuns.filter((r) => r.kind !== 'wall').flatMap((r) => polylineSegments(r.points));
  const near = (p, segs, d = 0.03) => segs.some(([a, b]) => distToSegment(p, a, b) < d);

  const doorCells = []; // squares right inside a door, with the side the door is on
  const matched = new Set();
  for (const c of cells.values()) {
    for (const side of SIDES) {
      const [dx, dy] = STEP[side];
      if (cells.has(key(c.x + dx, c.y + dy))) {
        c.sides[side] = 'inside';
        continue;
      }
      const mid = add([c.x, c.y], EDGE_MID[side]);
      const door = doors.find((d) => distToSegment(mid, d.a, d.b) < 0.03);
      if (door) {
        c.sides[side] = 'door';
        doorCells.push({ cell: c, side });
        matched.add(door);
      } else if (near(mid, balconySegs)) c.sides[side] = 'balcony';
      else if (near(mid, wallSegs)) c.sides[side] = 'wall';
      // Curved and diagonal walls don't follow square edges: a wall within half a square
      // behind this side still counts, so furniture can stand against it.
      else if (near(mid, balconySegs, 0.55)) c.sides[side] = 'balcony';
      else if (near(mid, wallSegs, 0.55)) c.sides[side] = 'wall';
      else c.sides[side] = 'open';
    }
  }

  // Keep clear: two squares deep in front of every door, and round every link.
  const keepClear = new Set();
  const anchors = [];
  for (const { cell, side } of doorCells) {
    keepClear.add(key(cell.x, cell.y));
    anchors.push(key(cell.x, cell.y));
    const [dx, dy] = STEP[side];
    const inner = key(cell.x - dx, cell.y - dy);
    if (cells.has(inner)) keepClear.add(inner);
  }
  // Doors that don't line up with square edges (on curved or diagonal walls): clear the
  // squares close to them, and use the nearest as the entrance.
  for (const d of doors) {
    if (matched.has(d)) continue;
    const mid = scale(add(d.a, d.b), 0.5);
    let nearest = null;
    let best = 1.6;
    for (const c of cells.values()) {
      const dm = Math.hypot(c.x + 0.5 - mid[0], c.y + 0.5 - mid[1]);
      if (projectOnSegment([c.x + 0.5, c.y + 0.5], d.a, d.b).dist < 1.6 && dm < 2) keepClear.add(key(c.x, c.y));
      if (dm < best) {
        best = dm;
        nearest = key(c.x, c.y);
      }
    }
    if (nearest) anchors.push(nearest);
  }
  const blocked = new Set(); // squares nothing may use
  for (const { link } of links) {
    for (let y = Math.floor(link.y) - 1; y < Math.ceil(link.y + link.h) + 1; y++) {
      for (let x = Math.floor(link.x) - 1; x < Math.ceil(link.x + link.w) + 1; x++) {
        const k = key(x, y);
        if (!cells.has(k)) continue;
        const inside = x >= link.x && x < link.x + link.w && y >= link.y && y < link.y + link.h;
        if (inside) blocked.add(k);
        else {
          keepClear.add(k);
          anchors.push(k);
        }
      }
    }
  }
  // Squares on a balcony edge stay free for balcony assets only.
  const balconyCells = new Set([...cells.values()].filter((c) => SIDES.some((s) => c.sides[s] === 'balcony')).map((c) => key(c.x, c.y)));
  // Painted terrain: nothing stands in water, lava or chasms; roads stay clear of furniture.
  if (geo.terrain?.size) {
    for (const c of cells.values()) {
      const kind = terrainAt(geo.terrain, [c.x + 0.5, c.y + 0.5]);
      const t = kind && TERRAIN[kind];
      if (!t || t.decor) continue;
      if (t.keepClear) keepClear.add(key(c.x, c.y));
      else blocked.add(key(c.x, c.y));
    }
  }
  return { cells, keepClear, blocked, anchors: [...new Set(anchors)], balconyCells };
}

// ---- footprints and candidates --------------------------------------------

const footprintCache = new Map();

/** A room's one showpiece against a wall: throne, altar, forge, bar... */
const isFocal = (meta) => meta.min >= 1 && meta.max === 1 && (meta.placement === 'wall' || meta.placement === 'centre');

/** Footprint of an asset at given generator params. */
export function footprintOf(meta, params) {
  if (!meta.generator || !params) return meta.footprint;
  const k = meta.id + JSON.stringify(params);
  if (!footprintCache.has(k)) footprintCache.set(k, runGenerator(meta.generator.id, { ...meta.generator.params, ...params }).footprint);
  return footprintCache.get(k);
}

/** Sizes the decorator may try for a generator asset (null = the asset's own size). */
function sizeOptions(meta, random) {
  const sizes = meta.generator?.sizes;
  if (!sizes) return [null];
  const keys = Object.keys(sizes);
  let combos = [{}];
  for (const k of keys) {
    const [lo, hi] = sizes[k];
    const next = [];
    for (const c of combos) for (let v = lo; v <= hi; v++) next.push({ ...c, [k]: v });
    combos = next;
  }
  // Shuffle, then favour sizes near the default so rooms don't all get giant tables.
  const base = meta.generator.params;
  const cost = (c) => keys.reduce((s, k) => s + Math.abs(c[k] - (base[k] ?? c[k])), 0) + random() * 1.5;
  return combos.map((c) => [cost(c), c]).sort((a, b) => a[0] - b[0]).map(([, c]) => c).slice(0, 6);
}

function rectCells(x, y, w, h) {
  const out = [];
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) out.push([i, j]);
  return out;
}

/** The squares along one side of a rect, with that side. */
function edgeCells(x, y, w, h, side) {
  switch (side) {
    case 'n': return rectCells(x, y, w, 1);
    case 's': return rectCells(x, y + h - 1, w, 1);
    case 'e': return rectCells(x + w - 1, y, 1, h);
    default: return rectCells(x, y, 1, h);
  }
}

const OPPOSITE = { n: 's', s: 'n', e: 'w', w: 'e' };

/** The row of squares just in front of a piece whose back is to `facing` (`depth` rows deep). */
function frontOf(r, facing, depth = 1) {
  const out = [];
  for (let d = 1; d <= depth; d++) {
    if (facing === 'n') for (let i = r.x; i < r.x + r.w; i++) out.push([i, r.y + r.h - 1 + d]);
    if (facing === 's') for (let i = r.x; i < r.x + r.w; i++) out.push([i, r.y - d]);
    if (facing === 'w') for (let j = r.y; j < r.y + r.h; j++) out.push([r.x + r.w - 1 + d, j]);
    if (facing === 'e') for (let j = r.y; j < r.y + r.h; j++) out.push([r.x - d, j]);
  }
  return out;
}

/** Gap in squares between two rects (0 = touching, negative = overlapping). */
function rectGap(a, b) {
  return Math.max(Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
}

/**
 * Does spot `s` (a rect with rot and facing) stand in relation `rel` to anchor `t`?
 * Returns a score bonus (negative is better) or null if the relation isn't met.
 */
function relationFit(rel, meta, s, t, placed) {
  const gap = rectGap(s, t);
  if (gap < 0) return null;
  switch (rel.how) {
    case 'near':
      return gap <= (rel.dist ?? 2) ? -1 - ((rel.dist ?? 2) - gap) : null;
    case 'beside': {
      if (gap !== 0 || !t.facing || s.facing !== t.facing) return null;
      const overlapX = Math.min(s.x + s.w, t.x + t.w) - Math.max(s.x, t.x);
      const overlapY = Math.min(s.y + s.h, t.y + t.h) - Math.max(s.y, t.y);
      if (overlapX > 0 === overlapY > 0) return null; // must share a side, not a corner
      const backs = { n: s.y === t.y, s: s.y + s.h === t.y + t.h, w: s.x === t.x, e: s.x + s.w === t.x + t.w };
      return backs[t.facing] ? -2 : null;
    }
    case 'front': {
      if (!t.facing) return null;
      const zone = new Set(frontOf(t, t.facing, 2).map(([i, j]) => key(i, j)));
      if (!rectCells(s.x, s.y, s.w, s.h).some(([i, j]) => zone.has(key(i, j)))) return null;
      if (rel.faces && rotateSide(meta.wallSide, s.rot) !== t.facing) return null;
      return -1;
    }
    case 'flank': {
      if (!t.facing) return null;
      const alongX = t.facing === 'n' || t.facing === 's';
      const [a0, a1, c0, c1] = alongX ? [t.x, t.x + t.w, t.y, t.y + t.h] : [t.y, t.y + t.h, t.x, t.x + t.w];
      const [sa0, sa1, sc0, sc1] = alongX ? [s.x, s.x + s.w, s.y, s.y + s.h] : [s.y, s.y + s.h, s.x, s.x + s.w];
      // In the same band as the anchor, or one square out from its front.
      const outward = { n: 1, w: 1, s: -1, e: -1 }[t.facing];
      const band0 = outward > 0 ? c0 : c0 - 1;
      const band1 = outward > 0 ? c1 + 1 : c1;
      if (sc1 <= band0 || sc0 >= band1) return null;
      const left = sa1 <= a0 && a0 - sa1 <= 1;
      const right = sa0 >= a1 && sa0 - a1 <= 1;
      if (!left && !right) return null;
      // Mirror the one already there, never doubling up on one side.
      let bonus = -2;
      for (const o of placed) {
        if (o.meta.id !== meta.id || o.anchor !== t) continue;
        const [oa0, oa1] = alongX ? [o.x, o.x + o.w] : [o.y, o.y + o.h];
        const oLeft = oa1 <= a0;
        if (oLeft === left) return null;
        const mirrored = Math.abs(a0 - sa1 - (oa0 - a1)) < 0.01 || Math.abs(sa0 - a1 - (a0 - oa1)) < 0.01;
        if (mirrored) bonus -= 2;
      }
      return bonus;
    }
    default:
      return null;
  }
}

function sideIs(room, cells, side, kind) {
  return cells.every(([x, y]) => room.cells.get(key(x, y))?.sides[side] === kind);
}

/**
 * Every legal spot for an asset in the room: {x, y (top-left), rot, w, h (rotated)}.
 * occupied: Map layer -> Set of used squares.
 */
function candidates(room, meta, fp, occupied, centre, { allRots = false } = {}) {
  const out = [];
  const floorLayer = meta.layer === 'floor';
  const rule = meta.placement;
  const blocks = meta.layer === 'object' && meta.blocksMovement;
  for (const rot of [0, 90, 180, 270]) {
    const quarter = rot % 180 !== 0;
    if (fp.w === fp.h && rot >= 180 && !allRots && !['wall', 'corner', 'balcony', 'door'].includes(rule)) continue;
    const w = quarter ? fp.h : fp.w;
    const h = quarter ? fp.w : fp.h;
    const facing = rotateSide(meta.wallSide, rot);
    for (const c of room.cells.values()) {
      const { x, y } = c;
      const squares = rectCells(x, y, w, h);
      let ok = true;
      for (const [i, j] of squares) {
        const k = key(i, j);
        if (!room.cells.has(k) || room.blocked.has(k) || occupied[meta.layer].has(k)) {
          ok = false;
          break;
        }
        if (!floorLayer && room.keepClear.has(k)) {
          ok = false;
          break;
        }
        if (rule !== 'balcony' && !floorLayer && room.balconyCells.has(k)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const back = edgeCells(x, y, w, h, facing);
      const cx = x + w / 2;
      const cy = y + h / 2;
      let score = 0;
      if (blocks) {
        // Keep walkways and the space in front of other furniture clear.
        if (squares.some(([i, j]) => room.reserved?.has(key(i, j)))) continue;
        if (room.flow && squares.some(([i, j]) => room.flow.has(key(i, j)))) {
          if (!room.narrow) continue;
          score += 4;
        }
        // Furniture used from the front needs a free square to stand on in front of it.
        if (rule === 'wall' && room.blocking) {
          const front = frontOf({ x, y, w, h }, facing);
          if (!front.some(([i, j]) => room.cells.has(key(i, j)) && !room.blocked.has(key(i, j)) && !room.blocking.has(key(i, j)))) continue;
        }
      }
      // Narrow rooms (corridors) keep their middle free: blocking pieces go along walls only.
      if (room.narrow && meta.blocksMovement && (rule === 'centre' || rule === 'free')) continue;
      if (rule === 'wall' || rule === 'door') {
        if (!sideIs(room, back, facing, 'wall')) continue;
        if (isFocal(meta)) {
          // Far from the entrances, centred on its wall.
          const toDoor = room.anchorPoints.length ? Math.min(...room.anchorPoints.map(([ax, ay]) => Math.hypot(cx - ax, cy - ay))) : 0;
          const offCentre = facing === 'n' || facing === 's' ? Math.abs(cx - centre[0]) : Math.abs(cy - centre[1]);
          score = -toDoor + offCentre * 0.8;
        }
        if (rule === 'door') {
          // Next to (but not in) the clear area in front of a door.
          const ring = rectCells(x - 1, y - 1, w + 2, h + 2);
          if (!ring.some(([i, j]) => room.keepClear.has(key(i, j)))) continue;
        }
      } else if (rule === 'corner') {
        if (!sideIs(room, back, facing, 'wall')) continue;
        const left = rotateSide('w', rot);
        const right = rotateSide('e', rot);
        if (!sideIs(room, edgeCells(x, y, w, h, left), left, 'wall') && !sideIs(room, edgeCells(x, y, w, h, right), right, 'wall')) continue;
      } else if (rule === 'balcony') {
        if (!sideIs(room, back, facing, 'balcony')) continue;
      } else if (rule === 'centre') {
        score = Math.hypot(cx - centre[0], cy - centre[1]);
        // Line up long furniture with the room's long axis.
        if ((w > h) !== (room.width >= room.height) && w !== h) score += 1.5;
      }
      if (meta.facing === 'focal' && room.focal) {
        // Seats face the focal piece: their front (own south side) points at it.
        const dx = room.focal[0] - cx;
        const dy = room.focal[1] - cy;
        const want = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : dy > 0 ? 's' : 'n';
        if (rotateSide('s', rot) !== want) continue;
        score = Math.abs(Math.abs(dx) > Math.abs(dy) ? dy : dx) * 0.3 + Math.hypot(dx, dy) * 0.1;
      }
      if (floorLayer && rule === 'door') {
        // Mats and hazard stripes go right in front of a door.
        if (!squares.some(([i, j]) => room.anchors.includes(key(i, j)))) continue;
      }
      out.push({ x, y, rot, w, h, score, facing });
    }
  }
  return out;
}

// ---- reachability --------------------------------------------------------

/**
 * Does blocking `squares` keep the room walkable? The squares around the new piece must
 * still reach each other, so no part of the room is cut off. Checking only around the piece
 * works even when water or a chasm already splits the room.
 */
function keepsWalkable(room, blocking, squares) {
  const taken = new Set(squares);
  if (room.anchors.some((k) => taken.has(k))) return false;
  const walkable = (k) => room.cells.has(k) && !room.blocked.has(k) && !blocking.has(k) && !taken.has(k);
  const around = new Set();
  for (const k of squares) {
    const [x, y] = k.split(',').map(Number);
    for (const s of SIDES) {
      const n = key(x + STEP[s][0], y + STEP[s][1]);
      if (walkable(n)) around.add(n);
    }
  }
  if (around.size < 2) return true;
  const [start] = around;
  const seen = new Set([start]);
  const queue = [start];
  let found = 1;
  while (queue.length && found < around.size) {
    const [x, y] = queue.shift().split(',').map(Number);
    for (const s of SIDES) {
      const n = key(x + STEP[s][0], y + STEP[s][1]);
      if (seen.has(n) || !walkable(n)) continue;
      seen.add(n);
      if (around.has(n)) found++;
      queue.push(n);
    }
  }
  return found === around.size;
}

// ---- main ----------------------------------------------------------------

/**
 * Decorate one room.
 *  geo, region:  level geometry and the room's region (from detectRooms)
 *  tag:          the room tag {id, type, seed, reroll, density}
 *  assets:       asset metadata available for the map's setting
 *  doors, links: the level's doors and linksOnLevel()
 *  existing:     placements already in the room that stay (hand-placed), as
 *                [{meta, footprint (rotated), x, y}] with x, y the top-left square
 *  mood:         how cared-for the room is (moods.js): changes how beds, tables and shelves
 *                look, which clutter shows and how much, never where the furniture goes
 * Returns {placements, report}.
 */
export function decorateRoom({ geo, region, tag, assets, doors, links = [], existing = [], mapSeed = 0, outdoor = false, mood = DEFAULT_MOOD }) {
  const random = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0));
  const room = analyseRoom({ geo, region, doors, links });
  const xs = region.cells.map((c) => c[0]);
  const ys = region.cells.map((c) => c[1]);
  room.width = Math.max(...xs) - Math.min(...xs) + 1;
  room.height = Math.max(...ys) - Math.min(...ys) + 1;
  room.narrow = Math.min(room.width, room.height) <= 3;
  room.wide = Math.min(room.width, room.height) >= 7 && region.cells.length >= 40;
  room.anchorPoints = room.anchors.map((k) => k.split(',').map((v) => Number(v) + 0.5));
  const centre = [
    region.cells.reduce((s, c) => s + c[0] + 0.5, 0) / region.cells.length,
    region.cells.reduce((s, c) => s + c[1] + 0.5, 0) / region.cells.length,
  ];

  const occupied = { floor: new Set(), object: new Set(), overhead: new Set() };
  const blocking = new Set();
  const placed = []; // rects of every piece in the room, for the house rules
  for (const e of existing) {
    for (const [i, j] of rectCells(e.x, e.y, e.footprint.w, e.footprint.h)) {
      occupied[e.meta.layer].add(key(i, j));
      if (e.meta.blocksMovement) blocking.add(key(i, j));
    }
    placed.push({ meta: e.meta, x: e.x, y: e.y, w: e.footprint.w, h: e.footprint.h, rot: 0, facing: null });
  }
  // Walkways between the doors (and into the room), and squares kept free in front of things.
  room.blocking = blocking;
  room.reserved = new Set();
  // The walkways are worked out once the room's central showpieces (reactor, holo table)
  // stand, so the routes go round them; until then nothing is kept clear.
  room.flow = new Set();
  const focalFronts = [];

  const density = tag.density ?? DEFAULT_DENSITY;
  const usable = [...room.cells.keys()].filter((k) => !room.blocked.has(k) && !room.keepClear.has(k)).length;
  // Share of the free floor to furnish: light ~16%, medium ~34%, heavy ~62%, full ~85%.
  let budget = Math.round(usable * (0.05 + 0.35 * density + 0.45 * density * density));
  // Per-room limits grow with density; one-of-a-kind pieces (max 1) stay unique. When every
  // piece has reached its limit and floor budget is left, the limits double (see below).
  let capsLifted = false;
  const capOf = (m) => {
    if (!m.max || m.max === 1) return m.max;
    // Outdoors, limits grow with the area: a wood has more than six trees.
    const cap = Math.max(m.max, Math.round(m.max * (0.5 + density * 1.6))) * (outdoor ? Math.max(1, Math.round(usable / 40)) : 1);
    // Lifted, but never so far that one kind of piece takes over the room.
    return capsLifted ? cap * 2 : cap;
  };
  const underCap = (m) => !capOf(m) || (counts.get(m.id) || 0) < capOf(m);
  // Outdoors, "any room" pieces (torches, floor cracks) are indoor things: leave them out.
  const fits = (m) => suitsRoom(m, tag.type) && !(outdoor && m.roomTypes.includes('*'));
  const isSecret = (m) => m.tags.includes('secret');
  const pool = assets.filter((m) => fits(m) && !m.clutter && !m.supplies && !isSecret(m));
  const counts = new Map();
  const placements = [];
  const report = { placed: 0, skipped: [] };

  // Smooth seeded noise over the room: high values are where things gather.
  const noise = valueNoise(rng(hash(mapSeed, tag.id, tag.seed, 'clumps')), 5);
  const pickClumped = (spots) => {
    const w = spots.map((sp) => noise(sp.x + sp.w / 2, sp.y + sp.h / 2) ** 3 + 0.02);
    let r = random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return i;
    return w.length - 1;
  };

  const doorDist = (cx, cy) => (room.anchorPoints.length ? Math.min(...room.anchorPoints.map(([ax, ay]) => Math.hypot(cx - ax, cy - ay))) : 6);
  const lights = () => placed.filter((p) => p.meta.light);

  /** House-rule score for a spot (lower is better), on top of its placement-rule score. */
  const houseScore = (meta, s) => {
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    let score = 0;
    const d = doorDist(cx, cy);
    if (PRIVATE.has(meta.id)) score += 6 / (1 + d);
    if (STORAGE.has(meta.id)) score += 4 / (1 + d);
    if (ENTRANCE.has(meta.id)) score -= 5 / (1 + d);
    if (meta.light && !isFocal(meta)) {
      const others = lights();
      if (others.length) score -= Math.min(6, Math.min(...others.map((o) => Math.hypot(cx - (o.x + o.w / 2), cy - (o.y + o.h / 2))))) * 0.7;
    }
    if (ROWS[meta.id] != null) {
      const g = ROWS[meta.id];
      for (const o of placed) {
        if (o.meta.id !== meta.id || o.w !== s.w || o.h !== s.h) continue;
        const inRow = (o.y === s.y && Math.abs(o.x - s.x) === s.w + g) || (o.x === s.x && Math.abs(o.y - s.y) === s.h + g);
        if (inRow) {
          score -= 4;
          break;
        }
      }
    }
    const rel = RELATIONS[meta.id];
    if (rel) {
      let best = null;
      for (const t of placed) {
        if (!rel.to.includes(t.meta.id) || t === s) continue;
        const fit = relationFit(rel, meta, s, t, placed);
        if (fit != null && (best == null || fit < best)) best = fit;
      }
      if (best != null) score += best * (rel.soft ? 1.5 : 3);
    }
    return score;
  };

  /**
   * Place one piece. With `anchor` and `rel`, it is a companion: only spots that stand in that
   * relation to the anchor count (trying free-standing spots if its own rule finds none).
   */
  const place = (meta, { anchor = null, rel = null } = {}) => {
    const sizes = sizeOptions(meta, random);
    for (const params of sizes) {
      const fp = footprintOf(meta, params);
      const required = (counts.get(meta.id) || 0) < (meta.min || 0);
      if (meta.layer === 'object' && !required && !anchor && fp.w * fp.h > Math.max(budget, 1)) continue;
      const opts = { allRots: !!rel?.faces };
      let spots = candidates(room, meta, fp, occupied, centre, opts);
      // Once the corners are taken, corner clutter (barrels, crates, sacks) lines the walls
      // in busier rooms.
      if (!spots.length && meta.placement === 'corner' && density >= 0.4) {
        spots = candidates(room, { ...meta, placement: 'wall' }, fp, occupied, centre, opts);
      }
      if (anchor) {
        const fitting = (list) => list.map((sp) => ({ ...sp, fit: relationFit(rel, meta, sp, anchor, placed) })).filter((sp) => sp.fit != null);
        let rated = fitting(spots);
        if (!rated.length && meta.placement !== 'free' && meta.placement !== 'centre') rated = fitting(candidates(room, { ...meta, placement: 'free' }, fp, occupied, centre, opts));
        spots = rated.map((sp) => ({ ...sp, score: sp.score + sp.fit * 3 }));
      }
      if (!spots.length) continue;
      // Outdoors, free-standing pieces gather in clumps (woods, rock fields) with clearings.
      const clumped = outdoor && !anchor && (meta.placement === 'free' || meta.placement === 'centre');
      if (!clumped) {
        // Score every spot by its rule and the house rules, with a little noise for variety,
        // then try the best few in turn.
        const spread = meta.placement === 'centre' || isFocal(meta) ? 0.6 : 1.5;
        for (const sp of spots) sp.rank = sp.score + houseScore(meta, sp) + random() * spread;
        spots.sort((a, b) => a.rank - b.rank);
      }
      for (let attempt = 0; attempt < 8 && spots.length; attempt++) {
        const i = clumped ? pickClumped(spots) : Math.floor(random() * Math.min(isFocal(meta) ? 2 : 3, spots.length));
        const s = spots.splice(i, 1)[0];
        const squares = rectCells(s.x, s.y, s.w, s.h).map(([a, b]) => key(a, b));
        if (meta.blocksMovement) {
          if (!keepsWalkable(room, blocking, squares)) continue;
          for (const k of squares) blocking.add(k);
        }
        for (const k of squares) occupied[meta.layer].add(k);
        if (meta.layer === 'object') budget -= squares.length;
        counts.set(meta.id, (counts.get(meta.id) || 0) + 1);
        const pl = { asset: meta.id, x: s.x + s.w / 2, y: s.y + s.h / 2, rot: s.rot, auto: true, room: tag.id };
        if (params) pl.params = params;
        if (meta.generator && GENERATORS[meta.generator.id]?.moods) {
          // Pieces made of parts (bed, table, shelf) get the room's mood and their own seed,
          // from a hash rather than the layout's random stream so moods never move furniture.
          pl.params = { ...(params || {}), mood, seed: hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'piece', placements.length) % 100000 };
        }
        placements.push(pl);
        report.placed++;
        const rect = { meta, x: s.x, y: s.y, w: s.w, h: s.h, rot: s.rot, facing: s.facing, anchor };
        placed.push(rect);
        if (meta.layer === 'object' && meta.blocksMovement && meta.placement === 'wall') {
          // Used from the front: keep the square in front free of other furniture.
          for (const [i2, j2] of frontOf(rect, s.facing)) if (room.cells.has(key(i2, j2))) room.reserved.add(key(i2, j2));
        }
        if (isFocal(meta) && !room.focal) {
          room.focal = [pl.x, pl.y];
          // A walkway now leads up to the showpiece.
          if (!outdoor && meta.placement === 'wall') {
            focalFronts.push(frontOf(rect, s.facing).map(([i2, j2]) => key(i2, j2)));
            if (room.flow.size) room.flow = walkways(room, { blocking, targets: focalFronts });
          }
        }
        if (!anchor) addCompanions(meta, rect);
        return true;
      }
    }
    return false;
  };

  /** Pieces that come with this one: a nightstand with a bed, stools with a bar... */
  const addCompanions = (meta, rect) => {
    for (const { id, rel } of companionsOf(meta.id)) {
      const cm = pool.find((m) => m.id === id);
      if (!cm || random() > (rel.chance ?? 0.8)) continue;
      const [lo, hi] = Array.isArray(rel.count) ? rel.count : [rel.count ?? (rel.how === 'flank' ? 2 : 1), rel.count ?? (rel.how === 'flank' ? 2 : 1)];
      const n = lo + Math.floor(random() * (hi - lo + 1));
      for (let i = 0; i < n && underCap(cm); i++) if (!place(cm, { anchor: rect, rel })) break;
    }
  };

  // Pieces that belong with an anchor (nightstands, bar stools, pilot seats) come with it as
  // companions; they only join the general pick when the room has nothing to anchor them.
  const dependent = (m) => {
    const rel = RELATIONS[m.id];
    return rel && !rel.soft && pool.some((o) => rel.to.includes(o.id));
  };
  // 1. Required pieces first, biggest first. 2. Rugs and decals. 3. Weighted picks until the
  // budget runs out or nothing more fits.
  const required = pool.filter((m) => m.min > 0).sort((a, b) => b.footprint.w * b.footprint.h - a.footprint.w * a.footprint.h);
  // Central showpieces go first, in the middle; then the walkways are laid out round them.
  // (Some required pieces may already have come as companions: an anvil with its forge.)
  const placeRequired = (list) => {
    for (const m of list) while ((counts.get(m.id) || 0) < m.min) if (!place(m)) {
      report.skipped.push(m.id);
      break;
    }
  };
  placeRequired(required.filter((m) => m.placement === 'centre' && !dependent(m)));
  if (!outdoor) room.flow = walkways(room, { blocking, targets: focalFronts });
  placeRequired(required.filter((m) => m.placement !== 'centre'));
  // What the room is for: one of each group it needs (a bed in a bedroom), unless one stands.
  for (const group of ROOM_NEEDS[tag.type] || []) {
    const has = (id) => (counts.get(id) || 0) > 0 || existing.some((e) => e.meta.id === id);
    if (group.some(has)) continue;
    const options = group.map((id) => pool.find((m) => m.id === id)).filter(Boolean);
    while (options.length) {
      const total = options.reduce((t, m) => t + m.weight, 0);
      let r = random() * total;
      const i = Math.max(0, options.findIndex((m) => (r -= m.weight) <= 0));
      if (place(options[i])) break;
      options.splice(i, 1);
    }
  }
  const floorPool = pool.filter((m) => m.layer === 'floor');
  // Traps (GM-only) are rarer: about one room in five.
  for (const m of floorPool) if (random() < (0.35 + density * 0.5) * (m.gmOnly ? 0.3 : 1) && underCap(m)) place(m);

  let failures = 0;
  const main = pool.filter((m) => m.layer !== 'floor' && !dependent(m));
  const patience = Math.round(12 + 25 * density);
  // Space only shrinks, so a piece that found no spot once never will: stop trying it and
  // spend the rest of the budget on pieces that still fit (free-standing ones once the walls
  // are full).
  const noRoom = new Set();
  const available = (m) => underCap(m) && !noRoom.has(m.id);
  while (budget > 0 && failures < patience && main.length) {
    let open = main.filter(available);
    if (!open.length && !capsLifted && density >= 0.4) {
      // A room type with only a few kinds of piece: carry on with more of the same.
      capsLifted = true;
      open = main.filter(available);
    }
    if (!open.length) break;
    // Walls and corners fill first; centre pieces are rarer in light rooms.
    const weightOf = (m) => m.weight * (m.placement === 'centre' ? 0.6 + density : 1) * (m.roomTypes.includes('*') ? 0.4 : 1);
    const total = open.reduce((s, m) => s + weightOf(m), 0);
    let r = random() * total;
    const pick = open.find((m) => (r -= weightOf(m)) <= 0) || open[open.length - 1];
    if (place(pick)) failures = 0;
    else {
      failures++;
      noRoom.add(pick.id);
    }
  }
  if (tag.ruin) ruinRoom();
  else if (moodIndex(mood) >= 3) knockAskew();
  if (tag.combat) addCover();
  addSecrets();
  const ruinOnly = (m) => tag.ruin > 0 && m.roomTypes.includes('ruin');
  placements.push(...placeSupplies({ room, tag, mood, density, assets: assets.filter((m) => m.supplies && fits(m)), occupied, mapSeed }));
  // Neglected rooms gather cobwebs and cracks whatever they are; ransacked ones, debris.
  const moodMess = (m) => !outdoor && m.clutter && MOOD_ANYWHERE[m.id] != null && moodIndex(mood) >= MOOD_ANYWHERE[m.id];
  placements.push(...scatterClutter({ room, tag, mood, assets: assets.filter((m) => fits(m) || ruinOnly(m) || moodMess(m)), occupied, mapSeed }));
  return { placements, report };

  /**
   * Secrets only the GM sees: a stash under a loose flagstone, a lever in a sconce. Always one
   * in a hidden room; now and then one elsewhere (tag.secrets: 'none' or 'one' overrides).
   */
  function addSecrets() {
    if (outdoor || tag.secrets === 'none') return;
    const sr = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'secrets'));
    const want = tag.secrets === 'one' || tag.hidden ? 1 : sr() < 0.12 ? 1 : 0;
    if (!want) return;
    const kinds = assets.filter((m) => isSecret(m) && (fits(m) || tag.hidden));
    // In a hidden room the stash (free-standing) is what it is for.
    const order = kinds.sort((a, b) => (tag.hidden ? (a.placement === 'free' ? -1 : 1) - (b.placement === 'free' ? -1 : 1) : sr() - 0.5));
    for (const m of order) if (place(m)) break;
  }

  /** Ransacked rooms: small free-standing pieces knocked a little askew (own random stream). */
  function knockAskew() {
    const rr = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'askew'));
    for (const p of placements) {
      const m = assets.find((a) => a.id === p.asset);
      if (!m || m.layer !== 'object' || isFocal(m) || !['free', 'centre', 'corner'].includes(m.placement)) continue;
      const fp = footprintOf(m, p.params);
      if (fp.w * fp.h > 2 || rr() > 0.45) continue;
      p.rot = (p.rot + (rr() < 0.5 ? -1 : 1) * 15 * (1 + Math.floor(rr() * 2)) + 360) % 360;
    }
  }

  /**
   * Ruined rooms: most lights are out, some pieces are gone (their space taken by rubble),
   * others knocked askew, and fallen beams and collapsed masonry lie about.
   */
  function ruinRoom() {
    const r = tag.ruin;
    const rr = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'ruin'));
    const squaresOf = (p, m) => {
      const fp = footprintOf(m, p.params);
      const quarter = Math.round(p.rot / 90) % 2 === 1;
      const w = quarter ? fp.h : fp.w;
      const h = quarter ? fp.w : fp.h;
      return rectCells(Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h).map(([i, j]) => key(i, j));
    };
    for (let i = placements.length - 1; i >= 0; i--) {
      const p = placements[i];
      const m = assets.find((a) => a.id === p.asset);
      if (!m) continue;
      const gone = (m.light && rr() < 0.4 + 0.6 * r) || (!isFocal(m) && rr() < 0.4 * r);
      if (gone) {
        placements.splice(i, 1);
        for (const k of squaresOf(p, m)) {
          occupied[m.layer].delete(k);
          blocking.delete(k);
        }
        continue;
      }
      // Knocked askew: small free-standing pieces turn a little.
      const fp = footprintOf(m, p.params);
      if (['free', 'centre', 'corner'].includes(m.placement) && fp.w * fp.h <= 4 && rr() < r * 0.7) {
        p.rot = (p.rot + (rr() < 0.5 ? -1 : 1) * 15 * (1 + Math.floor(rr() * 2)) + 360) % 360;
      }
    }
    // Fallen beams and heaps of masonry.
    const heavy = assets.filter((m) => m.roomTypes.includes('ruin') && !m.clutter);
    const count = Math.round((room.cells.size / 30) * r) + (r > 0.5 ? 1 : 0);
    budget = Math.max(budget, count * 3);
    for (let i = 0; i < count && heavy.length; i++) place(heavy[Math.floor(rr() * heavy.length)]);
  }

  /**
   * Combat-ready rooms: free-standing cover spread over the open floor, until nearly every
   * open square is within two squares of something to hide behind. Each piece keeps a clear
   * square all round it, so lanes stay open, and the room stays fully walkable.
   */
  function addCover() {
    const coverSquares = new Set();
    const isCover = (m) => m.cover && m.cover !== 'none' && m.blocksMovement;
    for (const p of placements) {
      const m = assets.find((a) => a.id === p.asset);
      if (!m || !isCover(m)) continue;
      const fp = footprintOf(m, p.params);
      const quarter = (p.rot / 90) % 2 === 1;
      const w = quarter ? fp.h : fp.w;
      const h = quarter ? fp.w : fp.h;
      for (const [i, j] of rectCells(Math.round(p.x - w / 2), Math.round(p.y - h / 2), w, h)) coverSquares.add(key(i, j));
    }
    for (const e of existing) if (isCover(e.meta)) for (const [i, j] of rectCells(e.x, e.y, e.footprint.w, e.footprint.h)) coverSquares.add(key(i, j));
    const open = () => [...room.cells.keys()].filter((k) => !blocking.has(k) && !room.blocked.has(k));
    const near = (k) => {
      const [x, y] = k.split(',').map(Number);
      for (let j = y - 2; j <= y + 2; j++) for (let i = x - 2; i <= x + 2; i++) if (coverSquares.has(key(i, j))) return true;
      return false;
    };
    const kinds = pool.filter((m) => isCover(m) && ['free', 'centre', 'corner'].includes(m.placement) && !isFocal(m) && m.footprint.w * m.footprint.h <= 4);
    for (const id of GENERIC_COVER) {
      const m = assets.find((a) => a.id === id);
      if (m && !kinds.includes(m)) kinds.push(m);
    }
    if (!kinds.length) return;
    const limit = Math.ceil(open().length / 10);
    const rejected = new Set(); // spots that would cut the room off
    for (let added = 0, tries = 0; added < limit && tries < limit * 4; tries++) {
      const uncovered = open().filter((k) => !near(k));
      // Until nearly every open square is near cover, and always a little more than the room
      // had: ticking combat-ready should visibly add something to fight round.
      const minAdd = open().length >= 60 ? 2 : 1;
      if (uncovered.length <= open().length * 0.05 && added >= minAdd) break;
      const uncoveredSet = new Set(uncovered);
      let best = null;
      for (const meta of kinds) {
        const fp = footprintOf(meta, null);
        for (const rot of fp.w === fp.h ? [0] : [0, 90]) {
          const w = rot ? fp.h : fp.w;
          const h = rot ? fp.w : fp.h;
          for (const c of room.cells.values()) {
            if (rejected.has(`${meta.id}|${c.x},${c.y},${rot}`)) continue;
            const squares = rectCells(c.x, c.y, w, h).map(([i, j]) => key(i, j));
            if (squares.some((k) => !room.cells.has(k) || occupied.object.has(k) || room.keepClear.has(k) || room.blocked.has(k) || room.balconyCells.has(k) || room.reserved.has(k) || (!room.narrow && room.flow.has(k)))) continue;
            // A clear ring: no other piece and no wall right next to it.
            const ring = rectCells(c.x - 1, c.y - 1, w + 2, h + 2).map(([i, j]) => key(i, j)).filter((k) => !squares.includes(k));
            if (ring.some((k) => !room.cells.has(k) || blocking.has(k))) continue;
            let gain = 0;
            for (let j = c.y - 2; j < c.y + h + 2; j++) for (let i = c.x - 2; i < c.x + w + 2; i++) if (uncoveredSet.has(key(i, j))) gain++;
            const score = gain + random() * 0.5 + (meta.cover === 'full' ? 0.3 : 0);
            if ((gain >= 3 || added < minAdd) && (!best || score > best.score)) best = { meta, rot, w, h, x: c.x, y: c.y, squares, score };
          }
        }
      }
      if (!best) break;
      if (!keepsWalkable(room, blocking, best.squares)) {
        rejected.add(`${best.meta.id}|${best.x},${best.y},${best.rot}`);
        continue;
      }
      added++;
      for (const k of best.squares) {
        blocking.add(k);
        occupied.object.add(k);
        coverSquares.add(k);
      }
      counts.set(best.meta.id, (counts.get(best.meta.id) || 0) + 1);
      placements.push({ asset: best.meta.id, x: best.x + best.w / 2, y: best.y + best.h / 2, rot: best.rot, auto: true, room: tag.id });
    }
  }
}

/** Cover any room may use when its own pieces can't provide enough. */
const GENERIC_COVER = ['crate', 'barrel', 'cargo-crate', 'fuel-drum'];

/** 2D value noise in [0, 1] with cells `size` squares across. */
function valueNoise(random, size) {
  const grid = new Map();
  const at = (i, j) => {
    const k = `${i},${j}`;
    if (!grid.has(k)) grid.set(k, random());
    return grid.get(k);
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / size;
    const fy = y / size;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = smooth(fx - i);
    const v = smooth(fy - j);
    const a = at(i, j) * (1 - u) + at(i + 1, j) * u;
    const b = at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u;
    return a * (1 - v) + b * v;
  };
}

// ---- supplies --------------------------------------------------------------

const SIDE_ROT = { n: 0, e: 90, s: 180, w: 270 };

/**
 * The things a room in use has: ration crates, trays, toolboxes, med kits. Stocked against the
 * walls in tidy groups (pristine, lived-in), thinned out (neglected) or strewn over the floor
 * (ransacked). Its own random stream, so the furniture never moves. Each piece gets the mood.
 */
function placeSupplies({ room, tag, mood, density, assets, occupied, mapSeed }) {
  if (!assets.length) return [];
  const random = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'supplies'));
  const mi = moodIndex(mood);
  const free = (k) => room.cells.has(k) && !room.blocked.has(k) && !room.keepClear.has(k) && !room.balconyCells.has(k) && !occupied.object.has(k) && !occupied.overhead.has(k);
  const wallSide = (c) => SIDES.find((s) => c.sides[s] === 'wall');
  const along = [...room.cells.values()].filter((c) => {
    const k = key(c.x, c.y);
    return wallSide(c) && free(k) && !room.reserved?.has(k) && !room.flow?.has(k);
  });
  const amount = (SUPPLY_AMOUNT[mood] ?? 1) * (STOCKED_ROOMS.has(tag.type) ? 1.7 : 1) * (0.6 + density);
  let count = Math.round(along.length * 0.16 * amount + random() * 0.8);
  const out = [];
  const counts = new Map();
  const placed = new Set();
  const cap = (m) => Math.max(1, Math.round((m.max || 3) * (STOCKED_ROOMS.has(tag.type) ? 2 : 1)));
  for (let tries = 0; count > 0 && tries < count * 6 + 6; tries++) {
    const choices = assets.filter((m) => (counts.get(m.id) || 0) < cap(m));
    if (!choices.length) break;
    let r = random() * choices.reduce((s, m) => s + m.weight, 0);
    const meta = choices.find((m) => (r -= m.weight) <= 0) || choices[choices.length - 1];
    let spot = null;
    if (mi >= 3 && random() < 0.5) {
      // Strewn: anywhere on the open floor.
      const open = [...room.cells.values()].filter((c) => free(key(c.x, c.y)) && !placed.has(key(c.x, c.y)));
      if (open.length) {
        const c = open[Math.floor(random() * open.length)];
        spot = { c, rot: Math.floor(random() * 24) * 15 };
      }
    } else {
      // Against a wall, gathering with the supplies already there; corners first.
      const spots = along.filter((c) => !placed.has(key(c.x, c.y)) && free(key(c.x, c.y)));
      if (spots.length) {
        const w = spots.map((c) => {
          const walls = SIDES.filter((s) => c.sides[s] === 'wall').length;
          const near = SIDES.some((s) => placed.has(key(c.x + STEP[s][0], c.y + STEP[s][1])));
          return 1 + (walls >= 2 ? 2 : 0) + (near ? 4 : 0);
        });
        let q = random() * w.reduce((a, b) => a + b, 0);
        const i = Math.max(0, w.findIndex((v) => (q -= v) <= 0));
        const c = spots[i];
        spot = { c, rot: SIDE_ROT[wallSide(c)] + (mi >= 3 ? Math.round((random() - 0.5) * 4) * 15 : 0) };
      }
    }
    if (!spot) {
      counts.set(meta.id, Infinity);
      continue;
    }
    const k = key(spot.c.x, spot.c.y);
    placed.add(k);
    occupied.object.add(k);
    counts.set(meta.id, (counts.get(meta.id) || 0) + 1);
    out.push({
      asset: meta.id, x: spot.c.x + 0.5, y: spot.c.y + 0.5, rot: (spot.rot + 360) % 360, auto: true, room: tag.id,
      params: { mood, seed: hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'supply', out.length) % 100000 },
    });
    count--;
  }
  return out;
}

// ---- clutter ---------------------------------------------------------------

/**
 * Small decals after the furniture: mostly along walls and in corners, one per square, loose
 * (a little off-centre, any angle). Its own random stream, so changing the clutter amount
 * leaves the furniture where it is.
 */
function scatterClutter({ room, tag, assets, occupied, mapSeed, mood = DEFAULT_MOOD }) {
  // The room's own clutter setting, else its mood's; ruins are messier.
  const amount = Math.max(tag.clutter ?? MOOD_CLUTTER[mood] ?? DEFAULT_CLUTTER, tag.ruin ? 0.4 + 0.6 * tag.ruin : 0);
  // Only clutter that suits the mood: no spilled ale in a pristine hall, no bloodstains in a
  // tidy bedroom. Assets passed in are already the room's own plus the mood's mess.
  const pool = assets.filter((m) => m.clutter && clutterSuitsMood(m.id, mood));
  if (!amount || !pool.length) return [];
  const random = rng(hash(mapSeed, tag.id, tag.seed, tag.reroll || 0, 'clutter'));
  const out = [];
  const cells = [...room.cells.values()].filter((c) => !room.blocked.has(key(c.x, c.y)));
  let count = Math.round(cells.length * (0.03 + 0.1 * amount + 0.06 * amount * amount) + random() * 0.8);
  const used = new Set();
  const counts = new Map();
  const cap = (m) => Math.max(1, Math.round((m.max || 3) * (0.6 + amount)));
  for (let tries = 0; count > 0 && tries < count * 8 + 10; tries++) {
    const choices = pool.filter((m) => (counts.get(m.id) || 0) < cap(m));
    if (!choices.length) break;
    const total = choices.reduce((s, m) => s + m.weight, 0);
    let r = random() * total;
    const meta = choices.find((m) => (r -= m.weight) <= 0) || choices[choices.length - 1];
    let spot = null;
    if (meta.placement === 'corner' || meta.placement === 'wall') {
      // Cobwebs and the like: a proper corner or wall spot, turned to fit.
      const spots = candidates(room, meta, meta.footprint, occupied, [0, 0]).filter((s) => !used.has(key(s.x, s.y)));
      if (spots.length) {
        const s = spots[Math.floor(random() * spots.length)];
        spot = { x: s.x + s.w / 2, y: s.y + s.h / 2, rot: s.rot, k: key(s.x, s.y) };
      }
    } else {
      // Loose decals: walls and corners three times as likely as open floor.
      const free = cells.filter((c) => {
        const k = key(c.x, c.y);
        if (used.has(k) || occupied.object.has(k) || occupied.floor.has(k)) return false;
        // Rough ground (difficult terrain) stays out of doorways.
        return !(meta.tags.includes('difficult terrain') && (room.keepClear.has(k) || room.flow?.has(k)));
      });
      if (free.length) {
        const w = (c) => 1 + SIDES.filter((s) => c.sides[s] === 'wall').length * 2;
        const total2 = free.reduce((s, c) => s + w(c), 0);
        let q = random() * total2;
        const c = free.find((x) => (q -= w(x)) <= 0) || free[free.length - 1];
        const jitter = () => Math.round((random() - 0.5) * 0.36 * 100) / 100;
        spot = { x: c.x + 0.5 + jitter(), y: c.y + 0.5 + jitter(), rot: Math.floor(random() * 24) * 15, k: key(c.x, c.y) };
      }
    }
    if (!spot) {
      counts.set(meta.id, Infinity);
      continue;
    }
    used.add(spot.k);
    counts.set(meta.id, (counts.get(meta.id) || 0) + 1);
    out.push({ asset: meta.id, x: spot.x, y: spot.y, rot: spot.rot, auto: true, room: tag.id });
    count--;
  }
  return out;
}
