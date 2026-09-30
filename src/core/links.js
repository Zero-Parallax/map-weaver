// Links between levels: stairs, spiral stairs, ladders, lifts and trapdoors.
//
// A link lives on the map (not a level) because it spans levels:
//   {id, type, from: levelId (lowest), to: levelId (highest), x, y, w, h, dir}
// (x, y, w, h) is the footprint in squares, the same on every level.
// dir is the side the stairs climb towards ('n' | 'e' | 's' | 'w'); for spiral stairs it is
// the side you step off at the top.

import { newId } from './model.js';
import { circlePoints } from './geom.js';
import { rectRing } from './shapes.js';

export const LINK_TYPES = [
  { id: 'stairs', name: 'Stairs', span: 'pair', defaultSize: [2, 3] },
  { id: 'spiral', name: 'Spiral stairs', span: 'pair', defaultSize: [2, 2] },
  { id: 'ladder', name: 'Ladder', span: 'multi', defaultSize: [1, 1] },
  { id: 'lift', name: 'Lift', span: 'multi', defaultSize: [2, 2] },
  { id: 'trapdoor', name: 'Trapdoor', span: 'pair', defaultSize: [1, 1] },
];
export const LINK_TYPE_IDS = LINK_TYPES.map((t) => t.id);
export const DIRS = ['n', 'e', 's', 'w'];
const DIR_VEC = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

export function createLink(type, from, to, rect, dir = 'n') {
  return { id: newId('k'), type, from, to, ...rect, dir };
}

export function dirVector(dir) {
  return DIR_VEC[dir] || DIR_VEC.n;
}

/** Index range [lo, hi] of the levels a link spans, or null if its levels are gone. */
export function linkRange(map, link) {
  const a = map.levels.findIndex((l) => l.id === link.from);
  const b = map.levels.findIndex((l) => l.id === link.to);
  if (a < 0 || b < 0) return null;
  return [Math.min(a, b), Math.max(a, b)];
}

/** Links touching a level, with the level's role: 'bottom', 'middle' or 'top'. */
export function linksOnLevel(map, level) {
  const index = map.levels.indexOf(level);
  const out = [];
  for (const link of map.links) {
    const range = linkRange(map, link);
    if (!range || index < range[0] || index > range[1] || range[0] === range[1]) continue;
    out.push({ link, role: index === range[0] ? 'bottom' : index === range[1] ? 'top' : 'middle' });
  }
  return out;
}

/** The side of a rect facing dir, as a segment. */
export function rectSide(link, dir) {
  const { x, y, w, h } = link;
  switch (dir) {
    case 'e': return [[x + w, y], [x + w, y + h]];
    case 's': return [[x, y + h], [x + w, y + h]];
    case 'w': return [[x, y], [x, y + h]];
    default: return [[x, y], [x + w, y]];
  }
}

export function spiralCentre(link) {
  return [link.x + link.w / 2, link.y + link.h / 2];
}

/**
 * Floor openings a link cuts into a level: {rings, gaps}.
 * Stairs and spiral stairs open the floor above them; the arrival side has no railing (a gap).
 */
export function linkOpenings(link, role) {
  if (role !== 'top') return { rings: [], gaps: [] };
  if (link.type === 'stairs') {
    return { rings: [rectRing(link)], gaps: [rectSide(link, link.dir)] };
  }
  if (link.type === 'spiral') {
    const c = spiralCentre(link);
    const r = Math.min(link.w, link.h) / 2;
    const v = dirVector(link.dir);
    const edge = [c[0] + v[0] * r, c[1] + v[1] * r];
    const t = [-v[1] * 0.6, v[0] * 0.6];
    return {
      rings: [circlePoints(c, r, 0.004)],
      gaps: [[[edge[0] - t[0], edge[1] - t[1]], [edge[0] + t[0], edge[1] + t[1]]]],
    };
  }
  return { rings: [], gaps: [] };
}

export function linkContains(link, p) {
  return p[0] >= link.x && p[0] <= link.x + link.w && p[1] >= link.y && p[1] <= link.y + link.h;
}
