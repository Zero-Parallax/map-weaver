// Parametric asset generators: one function draws the asset at any size.
// Each returns {footprint, drawing}. They run in the browser (to remake an asset at another
// size) and in Node (to bake the starter sets).

import { Drawing, U } from './svg.js';
import { rng, hash } from '../core/rng.js';

function chair(g, cx, cy, facing, size = 36) {
  // facing: direction the sitter faces (towards the table)
  const h = size / 2;
  g.rect(cx - h, cy - h, size, size, 'o', 6);
  const back = { n: [cx - h, cy + h, cx + h, cy + h], s: [cx - h, cy - h, cx + h, cy - h], e: [cx - h, cy - h, cx - h, cy + h], w: [cx + h, cy - h, cx + h, cy + h] }[facing];
  g.line(...back, 'l');
}

/** Table with optional chairs round it. w, h = size of the table top in squares. */
function table({ w = 2, h = 1, chairs = true, round = false }) {
  const pad = chairs ? 0.5 : 0;
  const fw = w + pad * 2;
  const fh = h + pad * 2;
  const g = new Drawing();
  const x0 = pad * U;
  const y0 = pad * U;
  if (chairs) {
    for (let i = 0; i < w; i++) {
      chair(g, x0 + (i + 0.5) * U, y0 - 22, 's');
      chair(g, x0 + (i + 0.5) * U, y0 + h * U + 22, 'n');
    }
    for (let j = 0; j < h; j++) {
      if (w >= 2 || h >= 2) {
        chair(g, x0 - 22, y0 + (j + 0.5) * U, 'e');
        chair(g, x0 + w * U + 22, y0 + (j + 0.5) * U, 'w');
      }
    }
  }
  if (round) g.ellipse(x0 + (w * U) / 2, y0 + (h * U) / 2, (w * U) / 2 - 6, (h * U) / 2 - 6, 'o');
  else g.rect(x0 + 6, y0 + 6, w * U - 12, h * U - 12, 'o', 4);
  return { footprint: { w: fw, h: fh }, drawing: g };
}

