// Classic D&D and shared classic/fantasy assets. Backs face the top edge (wallSide n).

import { candle, flame, figure, stoneShape, planks } from '../motifs.js';

const C = ['classic'];
const CF = ['classic', 'fantasy'];

// Bone: a line with knobbly ends.
function bone(g, x1, y1, x2, y2) {
  g.line(x1, y1, x2, y2, 'l');
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    g.circle(x - 3, y - 2, 5, 'o');
    g.circle(x + 3, y + 2, 5, 'o');
  }
}

export default function define({ A, G }) {
  A('chest', 'Chest', CF, [1, 1], { placement: 'wall', roomTypes: ['storeroom', 'crypt', 'throne-room', 'barracks', 'bedroom', 'cellar', 'shop'], max: 2, tags: ['treasure'] }, (g) => {
    g.rect(12, 18, 76, 60, 'o', 6);
    g.rect(12, 18, 76, 22, 's', 6);
    g.rect(24, 18, 9, 60, 'ko');
    g.rect(67, 18, 9, 60, 'ko');
    g.rect(41, 58, 18, 16, 'ko', 2);
    g.circle(50, 65, 3, 'p');
  });

  A('barrel', 'Barrel', CF, [1, 1], { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'kitchen', 'tavern', 'barracks', 'smithy', 'prison'], max: 4, weight: 2 }, (g) => {
    g.circle(50, 50, 39, 'o');
    g.circle(50, 50, 32, 'l');
    const chord = (x) => Math.sqrt(32 * 32 - (x - 50) ** 2);
    g.lines([36, 50, 64].map((x) => [x, 50 - chord(x), x, 50 + chord(x)]), 't');
    g.circle(62, 38, 5, 'k');
  });

  A('sacks', 'Sacks', CF, [1, 1], { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'kitchen', 'shop'], max: 3 }, (g) => {
    g.ellipse(34, 48, 25, 30, 's');
    g.ellipse(34, 22, 9, 6, 'ko');
    g.ellipse(66, 62, 25, 28, 'o');
    g.ellipse(72, 36, 9, 6, 'ko');
    g.path('M22 52Q34 60 46 52M54 68Q66 76 78 68', 't');
  });

  G('crate', 'Crate', CF, 'cargo', { w: 1, h: 1, style: 'crate' }, { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'shop', 'smithy'], max: 4, weight: 2 }, { w: [1, 2], h: [1, 2] });

  A('bed', 'Bed', CF, [1, 2], { placement: 'wall', roomTypes: ['barracks', 'bedroom', 'prison'], max: 6, weight: 2 }, (g) => {
    g.rect(8, 4, 84, 192, 'o', 6);
    g.rect(8, 4, 84, 14, 'ko', 4);
    g.rect(20, 24, 60, 30, 'o', 12);
    g.line(30, 39, 70, 39, 't');
    g.rect(8, 66, 84, 130, 's', 6);
    g.rect(8, 66, 84, 18, 'o', 4);
    g.lines([[8, 110, 92, 150], [8, 150, 92, 190], [8, 190, 50, 196]], 't');
  });

  A('bunk-bed', 'Bunk bed', CF, [1, 2], { placement: 'wall', roomTypes: ['barracks', 'bedroom'], max: 8, weight: 2 }, (g) => {
    g.rect(8, 4, 84, 192, 's', 4);
    g.rect(16, 12, 68, 176, 'o', 8);
    g.rect(24, 20, 52, 26, 'o', 10);
    for (const [x, y] of [[4, 0], [80, 0], [4, 184], [80, 184]]) g.rect(x, y, 16, 16, 'ko', 3);
    // Ladder up the side.
    g.lines([[70, 110, 70, 180], [84, 110, 84, 180]], 'l');
    g.lines([[70, 124, 84, 124], [70, 140, 84, 140], [70, 156, 84, 156], [70, 172, 84, 172]], 'l');
  });

  G('bookshelf', 'Bookshelf', CF, 'shelf', { len: 2, kind: 'books' }, { placement: 'wall', roomTypes: ['library', 'bedroom', 'throne-room', 'shop', 'temple'], max: 6, weight: 3 }, { len: [1, 4] });
  G('table-chairs', 'Table with chairs', CF, 'table', { w: 2, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['barracks', 'library', 'tavern', 'kitchen', 'great-hall', 'chamber'], max: 3, weight: 2 }, { w: [1, 4], h: [1, 2] });
  G('table', 'Table', CF, 'table', { w: 2, h: 1, chairs: false }, { placement: 'free', roomTypes: ['storeroom', 'kitchen', 'smithy', 'library', 'shop', 'chamber'], max: 2 }, { w: [1, 3], h: [1, 2] });
  G('rug', 'Rug', CF, 'rug', { w: 2, h: 3, pattern: 'border' }, { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'bedroom', 'library', 'great-hall', 'temple'], max: 1 }, { w: [2, 4], h: [2, 5] });

  A('pillar', 'Pillar', CF, [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber'], max: 6, tags: ['column'] }, (g) => {
    g.rect(8, 8, 84, 84, 's', 4);
    g.circle(50, 50, 32, 'o');
    const flutes = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      flutes.push([50 + Math.cos(a) * 22, 50 + Math.sin(a) * 22, 50 + Math.cos(a) * 32, 50 + Math.sin(a) * 32]);
    }
    g.lines(flutes, 't');
    g.circle(50, 50, 10, 'ko');
  });

  A('statue', 'Statue', CF, [1, 1], { placement: 'corner', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber', 'library', 'shop'], max: 4 }, (g) => {
    g.rect(8, 8, 84, 84, 's', 4);
    g.rect(16, 16, 68, 68, 'l', 2);
    figure(g, 50, 46, 0.95, 'o');
    g.line(70, 30, 70, 78, 'l'); // spear
    g.poly([[64, 30], [70, 16], [76, 30]], 'ko');
  });

  A('altar', 'Altar', CF, [2, 1], { placement: 'wall', roomTypes: ['temple', 'crypt'], min: 1, max: 1 }, (g) => {
    g.rect(8, 6, 184, 64, 's', 4);
    g.rect(78, 6, 44, 64, 'o');
    const fringe = [];
    for (let x = 82; x < 120; x += 6) fringe.push([x, 70, x, 78]);
    g.lines(fringe, 't');
    candle(g, 32, 38, 9);
    candle(g, 168, 38, 9);
    g.circle(100, 34, 12, 'ko');
    g.circle(100, 34, 5, 'p');
  });

  A('brazier', 'Brazier', CF, [1, 1], { placement: 'free', roomTypes: ['temple', 'throne-room', 'crypt', 'great-hall', 'cave'], max: 4 }, (g) => {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      g.line(50, 50, 50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 'l');
      g.circle(50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 5, 'ko');
    }
    g.circle(50, 50, 30, 'ko');
    g.star(50, 50, 22, 7, 10, 'p');
    g.circle(50, 50, 6, 'k');
  });

  A('torch', 'Wall torch', CF, [1, 1], { placement: 'door', layer: 'overhead', blocksMovement: false, roomTypes: ['*'], max: 2, tags: ['light'] }, (g) => {
    g.rect(40, 0, 20, 10, 'ko', 2);
    g.line(50, 10, 50, 26, 'l');
    flame(g, 50, 34, 14);
  });

  A('rubble', 'Rubble', CF.concat('scifi'), [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['cave', 'crypt', 'corridor', 'prison', 'cellar', 'mine', 'alien-ruins'], max: 3, tags: ['difficult terrain'] }, (g) => {
    g.poly(stoneShape(30, 34, 17, 3), 's');
    g.poly(stoneShape(66, 60, 20, 7), 'o');
    g.poly(stoneShape(32, 72, 12, 11), 's');
    g.lines([[62, 52, 70, 66], [24, 30, 34, 38]], 't');
    for (const [x, y] of [[58, 28], [48, 50], [80, 34], [50, 84]]) g.circle(x, y, 4, 'k');
  });

  A('bones', 'Bones', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['crypt', 'prison', 'cave', 'corridor'], max: 3 }, (g) => {
    bone(g, 50, 64, 84, 84);
    bone(g, 56, 86, 86, 58);
    g.circle(36, 38, 18, 'o');
    g.rect(28, 50, 16, 10, 'o', 3);
    g.circle(30, 36, 5, 'k');
    g.circle(43, 36, 5, 'k');
  });

  A('cobweb', 'Cobweb', CF, [1, 1], { placement: 'corner', layer: 'overhead', blocksMovement: false, clutter: true, roomTypes: ['crypt', 'cellar', 'storeroom', 'cave', 'prison', 'library', 'corridor'], max: 2 }, (g) => {
    const angles = [0, 0.3, 0.62, 0.95, 1.25, Math.PI / 2];
    g.lines(angles.map((a) => [0, 0, Math.cos(a) * 78, Math.sin(a) * 78]), 't');
    for (const r of [22, 40, 58, 74]) {
      const pts = angles.map((a) => [Math.cos(a) * r, Math.sin(a) * r]);
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const m = [(pts[i - 1][0] + pts[i][0]) / 2 * 0.9, (pts[i - 1][1] + pts[i][1]) / 2 * 0.9];
        d += `Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
      }
      g.path(d, 't');
    }
    g.circle(44, 40, 6, 'k');
    g.lines([[38, 34, 32, 30], [50, 34, 56, 30], [38, 46, 32, 50], [50, 46, 56, 50]], 't');
  });

  A('fountain', 'Fountain', CF, [2, 2], { placement: 'centre', roomTypes: ['great-hall', 'temple', 'throne-room'], max: 1 }, (g) => {
    g.star(100, 100, 92, 8, 92, 's', Math.PI / 8);
    g.star(100, 100, 78, 8, 78, 'm', Math.PI / 8);
    g.circle(100, 100, 56, 'pl');
    g.circle(100, 100, 38, 'pl');
    g.circle(100, 100, 20, 'o');
    g.circle(100, 100, 8, 'k');
  });

  A('weapon-rack', 'Weapon rack', CF, [2, 1], { placement: 'wall', roomTypes: ['barracks', 'smithy', 'great-hall'], max: 2 }, (g) => {
    g.rect(6, 4, 188, 14, 'ko', 3);
    for (const x of [34, 74]) {
      g.rect(x - 5, 18, 10, 56, 'o', 2); // blade
      g.rect(x - 15, 18, 30, 7, 'ko', 2); // guard
    }
    g.line(114, 18, 114, 90, 'l');
    g.poly([[114, 78], [104, 92], [124, 92]], 'ko'); // spear head (pointing down)
    g.line(156, 18, 156, 84, 'l');
    g.path('M156 60Q182 58 184 76Q170 72 156 78Z', 'ko'); // axe
  });

  A('desk', 'Desk', CF, [2, 1], { placement: 'wall', roomTypes: ['library', 'bedroom', 'shop', 'chamber'], max: 2 }, (g) => {
    g.rect(8, 6, 184, 54, 'o', 4);
    planks(g, 8, 6, 184, 54, 3, 'h');
    g.rect(38, 14, 28, 36, 's', 2);
    g.rect(66, 14, 28, 36, 's', 2);
    g.line(110, 18, 130, 42, 'l');
    candle(g, 160, 32, 8);
    g.rect(82, 66, 36, 30, 'o', 7);
    g.rect(82, 88, 36, 8, 'ko', 3);
  });

  A('throne', 'Throne', CF, [1, 1], { placement: 'wall', roomTypes: ['throne-room', 'great-hall'], min: 1, max: 1 }, (g) => {
    g.poly([[12, 2], [24, 16], [37, 4], [50, 16], [63, 4], [76, 16], [88, 2], [88, 30], [12, 30]], 'ko');
    g.rect(12, 30, 14, 58, 's', 5);
    g.rect(74, 30, 14, 58, 's', 5);
    g.rect(26, 30, 48, 58, 'o', 6);
    g.rect(32, 38, 36, 40, 's', 8);
  });

  A('sarcophagus', 'Sarcophagus', C, [1, 2], { placement: 'centre', roomTypes: ['crypt'], max: 4, weight: 2 }, (g) => {
    g.poly([[30, 6], [70, 6], [90, 40], [80, 194], [20, 194], [10, 40]], 's');
    g.poly([[34, 16], [66, 16], [78, 42], [70, 184], [30, 184], [22, 42]], 'o');
    g.circle(50, 42, 13, 's');
    g.ellipse(50, 112, 18, 56, 's');
    g.line(50, 70, 50, 170, 'l');
    g.rect(40, 82, 20, 8, 'ko', 2);
  });

  A('manacles', 'Manacles', C, [1, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['prison'], max: 4 }, (g) => {
    g.rect(18, 0, 64, 10, 'ko', 2);
    for (const x of [32, 68]) {
      for (let y = 16; y < 36; y += 8) g.ellipse(x, y, 3, 5, 't');
      g.circle(x, 44, 9, 'l');
    }
  });

  A('cage', 'Cage', C, [1, 1], { placement: 'corner', roomTypes: ['prison'], max: 2 }, (g) => {
    g.rect(8, 8, 84, 84, 'o', 4);
    g.lines([24, 40, 56, 72].map((x) => [x, 8, x, 92]), 'l');
    g.lines([[8, 36, 92, 36], [8, 64, 92, 64]], 't');
    g.rect(8, 8, 84, 84, 'l', 4);
    g.rect(86, 44, 10, 14, 'ko', 2); // lock
  });

  A('straw', 'Straw pile', CF, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['prison', 'barracks', 'storeroom', 'cellar'], max: 2 }, (g) => {
    g.ellipse(48, 52, 38, 30, 'h');
    const s = [];
    for (let i = 0; i < 26; i++) {
      const x = 16 + ((i * 37) % 64);
      const y = 26 + ((i * 53) % 52);
      const a = ((i * 71) % 180) * (Math.PI / 180);
      s.push([x, y, x + Math.cos(a) * 16, y + Math.sin(a) * 16]);
    }
    g.lines(s, 't');
  });

  A('pit', 'Pit trap', C, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'chamber', 'prison'], max: 1, weight: 0.5, tags: ['trap'], gmOnly: true }, (g) => {
    g.rect(6, 6, 88, 88, 's');
    g.rect(18, 18, 64, 64, 'm');
    g.rect(32, 32, 36, 36, 'k');
    g.lines([[6, 6, 32, 32], [94, 6, 68, 32], [6, 94, 32, 68], [94, 94, 68, 68]], 'l');
  });

  A('pressure-plate', 'Pressure plate trap', CF.concat('scifi'), [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'crypt', 'temple', 'throne-room', 'storeroom', 'cave', 'alien-ruins', 'armoury', 'security', 'cellar'], max: 1, weight: 0.4, tags: ['trap'], gmOnly: true }, (g) => {
    g.rect(16, 16, 68, 68, 's', 4);
    g.rect(26, 26, 48, 48, 'o', 3);
    g.lines([[26, 26, 16, 16], [74, 26, 84, 16], [26, 74, 16, 84], [74, 74, 84, 84]], 't');
    g.path('M50 34L60 54H40Z', 'ko');
    g.circle(50, 62, 3.5, 'k');
  });

  A('stalagmite', 'Stalagmite', CF.concat('scifi'), [1, 1], { placement: 'free', blocksVision: true, roomTypes: ['cave', 'mine', 'alien-ruins'], max: 6, weight: 2 }, (g) => {
    g.poly(stoneShape(50, 50, 42, 5, 9), 's');
    g.poly(stoneShape(50, 50, 27, 9, 7), 'o');
    g.poly(stoneShape(50, 50, 12, 2, 6), 'ko');
  });

  A('boulder', 'Boulder', CF.concat('scifi'), [2, 2], { placement: 'free', blocksVision: true, roomTypes: ['cave', 'mine', 'alien-ruins', 'landing-pad'], max: 2 }, (g) => {
    g.poly([[60, 12], [142, 8], [188, 60], [178, 150], [112, 190], [34, 172], [10, 96]], 's');
    g.poly([[70, 30], [132, 26], [166, 64], [150, 120], [96, 132], [48, 98]], 'o');
    g.path('M70 60L100 90L96 128M140 70L150 110', 'l');
  });

  A('mushrooms', 'Mushrooms', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['cave', 'cellar'], max: 3 }, (g) => {
    for (const [x, y, r, cls] of [[34, 36, 16, 's'], [64, 58, 20, 'o'], [36, 72, 11, 'o'], [72, 26, 9, 's']]) {
      g.circle(x, y, r, cls);
      g.circle(x - r * 0.3, y - r * 0.2, r * 0.18, 'k');
      g.circle(x + r * 0.3, y + r * 0.25, r * 0.15, 'k');
    }
  });

  A('campfire', 'Campfire', CF, [1, 1], { placement: 'centre', blocksMovement: false, roomTypes: ['cave', 'barracks'], max: 1 }, (g) => {
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      g.poly(stoneShape(50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36, 9, i, 6), 's');
    }
    g.add('<rect class="o" x="24" y="44" width="52" height="12" rx="5" transform="rotate(35 50 50)"/>');
    g.add('<rect class="o" x="24" y="44" width="52" height="12" rx="5" transform="rotate(-35 50 50)"/>');
    flame(g, 50, 50, 18);
  });

  G('dais', 'Dais', C, 'dais', { w: 3, h: 2 }, { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'temple'], max: 1 }, { w: [2, 5], h: [1, 3] });
  G('pew', 'Pew', CF, 'bench', { len: 3, back: true }, { placement: 'free', facing: 'focal', roomTypes: ['temple'], max: 8, weight: 3 }, { len: [2, 5] });

  A('urn', 'Urn', C, [1, 1], { placement: 'balcony', roomTypes: ['*'], max: 4 }, (g) => {
    g.ellipse(22, 50, 7, 12, 'o');
    g.ellipse(78, 50, 7, 12, 'o');
    g.circle(50, 50, 30, 's');
    g.circle(50, 50, 18, 'o');
    g.circle(50, 50, 10, 'k');
  });

  A('idol', 'Idol', C, [2, 2], { placement: 'wall', blocksVision: true, roomTypes: ['temple', 'throne-room'], max: 1 }, (g) => {
    g.star(100, 100, 92, 8, 92, 's', Math.PI / 8);
    g.rect(40, 40, 120, 120, 'o', 6);
    figure(g, 100, 96, 1.9, 's');
    g.circle(90, 92, 5, 'k');
    g.circle(110, 92, 5, 'k');
    g.star(100, 60, 12, 5, 5, 'ko');
  });

  A('tapestry', 'Tapestry', CF, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'great-hall', 'bedroom', 'temple'], max: 2 }, (g) => {
    g.rect(8, 0, 184, 20, 's', 1);
    for (let x = 30; x < 180; x += 36) g.poly([[x, 4], [x + 8, 10], [x, 16], [x - 8, 10]], 'ko');
    const f = [];
    for (let x = 14; x < 188; x += 8) f.push([x, 20, x, 28]);
    g.lines(f, 't');
  });

  A('candelabra', 'Candelabra', CF, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['temple', 'crypt', 'throne-room', 'library'], max: 2 }, (g) => {
    const arms = [];
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      pts.push([50 + Math.cos(a) * 28, 50 + Math.sin(a) * 28]);
      arms.push([50, 50, ...pts[i]]);
    }
    g.lines(arms, 'l');
    g.circle(50, 50, 12, 'ko');
    for (const [x, y] of pts) candle(g, x, y, 7);
  });

  A('lectern', 'Lectern', CF, [1, 1], { placement: 'centre', roomTypes: ['library', 'temple'], max: 1 }, (g) => {
    g.poly([[18, 26], [82, 26], [76, 70], [24, 70]], 's');
    g.rect(26, 30, 24, 34, 'o', 2);
    g.rect(50, 30, 24, 34, 'o', 2);
    g.line(50, 30, 50, 80, 'l');
  });
}
