// Placing doors on walls. A door is a segment {a, b} lying on a wall.

import { projectOnSegment, sub, add, scale, len, norm, dist } from './geom.js';

const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-6;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Nearest wall segment to p within maxDist, or null. */
export function nearestWall(segments, p, maxDist = 0.5) {
  let best = null;
  for (const [a, b] of segments) {
    const hit = projectOnSegment(p, a, b);
    if (hit.dist <= maxDist && (!best || hit.dist < best.dist)) best = { a, b, t: hit.t, point: hit.point, dist: hit.dist };
  }
  return best;
}

/**
 * Door endpoints on wall segment a-b near `point`, about `width` squares wide.
 * On walls between grid points the door snaps to grid points along the wall
 * (so a diagonal door spans one square corner to corner). On curves it is a chord.
 */
export function snapDoor(a, b, point, width = 1) {
  const d = sub(b, a);
  const L = len(d);
  if (L < 1e-6) return null;
  const u = norm(d);
  const s = projectOnSegment(point, a, b).t * L;
  if (isInt(a[0]) && isInt(a[1]) && isInt(d[0]) && isInt(d[1])) {
    const g = gcd(Math.abs(Math.round(d[0])), Math.abs(Math.round(d[1])));
    const step = scale(d, 1 / g);
    const spacing = len(step);
    const n = Math.min(g, Math.max(1, Math.round(width / spacing)));
    const k = Math.max(0, Math.min(g - n, Math.round(s / spacing - n / 2)));
    return { a: add(a, scale(step, k)), b: add(a, scale(step, k + n)) };
  }
  const half = width / 2;
  const centre = add(a, scale(u, s));
  return { a: add(centre, scale(u, -half)), b: add(centre, scale(u, half)) };
}

export function doorLength(door) {
  return dist(door.a, door.b);
}

/** True if two doors overlap along the same line. */
export function doorsOverlap(d1, d2) {
  const mid = scale(add(d1.a, d1.b), 0.5);
  const hit = projectOnSegment(mid, d2.a, d2.b);
  return hit.dist < 0.05 && hit.t > 0.01 && hit.t < 0.99;
}