/** Long bench or pew. back: draw a backrest along the top edge. */
function bench({ len = 2, back = false }) {
  const g = new Drawing();
  g.rect(8, back ? 30 : 32, len * U - 16, 36, 'o', 4);
  if (back) g.rect(8, 16, len * U - 16, 14, 's', 3);
  for (let i = 1; i < len; i++) g.line(i * U, back ? 30 : 32, i * U, 68, 't');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Shelf against a wall (the top edge). kind: books | bottles | goods | scrolls. */
function shelf({ len = 2, kind = 'books', seed = 1 }) {
  const g = new Drawing();
  const r = rng(hash('shelf', len, kind, seed));
  const depth = 44;
  g.rect(4, 4, len * U - 8, depth, 'o', 2);
  const items = [];
  if (kind === 'books') {
    let x = 12;
    while (x < len * U - 14) {
      const wBook = 5 + r() * 7;
      if (r() > 0.15) items.push([x, 10, x, 10 + 18 + r() * 12]);
      x += wBook + 2;
    }
    g.lines(items, 't');
  } else if (kind === 'bottles') {
    for (let x = 16; x < len * U - 12; x += 17 + r() * 6) g.circle(x, 18 + r() * 14, 6, r() > 0.5 ? 's' : 'o');
  } else if (kind === 'scrolls') {
    for (let x = 14; x < len * U - 14; x += 22) g.ellipse(x, 26, 8, 16, 'o');
  } else {
    for (let x = 12; x < len * U - 26; x += 26 + r() * 8) g.rect(x, 12, 18, 18 + r() * 12, r() > 0.6 ? 's' : 'o', 2);
  }
  for (let i = 1; i < len; i++) g.line(i * U, 6, i * U, depth + 2, 'l');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Counter along a wall. kind: bar | kitchen | shop | lab. */
function counter({ len = 3, kind = 'bar', seed = 1 }) {
  const g = new Drawing();
  const r = rng(hash('counter', len, kind, seed));
  const depth = kind === 'bar' ? 62 : 56;
  g.rect(4, 4, len * U - 8, depth, 'o', 3);
  g.line(10, depth - 8, len * U - 10, depth - 8, 't');
  if (kind === 'bar') {
    for (let x = 30; x < len * U - 20; x += 40 + r() * 30) g.circle(x, 26, 8, 'o');
  } else if (kind === 'kitchen') {
    g.rect(len * U - 90, 14, 60, 34, 's', 8);
    g.circle(len * U - 60, 31, 5, 'k');
    for (let i = 0; i < Math.min(2, len - 1); i++) g.rect(20 + i * 50, 16, 34, 26, 'o', 2);
  } else if (kind === 'lab') {
    for (let x = 22; x < len * U - 20; x += 36) g.circle(x, 28, 9, r() > 0.5 ? 's' : 'o');
    g.line(12, 50, len * U - 12, 50, 't');
  } else {
    for (let x = 16; x < len * U - 30; x += 34) g.rect(x, 14, 22, 22, r() > 0.5 ? 's' : 'o', 2);
  }
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Sci-fi console against a wall. */
function consoleUnit({ len = 2, screens = true }) {
  const g = new Drawing();
  g.chamfer(4, 4, len * U - 8, 58, 14, 'o');
  if (screens) {
    for (let i = 0; i < len; i++) g.chamfer(i * U + 16, 12, U - 32, 22, 6, 's');
  }
  const dots = [];
  for (let x = 20; x < len * U - 16; x += 16) dots.push([x, 46, x + 5, 46]);
  g.lines(dots, 'l');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Rug or carpet. pattern: border | diamond | stripes | round. */
function rug({ w = 2, h = 3, pattern = 'border' }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  if (pattern === 'round') {
    g.ellipse(W / 2, H / 2, W / 2 - 10, H / 2 - 10, 'o');
    g.ellipse(W / 2, H / 2, W / 2 - 26, H / 2 - 26, 't');
    return { footprint: { w, h }, drawing: g };
  }
  g.rect(10, 10, W - 20, H - 20, 'o', 2);
  g.rect(24, 24, W - 48, H - 48, 't');
  if (pattern === 'diamond') g.poly([[W / 2, 36], [W - 36, H / 2], [W / 2, H - 36], [36, H / 2]], 't');
  if (pattern === 'stripes') {
    const segs = [];
    for (let y = 40; y < H - 36; y += 20) segs.push([24, y, W - 24, y]);
    g.lines(segs, 't');
  }
  // Fringe on the short ends.
  const fringe = [];
  const long = H >= W;
  for (let t = 18; t < (long ? W : H) - 14; t += 10) fringe.push(long ? [t, 2, t, 10] : [2, t, 10, t], long ? [t, H - 10, t, H - 2] : [W - 10, t, W - 2, t]);
  g.lines(fringe, 't');
  return { footprint: { w, h }, drawing: g };
}

/** Raised platform. */
function dais({ w = 3, h = 2 }) {
  const g = new Drawing();
  g.rect(4, 4, w * U - 8, h * U - 8, 'h');
  g.rect(4, 4, w * U - 8, h * U - 8, 'l');
  g.rect(20, 20, w * U - 40, h * U - 40, 't');
  return { footprint: { w, h }, drawing: g };
}

/** Cargo crate or container. */
function cargo({ w = 1, h = 1, style = 'crate' }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  if (style === 'container') {
    g.chamfer(6, 6, W - 12, H - 12, 12, 'o');
    const ribs = [];
    const long = W >= H;
    for (let t = 30; t < (long ? W : H) - 20; t += 24) ribs.push(long ? [t, 14, t, H - 14] : [14, t, W - 14, t]);
    g.lines(ribs, 't');
  } else {
    g.rect(8, 8, W - 16, H - 16, 'o', 2);
    g.rect(18, 18, W - 36, H - 36, 't');
    g.lines([[18, 18, W - 18, H - 18], [W - 18, 18, 18, H - 18]], 't');
  }
  return { footprint: { w, h }, drawing: g };
}

/** Straight run of railing, for balconies drawn as assets (the editor draws edge railings itself). */
function railing({ len = 3, style = 'posts' }) {
  const g = new Drawing();
  g.line(4, 50, len * U - 4, 50, style === 'panel' ? 'l' : 't');
  if (style === 'panel') g.rect(4, 42, len * U - 8, 16, 's', 3);
  for (let x = 0; x <= len; x++) g.rect(Math.min(len * U - 12, Math.max(0, x * U - 6)), 44, 12, 12, 'k');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Registry: id -> {name, params (defaults and allowed ranges), make(params)}. */
export const GENERATORS = {
  table: { name: 'Table', params: { w: [1, 4], h: [1, 3] }, make: table },
  bench: { name: 'Bench', params: { len: [1, 5] }, make: bench },
  shelf: { name: 'Shelf', params: { len: [1, 4] }, make: shelf },
  counter: { name: 'Counter', params: { len: [2, 6] }, make: counter },
  console: { name: 'Console', params: { len: [1, 4] }, make: consoleUnit },
  rug: { name: 'Rug', params: { w: [1, 5], h: [1, 6] }, make: rug },
  dais: { name: 'Dais', params: { w: [2, 6], h: [1, 4] }, make: dais },
  cargo: { name: 'Cargo', params: { w: [1, 4], h: [1, 4] }, make: cargo },
  railing: { name: 'Railing', params: { len: [1, 8] }, make: railing },
};

export function runGenerator(id, params) {
  const gen = GENERATORS[id];
  if (!gen) throw new Error(`Unknown generator "${id}"`);
  return gen.make(params || {});
}
