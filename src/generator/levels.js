// Several levels at once, joined by stairs, spiral stairs, ladders or lifts.
//
// Levels are generated bottom first. Between each pair a link is placed where its footprint
// and landings lie inside one room on both levels. Dungeons and caves make that easy by
// starting the upper level with a room right over the stair room below (an anchor); towers,
// buildings and ships share an outline, so a spot is searched for. If none is found, a small
// walled stairwell is built through both levels.

import { computeLevelGeometry } from '../core/level-geometry.js';
import { createLink } from '../core/links.js';
import { pointInRings, classifySegments } from '../core/geom.js';
import { rectRing } from '../core/shapes.js';
import { newId, createLevel, restack } from '../core/model.js';
import { regionAt } from '../core/rooms.js';
import { rng, hash } from '../core/rng.js';
import { generateLayout } from './layout.js';

const SIZES = { stairs: [2, 3], spiral: [2, 2], ladder: [1, 1], lift: [2, 2] };

/** Footprint, the square(s) you step on at the bottom, and at the top, for a link at x, y. */
function linkSquares(type, x, y, dir) {
  const [a, b] = SIZES[type] || [2, 2];
  const vertical = dir === 'n' || dir === 's';
  const w = type === 'stairs' && !vertical ? b : a;
  const h = type === 'stairs' && !vertical ? a : b;
  const rect = [];
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) rect.push([i, j]);
  const side = (d) => {
    const out = [];
    if (d === 'n') for (let i = x; i < x + w; i++) out.push([i, y - 1]);
    if (d === 's') for (let i = x; i < x + w; i++) out.push([i, y + h]);
    if (d === 'w') for (let j = y; j < y + h; j++) out.push([x - 1, j]);
    if (d === 'e') for (let j = y; j < y + h; j++) out.push([x + w, j]);
    return out;
  };
  const back = { n: 's', s: 'n', e: 'w', w: 'e' }[dir];
  return {
    w,
    h,
    rect,
    foot: type === 'stairs' ? side(back) : [],
    top: type === 'stairs' || type === 'spiral' ? side(dir) : [],
  };
}

/** Region whose full squares hold every given square, or -1. */
function regionHolding(geo, squares, full) {
  let index = -1;
  for (const [x, y] of squares) {
    const r = regionAt(geo.rooms, [x + 0.5, y + 0.5]);
    if (r < 0 || (index >= 0 && r !== index) || !full[r].has(`${x},${y}`)) return -1;
    index = r;
  }
  return index;
}

const fullSquares = (geo) => geo.rooms.regions.map((r) => new Set(r.cells.map(([x, y]) => `${x},${y}`)));

/**
 * Spots for a link: inside one room on the lower level (with its foot), and if `high` is
 * given, inside one room on the upper level too (with its top landing). Rooms in `avoid` (by
 * tag type) are skipped below. Returns [{x, y, dir, w, h, low, high}].
 */
export function stairSpots(type, low, high, size, avoid = []) {
  const fullLow = fullSquares(low);
  const fullHigh = high && fullSquares(high);
  const out = [];
  // Ladders and lifts have no direction; stairs and spiral stairs try all four.
  for (const dir of type === 'ladder' || type === 'lift' ? ['n'] : ['n', 'e', 's', 'w']) {
    for (let y = 1; y < size.h - 1; y++) {
      for (let x = 1; x < size.w - 1; x++) {
        const sq = linkSquares(type, x, y, dir);
        const lo = regionHolding(low, [...sq.rect, ...sq.foot], fullLow);
        if (lo < 0 || avoid.includes(low.rooms.regions[lo].tag?.type)) continue;
        let hi = -1;
        if (high) {
          hi = regionHolding(high, [...sq.rect, ...sq.top], fullHigh);
          if (hi < 0) continue;
        }
        out.push({ x, y, dir, w: sq.w, h: sq.h, low: lo, high: hi });
      }
    }
  }
  return out;
}

/** Pick a spot near the edge of its room (stairs against a wall), at random among the best. */
function pickSpot(spots, geo, random) {
  if (!spots.length) return null;
  const full = fullSquares(geo);
  const score = (s) => {
    let edge = 0;
    for (let j = s.y - 1; j <= s.y + s.h; j++) {
      for (let i = s.x - 1; i <= s.x + s.w; i++) if (!full[s.low].has(`${i},${j}`)) edge++;
    }
    return edge + random() * 3;
  };
  return spots.map((s) => [score(s), s]).sort((a, b) => b[0] - a[0])[0][1];
}

const LEVEL_NAMES = {
  up: (i) => (i === 0 ? 'Ground floor' : i === 1 ? 'First floor' : i === 2 ? 'Second floor' : `Floor ${i + 1}`),
  deck: (i) => `Deck ${i + 1}`,
  down: (i, n) => (i === n - 1 ? 'Entrance level' : `Depth ${n - 1 - i}`),
};

/**
 * Generate a whole map's levels. Returns {levels: [level], links: [link]}, bottom first,
 * ready to replace map.levels and map.links.
 */
