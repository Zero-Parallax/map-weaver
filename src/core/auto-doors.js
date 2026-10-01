// Automatic doors between neighbouring rooms.
//
// Rooms are joined like a spanning tree over the whole level: neighbours that can't already
// reach each other through existing doors get one door, on the wall they share. Hub rooms
// (corridors, halls) are joined first, so they become the routes between rooms. Only doors
// for the target rooms are made, but the plan covers every room, so the result is the same
// whichever order rooms are tagged in.
// Each door sits where the shared wall has the most room either side, nearest its middle,
// and away from other doors and anything standing in front of it.

import { sub, add, scale, len, norm, dist, lerp, perp } from './geom.js';
import { OX, OY, STEP } from './rooms.js';

const SIDE = 0.3; // how far either side of a wall to look for the room
const LOOK = 0.25; // spacing of the clearance samples beyond a door's ends
const MAX_CLEAR = 4; // clearance samples counted each side (one square)
const MIN_AREA = 2; // smaller regions are slivers, not rooms

const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-6;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Room index at p using only the nearest lattice sample (never looks across a wall). */
function labelAt(rooms, p) {
  const { grid, labels } = rooms;
  const i = Math.round((p[0] - OX) / STEP);
  const j = Math.round((p[1] - OY) / STEP);
  if (i < 0 || j < 0 || i >= grid.nx || j >= grid.ny) return -1;
  return labels[j * grid.nx + i];
}

/** Pair of rooms either side of a wall at p (normal n), as "lo,hi", or null. */
function pairAt(rooms, p, n) {
  const l = labelAt(rooms, add(p, scale(n, SIDE)));
  const r = labelAt(rooms, add(p, scale(n, -SIDE)));
  if (l < 0 || r < 0 || l === r) return null;
  return l < r ? `${l},${r}` : `${r},${l}`;
}

/** Candidate door spans along one wall segment, about `width` squares wide. */
function spans(a, b, width) {
  const d = sub(b, a);
  const L = len(d);
  if (L < 1e-6) return [];
  const out = [];
  if (isInt(a[0]) && isInt(a[1]) && isInt(d[0]) && isInt(d[1])) {
    // Grid walls: doors run between grid points (diagonals corner to corner).
    const g = gcd(Math.abs(Math.round(d[0])), Math.abs(Math.round(d[1])));
    const step = scale(d, 1 / g);
    const n = Math.min(g, Math.max(1, Math.round(width / len(step))));
    for (let k = 0; k + n <= g; k++) out.push([add(a, scale(step, k)), add(a, scale(step, k + n))]);
    return out;
  }
  // Curves and off-grid walls: chords centred along the wall.
  const u = norm(d);
  const half = width / 2;
  const centres = [];
  if (L <= width) centres.push(L / 2);
  else for (let s = half; s <= L - half + 1e-6; s += 0.25) centres.push(s);
  for (const s of centres) {
    const c = add(a, scale(u, s));
    out.push([add(c, scale(u, -half)), add(c, scale(u, half))]);
  }
  return out;
}

/** Pair the door at a-b joins, or null. */
function doorPair(rooms, a, b) {
  const n = perp(norm(sub(b, a)));
  return pairAt(rooms, lerp(a, b, 0.5), n);
}

/**
 * Every place a door could join two rooms. Returns Map("lo,hi" -> {shared, options[]}),
 * where shared is the length of wall between them and each option is {a, b, clear}.
 */
export function doorOptions(geo, width = 1) {
  const rooms = geo.rooms;
  const pairs = new Map();
  const entry = (k) => {
    let e = pairs.get(k);
    if (!e) pairs.set(k, (e = { shared: 0, options: [] }));
    return e;
  };
  for (const [a, b] of geo.inner) {
    const L = dist(a, b);
    if (L < 1e-6) continue;
    const u = norm(sub(b, a));
    const n = perp(u);
    // Shared length, sampled every quarter square.
    const count = Math.max(1, Math.round(L / 0.25));
    for (let i = 0; i < count; i++) {
      const k = pairAt(rooms, lerp(a, b, (i + 0.5) / count), n);
      if (k) entry(k).shared += L / count;
    }
    for (const [da, db] of spans(a, b, width)) {
      const du = norm(sub(db, da));
      const dn = perp(du);
      const k = pairAt(rooms, lerp(da, db, 0.5), dn);
      if (!k || [0.1, 0.9].some((t) => pairAt(rooms, lerp(da, db, t), dn) !== k)) continue;
      // Clearance: how far the same shared wall carries on past each end.
      const reach = (from, dir) => {
        let c = 0;
        while (c < MAX_CLEAR && pairAt(rooms, add(from, scale(dir, LOOK * (c + 1))), dn) === k) c++;
        return c;
      };
      const clear = Math.min(reach(da, scale(du, -1)), reach(db, du));
      entry(k).options.push({ a: da, b: db, clear });
    }
  }
  return pairs;
}

