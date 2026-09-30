// Starter asset sets. Each entry becomes one SVG file (see tools/generate-assets.js).
// Symbol style: simple outlines, like old module maps. Backs face the top edge (wallSide n).
// Units: 100 per square.

import { Drawing } from './svg.js';
import { runGenerator } from './generators.js';

const C = ['classic'];
const F = ['fantasy'];
const S = ['scifi'];
const CF = ['classic', 'fantasy'];

const defs = [];

/** Fixed asset drawn by hand. */
function A(id, name, settings, [w, h], opts, draw) {
  defs.push({ id, name, settings, footprint: { w, h }, ...opts, draw });
}

/** Asset made by a parametric generator; `sizes` lets the decorator pick other sizes. */
function G(id, name, settings, generator, params, opts, sizes) {
  defs.push({ id, name, settings, ...opts, generator: { id: generator, params }, sizes });
}

// ---- shared: classic + fantasy ------------------------------------------------

A('chest', 'Chest', CF, [1, 1], { placement: 'wall', roomTypes: ['storeroom', 'crypt', 'throne-room', 'barracks', 'bedroom', 'cellar', 'shop'], max: 2, tags: ['treasure'] }, (g) => {
  g.rect(14, 18, 72, 54, 'o', 4);
  g.line(14, 34, 86, 34, 'l');
  g.lines([[32, 18, 32, 72], [68, 18, 68, 72]], 't');
  g.rect(44, 52, 12, 12, 'k', 2);
});

A('barrel', 'Barrel', CF, [1, 1], { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'kitchen', 'tavern', 'barracks', 'smithy'], max: 4, weight: 2 }, (g) => {
  g.circle(50, 50, 36, 'o');
  g.circle(50, 50, 28, 't');
  g.circle(50, 50, 8, 't');
});

A('sacks', 'Sacks', CF, [1, 1], { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'kitchen', 'shop'], max: 3 }, (g) => {
  g.ellipse(36, 40, 24, 28, 'o');
  g.ellipse(66, 58, 24, 26, 'o');
  g.lines([[30, 16, 42, 16], [60, 36, 72, 36]], 'l');
});

G('crate', 'Crate', CF, 'cargo', { w: 1, h: 1, style: 'crate' }, { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'shop', 'smithy'], max: 4, weight: 2 }, { w: [1, 2], h: [1, 2] });

A('bed', 'Bed', CF, [1, 2], { placement: 'wall', roomTypes: ['barracks', 'bedroom', 'prison'], max: 6, weight: 2 }, (g) => {
  g.rect(10, 6, 80, 188, 'o', 4);
  g.rect(22, 16, 56, 28, 'o', 8);
  g.rect(10, 62, 80, 132, 's', 4);
  g.line(10, 80, 90, 80, 't');
});

A('bunk-bed', 'Bunk bed', CF, [1, 2], { placement: 'wall', roomTypes: ['barracks', 'bedroom'], max: 8, weight: 2 }, (g) => {
  g.rect(10, 6, 80, 188, 'o', 4);
  g.rect(22, 16, 56, 26, 'o', 8);
  g.rect(22, 158, 56, 26, 'o', 8);
  g.lines([[10, 6, 90, 194], [90, 6, 10, 194]], 't');
});

G('bookshelf', 'Bookshelf', CF, 'shelf', { len: 2, kind: 'books' }, { placement: 'wall', roomTypes: ['library', 'bedroom', 'throne-room', 'shop'], max: 6, weight: 3 }, { len: [1, 4] });

G('table-chairs', 'Table with chairs', CF, 'table', { w: 2, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['barracks', 'library', 'tavern', 'kitchen', 'great-hall', 'chamber'], max: 3, weight: 2 }, { w: [1, 4], h: [1, 2] });

G('table', 'Table', CF, 'table', { w: 2, h: 1, chairs: false }, { placement: 'free', roomTypes: ['storeroom', 'kitchen', 'smithy', 'library', 'shop', 'chamber'], max: 2 }, { w: [1, 3], h: [1, 2] });

G('rug', 'Rug', CF, 'rug', { w: 2, h: 3, pattern: 'border' }, { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'bedroom', 'library', 'great-hall', 'temple'], max: 1 }, { w: [2, 4], h: [2, 5] });

A('pillar', 'Pillar', CF, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber'], max: 6, tags: ['column'] }, (g) => {
  g.circle(50, 50, 36, 'o');
  g.circle(50, 50, 26, 't');
});

