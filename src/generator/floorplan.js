// Organic building floor plans, grown on the square grid.
//
// 1. Outline: a main block with wings (L, T and U shapes) and sometimes an annex.
// 2. Hallway: a spine down the main block that may stop short of the far end (leaving a big
//    end room), with branches into the wings.
// 3. Rooms grow from scattered seeds: first as rectangles taking turns to push a side out,
//    then the gaps are shared out square by square, which gives L-shaped and odd rooms like
//    real buildings. Tiny leftovers join a neighbour.
// 4. Extras: round towers on the corners (castles), bay windows on big rooms (houses).
// Rooms are walled 'cells' shapes, so shared walls come out single and doors go between.

const key = (x, y) => `${x},${y}`;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function rectCells(r, into = new Set()) {
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) into.add(key(x, y));
  return into;
}

/** Main block plus wings, centred in the map. Returns {blocks, cells, main, front}. */
function outline(n, size, t) {
  const area = n * t.int(26, 36);
  const wings = n >= 5 ? t.int(1, n >= 9 ? 3 : 2) : t.chance(0.5) ? 1 : 0;
  const mainArea = area * (wings ? 0.62 : 1);
  const aspect = 1.25 + t.random() * 0.6;
  const main = { x: 0, y: 0, w: Math.max(7, Math.round(Math.sqrt(mainArea * aspect))), h: 0 };
  main.h = Math.max(6, Math.round(mainArea / main.w));
  const blocks = [main];
  const sides = ['n', 's', 'e', 'w'];
  const used = new Set();
  for (let i = 0; i < wings; i++) {
    const side = t.pick(sides.filter((s) => !used.has(s) || t.chance(0.3)));
    used.add(side);
    const along = side === 'n' || side === 's' ? main.w : main.h;
    const span = Math.max(4, Math.round(along * (0.35 + t.random() * 0.35)));
    const depth = t.int(4, 7);
    // Flush with a corner (an L) or somewhere along the side (a T).
    const off = t.chance(0.5) ? (t.chance(0.5) ? 0 : along - span) : t.int(1, Math.max(1, along - span - 1));
    const wing = side === 'n' ? { x: main.x + off, y: main.y - depth, w: span, h: depth }
      : side === 's' ? { x: main.x + off, y: main.y + main.h, w: span, h: depth }
        : side === 'w' ? { x: main.x - depth, y: main.y + off, w: depth, h: span }
          : { x: main.x + main.w, y: main.y + off, w: depth, h: span };
    if (blocks.some((b) => b !== main && b.x < wing.x + wing.w && wing.x < b.x + b.w && b.y < wing.y + wing.h && wing.y < b.y + b.h)) continue;
    wing.side = side;
    blocks.push(wing);
  }
  // Centre in the map.
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  const maxX = Math.max(...blocks.map((b) => b.x + b.w));
  const maxY = Math.max(...blocks.map((b) => b.y + b.h));
  const dx = Math.round((size.w - (maxX - minX)) / 2) - minX;
  const dy = Math.round((size.h - (maxY - minY)) / 2) - minY;
  for (const b of blocks) {
    b.x += dx;
    b.y += dy;
  }
  const cells = new Set();
  for (const b of blocks) rectCells(b, cells);
  // The front is a side of the main block with no wing on it.
  const front = ['s', 'w', 'e', 'n'].find((s) => !used.has(s)) || 's';
  return { blocks, cells, main, front };
}

/** A two-square hallway: a spine along the main block from the front, branches into wings. */
function hallway(plan, t) {
  const { main, blocks, cells, front } = plan;
  const hall = new Set();
  const horizontal = front === 'w' || front === 'e';
  const long = horizontal ? main.w : main.h;
  const across = horizontal ? main.h : main.w;
  if (Math.min(main.w, main.h) < 8) return { hall, start: null };
  const reach = Math.round(long * (t.chance(0.5) ? 1 : 0.6 + t.random() * 0.25));
  const at = Math.round(across / 2 - 1 + t.int(-1, 1));
  const spine = horizontal
    ? { x: front === 'w' ? main.x : main.x + main.w - reach, y: main.y + at, w: reach, h: 2 }
    : { x: main.x + at, y: front === 'n' ? main.y : main.y + main.h - reach, w: 2, h: reach };
  rectCells(spine, hall);
  // Branch from the spine's middle into each wing.
  for (const w of blocks.slice(1)) {
    const cx = Math.round(w.x + w.w / 2 - 1);
    const cy = Math.round(w.y + w.h / 2 - 1);
    const sx = horizontal ? Math.max(spine.x, Math.min(spine.x + spine.w - 2, cx)) : spine.x;
    const sy = horizontal ? spine.y : Math.max(spine.y, Math.min(spine.y + spine.h - 2, cy));
    // An L: along the spine's direction first, then across to the wing's middle.
    const path = horizontal
      ? [{ x: Math.min(sx, cx), y: sy, w: Math.abs(cx - sx) + 2, h: 2 }, { x: cx, y: Math.min(sy, cy), w: 2, h: Math.abs(cy - sy) + 2 }]
      : [{ x: sx, y: Math.min(sy, cy), w: 2, h: Math.abs(cy - sy) + 2 }, { x: Math.min(sx, cx), y: cy, w: Math.abs(cx - sx) + 2, h: 2 }];
    for (const r of path) rectCells(r, hall);
  }
  for (const k of [...hall]) if (!cells.has(k)) hall.delete(k);
  // Where the spine meets the front wall: the entrance.
  const start = horizontal
    ? { side: front, x: front === 'w' ? spine.x : spine.x + spine.w, y: spine.y }
    : { side: front, x: spine.x, y: front === 'n' ? spine.y : spine.y + spine.h };
  return { hall, start };
}

