// Foot traffic: the routes people take through a room, so furniture can keep out of the way.
//
// Every entrance (door, stair landing) is joined to the others by the cheapest walk across the
// room's squares, as a minimum spanning tree: the first entrance links to the nearest one, the
// pair to the next nearest, and so on. Walks avoid hugging the walls (that is where furniture
// goes) and avoid needless turns, so the lanes run straight through the middle like real
// routes do. A room with one way in gets a lane from the door to its heart, plus lanes to any
// extra targets (the spot in front of the room's showpiece). Big rooms get two-square lanes.

const SIDES = ['n', 'e', 's', 'w'];
const STEP = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const key = (x, y) => `${x},${y}`;
const parse = (k) => k.split(',').map(Number);

/** Group entrance squares that touch (a double door is one entrance). */
export function entranceGroups(anchors) {
  const left = new Set(anchors);
  const groups = [];
  while (left.size) {
    const [first] = left;
    left.delete(first);
    const group = [first];
    for (let i = 0; i < group.length; i++) {
      const [x, y] = parse(group[i]);
      for (const s of SIDES) {
        const n = key(x + STEP[s][0], y + STEP[s][1]);
        if (left.has(n)) {
          left.delete(n);
          group.push(n);
        }
      }
    }
    groups.push(group);
  }
  return groups;
}

/** The walkable square nearest the middle of the room (its heart). */
export function heartOf(room, passable) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const c of room.cells.values()) {
    sx += c.x + 0.5;
    sy += c.y + 0.5;
    n++;
  }
  const cx = sx / n;
  const cy = sy / n;
  let best = null;
  let bestD = Infinity;
  for (const k of room.cells.keys()) {
    if (!passable(k)) continue;
    const [x, y] = parse(k);
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d < bestD) {
      bestD = d;
      best = k;
    }
  }
  return best;
}

/**
 * Cheapest walk from any square in `from` to any square in `to`, or null.
 * Costs: 1 a step, more beside walls, a little for each turn.
 */
function walk(room, passable, from, to) {
  const target = new Set(to);
  const wallCost = (k) => {
    const c = room.cells.get(k);
    return SIDES.some((s) => c.sides[s] === 'wall' || c.sides[s] === 'balcony') ? 0.8 : 0;
  };
  // State: square + the direction we arrived in (for the turn cost).
  const dist = new Map();
  const prev = new Map();
  const heap = [];
  const push = (item) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  for (const k of from) {
    if (!room.cells.has(k)) continue;
    const st = `${k}|-`;
    dist.set(st, 0);
    push([0, k, '-']);
  }
  while (heap.length) {
    const [d, k, dir] = pop();
    const st = `${k}|${dir}`;
    if (d > dist.get(st)) continue;
    if (target.has(k)) {
      // Walk back to the start.
      const path = [k];
      let cur = st;
      while (prev.has(cur)) {
        cur = prev.get(cur);
        path.push(cur.split('|')[0]);
      }
      return path.reverse();
    }
    const [x, y] = parse(k);
    for (const s of SIDES) {
      const n = key(x + STEP[s][0], y + STEP[s][1]);
      if (!room.cells.has(n) || (!passable(n) && !target.has(n))) continue;
      const nd = d + 1 + wallCost(n) + (dir !== '-' && dir !== s ? 0.35 : 0);
      const ns = `${n}|${s}`;
      if (nd < (dist.get(ns) ?? Infinity)) {
        dist.set(ns, nd);
        prev.set(ns, st);
        push([nd, n, s]);
      }
    }
  }
  return null;
}

/**
 * Squares of the room's walkways (a Set of "x,y").
 *  room:     from analyseRoom (cells with sides, anchors, blocked)
 *  blocking: squares already taken by furniture that stops movement
 *  targets:  extra lists of squares to reach (e.g. in front of the room's showpiece)
 */
export function walkways(room, { blocking = new Set(), targets = [] } = {}) {
  const passable = (k) => room.cells.has(k) && !room.blocked.has(k) && !blocking.has(k);
  const terminals = entranceGroups(room.anchors.filter(passable));
  for (const t of targets) {
    const ok = t.filter(passable);
    if (ok.length) terminals.push(ok);
  }
  const out = new Set();
  if (!terminals.length) return out;
  if (terminals.length === 1) {
    // One way in: the lane leads from the door into the heart of the room.
    const heart = heartOf(room, passable);
    if (heart && !terminals[0].includes(heart)) terminals.push([heart]);
  }
  // Grow a spanning tree: join the nearest unjoined terminal to everything joined so far.
  const tree = new Set(terminals[0]);
  for (const k of terminals[0]) out.add(k);
  const pending = terminals.slice(1);
  while (pending.length) {
    let best = null;
    let bestIndex = -1;
    for (let i = 0; i < pending.length; i++) {
      const path = walk(room, passable, [...tree], pending[i]);
      if (path && (!best || path.length < best.length)) {
        best = path;
        bestIndex = i;
      }
    }
    if (!best) break; // the rest can't be reached (water, chasms): leave them
    for (const k of pending[bestIndex]) out.add(k);
    pending.splice(bestIndex, 1);
    for (const k of best) {
      out.add(k);
      tree.add(k);
    }
  }
  // Big rooms: widen each lane by a square, on the side away from the nearest wall.
  if (room.wide) {
    for (const k of [...out]) {
      const [x, y] = parse(k);
      const along = SIDES.filter((s) => out.has(key(x + STEP[s][0], y + STEP[s][1])));
      const horizontal = along.some((s) => s === 'e' || s === 'w');
      const options = horizontal ? ['s', 'n'] : ['e', 'w'];
      const score = (s) => {
        const n = key(x + STEP[s][0], y + STEP[s][1]);
        const c = room.cells.get(n);
        if (!c || !passable(n)) return -1;
        return SIDES.filter((t) => c.sides[t] === 'inside').length;
      };
      const pick = options.map((s) => [score(s), s]).sort((a, b) => b[0] - a[0])[0];
      if (pick[0] >= 3) out.add(key(x + STEP[pick[1]][0], y + STEP[pick[1]][1]));
    }
  }
  return out;
}