A('statue', 'Statue', CF, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber'], max: 4 }, (g) => {
  g.rect(12, 12, 76, 76, 'o', 2);
  g.star(50, 50, 30, 5, 13, 's');
});

A('altar', 'Altar', CF, [2, 1], { placement: 'wall', roomTypes: ['temple', 'crypt'], min: 1, max: 1 }, (g) => {
  g.rect(12, 10, 176, 58, 'o', 2);
  g.rect(22, 18, 156, 42, 't');
  g.circle(40, 39, 7, 'k');
  g.circle(160, 39, 7, 'k');
  g.lines([[92, 30, 108, 48], [108, 30, 92, 48]], 'l');
});

A('brazier', 'Brazier', CF, [1, 1], { placement: 'free', roomTypes: ['temple', 'throne-room', 'crypt', 'great-hall', 'cave'], max: 4 }, (g) => {
  g.circle(50, 50, 30, 'o');
  g.star(50, 50, 20, 6, 9, 'k');
});

A('torch', 'Wall torch', CF, [1, 1], { placement: 'door', layer: 'overhead', blocksMovement: false, roomTypes: ['*'], max: 2, tags: ['light'] }, (g) => {
  g.rect(40, 2, 20, 12, 'k', 2);
  g.line(50, 14, 50, 22, 'l');
  g.star(50, 30, 12, 5, 6, 's');
});

A('rubble', 'Rubble', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['cave', 'crypt', 'corridor', 'prison', 'cellar'], max: 3, tags: ['difficult terrain'] }, (g) => {
  g.poly([[20, 30], [38, 22], [46, 36], [32, 46]], 'o');
  g.poly([[56, 50], [74, 44], [82, 60], [66, 72], [54, 64]], 's');
  g.poly([[26, 64], [40, 60], [42, 76], [28, 78]], 'o');
  g.circle(64, 26, 5, 'k');
  g.circle(46, 56, 4, 'k');
});

A('bones', 'Bones', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['crypt', 'prison', 'cave', 'corridor'], max: 3 }, (g) => {
  g.circle(40, 38, 12, 'o');
  g.lines([[36, 38, 38, 38], [42, 38, 44, 38]], 'l');
  g.lines([[48, 60, 80, 76], [54, 78, 76, 56], [22, 70, 40, 62]], 'l');
  g.circle(48, 60, 4, 'k');
  g.circle(80, 76, 4, 'k');
});

A('cobweb', 'Cobweb', CF, [1, 1], { placement: 'corner', layer: 'overhead', blocksMovement: false, roomTypes: ['crypt', 'cellar', 'storeroom', 'cave', 'prison', 'library', 'corridor'], max: 2 }, (g) => {
  g.lines([[0, 0, 70, 0], [0, 0, 0, 70], [0, 0, 60, 30], [0, 0, 30, 60], [0, 0, 50, 50]], 't');
  g.path('M24 0Q18 18 0 24M46 0Q36 36 0 46M66 0Q52 52 0 66', 't');
});

A('fountain', 'Fountain', CF, [2, 2], { placement: 'centre', roomTypes: ['great-hall', 'temple', 'throne-room'], max: 1 }, (g) => {
  g.circle(100, 100, 86, 'o');
  g.circle(100, 100, 70, 's');
  g.circle(100, 100, 22, 'o');
  g.circle(100, 100, 8, 'k');
});

A('weapon-rack', 'Weapon rack', CF, [2, 1], { placement: 'wall', roomTypes: ['barracks', 'smithy', 'great-hall'], max: 2 }, (g) => {
  g.rect(8, 8, 184, 20, 'o', 2);
  g.lines([[30, 8, 30, 70], [70, 8, 70, 66], [110, 8, 110, 70], [150, 8, 150, 66]], 'l');
  g.poly([[24, 70], [30, 86], [36, 70]], 'k');
  g.lines([[62, 24, 78, 24], [102, 24, 118, 24], [142, 24, 158, 24]], 'l');
});

A('desk', 'Desk', CF, [2, 1], { placement: 'wall', roomTypes: ['library', 'bedroom', 'shop', 'chamber'], max: 2 }, (g) => {
  g.rect(10, 6, 180, 50, 'o', 3);
  g.rect(40, 16, 34, 26, 'o', 1);
  g.circle(150, 26, 7, 'k');
  g.rect(82, 64, 36, 30, 'o', 6);
  g.line(82, 90, 118, 90, 'l');
});

A('throne', 'Throne', CF, [1, 1], { placement: 'wall', roomTypes: ['throne-room', 'great-hall'], min: 1, max: 1 }, (g) => {
  g.rect(10, 6, 80, 24, 's', 4);
  g.rect(18, 26, 64, 62, 'o', 6);
  g.lines([[18, 30, 18, 86], [82, 30, 82, 86]], 'l');
  g.star(50, 18, 8, 5, 4, 'k');
});

