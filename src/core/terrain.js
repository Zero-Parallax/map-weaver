// Ground and painted terrain.
//
// level.ground (optional): the level is outdoors. The whole map is walkable ground of that
// kind, the map's edge is not a wall, and drawn shapes are buildings standing on it.
//
// level.terrain: painted areas, in order: {id, kind, op: 'add' | 'erase', shape}. shape is a
// floor shape (cells from the brush, a freehand 'cave' blob, or a 'path' for rivers and
// roads). Later paint replaces earlier paint of other kinds; 'erase' removes all kinds.
//
// Each kind says how it plays:
//   move    normal | difficult | hazard (difficult, and it hurts) | blocked (no walking)
//   decor   whether furniture may stand on it (floor decals and bridges always may)

import { union, difference } from './clip.js';
import { pointInRings } from './geom.js';
import { cachedShapeRings } from './level-geometry.js';

export const GROUNDS = [
  { id: 'grass', name: 'Grass' },
  { id: 'dirt', name: 'Dirt' },
  { id: 'sand', name: 'Sand' },
  { id: 'snow', name: 'Snow' },
  { id: 'rock', name: 'Bare rock' },
  { id: 'plating', name: 'Deck plating' },
];
export const GROUND_IDS = GROUNDS.map((g) => g.id);

export const TERRAIN_KINDS = [
  { id: 'water', name: 'Shallow water', move: 'difficult', decor: false },
  { id: 'deep-water', name: 'Deep water', move: 'difficult', decor: false, swim: true },
  { id: 'lava', name: 'Lava', move: 'hazard', decor: false },
  { id: 'chasm', name: 'Chasm', move: 'blocked', decor: false },
  { id: 'ice', name: 'Ice', move: 'difficult', decor: true },
  { id: 'mud', name: 'Mud', move: 'difficult', decor: true },
  { id: 'road', name: 'Dirt road', move: 'normal', decor: false, keepClear: true },
  { id: 'paving', name: 'Paving', move: 'normal', decor: false, keepClear: true },
  { id: 'grass', name: 'Grass', move: 'normal', decor: true },
  { id: 'sand', name: 'Sand', move: 'normal', decor: true },
];
export const TERRAIN = Object.fromEntries(TERRAIN_KINDS.map((k) => [k.id, k]));

/** Rings of each terrain kind on a level: Map(kind -> rings), non-overlapping. */
export function computeTerrain(level) {
  const kinds = new Map();
  for (const item of level.terrain || []) {
    if (item.op !== 'erase' && !TERRAIN[item.kind]) continue;
    const rings = cachedShapeRings(item.shape);
    if (!rings.length) continue;
    for (const [k, r] of kinds) if (k !== item.kind) kinds.set(k, difference(r, rings));
    if (item.op === 'erase') {
      if (kinds.has(item.kind)) kinds.set(item.kind, difference(kinds.get(item.kind), rings));
      continue;
    }
    kinds.set(item.kind, union(kinds.get(item.kind) || [], rings));
  }
  for (const [k, r] of kinds) if (!r.length) kinds.delete(k);
  return kinds;
}

/** Terrain kind at a point, or null. */
export function terrainAt(terrain, p) {
  for (const [kind, rings] of terrain) if (pointInRings(p, rings)) return kind;
  return null;
}
