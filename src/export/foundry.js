// Foundry VTT v14 scene export (built-in Scene Levels). Pure data, no DOM.
//
// Produces Scene data for Foundry's "Import Data": one Level per map level (elevation band,
// background image, lower levels visible from above) and walls tagged with their level.
//
// Wall mapping (CONST values from Foundry v14):
//   sense types  NONE 0, LIMITED 10, NORMAL 20      move  NONE 0, NORMAL 20
//   dir          BOTH 0, LEFT 1, RIGHT 2           door  NONE 0, DOOR 1, SECRET 2
//   ds (state)   CLOSED 0, OPEN 1, LOCKED 2
// A wall's direction applies to all its senses, so a railing is two walls on the same line:
// one blocks movement both ways, the other blocks sight and light only when looking from the
// open side (you can see down from the balcony, not up onto it).

import { simplify, polylineSegments, projectOnSegment, dist, sub, norm, add, scale, pointInRings } from '../core/geom.js';
import { hash } from '../core/rng.js';

export const COMPLEXITY = {
  high: { name: 'High (follows every curve)', tolerance: 0.01 },
  medium: { name: 'Medium', tolerance: 0.05 },
  low: { name: 'Low (fewest walls)', tolerance: 0.15 },
};

const WALL = { move: 20, sight: 20, light: 20, sound: 20, dir: 0, door: 0, ds: 0 };
const DOORS = {
  door: { door: 1 },
  double: { door: 1 },
  sliding: { door: 1 },
  secret: { door: 2 },
  locked: { door: 1, ds: 2 },
  portcullis: { door: 1, sight: 0, light: 0, sound: 0 }, // bars: see and hear through
  window: { sight: 0, light: 0, sound: 10 },
  archway: null, // open: no wall
};

/** A stable 16-character Foundry-style id. */
export function foundryId(...parts) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  let h = hash('map-weaver', ...parts);
  for (let i = 0; i < 16; i++) {
    h = hash(h, i);
    out += chars[h % chars.length];
  }
  return out;
}