A('sarcophagus', 'Sarcophagus', C, [1, 2], { placement: 'centre', roomTypes: ['crypt'], max: 4, weight: 2 }, (g) => {
  g.poly([[30, 8], [70, 8], [88, 40], [80, 192], [20, 192], [12, 40]], 'o');
  g.poly([[36, 20], [64, 20], [76, 44], [70, 180], [30, 180], [24, 44]], 't');
  g.lines([[50, 60, 50, 130], [34, 84, 66, 84]], 'l');
});

A('manacles', 'Manacles', C, [1, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['prison'], max: 4 }, (g) => {
  g.lines([[30, 2, 34, 22], [70, 2, 66, 22]], 't');
  g.circle(34, 28, 8, 'l');
  g.circle(66, 28, 8, 'l');
});

A('cage', 'Cage', C, [1, 1], { placement: 'corner', roomTypes: ['prison'], max: 2 }, (g) => {
  g.rect(10, 10, 80, 80, 'o', 2);
  g.lines([[26, 10, 26, 90], [42, 10, 42, 90], [58, 10, 58, 90], [74, 10, 74, 90]], 't');
});

A('straw', 'Straw pile', CF, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['prison', 'barracks', 'storeroom', 'cellar'], max: 2 }, (g) => {
  const s = [];
  for (let i = 0; i < 16; i++) {
    const x = 16 + ((i * 37) % 64);
    const y = 18 + ((i * 53) % 62);
    const a = (i * 71) % 180;
    s.push([x, y, x + Math.cos((a * Math.PI) / 180) * 16, y + Math.sin((a * Math.PI) / 180) * 16]);
  }
  g.lines(s, 't');
});

A('bucket', 'Bucket', CF, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['prison', 'kitchen', 'smithy', 'cellar'], max: 1 }, (g) => {
  g.circle(50, 50, 16, 'o');
  g.circle(50, 50, 10, 't');
});

A('pit', 'Pit', C, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'chamber', 'prison'], max: 1, tags: ['trap'] }, (g) => {
  g.rect(8, 8, 84, 84, 'm');
  g.lines([[8, 8, 92, 92], [92, 8, 8, 92]], 'l');
});

A('stalagmite', 'Stalagmite', CF, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['cave'], max: 6, weight: 2 }, (g) => {
  g.poly([[50, 12], [78, 30], [86, 60], [62, 86], [30, 82], [14, 54], [24, 24]], 's');
  g.circle(50, 50, 12, 'o');
});

A('boulder', 'Boulder', CF, [2, 2], { placement: 'free', blocksVision: true, roomTypes: ['cave'], max: 2 }, (g) => {
  g.poly([[60, 14], [140, 10], [186, 60], [176, 150], [110, 188], [36, 170], [12, 96]], 'o');
  g.path('M70 60L100 90L96 130', 'l');
  g.path('M140 70L150 110', 't');
});

A('mushrooms', 'Mushrooms', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['cave', 'cellar'], max: 3 }, (g) => {
  g.circle(34, 36, 13, 's');
  g.circle(62, 58, 16, 'o');
  g.circle(40, 70, 9, 'o');
  g.circle(62, 58, 4, 'k');
});

A('campfire', 'Campfire', CF, [1, 1], { placement: 'centre', blocksMovement: false, roomTypes: ['cave', 'barracks'], max: 1 }, (g) => {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.circle(50 + Math.cos(a) * 32, 50 + Math.sin(a) * 32, 8, 'o');
  }
  g.star(50, 50, 18, 7, 8, 'k');
});

G('dais', 'Dais', C, 'dais', { w: 3, h: 2 }, { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'temple'], max: 1 }, { w: [2, 5], h: [1, 3] });

G('pew', 'Pew', CF, 'bench', { len: 3, back: true }, { placement: 'free', facing: 'focal', roomTypes: ['temple'], max: 8, weight: 3 }, { len: [2, 5] });

A('urn', 'Urn', C, [1, 1], { placement: 'balcony', roomTypes: ['*'], max: 4 }, (g) => {
  g.circle(50, 50, 26, 'o');
  g.circle(50, 50, 14, 's');
});