function components(cells) {
  const seen = new Set();
  const out = [];
  for (const k of cells) {
    if (seen.has(k)) continue;
    const comp = [];
    const stack = [k];
    seen.add(k);
    while (stack.length) {
      const c = stack.pop();
      comp.push(c);
      const [x, y] = c.split(',').map(Number);
      for (const [dx, dy] of N4) {
        const nk = key(x + dx, y + dy);
        if (cells.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          stack.push(nk);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

/** Grow `k` rooms over a set of squares. Returns arrays of squares, one per room. */
function growRooms(comp, k, t) {
  const free = new Set(comp);
  const pts = comp.map((c) => c.split(',').map(Number));
  // Seeds spread out: each new one as far as possible from the others.
  const seeds = [pts[Math.floor(t.random() * pts.length)]];
  while (seeds.length < k) {
    let best = null;
    let bestD = -1;
    for (const p of pts) {
      const d = Math.min(...seeds.map((s) => Math.abs(s[0] - p[0]) + Math.abs(s[1] - p[1]))) + t.random() * 1.5;
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    seeds.push(best);
  }
  const owner = new Map();
  const rooms = seeds.map(([x, y], i) => {
    owner.set(key(x, y), i);
    free.delete(key(x, y));
    return { x, y, w: 1, h: 1, cells: [key(x, y)], grow: i === 0 ? 2 : 1 };
  });
  // Rectangular growth: rooms take turns pushing out a side while the strip is free.
  const strip = (r, side) => {
    const out = [];
    if (side === 'e') for (let y = r.y; y < r.y + r.h; y++) out.push(key(r.x + r.w, y));
    if (side === 'w') for (let y = r.y; y < r.y + r.h; y++) out.push(key(r.x - 1, y));
    if (side === 's') for (let x = r.x; x < r.x + r.w; x++) out.push(key(x, r.y + r.h));
    if (side === 'n') for (let x = r.x; x < r.x + r.w; x++) out.push(key(x, r.y - 1));
    return out;
  };
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of rooms.map((_, i) => i).sort(() => t.random() - 0.5)) {
      const r = rooms[i];
      for (let g = 0; g < r.grow; g++) {
        const sides = ['n', 's', 'e', 'w'].sort(() => t.random() - 0.5)
          .sort((a, b) => ((a === 'e' || a === 'w') === r.w < r.h ? -1 : 0) - ((b === 'e' || b === 'w') === r.w < r.h ? -1 : 0));
        for (const side of sides) {
          if ((side === 'e' || side === 'w') && r.w >= r.h * 2.2 && r.h > 2) continue;
          if ((side === 'n' || side === 's') && r.h >= r.w * 2.2 && r.w > 2) continue;
          const s = strip(r, side);
          if (!s.every((c) => free.has(c))) continue;
          for (const c of s) {
            free.delete(c);
            owner.set(c, i);
            r.cells.push(c);
          }
          if (side === 'e') r.w++;
          if (side === 'w') (r.x--, r.w++);
          if (side === 's') r.h++;
          if (side === 'n') (r.y--, r.h++);
          grew = true;
          break;
        }
      }
    }
  }
  // Fill the gaps square by square from the rooms around them: L-shapes and nooks.
  let frontier = [...owner.keys()];
  while (free.size && frontier.length) {
    const next = [];
    for (const c of frontier.sort(() => t.random() - 0.5)) {
      const [x, y] = c.split(',').map(Number);
      for (const [dx, dy] of N4) {
        const nk = key(x + dx, y + dy);
        if (!free.has(nk)) continue;
        free.delete(nk);
        const i = owner.get(c);
        owner.set(nk, i);
        rooms[i].cells.push(nk);
        next.push(nk);
      }
    }
    frontier = next;
  }
  // Smooth out one-square jogs: a square mostly surrounded by another room joins it.
  for (let pass = 0; pass < 3; pass++) {
    for (const c of comp) {
      const mine = owner.get(c);
      if (mine == null || rooms[mine].cells.length <= 8) continue;
      const [x, y] = c.split(',').map(Number);
      const around = new Map();
      for (const [dx, dy] of N4) {
        const j = owner.get(key(x + dx, y + dy));
        if (j != null && j !== mine) around.set(j, (around.get(j) || 0) + 1);
      }
      const [j, n] = [...around].sort((a, b) => b[1] - a[1])[0] || [];
      if (n == null || n < 3) continue;
      owner.set(c, j);
      rooms[mine].cells = rooms[mine].cells.filter((k) => k !== c);
      rooms[j].cells.push(c);
    }
  }
  // Tiny rooms join the neighbour they share most wall with.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r.cells.length || r.cells.length >= 8) continue;
      const shared = new Map();
      for (const c of r.cells) {
        const [x, y] = c.split(',').map(Number);
        for (const [dx, dy] of N4) {
          const j = owner.get(key(x + dx, y + dy));
          if (j != null && j !== i) shared.set(j, (shared.get(j) || 0) + 1);
        }
      }
      const j = [...shared].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (j == null) continue;
      for (const c of r.cells) owner.set(c, j);
      rooms[j].cells.push(...r.cells);
      r.cells = [];
    }
  }
  return rooms.map((r) => r.cells).filter((c) => c.length);
}

/** The square of a room furthest from its edge (where its label goes). */
function heart(cells) {
  const set = new Set(cells);
  let best = cells[0];
  let bestD = -1;
  for (const c of cells) {
    const [x, y] = c.split(',').map(Number);
    let d = 0;
    while (d < 6 && [[d + 1, 0], [-d - 1, 0], [0, d + 1], [0, -d - 1]].every(([dx, dy]) => set.has(key(x + dx, y + dy)))) d++;
    if (d > bestD) {
      bestD = d;
      best = c;
    }
  }
  const [x, y] = best.split(',').map(Number);
  return [x + 0.5, y + 0.5];
}

/** Outside edges of a room (square sides facing out of the building), as unit segments. */
function outerSides(cells, building) {
  const out = [];
  for (const c of cells) {
    const [x, y] = c.split(',').map(Number);
    if (!building.has(key(x, y - 1))) out.push({ a: [x, y], b: [x + 1, y], side: 'n' });
    if (!building.has(key(x, y + 1))) out.push({ a: [x, y + 1], b: [x + 1, y + 1], side: 's' });
    if (!building.has(key(x - 1, y))) out.push({ a: [x, y], b: [x, y + 1], side: 'w' });
    if (!building.has(key(x + 1, y))) out.push({ a: [x + 1, y], b: [x + 1, y + 1], side: 'e' });
  }
  return out;
}

/**
 * A bay window for a room: the longest straight run of its outside wall on one side, if at
 * least five squares long; the bay sits in its middle, clear of the run's ends so it never
 * reaches the next room. Returns trapezoid points, or null.
 */
function bayOn(cells, building) {
  const runs = [];
  const bySide = {};
  for (const s of outerSides(cells, building)) (bySide[s.side] ||= []).push(s);
  for (const [side, list] of Object.entries(bySide)) {
    const horizontal = side === 'n' || side === 's';
    const lines = new Map();
    for (const s of list) {
      const line = horizontal ? s.a[1] : s.a[0];
      if (!lines.has(line)) lines.set(line, []);
      lines.get(line).push(horizontal ? s.a[0] : s.a[1]);
    }
    for (const [line, starts] of lines) {
      starts.sort((a, b) => a - b);
      let from = starts[0];
      for (let i = 1; i <= starts.length; i++) {
        if (i === starts.length || starts[i] !== starts[i - 1] + 1) {
          runs.push({ side, line, from, to: starts[i - 1] + 1 });
          from = starts[i];
        }
      }
    }
  }
  const run = runs.sort((a, b) => b.to - b.from - (a.to - a.from))[0];
  if (!run || run.to - run.from < 5) return null;
  const width = Math.min(4, run.to - run.from - 2);
  const s0 = Math.round((run.from + run.to - width) / 2);
  const out = run.side === 'n' || run.side === 'w' ? -1 : 1;
  const p = (u, v) => (run.side === 'n' || run.side === 's' ? [u, run.line + out * v] : [run.line + out * v, u]);
  return [p(s0, 0), p(s0 + width, 0), p(s0 + width - 0.6, 1), p(s0 + 0.6, 1)];
}

/**
 * An organic building. style: {rooms, corridor, towers, bays}. Returns the same shape of
 * result as the other layouts: {shapes, tags, corridors, entrances}.
 */
export function organicBuilding(style, n, size, t, assignTypes) {
  const plan = outline(n, size, t);
  const { hall, start } = n >= 5 && style.corridor ? hallway(plan, t) : { hall: new Set(), start: null };
  const free = new Set([...plan.cells].filter((c) => !hall.has(c)));
  const comps = components(free).sort((a, b) => b.length - a.length);
  const total = comps.reduce((s, c) => s + c.length, 0);
  // Share the rooms out by area (every piece gets at least one).
  const want = Math.max(1, n - (hall.size ? 1 : 0));
  const counts = comps.map((c) => Math.max(1, Math.round((want * c.length) / total)));
  const rooms = comps.flatMap((c, i) => growRooms(c, Math.min(counts[i], Math.max(1, Math.floor(c.length / 9))), t))
    .map((cells) => ({ cells, area: cells.length }));
  assignTypes(rooms, style.rooms, t);
  const shapes = [];
  const tags = [];
  for (const r of rooms) {
    shapes.push({ kind: 'cells', cells: r.cells.map((c) => c.split(',').map(Number)), walled: true });
    tags.push({ type: r.type, at: heart(r.cells) });
  }
  const corridors = [];
  if (hall.size) {
    const cells = [...hall];
    shapes.push({ kind: 'cells', cells: cells.map((c) => c.split(',').map(Number)), walled: true });
    tags.push({ type: style.corridor.type, at: heart(cells) });
  }
  // Bay windows: a shallow bow in the middle of one room's long outside wall (houses, inns).
  if (style.bays !== false) {
    for (const r of [...rooms].sort((a, b) => b.area - a.area).slice(0, t.int(0, 2))) {
      const bay = bayOn(r.cells, plan.cells);
      if (bay) shapes.push({ kind: 'poly', walled: false, points: bay });
    }
  }
  // Round towers on the outer corners of the main block (castles and keeps).
  if (style.towers) {
    const m = plan.main;
    const corners = [[m.x, m.y], [m.x + m.w, m.y], [m.x, m.y + m.h], [m.x + m.w, m.y + m.h]]
      .filter(([x, y]) => [[x - 0.5, y - 0.5], [x + 0.5, y - 0.5], [x - 0.5, y + 0.5], [x + 0.5, y + 0.5]].filter(([px, py]) => plan.cells.has(key(Math.floor(px), Math.floor(py)))).length === 1);
    const r = t.chance(0.5) ? 2.5 : 3;
    const towerRooms = corners.map(() => ({ area: 20 }));
    assignTypes(towerRooms, style.rooms.filter((e) => !e.size || e.size.includes('small') || e.size.includes('medium')), t);
    corners.forEach(([x, y], i) => {
      shapes.push({ kind: 'circle', cx: x, cy: y, r, walled: true });
      // The label goes in the part of the tower that stands out from the building.
      const inside = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].find(([qx, qy]) => plan.cells.has(key(Math.floor(x + qx), Math.floor(y + qy))));
      tags.push({ type: towerRooms[i].type, at: [x - Math.sign(inside[0]) * r * 0.55, y - Math.sign(inside[1]) * r * 0.55] });
    });
  }
  // The way in: double doors at the hallway's front end, else into the biggest room.
  const entrances = [];
  if (start) {
    entrances.push(start.side === 'n' || start.side === 's'
      ? { a: [start.x, start.y], b: [start.x + 2, start.y], wide: true }
      : { a: [start.x, start.y], b: [start.x, start.y + 2], wide: true });
  } else if (rooms.length) {
    const big = [...rooms].sort((a, b) => b.area - a.area)[0];
    const sides = outerSides(big.cells, plan.cells);
    if (sides.length) entrances.push({ a: sides[Math.floor(sides.length / 2)].a, b: sides[Math.floor(sides.length / 2)].b });
  }
  // A tower can cut a corner off a room: pieces left over keep the type of the room they were.
  const owner = new Map();
  rooms.forEach((r) => r.cells.forEach((c) => owner.set(c, r.type)));
  for (const c of hall) owner.set(c, style.corridor?.type);
  const typeAt = ([x, y]) => owner.get(key(Math.floor(x), Math.floor(y)));
  return { shapes, tags, corridors, entrances, typeAt };
}