/** Chain loose segments into polylines where they share end points. */
export function chainSegments(segments) {
  const key = (p) => `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`;
  const byPoint = new Map();
  segments.forEach((s, i) => {
    for (const p of s) {
      const k = key(p);
      if (!byPoint.has(k)) byPoint.set(k, []);
      byPoint.get(k).push(i);
    }
  });
  const used = new Uint8Array(segments.length);
  const lines = [];
  const extend = (line, fromEnd) => {
    for (;;) {
      const tip = fromEnd ? line[line.length - 1] : line[0];
      const next = (byPoint.get(key(tip)) || []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [a, b] = segments[next];
      const other = key(a) === key(tip) ? b : a;
      if (fromEnd) line.push(other);
      else line.unshift(other);
    }
  };
  segments.forEach((s, i) => {
    if (used[i]) return;
    used[i] = 1;
    const line = [s[0], s[1]];
    extend(line, true);
    extend(line, false);
    lines.push(line);
  });
  return lines;
}

/**
 * Remove the parts of wall segments that doors cover. Segments along the door line are cut
 * exactly; segments of curved walls under a chord door are dropped and their ends snapped to
 * the door's ends so no gap is left.
 */
export function cutDoors(segments, doors, tolerance) {
  const lineEps = Math.max(0.03, tolerance * 2 + 0.02);
  let out = segments.map(([a, b]) => [a, b]);
  for (const d of doors) {
    const next = [];
    const dl = dist(d.a, d.b);
    if (dl < 1e-6) continue;
    const u = norm(sub(d.b, d.a));
    for (const [a, b] of out) {
      const ha = projectOnSegment(a, d.a, d.b);
      const hb = projectOnSegment(b, d.a, d.b);
      const perpA = Math.abs((a[0] - d.a[0]) * -u[1] + (a[1] - d.a[1]) * u[0]);
      const perpB = Math.abs((b[0] - d.a[0]) * -u[1] + (b[1] - d.a[1]) * u[0]);
      if (perpA < lineEps && perpB < lineEps) {
        // Along the door's line: keep what lies outside [0, dl].
        const ta = ((a[0] - d.a[0]) * u[0] + (a[1] - d.a[1]) * u[1]);
        const tb = ((b[0] - d.a[0]) * u[0] + (b[1] - d.a[1]) * u[1]);
        const lo = Math.min(ta, tb);
        const hi = Math.max(ta, tb);
        if (hi <= 1e-6 || lo >= dl - 1e-6) {
          next.push([a, b]);
          continue;
        }
        const at = (t) => add(d.a, scale(u, t));
        const first = ta <= tb ? a : b;
        const last = ta <= tb ? b : a;
        if (lo < -1e-6) next.push([first, at(0)]);
        if (hi > dl + 1e-6) next.push([at(dl), last]);
        continue;
      }
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const hm = projectOnSegment(mid, d.a, d.b);
      if (hm.dist < 0.3 && hm.t > 0 && hm.t < 1) continue; // under a chord door
      // Snap loose ends next to the door onto its ends.
      const snapEnd = (p, h) => (h.dist < 0.3 && (h.t === 0 || h.t === 1) && dist(p, h.point) < 0.3 ? h.point : p);
      next.push([snapEnd(a, ha), snapEnd(b, hb)]);
    }
    out = next;
  }
  return out.filter(([a, b]) => dist(a, b) > 1e-4);
}

function toWall(a, b, pps, levelId, props) {
  return {
    c: [Math.round(a[0] * pps), Math.round(a[1] * pps), Math.round(b[0] * pps), Math.round(b[1] * pps)],
    levels: [levelId],
    ...WALL,
    ...props,
  };
}

/** Walls for one level. geo from computeLevelGeometry. */
export function levelWalls({ level, geo, pps, levelId, tolerance, assetWalls = [], flipOneWay = false }) {
  const walls = [];
  const simplifyLines = (lines) => lines.map((l) => (l.length > 2 ? simplify(l, tolerance) : l));

  // Solid walls: the outline, inner walls and edges made into walls.
  const outline = geo.structure.map((ring) => [...ring, ring[0]]);
  const inner = chainSegments(geo.inner);
  const edgeWalls = geo.edgeRuns.filter((r) => r.kind === 'wall').map((r) => r.points);
  const solid = simplifyLines([...outline, ...inner, ...edgeWalls]).flatMap((l) => polylineSegments(l));
  const doors = level.doors.filter((d) => d.type in DOORS);
  for (const [a, b] of cutDoors(solid, doors, tolerance)) walls.push(toWall(a, b, pps, levelId, {}));
  for (const d of doors) {
    const props = DOORS[d.type];
    if (props) walls.push(toWall(d.a, d.b, pps, levelId, props));
  }

  // Railings: movement both ways, sight and light one way.
  for (const run of geo.edgeRuns.filter((r) => r.kind === 'railing')) {
    for (const [a, b] of polylineSegments(simplify(run.points, tolerance))) {
      const d = norm(sub(b, a));
      const mid = scale(add(a, b), 0.5);
      // Screen coordinates (y down): the left of a->b is (dy, -dx).
      const leftIsOpen = pointInRings(add(mid, scale([d[1], -d[0]], 0.05)), geo.open);
      let dir = leftIsOpen ? 1 : 2; // block rays that come from the open side
      if (flipOneWay) dir = dir === 1 ? 2 : 1;
      walls.push(toWall(a, b, pps, levelId, { sight: 0, light: 0, sound: 0 }));
      walls.push(toWall(a, b, pps, levelId, { move: 0, sound: 0, dir }));
    }
  }

  // Assets that block vision (pillars, statues...) get a wall round their footprint.
  for (const ring of assetWalls) {
    for (const [a, b] of polylineSegments(ring, true)) walls.push(toWall(a, b, pps, levelId, {}));
  }
  // Drop duplicates and zero-length walls.
  const seen = new Set();
  return walls.filter((w) => {
    const [x0, y0, x1, y1] = w.c;
    if (x0 === x1 && y0 === y1) return false;
    const ends = [`${x0},${y0}`, `${x1},${y1}`].sort();
    const k = [...ends, w.move, w.sight, w.dir, w.door].join('|');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Rotated footprint outline of a placement, inset a little. */
export function placementRing(pl, footprint, inset = 0.08) {
  const a = ((pl.rot || 0) * Math.PI) / 180;
  const hw = footprint.w / 2 - inset;
  const hh = footprint.h / 2 - inset;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [pl.x + x * c - y * s, pl.y + x * s + y * c]);
}

/**
 * Build Foundry Scene data.
 *  geometry(level)       derived geometry for a level
 *  imagePath(index)      path of each level's background image inside Foundry's data folder
 *  resolve(placement)    {meta, footprint} for asset walls (optional)
 */
export function buildFoundryScene(map, { geometry, imagePath, pps = 100, complexity = 'medium', assetWalls = true, resolve = null, flipOneWay = false }) {
  const tolerance = (COMPLEXITY[complexity] || COMPLEXITY.medium).tolerance;
  const fps = map.feetPerSquare || 5;
  const ids = map.levels.map((lv) => foundryId(map.id, lv.id));
  const levels = map.levels.map((lv, i) => ({
    _id: ids[i],
    name: lv.name,
    elevation: { bottom: lv.elevation * fps, top: (lv.elevation + lv.height) * fps },
    background: { src: imagePath(i) },
    foreground: { src: null },
    // Lower levels show through this level's openings.
    visibility: { levels: ids.slice(0, i) },
    sort: i,
  }));
  const walls = map.levels.flatMap((lv, i) => {
    const rings = [];
    if (assetWalls && resolve) {
      for (const pl of lv.placements) {
        const r = resolve(pl);
        if (r?.meta.blocksVision) rings.push(placementRing(pl, r.footprint));
      }
    }
    return levelWalls({ level: lv, geo: geometry(lv), pps, levelId: ids[i], tolerance, assetWalls: rings, flipOneWay });
  });
  const ground = map.levels.findIndex((lv) => lv.elevation === 0);
  return {
    name: map.name,
    width: Math.round(map.size.w * pps),
    height: Math.round(map.size.h * pps),
    padding: 0,
    grid: { type: 1, size: pps, distance: fps, units: 'ft' },
    tokenVision: true,
    levels,
    initialLevel: ids[Math.max(0, ground)],
    walls,
    flags: { 'map-weaver': { mapId: map.id, exported: new Date().toISOString(), complexity } },
  };
}
