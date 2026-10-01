// The map document. Everything here is plain JSON so it saves, loads and diffs cleanly.
//
// Map
//   setting, style {palette, shading, grid}, size {w, h} in squares, seed
//   levels[]  one per storey, bottom first
//   links[]   stairs / ladders / lifts / trapdoors between levels (Phase 1, step 2)
// Level
//   shapes[]  floor shapes applied in order: add, subtract, or void (open to the level below)
//   walls[]   walls drawn by hand (lines and arcs), on top of the walls shapes create
//   doors[]   openings placed on any wall: {a, b, type}
//   edges[]   overrides for the edges of open-to-below areas: {at, kind: railing | wall | drop}
//   rooms[]   room tags: {at: point inside the room, type, seed, reroll}
//   wallStyles[]  per-room wall looks: {at: point inside the room, texture, width}
//   placements[]  decorated assets (step 3+)

export const FORMAT = 'map-weaver/map';
export const VERSION = 1;

export const SHAPE_KINDS = ['rect', 'circle', 'poly', 'cave', 'cells', 'path'];
export const SHAPE_OPS = ['add', 'subtract', 'void'];
export const EDGE_KINDS = [
  { id: 'railing', name: 'Railing' },
  { id: 'wall', name: 'Wall' },
  { id: 'drop', name: 'Open drop' },
];
const EDGE_KIND_IDS = EDGE_KINDS.map((k) => k.id);
const LINK_TYPE_IDS = ['stairs', 'spiral', 'ladder', 'lift', 'trapdoor'];
export const WALL_KINDS = ['line', 'arc'];

// Semantic door/opening types. Foundry mapping lives in the exporter (Phase 2).
export const DOOR_TYPES = [
  { id: 'door', name: 'Door', width: 1 },
  { id: 'double', name: 'Double door', width: 2 },
  { id: 'secret', name: 'Secret door', width: 1 },
  { id: 'locked', name: 'Locked door', width: 1 },
  { id: 'portcullis', name: 'Portcullis / bars', width: 1 },
  { id: 'sliding', name: 'Sliding door', width: 1 },
  { id: 'archway', name: 'Archway (open)', width: 1 },
  { id: 'window', name: 'Window', width: 1 },
];
export const DOOR_TYPE_IDS = DOOR_TYPES.map((d) => d.id);

let idCounter = 0;
export function newId(prefix = 'x') {
  idCounter = (idCounter + 1) % 1e6;
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

export function newSeed() {
  return Math.floor(Math.random() * 2 ** 31);
}

export function createLevel(name = 'Ground floor', elevation = 0) {
  return {
    id: newId('lv'),
    name,
    elevation, // in squares above the ground level
    height: 2, // storey height in squares, for Foundry levels later
    shapes: [],
    walls: [],
    doors: [],
    edges: [],
    rooms: [],
    wallStyles: [],
    placements: [],
  };
}

/** Keep elevations stacked: each level sits on top of the one below. */
export function restack(map) {
  let z = 0;
  for (const lv of map.levels) {
    lv.elevation = z;
    z += lv.height;
  }
}

/** Insert a new level at index (0 = bottom). Returns it. */
export function insertLevel(map, index, name) {
  const lv = createLevel(name);
  map.levels.splice(index, 0, lv);
  restack(map);
  return lv;
}

/** Remove a level; links that no longer span two levels are removed or shortened. */
export function removeLevel(map, levelId) {
  const index = map.levels.findIndex((l) => l.id === levelId);
  if (index < 0 || map.levels.length < 2) return;
  const below = map.levels[index - 1];
  const above = map.levels[index + 1];
  map.levels.splice(index, 1);
  map.links = map.links.filter((k) => {
    if (k.from === levelId) k.from = above?.id;
    if (k.to === levelId) k.to = below?.id;
    const a = map.levels.findIndex((l) => l.id === k.from);
    const b = map.levels.findIndex((l) => l.id === k.to);
    return a >= 0 && b >= 0 && b > a;
  });
  restack(map);
}

export function createMap({ name = 'Untitled map', setting = 'classic', style, size } = {}) {
  return {
    format: FORMAT,
    version: VERSION,
    id: newId('map'),
    name,
    setting,
    style: { palette: 'blue-white', shading: 'solid', grid: 'floor', ...style },
    size: { w: 40, h: 30, ...size },
    feetPerSquare: 5,
    seed: newSeed(),
    levels: [createLevel()],
    links: [],
  };
}

/** Validate and upgrade a parsed map. Throws with a readable message on bad input. */
export function loadMap(data) {
  if (!data || typeof data !== 'object') throw new Error('Not a map file.');
  if (data.format !== FORMAT) throw new Error('This file is not a Map Weaver map.');
  if (typeof data.version !== 'number' || data.version > VERSION) {
    throw new Error(`Map version ${data.version} is newer than this app supports (${VERSION}).`);
  }
  const map = structuredClone(data);
  const base = createMap();
  map.style = { ...base.style, ...map.style };
  map.size = { ...base.size, ...map.size };
  map.feetPerSquare ??= 5;
  map.seed ??= newSeed();
  map.links ??= [];
  if (!Array.isArray(map.levels) || !map.levels.length) map.levels = [createLevel()];
  for (const lv of map.levels) {
    lv.id ??= newId('lv');
    lv.name ??= 'Level';
    lv.elevation ??= 0;
    lv.height ??= 2;
    for (const key of ['shapes', 'walls', 'doors', 'edges', 'rooms', 'wallStyles', 'placements']) {
      if (!Array.isArray(lv[key])) lv[key] = [];
    }
    lv.shapes = lv.shapes.filter((s) => SHAPE_KINDS.includes(s.kind));
    for (const s of lv.shapes) {
      s.id ??= newId('s');
      if (!SHAPE_OPS.includes(s.op)) s.op = 'add';
    }
    lv.walls = lv.walls.filter((w) => WALL_KINDS.includes(w.kind));
    for (const w of lv.walls) w.id ??= newId('w');
    lv.edges = lv.edges.filter((e) => Array.isArray(e.at) && EDGE_KIND_IDS.includes(e.kind));
    for (const d of lv.doors) {
      d.id ??= newId('d');
      if (!DOOR_TYPE_IDS.includes(d.type)) d.type = 'door';
    }
    for (const r of lv.rooms) {
      r.id ??= newId('r');
      r.seed ??= newSeed();
      r.reroll ??= 0;
    }
  }
  const levelIds = new Set(map.levels.map((l) => l.id));
  map.links = map.links.filter((k) => LINK_TYPE_IDS.includes(k.type) && levelIds.has(k.from) && levelIds.has(k.to));
  for (const k of map.links) k.id ??= newId('k');
  map.version = VERSION;
  return map;
}

export function saveMap(map) {
  return JSON.stringify(map, null, 1);
}