A('idol', 'Idol', C, [2, 2], { placement: 'wall', blocksVision: true, roomTypes: ['temple', 'throne-room'], max: 1 }, (g) => {
  g.rect(10, 10, 180, 180, 'o', 4);
  g.star(100, 100, 74, 8, 74, 's', -Math.PI / 8);
  g.star(100, 100, 44, 5, 20, 'o');
  g.circle(100, 100, 8, 'k');
});

A('tapestry', 'Tapestry', CF, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'great-hall', 'bedroom', 'temple'], max: 2 }, (g) => {
  g.rect(10, 2, 180, 14, 's', 1);
  const f = [];
  for (let x = 16; x < 186; x += 10) f.push([x, 16, x, 24]);
  g.lines(f, 't');
});

A('candelabra', 'Candelabra', CF, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['temple', 'crypt', 'throne-room', 'library'], max: 2 }, (g) => {
  g.circle(50, 50, 20, 'o');
  for (let i = 0; i < 3; i++) g.circle(50 + Math.cos((i * 2 * Math.PI) / 3) * 12, 50 + Math.sin((i * 2 * Math.PI) / 3) * 12, 5, 'k');
});

// ---- fantasy -------------------------------------------------------------

G('bar-counter', 'Bar counter', F, 'counter', { len: 4, kind: 'bar' }, { placement: 'wall', roomTypes: ['tavern'], min: 1, max: 1 }, { len: [2, 6] });

A('stool', 'Stool', F, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['tavern', 'kitchen', 'smithy'], max: 6 }, (g) => {
  g.circle(50, 50, 16, 'o');
});

G('round-table', 'Round table', F, 'table', { w: 2, h: 2, chairs: true, round: true }, { placement: 'centre', roomTypes: ['tavern', 'great-hall', 'library'], max: 4, weight: 2 }, { w: [1, 3], h: [1, 3] });

G('long-table', 'Long table', F, 'table', { w: 4, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['great-hall', 'tavern'], max: 2 }, { w: [3, 6], h: [1, 2] });

A('keg-rack', 'Keg rack', F, [2, 1], { placement: 'wall', roomTypes: ['tavern', 'cellar'], max: 2 }, (g) => {
  g.rect(6, 6, 188, 60, 'o', 2);
  g.ellipse(52, 36, 38, 22, 'o');
  g.ellipse(148, 36, 38, 22, 'o');
  g.lines([[52, 14, 52, 58], [148, 14, 148, 58]], 't');
});

A('fireplace', 'Fireplace', F, [2, 1], { placement: 'wall', roomTypes: ['tavern', 'great-hall', 'bedroom', 'kitchen', 'library'], max: 1 }, (g) => {
  g.rect(8, 2, 184, 52, 's', 2);
  g.rect(50, 2, 100, 36, 'k');
  g.star(100, 20, 13, 6, 6, 'p');
  g.line(8, 54, 192, 54, 'l');
});

A('stove', 'Stove', F, [1, 1], { placement: 'wall', roomTypes: ['kitchen'], min: 1, max: 1 }, (g) => {
  g.rect(8, 6, 84, 70, 'o', 4);
  g.circle(32, 32, 12, 't');
  g.circle(68, 32, 12, 't');
  g.rect(24, 56, 52, 12, 'k', 2);
});

G('kitchen-counter', 'Kitchen counter', F, 'counter', { len: 3, kind: 'kitchen' }, { placement: 'wall', roomTypes: ['kitchen'], max: 2 }, { len: [2, 5] });

A('cauldron', 'Cauldron', F, [1, 1], { placement: 'centre', roomTypes: ['kitchen', 'cave', 'library'], max: 1 }, (g) => {
  g.circle(50, 50, 34, 'k');
  g.circle(50, 50, 24, 's');
  g.lines([[50, 16, 50, 4], [20, 68, 10, 76], [80, 68, 90, 76]], 'l');
});

A('double-bed', 'Double bed', F, [2, 2], { placement: 'wall', roomTypes: ['bedroom'], max: 1 }, (g) => {
  g.rect(10, 6, 180, 188, 'o', 4);
  g.rect(24, 16, 66, 30, 'o', 8);
  g.rect(110, 16, 66, 30, 'o', 8);
  g.rect(10, 62, 180, 132, 's', 4);
  g.line(10, 80, 190, 80, 't');
});

A('wardrobe', 'Wardrobe', F, [2, 1], { placement: 'wall', roomTypes: ['bedroom'], max: 1 }, (g) => {
  g.rect(6, 6, 188, 52, 'o', 2);
  g.line(100, 6, 100, 58, 'l');
  g.circle(90, 40, 4, 'k');
  g.circle(110, 40, 4, 'k');
});

