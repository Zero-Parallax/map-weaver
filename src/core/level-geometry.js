// Derived geometry for one level: floor, open-to-below areas, walls, edges and rooms.
// Recomputed from the level (and the map's links) whenever they change.
//
// Areas:
//  - floor: where you can stand.
//  - open: open to the level below (balconies, galleries, stairwells). Void shapes and the
//    tops of stairs create it; later floor shapes fill it back in.
//  - structure = floor + open. Anything outside it is solid rock / outside.
//
// Walls come from:
//  1. The structure boundary.
//  2. Outlines of walled shapes. Each add shape joins rooms in one of three ways:
//       merge   (walled false)                 no walls of its own; opens into what it touches
//       on top  (walled true)                  own walls; earlier walls inside it are removed
//       overlap (walled true, overlap true)    own walls; earlier walls inside it are kept, so
//                                              where two rooms cross becomes a third space
//       under   (walled true, under true)      own walls only outside the floor drawn before
//                                              it; earlier walls are kept. Corridors: they
//                                              stop at the rooms they reach, behind a wall.
//     Drawing a walled room next to another leaves a single shared wall.
//  3. Walls drawn by hand (lines and arcs).
// Only parts of 2 and 3 strictly inside the floor are kept.
//
// Edges between floor and open areas are grouped into runs (split at corners). Each run is a
// railing by default, or a wall or open drop if the level's edge overrides say so. Stair
// arrivals leave gaps in them.

import { classifySegments, polylineSegments, arcPoints, mergeCollinear, projectOnSegment, sub, dot, norm, len, dist, lerp } from './geom.js';
import { union, difference } from './clip.js';
import { shapeRings } from './shapes.js';
import { detectRooms } from './rooms.js';
import { linksOnLevel, linkOpenings } from './links.js';
import { computeTerrain } from './terrain.js';

const ringCache = new Map();
const CORNER_COS = Math.cos((35 * Math.PI) / 180);

export function cachedShapeRings(shape) {
  const key = JSON.stringify(shape, (k, v) => (k === 'id' || k === 'walled' || k === 'op' || k === 'overlap' || k === 'under' ? undefined : v));
  let rings = ringCache.get(key);
  if (!rings) {
    if (ringCache.size > 4000) ringCache.clear();
    rings = shapeRings(shape);
    ringCache.set(key, rings);
  }
  return rings;
}

export function wallPolyline(wall) {
  if (wall.kind === 'line') return [wall.a, wall.b];
  if (wall.kind === 'arc') return arcPoints(wall.c, wall.r, wall.start, wall.sweep, 0.004);
  return [];
}

const mapRing = (size) => [[0, 0], [size.w, 0], [size.w, size.h], [0, size.h]];

/**
 * Floor and open areas from the level's shapes plus any link openings. Outdoor levels
 * (level.ground) start with the whole map as floor.
 */
export function computeAreas(level, openings = { rings: [], gaps: [] }, size = null) {
  let floor = level.ground && size ? [mapRing(size)] : [];
  let open = [];
  const rings = level.shapes.map(cachedShapeRings);
  level.shapes.forEach((s, i) => {
    const r = rings[i];
    if (s.op === 'void') {
      floor = difference(floor, r);
      open = union(open, r);
    } else {
      floor = s.op === 'subtract' ? difference(floor, r) : union(floor, r);
      open = difference(open, r);
    }
  });
  if (openings.rings.length) {
    floor = difference(floor, openings.rings);
    open = union(open, openings.rings);
  }
  const structure = open.length ? union(floor, open) : floor;
  return { floor, open, structure, shapeRings: rings };
}

export function computeInnerWalls(level, shapeRings, floor) {
  let inner = [];
  const trackFloor = level.shapes.some((s) => s.under);
  let before = []; // floor drawn so far, for 'under' shapes
  level.shapes.forEach((s, i) => {
    const rings = shapeRings[i];
    if (!rings.length) return;
    const keepEarlier = s.op === 'add' && s.walled && (s.overlap || s.under);
    if (inner.length && !keepEarlier) {
      inner = classifySegments(inner, rings)
        .filter((p) => p.where === 'outside')
        .map((p) => [p.a, p.b]);
    }
    if (s.op === 'add' && s.walled) {
      let own = rings.flatMap((ring) => polylineSegments(ring, true));
      if (s.under && before.length) own = classifySegments(own, before).filter((p) => p.where === 'outside').map((p) => [p.a, p.b]);
      inner.push(...own);
    }
    if (trackFloor) before = s.op === 'add' ? union(before, rings) : difference(before, rings);
  });
  for (const w of level.walls) inner.push(...polylineSegments(wallPolyline(w)));
  if (!floor.length || !inner.length) return [];
  const kept = classifySegments(inner, floor)
    .filter((p) => p.where === 'inside')
    .map((p) => [p.a, p.b]);
  return mergeCollinear(kept);
}

