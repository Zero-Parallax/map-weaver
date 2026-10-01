// Parametric asset generators: one function draws the asset at any size.
// Each returns {footprint, drawing}. They run in the browser (to remake an asset at another
// size) and in Node (to bake the starter sets).

import { Drawing, U } from './svg.js';
import { rng, hash } from '../core/rng.js';
import { chair, seat, planks, screen, buttons, candle } from './motifs.js';

/**
 * Table with optional chairs round it. w, h = size of the table top in squares.
 * style: wood (plank top, candle) or metal (sci-fi: bevelled top, seats).
 */
function table({ w = 2, h = 1, chairs = true, round = false, style = 'wood', seed = 1 }) {
  const pad = chairs ? 0.5 : 0;
  const g = new Drawing();
  const x0 = pad * U;
  const y0 = pad * U;
  const W = w * U;
  const H = h * U;
  const r = rng(hash('table', w, h, round, style, seed));
  const sit = style === 'metal' ? seat : chair;
  if (chairs) {
    if (round) {
      const count = Math.max(4, Math.round((w + h) * 2));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const cx = x0 + W / 2 + Math.cos(a) * (W / 2 + 22);
        const cy = y0 + H / 2 + Math.sin(a) * (H / 2 + 22);
        const facing = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'w' : 'e') : Math.sin(a) > 0 ? 'n' : 's';
        sit(g, cx, cy, facing, 34);
      }
    } else {
      for (let i = 0; i < w; i++) {
        sit(g, x0 + (i + 0.5) * U, y0 - 24, 's');
        sit(g, x0 + (i + 0.5) * U, y0 + H + 24, 'n');
      }
      for (let j = 0; j < h; j++) {
        if (w >= 2 || h >= 2) {
          sit(g, x0 - 24, y0 + (j + 0.5) * U, 'e');
          sit(g, x0 + W + 24, y0 + (j + 0.5) * U, 'w');
        }
      }
    }
  }
  if (style === 'metal') {
    g.chamfer(x0 + 6, y0 + 6, W - 12, H - 12, 16, 's');
    g.chamfer(x0 + 18, y0 + 18, W - 36, H - 36, 10, 't');
    for (let i = 0; i < w; i++) g.rect(x0 + i * U + 36, y0 + 26, 28, 18, 'o', 4);
  } else if (round) {
    g.ellipse(x0 + W / 2, y0 + H / 2, W / 2 - 6, H / 2 - 6, 'o');
    g.ellipse(x0 + W / 2, y0 + H / 2, W / 2 - 18, H / 2 - 18, 't');
    candle(g, x0 + W / 2, y0 + H / 2, 8);
    g.circle(x0 + W / 2 - W * 0.2, y0 + H / 2 + H * 0.12, 9, 'o');
  } else {
    g.rect(x0 + 6, y0 + 6, W - 12, H - 12, 'o', 5);
    planks(g, x0 + 6, y0 + 6, W - 12, H - 12, Math.max(2, h * 3), 'h');
    // A few things on the table.
    for (let i = 0; i < w; i++) {
      const cx = x0 + (i + 0.5) * U + (r() - 0.5) * 20;
      const cy = y0 + H / 2 + (r() - 0.5) * H * 0.3;
      if (r() > 0.5) g.circle(cx, cy, 11, 'o');
      else g.circle(cx, cy, 7, 's');
    }
    if (w >= 2) candle(g, x0 + W / 2, y0 + H / 2);
  }
  return { footprint: { w: w + pad * 2, h: h + pad * 2 }, drawing: g };
}