A('nightstand', 'Nightstand', F, [1, 1], { placement: 'wall', roomTypes: ['bedroom'], max: 2 }, (g) => {
  g.rect(20, 6, 60, 50, 'o', 3);
  g.circle(50, 30, 10, 's');
});

A('armchair', 'Armchair', F, [1, 1], { placement: 'free', roomTypes: ['bedroom', 'library', 'great-hall'], max: 3 }, (g) => {
  g.rect(12, 12, 76, 76, 'o', 12);
  g.rect(12, 12, 76, 20, 's', 8);
  g.lines([[24, 32, 24, 84], [76, 32, 76, 84]], 't');
});

A('anvil', 'Anvil', F, [1, 1], { placement: 'centre', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
  g.poly([[8, 36], [34, 30], [84, 30], [92, 42], [84, 56], [66, 56], [62, 76], [38, 76], [36, 56], [30, 50]], 'o');
});

A('forge', 'Forge', F, [2, 2], { placement: 'wall', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
  g.rect(8, 6, 184, 150, 's', 6);
  g.rect(40, 30, 120, 90, 'k', 4);
  for (let i = 0; i < 6; i++) g.circle(62 + (i % 3) * 38, 56 + Math.floor(i / 3) * 38, 12, 'p');
  g.rect(70, 6, 60, 18, 'o', 2);
});

A('grindstone', 'Grindstone', F, [1, 1], { placement: 'free', roomTypes: ['smithy'], max: 1 }, (g) => {
  g.rect(20, 36, 60, 28, 'o', 2);
  g.ellipse(50, 50, 12, 36, 's');
  g.line(8, 50, 92, 50, 'l');
});

A('workbench', 'Workbench', F, [2, 1], { placement: 'wall', roomTypes: ['smithy', 'shop', 'cellar'], max: 2 }, (g) => {
  g.rect(8, 6, 184, 56, 'o', 2);
  g.lines([[30, 20, 60, 40], [90, 16, 90, 46], [120, 30, 160, 30]], 'l');
  g.circle(170, 44, 7, 'k');
});

G('display-counter', 'Display counter', F, 'counter', { len: 3, kind: 'shop' }, { placement: 'centre', roomTypes: ['shop'], min: 1, max: 2 }, { len: [2, 5] });

G('goods-shelf', 'Goods shelf', CF, 'shelf', { len: 2, kind: 'goods' }, { placement: 'wall', roomTypes: ['shop', 'cellar', 'kitchen', 'storeroom'], max: 4, weight: 2 }, { len: [1, 4] });

G('wine-rack', 'Wine rack', F, 'shelf', { len: 2, kind: 'bottles' }, { placement: 'wall', roomTypes: ['cellar', 'tavern'], max: 3 }, { len: [1, 4] });

G('scroll-shelf', 'Scroll shelf', F, 'shelf', { len: 2, kind: 'scrolls' }, { placement: 'wall', roomTypes: ['library', 'temple'], max: 3 }, { len: [1, 3] });

A('lectern', 'Lectern', CF, [1, 1], { placement: 'centre', roomTypes: ['library', 'temple'], max: 1 }, (g) => {
  g.poly([[24, 30], [76, 30], [70, 62], [30, 62]], 'o');
  g.line(50, 30, 50, 62, 't');
});

A('plant', 'Potted plant', F, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['great-hall', 'bedroom', 'shop', 'tavern', 'library'], max: 2 }, (g) => {
  g.circle(50, 50, 20, 'o');
  g.star(50, 50, 30, 7, 12, 's');
  g.circle(50, 50, 6, 'k');
});

A('planter', 'Planter box', F, [1, 1], { placement: 'balcony', roomTypes: ['*'], max: 4 }, (g) => {
  g.rect(10, 20, 80, 40, 'o', 3);
  for (const x of [28, 50, 72]) g.star(x, 40, 12, 5, 5, 's');
});

A('doormat', 'Doormat', F, [1, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['tavern', 'shop', 'great-hall'], max: 1 }, (g) => {
  g.rect(12, 20, 76, 60, 'o', 4);
  g.rect(22, 30, 56, 40, 't');
});

A('coat-rack', 'Coat rack', F, [1, 1], { placement: 'door', blocksMovement: false, roomTypes: ['tavern', 'great-hall', 'bedroom'], max: 1 }, (g) => {
  g.circle(50, 50, 10, 'k');
  g.lines([[50, 50, 26, 30], [50, 50, 74, 30], [50, 50, 26, 70], [50, 50, 74, 70]], 'l');
});