export function generateLevels({ style, map, count = 8, levels = 2, seed = 1, doorType = 'door', linkType = 'stairs' }) {
  const random = rng(hash('levels', seed));
  const n = Math.max(1, levels);
  const naming = style.layout === 'ship' ? 'deck' : style.layout === 'rooms' || style.layout === 'caves' ? 'down' : 'up';
  const outLevels = [];
  const links = [];
  const work = { ...map, levels: outLevels, links };
  const geoOf = (lv) => computeLevelGeometry(lv, work);
  const corridorType = style.corridor?.type;
  let anchor = null;
  let planned = null; // spot chosen on the level below before the anchored level was made
  for (let i = 0; i < n; i++) {
    const out = generateLayout({ style, map, count, seed: hash(seed, i), doorType, anchor });
    const level = createLevel(LEVEL_NAMES[naming](i, n));
    Object.assign(level, { shapes: out.shapes, walls: out.walls, doors: i === 0 || naming === 'down' ? out.doors : [], rooms: out.rooms, terrain: out.terrain, placements: out.placements });
    // Only the ground (or entrance) level keeps its way in from outside.
    if (naming === 'down' && i !== n - 1) level.doors = [];
    outLevels.push(level);
    restack(work);
    if (i === 0) {
      anchor = null;
    } else {
      const below = outLevels[i - 1];
      const lowGeo = geoOf(below);
      const highGeo = geoOf(level);
      let spot = planned && stairSpots(linkType, lowGeo, highGeo, map.size).find((s) => s.x === planned.x && s.y === planned.y && s.dir === planned.dir);
      spot ||= pickSpot(stairSpots(linkType, lowGeo, highGeo, map.size, [corridorType]), lowGeo, random);
      spot ||= pickSpot(stairSpots(linkType, lowGeo, highGeo, map.size), lowGeo, random);
      if (!spot) spot = carveStairwell({ below, level, lowGeo, highGeo, linkType, map, random, corridorType, geoOf });
      if (spot) links.push(createLink(linkType, below.id, level.id, { x: spot.x, y: spot.y, w: spot.w, h: spot.h }, spot.dir));
    }
    // Plan the next link now, so the level above can start with a room right over it.
    planned = null;
    anchor = null;
    if (i < n - 1 && (style.layout === 'rooms' || style.layout === 'caves')) {
      const geo = geoOf(level);
      const spots = stairSpots(linkType, geo, null, map.size, [corridorType]);
      planned = pickSpot(spots, geo, random);
      if (planned) {
        const cells = geo.rooms.regions[planned.low].cells;
        const xs = cells.map((c) => c[0]);
        const ys = cells.map((c) => c[1]);
        anchor = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 };
      }
    }
  }
  // A stair opening can split the room above in two: the piece left over keeps the room's type.
  for (const level of outLevels) {
    const withLinks = geoOf(level);
    const without = computeLevelGeometry(level, { ...work, links: [] });
    for (const r of withLinks.rooms.regions) {
      if (r.tag || r.area < 2 || !r.cells.length) continue;
      const before = without.rooms.regions[regionAt(without.rooms, r.labelAt)];
      const type = before?.tag?.type || corridorType;
      if (type) level.rooms.push({ id: newId('r'), type, at: r.labelAt, seed: Math.floor(random() * 2 ** 30), reroll: 0 });
    }
  }
  return { levels: outLevels, links };
}

/**
 * Last resort: a small walled stairwell built through both levels where both have floor.
 * Room tags that end up inside it move to what is left of their room.
 */
function carveStairwell({ below, level, lowGeo, highGeo, linkType, map, random, corridorType, geoOf }) {
  const sq = linkSquares(linkType, 0, 0, 'n');
  const W = sq.w + 2;
  const H = sq.h + 2 + (sq.foot.length ? 1 : 0);
  const options = [];
  for (let y = 1; y + H < map.size.h; y++) {
    for (let x = 1; x + W < map.size.w; x++) {
      const pts = [[x + 0.1, y + 0.1], [x + W - 0.1, y + 0.1], [x + 0.1, y + H - 0.1], [x + W - 0.1, y + H - 0.1], [x + W / 2, y + H / 2]];
      if (pts.every((p) => pointInRings(p, lowGeo.floor) && pointInRings(p, highGeo.floor))) options.push({ x, y });
    }
  }
  if (!options.length) return null;
  const { x, y } = options[Math.floor(random() * options.length)];
  for (const [lv, geo] of [[below, lowGeo], [level, highGeo]]) {
    // Remember a square of each room outside the stairwell, for tags caught inside it.
    const keep = new Map();
    for (const r of geo.rooms.regions) {
      if (!r.tag) continue;
      const c = r.cells.find(([cx, cy]) => cx < x || cx >= x + W || cy < y || cy >= y + H);
      if (c) keep.set(r.tag.id, [c[0] + 0.5, c[1] + 0.5]);
    }
    lv.shapes.push({ id: newId('s'), kind: 'rect', op: 'add', walled: true, x, y, w: W, h: H, radius: 0 });
    // Walls drawn by hand that run through the stairwell are cut back to its edge.
    const ring = [rectRing({ x, y, w: W, h: H })];
    lv.walls = lv.walls.flatMap((w) => {
      if (w.kind !== 'line') return [w];
      const pieces = classifySegments([[w.a, w.b]], ring).filter((p) => p.where === 'outside');
      return pieces.map((p, i) => ({ ...w, id: i ? newId('w') : w.id, a: p.a, b: p.b }));
    });
    for (const t of lv.rooms) {
      if (t.at[0] > x && t.at[0] < x + W && t.at[1] > y && t.at[1] < y + H) t.at = keep.get(t.id) || t.at;
    }
    lv.rooms.push({ id: newId('r'), type: corridorType || lv.rooms[0]?.type, at: [x + 0.5, y + H - 0.5], seed: Math.floor(random() * 2 ** 30), reroll: 0 });
  }
  return { x: x + 1, y: y + 1 + (sq.top.length ? 1 : 0), dir: 'n', w: sq.w, h: sq.h };
}

