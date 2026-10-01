// Outdoor assets: trees, rocks, camps, graveyards, farmyards, alien jungles, crash sites.
// Bridges and stepping stones are for placing by hand (and the generator), not decorating.

import { leaves, stoneShape, planks } from '../motifs.js';

const ALL = ['classic', 'fantasy', 'scifi'];
const CF = ['classic', 'fantasy'];
const S = ['scifi'];
const MANUAL = ['by-hand']; // no room type: the decorator never picks these

/** A lumpy round canopy from overlapping circles. */
function canopy(g, cx, cy, r, seed, cls = 'o') {
  const bumps = 9;
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 + seed;
    const d = r * (0.55 + ((i * 37 + seed * 11) % 7) / 40);
    g.circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.48, cls);
  }
  g.circle(cx, cy, r * 0.62, cls);
}

export default function define({ A, G }) {
  // ---- classic / fantasy ----------------------------------------------------------------

  A('oak', 'Oak tree', CF, [2, 2], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp', 'graveyard', 'farmyard', 'garden'], max: 3, weight: 4, cover: 'three-quarters' }, (g) => {
    canopy(g, 100, 100, 74, 1, 's');
    canopy(g, 92, 92, 50, 2, 'o');
    const veins = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      veins.push([100, 100, 100 + Math.cos(a) * 46, 100 + Math.sin(a) * 46]);
    }
    g.lines(veins, 't');
    g.circle(100, 100, 12, 'ko');
  });

  A('pine', 'Pine tree', CF, [2, 2], { placement: 'free', roomTypes: ['forest', 'camp'], max: 3, weight: 3, cover: 'three-quarters' }, (g) => {
    for (const [r, cls, turn] of [[90, 's', 0], [64, 'o', 0.2], [38, 's', 0.1]]) {
      const pts = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + turn;
        const rad = i % 2 ? r * 0.62 : r;
        pts.push([100 + Math.cos(a) * rad, 100 + Math.sin(a) * rad]);
      }
      g.poly(pts, cls);
    }
    g.circle(100, 100, 10, 'ko');
  });

  A('bush', 'Bush', CF, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['forest', 'clearing', 'garden', 'graveyard', 'camp', 'farmyard'], max: 4, weight: 3, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    canopy(g, 50, 50, 36, 3, 's');
    leaves(g, 50, 50, 26, 6, 'o');
  });

  A('stump', 'Tree stump', CF, [1, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp'], max: 2 }, (g) => {
    g.circle(50, 50, 30, 'o');
    g.circle(50, 50, 20, 't');
    g.circle(50, 50, 10, 't');
    g.lines([[50, 20, 46, 10], [78, 58, 90, 64], [24, 64, 12, 72]], 'l');
  });

  A('fallen-log', 'Fallen log', CF, [3, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp'], max: 2 }, (g) => {
    g.rect(14, 26, 270, 48, 's', 22);
    g.lines([[40, 38, 120, 34], [70, 60, 180, 64], [150, 36, 250, 40], [200, 58, 266, 56]], 't');
    g.ellipse(272, 50, 14, 24, 'o');
    g.ellipse(272, 50, 7, 13, 't');
    g.lines([[90, 26, 80, 8], [210, 74, 222, 92]], 'l');
  });

  A('tent', 'Tent', CF, [2, 2], { placement: 'free', roomTypes: ['camp'], max: 3, weight: 2, blocksVision: true }, (g) => {
    g.poly([[20, 30], [180, 30], [190, 170], [10, 170]], 's');
    g.poly([[100, 30], [190, 170], [100, 170]], 'o');
    g.line(100, 22, 100, 178, 'l');
    g.poly([[80, 170], [100, 130], [120, 170]], 'k');
    for (const [x, y] of [[10, 186], [190, 186], [10, 14], [190, 14]]) g.circle(x, y, 6, 'ko');
  });

  A('bedroll', 'Bedroll', CF, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['camp'], max: 3 }, (g) => {
    g.rect(18, 12, 64, 176, 's', 16);
    g.rect(24, 18, 52, 40, 'o', 12);
    g.lines([[18, 90, 82, 90], [18, 130, 82, 130]], 't');
  });

  A('wagon', 'Wagon', CF, [2, 3], { placement: 'free', roomTypes: ['camp', 'farmyard'], max: 1, cover: 'three-quarters' }, (g) => {
    for (const [x, y] of [[8, 50], [192, 50], [8, 230], [192, 230]]) g.rect(x - 8, y - 26, 16, 52, 'ko', 4);
    g.rect(22, 20, 156, 250, 'o', 6);
    planks(g, 22, 20, 156, 250, 6, 'v');
    g.rect(22, 20, 156, 250, 'l', 6);
    g.lines([[100, 270, 100, 298], [70, 298, 130, 298]], 'l');
  });

  A('gravestone', 'Gravestone', CF, [1, 1], { placement: 'free', roomTypes: ['graveyard'], max: 8, weight: 8 }, (g) => {
    g.rect(24, 60, 52, 32, 'h', 6); // grave mound
    g.path('M28 64V30A22 22 0 0 1 72 30V64Z', 'o');
    g.lines([[50, 24, 50, 54], [40, 34, 60, 34]], 'l');
  });

  A('haystack', 'Haystack', CF, [2, 2], { placement: 'free', roomTypes: ['farmyard'], max: 2, blocksVision: true }, (g) => {
    g.circle(100, 100, 82, 's');
    const straw = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      straw.push([100 + Math.cos(a) * 24, 100 + Math.sin(a) * 24, 100 + Math.cos(a + 0.3) * 76, 100 + Math.sin(a + 0.3) * 76]);
    }
    g.lines(straw, 't');
    g.circle(100, 100, 22, 'o');
  });

  A('hedge', 'Hedge', CF, [2, 1], { placement: 'free', roomTypes: ['garden', 'graveyard'], max: 4, blocksVision: true }, (g) => {
    g.rect(6, 14, 188, 72, 's', 30);
    for (const x of [36, 82, 128, 166]) leaves(g, x, 50, 26, 6, 'o');
  });

  G('wood-fence', 'Wooden fence', CF, 'fence', { len: 3, style: 'wood' }, { placement: 'free', roomTypes: ['farmyard', 'garden', 'camp'], max: 3, cover: 'half' }, { len: [2, 5] });
  G('iron-fence', 'Iron railings', CF, 'fence', { len: 3, style: 'iron' }, { placement: 'free', roomTypes: ['graveyard', 'garden'], max: 3, cover: 'half' }, { len: [2, 5] });

  A('flowers', 'Flowers', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['garden', 'clearing', 'graveyard', 'farmyard'] }, (g) => {
    for (const [x, y] of [[30, 34], [62, 26], [50, 58], [24, 70], [74, 66]]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.circle(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4.5, 'o');
      }
      g.circle(x, y, 3.5, 'k');
    }
  });

  A('tall-grass', 'Tall grass', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['forest', 'clearing', 'camp', 'farmyard', 'graveyard', 'ruin'], weight: 2 }, (g) => {
    const blades = [];
    for (const [x, y] of [[26, 70], [50, 78], [72, 66], [40, 44], [64, 40]]) {
      blades.push([x, y, x - 10, y - 30], [x, y, x + 2, y - 36], [x, y, x + 12, y - 28]);
    }
    g.lines(blades, 'l');
  });

  A('fallen-leaves', 'Fallen leaves', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['forest', 'graveyard', 'garden', 'ruin'] }, (g) => {
    for (const [x, y, a] of [[28, 30, 20], [64, 40, -30], [40, 70, 60], [76, 74, 10]]) {
      g.add(`<g transform="rotate(${a} ${x} ${y})">`).ellipse(x, y, 11, 6, 's').line(x - 11, y, x + 11, y, 't').add('</g>');
    }
  });

  // ---- any setting ----------------------------------------------------------------------

  A('rock', 'Rock', ALL, [1, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp', 'graveyard', 'wasteland', 'crash-site', 'jungle'], max: 3, weight: 2 }, (g) => {
    g.poly(stoneShape(50, 54, 38, 4, 9), 's');
    g.poly(stoneShape(44, 46, 22, 8, 7), 'o');
    g.lines([[56, 60, 72, 70], [30, 62, 40, 70]], 't');
  });

  A('stepping-stones', 'Stepping stones', ALL, [2, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL }, (g) => {
    for (const [x, y, r, s] of [[30, 54, 20, 1], [92, 42, 18, 2], [150, 58, 20, 3]]) g.poly(stoneShape(x, y, r, s), 'o');
  });

  G('wooden-bridge', 'Wooden bridge', CF, 'bridge', { len: 4, width: 2, style: 'wood' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 3] });
  G('stone-bridge', 'Stone bridge', CF, 'bridge', { len: 4, width: 2, style: 'stone' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 4] });

  // ---- sci-fi ---------------------------------------------------------------------------

  A('alien-tree', 'Alien tree', S, [2, 2], { placement: 'free', roomTypes: ['jungle', 'colony-yard', 'crash-site'], max: 3, weight: 4, cover: 'three-quarters' }, (g) => {
    g.circle(100, 100, 50, 's');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2;
      const x = 100 + Math.cos(a) * 62;
      const y = 100 + Math.sin(a) * 62;
      g.add(`<g transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">`).ellipse(x, y, 32, 16, 'o').line(x - 26, y, x + 26, y, 't').add('</g>');
    }
    g.circle(100, 100, 30, 'm');
    for (const [x, y] of [[90, 92], [110, 96], [100, 112]]) g.circle(x, y, 6, 'p');
  });

  A('spore-pods', 'Spore pods', S, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['jungle', 'wasteland', 'alien-ruins'], max: 4, weight: 2, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    for (const [x, y, r] of [[36, 40, 18], [66, 36, 13], [60, 66, 20], [28, 70, 11]]) {
      g.circle(x, y, r, 'm');
      g.circle(x - r * 0.3, y - r * 0.3, r * 0.35, 'p');
    }
  });

  A('wreckage', 'Wreckage', S, [2, 2], { placement: 'free', roomTypes: ['crash-site', 'wasteland'], max: 3, weight: 3, cover: 'three-quarters' }, (g) => {
    g.poly([[18, 40], [120, 14], [178, 70], [150, 150], [60, 176], [26, 120]], 's');
    g.poly([[50, 60], [118, 44], [150, 90], [96, 130], [52, 112]], 'o');
    g.lines([[18, 40, 60, 176], [120, 14, 150, 150], [70, 80, 130, 100]], 't');
    for (const [x, y] of [[40, 52], [112, 26], [164, 74], [140, 140], [66, 162]]) g.circle(x, y, 4, 'k');
    g.star(100, 92, 24, 10, 7, 'hm');
  });

  A('escape-pod', 'Escape pod', S, [2, 2], { placement: 'free', roomTypes: ['crash-site'], max: 1, blocksVision: true }, (g) => {
    g.chamfer(30, 16, 140, 168, 40, 'o');
    g.chamfer(54, 36, 92, 60, 18, 'k');
    g.rect(60, 120, 80, 10, 's', 4);
    g.rect(60, 140, 80, 10, 's', 4);
    for (const [x, y, w] of [[10, 70, 20], [170, 70, 20], [10, 130, 20], [170, 130, 20]]) g.rect(x, y, w, 26, 'ko', 4);
  });

  A('crater', 'Crater', S, [2, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['crash-site', 'wasteland'], max: 2, tags: ['difficult terrain'] }, (g) => {
    g.poly(stoneShape(100, 100, 86, 12, 14), 'h');
    g.poly(stoneShape(100, 100, 56, 3, 12), 'hm');
    g.circle(100, 100, 24, 'k');
    for (const [x, y] of [[20, 40], [176, 60], [30, 170], [168, 160], [100, 8]]) g.circle(x, y, 5, 'hm');
  });

  A('comms-mast', 'Comms mast', S, [1, 1], { placement: 'free', roomTypes: ['colony-yard', 'crash-site'], max: 1, light: { bright: 0, dim: 2, color: '#ff4040', animation: 'pulse' } }, (g) => {
    g.lines([[50, 50, 14, 86], [50, 50, 86, 86], [50, 50, 50, 8]], 'l');
    g.circle(50, 50, 16, 'o');
    g.path('M30 28A28 28 0 0 1 70 28', 'l');
    g.circle(50, 50, 6, 'k');
  });

  A('solar-panel', 'Solar panel', S, [2, 1], { placement: 'free', roomTypes: ['colony-yard', 'wasteland'], max: 4, cover: 'half' }, (g) => {
    g.chamfer(6, 10, 188, 80, 8, 'k');
    const cells = [];
    for (let x = 30; x < 190; x += 24) cells.push([x, 14, x, 86]);
    cells.push([10, 50, 190, 50]);
    g.lines(cells, 'pl');
  });

  G('barrier', 'Barrier', S, 'fence', { len: 3, style: 'barrier' }, { placement: 'free', roomTypes: ['colony-yard', 'crash-site', 'wasteland'], max: 3, cover: 'half' }, { len: [2, 5] });
  G('gantry-bridge', 'Gantry bridge', S, 'bridge', { len: 4, width: 2, style: 'metal' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 3] });

  A('alien-grass', 'Alien grass', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['jungle', 'colony-yard', 'ruin'], weight: 2 }, (g) => {
    for (const [x, y] of [[26, 66], [56, 74], [76, 50], [40, 38]]) {
      g.path(`M${x} ${y}q-12 -20 -4 -34`, 'l');
      g.path(`M${x} ${y}q10 -18 14 -30`, 'l');
      g.circle(x - 4, y - 34, 4, 'm');
      g.circle(x + 14, y - 30, 4, 'm');
    }
  });
}