A('well', 'Well', F, [2, 2], { placement: 'centre', blocksVision: false, roomTypes: ['cellar', 'cave', 'great-hall'], max: 1 }, (g) => {
  g.circle(100, 100, 70, 'o');
  g.circle(100, 100, 52, 'k');
  g.lines([[20, 100, 180, 100]], 'l');
  g.rect(88, 88, 24, 24, 'o', 2);
});

// ---- sci-fi --------------------------------------------------------------

G('console', 'Console', S, 'console', { len: 2 }, { placement: 'wall', roomTypes: ['bridge', 'engine-room', 'lab', 'med-bay', 'airlock'], max: 4, weight: 3 }, { len: [1, 4] });

A('captain-chair', "Captain's chair", S, [1, 1], { placement: 'centre', roomTypes: ['bridge'], min: 1, max: 1 }, (g) => {
  g.chamfer(10, 10, 80, 80, 16, 's');
  g.rect(24, 20, 52, 58, 'o', 10);
  g.lines([[24, 30, 24, 70], [76, 30, 76, 70]], 'l');
  g.circle(18, 60, 4, 'k');
  g.circle(82, 60, 4, 'k');
});

A('pilot-seat', 'Pilot seat', S, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['bridge'], max: 4 }, (g) => {
  g.rect(28, 30, 44, 44, 'o', 10);
  g.line(28, 36, 72, 36, 'l');
});

A('holo-table', 'Holo table', S, [2, 2], { placement: 'centre', roomTypes: ['bridge', 'lab', 'armoury'], max: 1 }, (g) => {
  g.chamfer(10, 10, 180, 180, 36, 'o');
  g.circle(100, 100, 62, 's');
  g.circle(100, 100, 40, 'd');
  g.lines([[100, 30, 100, 170], [30, 100, 170, 100]], 't');
});

A('nav-station', 'Nav station', S, [2, 1], { placement: 'wall', roomTypes: ['bridge'], max: 2 }, (g) => {
  g.chamfer(4, 4, 192, 58, 14, 'o');
  g.circle(60, 32, 20, 's');
  g.lines([[60, 32, 74, 20]], 'l');
  g.chamfer(100, 14, 80, 30, 6, 's');
});

A('med-bed', 'Med bed', S, [1, 2], { placement: 'wall', roomTypes: ['med-bay'], max: 6, weight: 3 }, (g) => {
  g.chamfer(10, 6, 80, 188, 14, 'o');
  g.chamfer(22, 40, 56, 140, 10, 's');
  g.chamfer(26, 12, 48, 20, 6, 'o');
  g.lines([[40, 22, 46, 22], [54, 22, 60, 22]], 'l');
});

A('med-scanner', 'Med scanner', S, [1, 2], { placement: 'centre', roomTypes: ['med-bay', 'lab'], max: 1 }, (g) => {
  g.chamfer(18, 10, 64, 180, 12, 'o');
  g.path('M10 70Q50 50 90 70M10 130Q50 110 90 130', 'l');
  g.rect(40, 90, 20, 20, 's', 4);
});

A('med-cabinet', 'Medical cabinet', S, [1, 1], { placement: 'wall', roomTypes: ['med-bay'], max: 3 }, (g) => {
  g.chamfer(8, 6, 84, 48, 10, 'o');
  g.rect(44, 14, 12, 32, 'k');
  g.rect(34, 24, 32, 12, 'k');
});

A('locker', 'Storage locker', S, [2, 1], { placement: 'wall', roomTypes: ['crew-quarters', 'cargo-bay', 'airlock', 'armoury', 'engine-room'], max: 4, weight: 2 }, (g) => {
  g.chamfer(6, 6, 188, 50, 10, 'o');
  g.lines([[53, 6, 53, 56], [100, 6, 100, 56], [147, 6, 147, 56]], 'l');
  g.lines([[20, 20, 40, 20], [67, 20, 87, 20], [114, 20, 134, 20], [161, 20, 181, 20]], 't');
});

A('weapon-locker', 'Weapon locker', S, [2, 1], { placement: 'wall', roomTypes: ['armoury', 'bridge'], min: 1, max: 3 }, (g) => {
  g.chamfer(6, 6, 188, 56, 10, 'o');
  for (const x of [36, 82, 128, 164]) g.poly([[x - 5, 14], [x + 5, 14], [x + 5, 48], [x - 5, 52]], 's');
});

A('armour-rack', 'Armour rack', S, [2, 1], { placement: 'wall', roomTypes: ['armoury', 'airlock'], max: 2 }, (g) => {
  g.line(8, 10, 192, 10, 'l');
  for (const x of [50, 150]) {
    g.circle(x, 24, 12, 'o');
    g.chamfer(x - 26, 36, 52, 44, 10, 's');
  }
});

