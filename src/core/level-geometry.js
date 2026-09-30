// Derived geometry for one level: floor polygon, wall segments and rooms.
// Recomputed from the level's shapes and walls whenever they change.
//
// Walls come from three places:
//  1. The floor boundary: every edge between floor and not-floor is a wall.
//  2. Outlines of shapes added as "separate room" (walled). A later shape covering part of an
//     earlier outline removes that part, so extending a room merges it, and drawing a walled
//     room next to another leaves a single shared wall.
//  3. Walls drawn by hand (lines and arcs).
// Only parts of 2 and 3 strictly inside the floor are kept; the boundary already covers the rest.

import { classifySegments, polylineSegments, arcPoints, mergeCollinear } from './geom.js';
import { union, difference } from './clip.js';
import { shapeRings } from './shapes.js';
import { detectRooms } from './rooms.js';

const ringCache = new Map();

export function cachedShapeRings(shape) {
  const key = JSON.stringify(shape, (k, v) => (k === 'id' || k === 'walled' ? undefined : v));
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

export function computeFloor(level) {
  let floor = [];
  const rings = level.shapes.map(cachedShapeRings);
  level.shapes.forEach((s, i) => {
    floor = s.op === 'subtract' ? difference(floor, rings[i]) : union(floor, rings[i]);
  });
  return { floor, shapeRings: rings };
}

export function computeInnerWalls(level, shapeRings, floor) {
  let inner = [];
  level.shapes.forEach((s, i) => {
    const rings = shapeRings[i];
    if (!rings.length) return;
    if (inner.length) {
      inner = classifySegments(inner, rings)
        .filter((p) => p.where === 'outside')
        .map((p) => [p.a, p.b]);
    }
    if (s.op === 'add' && s.walled) {
      for (const ring of rings) inner.push(...polylineSegments(ring, true));
    }
  });
  for (const w of level.walls) inner.push(...polylineSegments(wallPolyline(w)));
  if (!floor.length || !inner.length) return [];
  const kept = classifySegments(inner, floor)
    .filter((p) => p.where === 'inside')
    .map((p) => [p.a, p.b]);
  return mergeCollinear(kept);
}

/** Full derived geometry for a level. */
export function computeLevelGeometry(level, map) {
  const { floor, shapeRings } = computeFloor(level);
  const inner = computeInnerWalls(level, shapeRings, floor);
  const boundarySegments = floor.flatMap((ring) => polylineSegments(ring, true));
  const rooms = detectRooms(floor, inner, map.size, level.rooms);
  return {
    floor,
    shapeRings,
    inner,
    boundarySegments,
    wallSegments: boundarySegments.concat(inner),
    rooms,
    cache: {}, // renderer scratch space (paths, hatching)
  };
}