/** Long bench or pew. back: a backrest along the top edge. */
function bench({ len = 2, back = false }) {
  const g = new Drawing();
  const W = len * U;
  const top = back ? 34 : 30;
  g.rect(8, top, W - 16, 40, 'o', 5);
  planks(g, 8, top, W - 16, 40, 3, 'h');
  if (back) g.rect(8, 12, W - 16, 18, 'ko', 4);
  const legs = [];
  for (let i = 0; i <= len; i++) legs.push([Math.min(W - 14, Math.max(14, i * U)), top + 2, Math.min(W - 14, Math.max(14, i * U)), top + 38]);
  g.lines(legs, 'l');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Shelf against a wall (the top edge). kind: books, bottles, goods, scrolls, parts. */
function shelf({ len = 2, kind = 'books', seed = 1 }) {
  const g = new Drawing();
  const r = rng(hash('shelf', len, kind, seed));
  const W = len * U;
  const depth = 48;
  g.rect(4, 4, W - 8, depth, 's', 3);
  g.rect(4, 4, W - 8, 8, 'ko', 2);
  if (kind === 'books') {
    let x = 12;
    while (x < W - 14) {
      const bw = 7 + r() * 9;
      const bh = 22 + r() * 16;
      const cls = ['o', 'k', 'o', 's', 'm'][Math.floor(r() * 5)];
      if (r() > 0.12) g.rect(x, 12, Math.min(bw, W - 12 - x), bh, cls === 'k' ? 'ko' : cls, 1.5);
      x += bw + 1.5;
    }
  } else if (kind === 'bottles') {
    for (let x = 18; x < W - 14; x += 19) {
      g.circle(x, 22, 8, r() > 0.5 ? 'ko' : 'm');
      g.circle(x, 22, 3, 'p');
      g.circle(x + 9, 40, 8, r() > 0.5 ? 'ko' : 'm');
    }
  } else if (kind === 'scrolls') {
    for (let x = 16; x < W - 14; x += 24) {
      g.rect(x - 9, 14, 18, 32, 'o', 8);
      g.line(x - 9, 22, x + 9, 22, 't');
      g.circle(x, 14, 4, 'k');
    }
  } else if (kind === 'parts') {
    for (let x = 12; x < W - 26; x += 30) {
      g.chamfer(x, 14, 24, 30, 5, r() > 0.5 ? 'o' : 'm');
      g.line(x + 6, 29, x + 18, 29, 't');
    }
  } else {
    for (let x = 12; x < W - 28; x += 30 + r() * 6) {
      const hgt = 18 + r() * 18;
      g.rect(x, 14, 22, hgt, r() > 0.5 ? 'o' : 'm', 2);
      g.line(x, 14 + hgt / 2, x + 22, 14 + hgt / 2, 't');
    }
  }
  for (let i = 1; i < len; i++) g.rect(i * U - 3, 4, 6, depth, 'ko');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Counter along a wall. kind: bar, kitchen, shop, lab, cantina. */
function counter({ len = 3, kind = 'bar', seed = 1 }) {
  const g = new Drawing();
  const r = rng(hash('counter', len, kind, seed));
  const W = len * U;
  const depth = kind === 'bar' || kind === 'cantina' ? 64 : 58;
  if (kind === 'cantina' || kind === 'lab') g.chamfer(4, 4, W - 8, depth, 14, 's');
  else g.rect(4, 4, W - 8, depth, 's', 4);
  g.rect(12, depth - 14, W - 24, 10, 'o', 3); // the front lip
  if (kind === 'bar' || kind === 'cantina') {
    // Taps along the back, mugs and glasses on top.
    for (let x = 26; x < W - 20; x += 44 + r() * 20) {
      g.rect(x - 6, 10, 12, 10, 'ko', 2);
      g.circle(x + 14, 32, 8, r() > 0.5 ? 'o' : 'ko');
    }
  } else if (kind === 'kitchen') {
    g.rect(W - 96, 14, 64, 34, 'm', 8);
    g.circle(W - 64, 31, 6, 'k');
    g.rect(22, 16, 46, 30, 'o', 3);
    g.lines([[30, 24, 60, 38]], 'l');
    if (len > 2) {
      g.circle(W / 2, 30, 15, 'o');
      g.circle(W / 2, 30, 9, 'm');
    }
  } else if (kind === 'lab') {
    for (let x = 24; x < W - 20; x += 34) {
      g.circle(x, 26, 10, 'o');
      g.circle(x, 26, 5, r() > 0.5 ? 'm' : 'k');
    }
    screen(g, W - 70, 12, 54, 26, 'graph');
  } else {
    for (let x = 16; x < W - 30; x += 32) {
      g.rect(x, 14, 24, 24, r() > 0.5 ? 'o' : 'm', 3);
      g.circle(x + 12, 26, 5, 'k');
    }
  }
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Sci-fi console against a wall: dark screens with readouts over a control deck. */
function consoleUnit({ len = 2, screens = true, seed = 1 }) {
  const g = new Drawing();
  const W = len * U;
  const styles = ['bars', 'radar', 'graph'];
  const r = rng(hash('console', len, seed));
  g.chamfer(4, 4, W - 8, 62, 16, 's');
  if (screens) for (let i = 0; i < len; i++) screen(g, i * U + 14, 10, U - 28, 30, styles[Math.floor(r() * 3)]);
  g.rect(14, 46, W - 28, 12, 'o', 4);
  buttons(g, 14, 52, W - 28, len * 5);
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Rug or carpet. pattern: border, diamond, stripes, round. */
function rug({ w = 2, h = 3, pattern = 'border' }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  if (pattern === 'round') {
    g.ellipse(W / 2, H / 2, W / 2 - 8, H / 2 - 8, 's');
    g.ellipse(W / 2, H / 2, W / 2 - 22, H / 2 - 22, 'o');
    g.ellipse(W / 2, H / 2, W / 2 - 36, H / 2 - 36, 'd');
    g.star(W / 2, H / 2, Math.min(W, H) * 0.14, 8, Math.min(W, H) * 0.07, 'ko');
    return { footprint: { w, h }, drawing: g };
  }
  g.rect(10, 10, W - 20, H - 20, 's', 2);
  g.rect(22, 22, W - 44, H - 44, 'o');
  g.rect(30, 30, W - 60, H - 60, 'd');
  if (pattern === 'diamond' || pattern === 'border') {
    g.poly([[W / 2, 40], [W - 40, H / 2], [W / 2, H - 40], [40, H / 2]], 's');
    g.poly([[W / 2, H / 2 - 18], [W / 2 + 18, H / 2], [W / 2, H / 2 + 18], [W / 2 - 18, H / 2]], 'ko');
  }
  if (pattern === 'stripes') {
    const segs = [];
    for (let y = 40; y < H - 36; y += 16) segs.push([30, y, W - 30, y]);
    g.lines(segs, 'l');
  }
  const fringe = [];
  const long = H >= W;
  for (let t = 18; t < (long ? W : H) - 14; t += 9) fringe.push(long ? [t, 0, t, 10] : [0, t, 10, t], long ? [t, H - 10, t, H] : [W - 10, t, W, t]);
  g.lines(fringe, 't');
  return { footprint: { w, h }, drawing: g };
}

/** Raised platform with steps down the front. */
function dais({ w = 3, h = 2 }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  g.rect(4, 4, W - 8, H - 8, 'h');
  g.rect(4, 4, W - 8, H - 8, 'l');
  g.rect(18, 4, W - 36, H - 26, 'o');
  g.rect(32, 4, W - 64, H - 48, 's');
  return { footprint: { w, h }, drawing: g };
}

/** Wooden crate (style crate) or sci-fi cargo container (style container). */
function cargo({ w = 1, h = 1, style = 'crate', seed = 1 }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  const r = rng(hash('cargo', w, h, style, seed));
  const box = (x, y, bw, bh) => {
    if (style === 'container') {
      g.chamfer(x + 4, y + 4, bw - 8, bh - 8, 12, 's');
      const long = bw >= bh;
      const ribs = [];
      for (let t = 22; t < (long ? bw : bh) - 16; t += 16) ribs.push(long ? [x + t, y + 14, x + t, y + bh - 14] : [x + 14, y + t, x + bw - 14, y + t]);
      g.lines(ribs, 't');
      g.rect(x + bw / 2 - 14, y + bh / 2 - 9, 28, 18, 'ko', 3);
      g.lines([[x + bw / 2 - 8, y + bh / 2, x + bw / 2 + 8, y + bh / 2]], 'pl');
    } else {
      g.rect(x + 6, y + 6, bw - 12, bh - 12, 'o', 2);
      planks(g, x + 6, y + 6, bw - 12, bh - 12, Math.max(3, Math.round(bh / 25)), 'h');
      g.lines([[x + 10, y + 10, x + bw - 10, y + bh - 10]], 'l');
      for (const [cx, cy] of [[x + 6, y + 6], [x + bw - 20, y + 6], [x + 6, y + bh - 20], [x + bw - 20, y + bh - 20]]) g.rect(cx, cy, 14, 14, 'ko', 2);
    }
  };
  if (style === 'crate' && w * h > 1) {
    // Stacks: a big crate with a smaller one on top.
    box(0, 0, W, H);
    const sw = W * (0.45 + r() * 0.15);
    const sh = H * (0.45 + r() * 0.15);
    box(W - sw - 4, 4, sw, sh);
  } else {
    box(0, 0, W, H);
  }
  return { footprint: { w, h }, drawing: g };
}

/** Straight run of railing (the editor draws edge railings itself). */
function railing({ len = 3, style = 'posts' }) {
  const g = new Drawing();
  const W = len * U;
  if (style === 'panel') g.chamfer(4, 40, W - 8, 20, 6, 's');
  else g.rect(4, 44, W - 8, 12, 'o', 3);
  for (let x = 0; x <= len; x++) g.rect(Math.min(W - 16, Math.max(0, x * U - 8)), 40, 16, 20, 'ko', 3);
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/**
 * Bridge spanning `len` squares (along x), `width` wide. style: wood (planks and rails),
 * stone (arched slabs with parapets) or metal (grated gantry with handrails).
 */
function bridge({ len = 4, width = 2, style = 'wood' }) {
  const g = new Drawing();
  const W = len * U;
  const H = width * U;
  if (style === 'stone') {
    g.rect(0, 10, W, H - 20, 'o', 8);
    const joints = [];
    for (let x = 50; x < W; x += 50) joints.push([x, 22, x, H - 22]);
    g.lines(joints, 't');
    g.rect(0, 0, W, 18, 's', 5);
    g.rect(0, H - 18, W, 18, 's', 5);
    for (let x = 0; x < W; x += 50) g.lines([[x, 0, x, 18], [x, H - 18, x, H]], 't');
  } else if (style === 'metal') {
    g.chamfer(0, 8, W, H - 16, 10, 's');
    const grid = [];
    for (let x = 20; x < W; x += 20) grid.push([x, 18, x, H - 18]);
    g.lines(grid, 't');
    g.rect(0, 2, W, 10, 'ko', 3);
    g.rect(0, H - 12, W, 10, 'ko', 3);
    for (let x = 30; x < W; x += 100) g.circle(x, 7, 5, 'p');
  } else {
    g.rect(0, 12, W, H - 24, 'o', 4);
    const boards = [];
    for (let x = 25; x < W; x += 25) boards.push([x, 14, x, H - 14]);
    g.lines(boards, 't');
    g.rect(0, 4, W, 12, 's', 4);
    g.rect(0, H - 16, W, 12, 's', 4);
    for (let x = 0; x <= len; x++) {
      const px = Math.min(W - 16, Math.max(0, x * U - 8));
      g.rect(px, 0, 16, 20, 'ko', 3);
      g.rect(px, H - 20, 16, 20, 'ko', 3);
    }
  }
  return { footprint: { w: len, h: width }, drawing: g };
}

/** A straight fence `len` squares long. style: wood (rails), iron (spiked) or barrier (sci-fi). */
function fence({ len = 3, style = 'wood' }) {
  const g = new Drawing();
  const W = len * U;
  if (style === 'barrier') {
    for (let x = 0; x < len; x++) {
      g.chamfer(x * U + 4, 34, U - 8, 32, 8, 's');
      g.lines([[x * U + 20, 42, x * U + 36, 58], [x * U + 44, 42, x * U + 60, 58], [x * U + 68, 42, x * U + 84, 58]], 'l');
    }
  } else if (style === 'iron') {
    g.line(0, 50, W, 50, 'l');
    const bars = [];
    for (let x = 10; x < W; x += 20) bars.push([x, 38, x, 62]);
    g.lines(bars, 't');
    for (let x = 0; x <= len; x++) g.rect(Math.min(W - 14, Math.max(0, x * U - 7)), 40, 14, 20, 'ko', 2);
  } else {
    g.rect(0, 40, W, 8, 'o', 2);
    g.rect(0, 54, W, 8, 'o', 2);
    for (let x = 0; x <= len; x++) g.rect(Math.min(W - 14, Math.max(0, x * U - 7)), 34, 14, 32, 's', 3);
  }
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
  bridge: { name: 'Bridge', params: { len: [2, 12], width: [1, 4] }, make: bridge },
  fence: { name: 'Fence', params: { len: [1, 8] }, make: fence },
};

export function runGenerator(id, params) {
  const gen = GENERATORS[id];
  if (!gen) throw new Error(`Unknown generator "${id}"`);
  return gen.make(params || {});
}