A('eva-suit', 'EVA suit locker', S, [1, 1], { placement: 'wall', roomTypes: ['airlock'], min: 1, max: 4 }, (g) => {
  g.chamfer(8, 6, 84, 70, 12, 'o');
  g.circle(50, 26, 12, 's');
  g.chamfer(32, 40, 36, 30, 6, 's');
});

G('cargo-crate', 'Cargo crate', S, 'cargo', { w: 1, h: 1, style: 'container' }, { placement: 'corner', roomTypes: ['cargo-bay', 'engine-room', 'airlock', 'corridor'], max: 8, weight: 3 }, { w: [1, 2], h: [1, 2] });

G('container', 'Cargo container', S, 'cargo', { w: 2, h: 4, style: 'container' }, { placement: 'free', blocksVision: true, roomTypes: ['cargo-bay'], max: 3 }, { w: [2, 3], h: [3, 5] });

A('fuel-drum', 'Fuel drum', S, [1, 1], { placement: 'corner', roomTypes: ['engine-room', 'cargo-bay'], max: 4 }, (g) => {
  g.circle(50, 50, 34, 'o');
  g.circle(50, 50, 24, 't');
  g.poly([[50, 34], [64, 58], [36, 58]], 'k');
});

A('reactor', 'Reactor core', S, [3, 3], { placement: 'centre', blocksVision: true, roomTypes: ['engine-room'], min: 1, max: 1 }, (g) => {
  g.chamfer(10, 10, 280, 280, 60, 'o');
  g.circle(150, 150, 110, 's');
  g.circle(150, 150, 60, 'o');
  g.circle(150, 150, 26, 'k');
  const spokes = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    spokes.push([150 + Math.cos(a) * 64, 150 + Math.sin(a) * 64, 150 + Math.cos(a) * 106, 150 + Math.sin(a) * 106]);
  }
  g.lines(spokes, 'l');
});

A('turbine', 'Engine turbine', S, [2, 2], { placement: 'wall', roomTypes: ['engine-room'], max: 2 }, (g) => {
  g.chamfer(8, 8, 184, 184, 30, 'o');
  g.circle(100, 100, 74, 's');
  const blades = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    blades.push([100 + Math.cos(a) * 20, 100 + Math.sin(a) * 20, 100 + Math.cos(a + 0.5) * 70, 100 + Math.sin(a + 0.5) * 70]);
  }
  g.lines(blades, 'l');
  g.circle(100, 100, 18, 'k');
});

A('generator', 'Power generator', S, [1, 2], { placement: 'wall', roomTypes: ['engine-room', 'cargo-bay'], max: 2 }, (g) => {
  g.chamfer(8, 6, 84, 188, 14, 'o');
  const fins = [];
  for (let y = 30; y < 180; y += 16) fins.push([20, y, 80, y]);
  g.lines(fins, 't');
  g.poly([[54, 60], [40, 100], [52, 100], [46, 136], [62, 92], [50, 92]], 'k');
});

A('pipes', 'Pipe run', S, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['engine-room', 'corridor', 'cargo-bay'], max: 3 }, (g) => {
  g.rect(0, 8, 200, 12, 'o');
  g.rect(0, 26, 200, 12, 's');
  g.lines([[50, 4, 50, 42], [150, 4, 150, 42]], 'l');
});

A('bunk', 'Bunk', S, [1, 2], { placement: 'wall', roomTypes: ['crew-quarters', 'med-bay'], max: 6, weight: 3 }, (g) => {
  g.chamfer(10, 6, 80, 188, 12, 'o');
  g.chamfer(22, 16, 56, 26, 8, 'o');
  g.rect(10, 64, 80, 130, 's', 2);
});

A('crew-locker', 'Crew locker', S, [1, 1], { placement: 'wall', roomTypes: ['crew-quarters'], max: 4 }, (g) => {
  g.chamfer(12, 6, 76, 50, 8, 'o');
  g.line(50, 6, 50, 56, 'l');
  g.lines([[22, 18, 40, 18], [60, 18, 78, 18]], 't');
});

G('mess-table', 'Mess table', S, 'table', { w: 3, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['mess-hall', 'crew-quarters'], max: 3, weight: 2 }, { w: [2, 4], h: [1, 2] });