function inGap(a, b, gaps) {
  const mid = lerp(a, b, 0.5);
  return gaps.some(([g0, g1]) => {
    const hit = projectOnSegment(mid, g0, g1);
    return hit.dist < 0.25 && hit.t > 0 && hit.t < 1;
  });
}

function turnIsSharp(p, q) {
  const u = norm(sub(p.b, p.a));
  const v = norm(sub(q.b, q.a));
  return dot(u, v) < CORNER_COS;
}

/**
 * Runs of floor edge that face an open area. Returns [{points, kind}] where kind is
 * 'railing' (default), 'wall' or 'drop' after applying overrides.
 */
export function computeEdgeRuns(floor, structure, gaps, overrides) {
  const runs = [];
  if (!floor.length || structure === floor) return runs;
  for (const ring of floor) {
    const pieces = classifySegments(polylineSegments(ring, true), structure);
    const flags = pieces.map((p) => p.where === 'inside' && !inGap(p.a, p.b, gaps));
    const n = pieces.length;
    if (!flags.some(Boolean)) continue;
    // Start just after a break so wrap-around runs stay whole.
    let start = flags.findIndex((f, i) => f && (!flags[(i - 1 + n) % n] || turnIsSharp(pieces[(i - 1 + n) % n], pieces[i])));
    if (start < 0) start = flags.indexOf(true); // one closed loop, e.g. a round opening
    let current = null;
    for (let k = 0; k < n; k++) {
      const i = (start + k) % n;
      const p = pieces[i];
      if (!flags[i]) {
        current = null;
        continue;
      }
      if (current && !turnIsSharp(pieces[(i - 1 + n) % n], p) && dist(current.points[current.points.length - 1], p.a) < 1e-6) {
        current.points.push(p.b);
      } else {
        current = { points: [p.a, p.b], kind: 'railing' };
        runs.push(current);
      }
    }
  }
  for (const o of overrides) {
    let best = null;
    let bestD = 0.35;
    for (const run of runs) {
      for (const [a, b] of polylineSegments(run.points)) {
        const d = projectOnSegment(o.at, a, b).dist;
        if (d < bestD) {
          bestD = d;
          best = run;
        }
      }
    }
    if (best) best.kind = o.kind;
  }
  return runs;
}

/** Nearest edge run to p within maxDist. */
export function edgeRunAt(runs, p, maxDist = 0.4) {
  let best = null;
  let bestD = maxDist;
  for (const run of runs) {
    for (const [a, b] of polylineSegments(run.points)) {
      const d = projectOnSegment(p, a, b).dist;
      if (d < bestD) {
        bestD = d;
        best = run;
      }
    }
  }
  return best;
}

/** Length along a polyline. */
export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += len(sub(points[i], points[i - 1]));
  return total;
}

function linkGeometry(map, level) {
  const rings = [];
  const gaps = [];
  if (!map || !map.links?.length) return { rings, gaps };
  for (const { link, role } of linksOnLevel(map, level)) {
    const o = linkOpenings(link, role);
    rings.push(...o.rings);
    gaps.push(...o.gaps);
  }
  return { rings, gaps };
}

/** Full derived geometry for a level. */
export function computeLevelGeometry(level, map) {
  const openings = linkGeometry(map, level);
  const { floor, open, structure, shapeRings } = computeAreas(level, openings, map.size);
  const inner = computeInnerWalls(level, shapeRings, floor);
  const edgeRuns = computeEdgeRuns(floor, structure, openings.gaps, level.edges || []);
  let outerSegments = structure.flatMap((ring) => polylineSegments(ring, true));
  if (level.ground) {
    // Outdoors the map's edge is not a wall.
    const { w, h } = map.size;
    const onEdge = (a, b) => (Math.abs(a[0]) < 1e-6 && Math.abs(b[0]) < 1e-6) || (Math.abs(a[0] - w) < 1e-6 && Math.abs(b[0] - w) < 1e-6) ||
      (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) || (Math.abs(a[1] - h) < 1e-6 && Math.abs(b[1] - h) < 1e-6);
    outerSegments = outerSegments.filter(([a, b]) => !onEdge(a, b));
  }
  // Outdoors, ground shows wherever no floor was drawn (buildings stand on it).
  let ground = [];
  if (level.ground) {
    const built = level.shapes.reduce((acc, s, i) => (s.op === 'add' ? union(acc, shapeRings[i]) : acc), []);
    ground = difference(floor, built);
  }
  const edgeWalls = edgeRuns.filter((r) => r.kind === 'wall').flatMap((r) => polylineSegments(r.points));
  // Railings and drops still bound the floor for room detection; walls too.
  const rooms = detectRooms(floor, inner, map.size, level.rooms);
  return {
    floor,
    open,
    structure,
    shapeRings,
    inner,
    edgeRuns,
    outerSegments,
    // Everything drawn as a wall, and where doors can go.
    wallSegments: outerSegments.concat(inner, edgeWalls),
    rooms,
    ground,
    terrain: computeTerrain(level),
    cache: {}, // renderer scratch space (paths, hatching)
  };
}