function unionFind(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  return { find, join: (i, j) => (parent[find(i)] = find(j)) };
}

/**
 * New doors for the target rooms on a level.
 *  geo:      computeLevelGeometry() of the level
 *  doors:    the level's existing doors
 *  targets:  region indexes to connect
 *  type:     door type, or a function (regionA, regionB) -> type
 *  width:    door width in squares
 *  hub:      function (region) -> true for corridors and halls
 *  blocked:  function (point) -> true if something stands there (kept clear of door fronts)
 * Returns [{a, b, type, pair: [i, j]}].
 */
export function planDoors({ geo, doors = [], targets, type = 'door', width = 1, hub = () => false, blocked = () => false }) {
  const regions = geo.rooms.regions;
  const uf = unionFind(regions.length);
  // Existing openings already join rooms (windows don't).
  for (const d of doors) {
    if (d.type === 'window') continue;
    const k = doorPair(geo.rooms, d.a, d.b);
    if (k) uf.join(...k.split(',').map(Number));
  }
  const eligible = (i) => regions[i] && regions[i].area >= MIN_AREA && regions[i].cells.length > 0;
  const targetSet = new Set(targets.filter(eligible));
  const pairs = [...doorOptions(geo, width)]
    .map(([k, e]) => ({ pair: k.split(',').map(Number), ...e }))
    .filter((p) => p.options.length && p.pair.every(eligible))
    .map((p) => ({ ...p, score: p.shared + p.pair.filter((i) => hub(regions[i]) || corridorLike(regions[i])).length * 1000 }))
    .sort((p, q) => q.score - p.score || p.pair[0] - q.pair[0] || p.pair[1] - q.pair[1]);

  const placed = [...doors];
  const out = [];
  for (const p of pairs) {
    if (uf.find(p.pair[0]) === uf.find(p.pair[1])) continue;
    if (!p.pair.some((i) => targetSet.has(i))) {
      uf.join(p.pair[0], p.pair[1]); // their door comes when one of them is done
      continue;
    }
    const best = pickOption(p.options, placed, blocked);
    if (!best) continue;
    const t = typeof type === 'function' ? type(regions[p.pair[0]], regions[p.pair[1]]) : type;
    const door = { a: best.a, b: best.b, type: t, pair: p.pair };
    out.push(door);
    placed.push(door);
    uf.join(p.pair[0], p.pair[1]);
  }
  return out;
}

/** Long and narrow (at most 2.5 squares across, three times as long): a corridor, tagged or not. */
function corridorLike(r) {
  const long = Math.max(r.maxI - r.minI + 1, r.maxJ - r.minJ + 1) * STEP;
  const across = r.area / long;
  return across <= 2.5 && long >= across * 3;
}

/** Best spot: clear of other doors and obstacles, most wall either side, nearest the middle. */
function pickOption(options, doors, blocked) {
  const mid = scale(options.reduce((s, o) => add(s, lerp(o.a, o.b, 0.5)), [0, 0]), 1 / options.length);
  const nearDoor = (o) => doors.some((d) => Math.min(dist(o.a, d.a), dist(o.a, d.b), dist(o.b, d.a), dist(o.b, d.b), dist(lerp(o.a, o.b, 0.5), lerp(d.a, d.b, 0.5))) < 1);
  const front = (o) => {
    const n = perp(norm(sub(o.b, o.a)));
    const c = lerp(o.a, o.b, 0.5);
    return [add(c, scale(n, 0.5)), add(c, scale(n, -0.5))].some(blocked);
  };
  let best = null;
  let bestScore = -Infinity;
  for (const o of options) {
    const score = (nearDoor(o) ? -100 : 0) + (front(o) ? -50 : 0) + o.clear * 2 - dist(lerp(o.a, o.b, 0.5), mid) * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}