A('food-dispenser', 'Food dispenser', S, [1, 1], { placement: 'wall', roomTypes: ['mess-hall'], min: 1, max: 2 }, (g) => {
  g.chamfer(10, 6, 80, 56, 10, 'o');
  g.chamfer(22, 14, 56, 18, 4, 's');
  g.rect(36, 40, 28, 12, 'k', 2);
});

G('lab-bench', 'Lab bench', S, 'counter', { len: 3, kind: 'lab' }, { placement: 'wall', roomTypes: ['lab', 'med-bay'], max: 3, weight: 2 }, { len: [2, 5] });

A('specimen-tank', 'Specimen tank', S, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['lab', 'med-bay'], max: 4 }, (g) => {
  g.circle(50, 50, 36, 'o');
  g.circle(50, 50, 28, 's');
  g.circle(40, 40, 5, 'o');
  g.circle(58, 56, 4, 'o');
  g.circle(46, 62, 3, 'o');
});

A('terminal', 'Terminal', S, [1, 1], { placement: 'wall', roomTypes: ['corridor', 'crew-quarters', 'cargo-bay', 'armoury', 'airlock'], max: 2 }, (g) => {
  g.chamfer(14, 6, 72, 40, 10, 'o');
  g.chamfer(24, 12, 52, 18, 4, 's');
});

A('vent', 'Floor vent', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'engine-room', 'cargo-bay', 'crew-quarters'], max: 2 }, (g) => {
  g.rect(14, 14, 72, 72, 'o', 2);
  const slats = [];
  for (let y = 26; y < 80; y += 10) slats.push([22, y, 78, y]);
  g.lines(slats, 't');
});

A('hazard-stripes', 'Hazard floor', S, [2, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['airlock', 'cargo-bay', 'engine-room'], max: 1 }, (g) => {
  g.rect(4, 20, 192, 60, 'o');
  const stripes = [];
  for (let x = -40; x < 200; x += 24) stripes.push([Math.max(4, x), 20 + Math.max(0, 4 - x), Math.min(196, x + 60), 80 - Math.max(0, x + 60 - 196)]);
  g.lines(stripes, 'l');
});

A('sofa', 'Lounge seat', S, [2, 1], { placement: 'wall', roomTypes: ['crew-quarters', 'mess-hall'], max: 2 }, (g) => {
  g.chamfer(6, 10, 188, 70, 14, 'o');
  g.chamfer(6, 10, 188, 22, 8, 's');
  g.line(100, 32, 100, 80, 't');
});

A('hydroponics', 'Hydroponics tray', S, [2, 1], { placement: 'free', roomTypes: ['lab', 'mess-hall'], max: 3 }, (g) => {
  g.chamfer(6, 12, 188, 76, 12, 'o');
  for (const x of [30, 65, 100, 135, 170]) g.star(x, 50, 14, 5, 6, 's');
});

A('charging-pad', 'Drone pad', S, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['cargo-bay', 'engine-room', 'lab'], max: 2 }, (g) => {
  g.circle(50, 50, 38, 'o');
  g.circle(50, 50, 28, 'd');
  g.lines([[40, 50, 60, 50], [50, 40, 50, 60]], 'l');
});

A('observation-seat', 'Observation bench', S, [2, 1], { placement: 'balcony', roomTypes: ['*'], max: 2 }, (g) => {
  g.chamfer(10, 30, 180, 36, 8, 'o');
  g.lines([[60, 30, 60, 66], [140, 30, 140, 66]], 't');
});

// ---- build ---------------------------------------------------------------

/** Metadata plus drawing for every starter asset. */
export function buildStarterAssets() {
  return defs.map((d) => {
    let drawing;
    let footprint = d.footprint;
    if (d.generator) {
      const out = runGenerator(d.generator.id, d.generator.params);
      drawing = out.drawing;
      footprint = out.footprint;
    } else {
      drawing = new Drawing();
      d.draw(drawing);
    }
    const settings = d.settings;
    const meta = {
      id: d.id,
      name: d.name,
      settings,
      footprint,
      roomTypes: d.roomTypes || ['*'],
      placement: d.placement || 'free',
      wallSide: d.wallSide || 'n',
      layer: d.layer || 'object',
      blocksMovement: d.blocksMovement ?? (d.layer || 'object') === 'object',
      blocksVision: d.blocksVision ?? false,
      weight: d.weight ?? 1,
      min: d.min ?? 0,
      max: d.max ?? 0,
      tags: d.tags || [],
    };
    if (d.facing) meta.facing = d.facing;
    if (d.generator) meta.generator = { ...d.generator, sizes: d.sizes || null };
    const folder = settings.length > 1 ? 'common' : settings[0];
    return { meta, drawing, folder };
  });
}
