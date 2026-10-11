// Fantasy assets (dungeons, keeps, temples...) and pieces shared with sci-fi. Backs face the top edge (wallSide n).
// House style: hand-inked old-school maps. Wood shows planks and grain, stone shows blocks and
// cracks, metal shows bands and rivets. Small details use the unoutlined classes (k, p, h, hm)
// so they stay crisp at map size.
// height: low (seats, beds), mid (tables; the default), tall (shelves, statues, pillars).

import { candle, flame, figure, stoneShape, grain, blocks, leafCluster } from '../motifs.js';

const C = ['fantasy'];
const CF = ['fantasy'];

// Bone: a shaft with knobbly ends.
function bone(g, x1, y1, x2, y2) {
  g.add(`<path d="M${x1} ${y1}L${x2} ${y2}" style="fill:none;stroke:var(--ink,#1b1b1b);stroke-width:9;stroke-linecap:round"/>`);
  g.add(`<path d="M${x1} ${y1}L${x2} ${y2}" style="fill:none;stroke:var(--paper,#fff);stroke-width:4;stroke-linecap:round"/>`);
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    g.circle(x - 3, y - 2, 5, 'o');
    g.circle(x + 3, y + 2, 5, 'o');
  }
}

/** Iron band across a box (chests, barrels): ink strip with rivets. */
function band(g, x, y, w, h) {
  g.rect(x, y, w, h, 'ko', 1);
  const vertical = h > w;
  for (let t = 6; t < (vertical ? h : w) - 3; t += 14) g.circle(vertical ? x + w / 2 : x + t, vertical ? y + t : y + h / 2, 1.8, 'p');
}

export default function define({ A, G }) {
  A('chest', 'Chest', CF, [1, 1], { placement: 'wall', roomTypes: ['storeroom', 'crypt', 'throne-room', 'barracks', 'bedroom', 'cellar', 'shop'], max: 2, tags: ['treasure'] }, (g) => {
    g.rect(10, 16, 80, 64, 'o', 6); // body
    g.rect(10, 16, 80, 26, 's', 6); // curved lid
    grain(g, 12, 44, 76, 34, 2, 'h', 3);
    g.line(14, 29, 86, 29, 't');
    band(g, 24, 16, 9, 64);
    band(g, 67, 16, 9, 64);
    g.rect(41, 52, 18, 18, 'ko', 2); // lock
    g.path('M50 57v8', 'pl');
    g.rect(2, 36, 10, 14, 'ko', 2); // handles
    g.rect(88, 36, 10, 14, 'ko', 2);
  });

  A('barrel', 'Barrel', CF, [1, 1], { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'kitchen', 'tavern', 'barracks', 'smithy', 'prison', 'farmyard', 'camp'], max: 4, weight: 2 }, (g) => {
    g.circle(50, 50, 40, 's'); // bulging staves
    g.circle(50, 50, 33, 'o'); // lid
    const chord = (x) => Math.sqrt(33 * 33 - (x - 50) ** 2);
    g.lines([30, 42, 58, 70].map((x) => [x, 50 - chord(x), x, 50 + chord(x)]), 't');
    g.circle(50, 50, 40, 'l'); // hoop
    g.circle(50, 50, 36, 't');
    g.circle(64, 36, 5, 'ko'); // bung
  });

  A('sacks', 'Sacks', CF, [1, 1], { placement: 'corner', height: 'low', roomTypes: ['storeroom', 'cellar', 'kitchen', 'shop', 'farmyard', 'camp'], max: 3 }, (g) => {
    // Two lumpy sacks, tied at the neck, one spilling grain.
    for (let i = 0; i < 9; i++) g.circle(62 + (i % 3) * 7 - 4, 84 + Math.floor(i / 3) * 4, 2.2, 'hm');
    g.path('M14 30Q12 14 32 16Q52 14 54 32Q60 62 44 76Q26 84 16 70Q8 54 14 30Z', 's');
    g.path('M24 22Q34 30 46 22', 't');
    g.path('M22 52Q32 58 44 48M20 66Q30 70 38 64', 't');
    g.path('M46 44Q48 28 70 30Q92 30 92 54Q94 80 70 86Q48 88 46 66Z', 'o');
    g.path('M62 40Q72 48 84 40M54 62Q66 70 82 62', 't');
    g.circle(31, 18, 6, 'ko'); // ties
    g.circle(71, 32, 6, 'ko');
  });

  G('crate', 'Crate', CF, 'cargo', { w: 1, h: 1, style: 'crate' }, { placement: 'corner', roomTypes: ['storeroom', 'cellar', 'shop', 'smithy', 'camp', 'farmyard'], max: 4, weight: 2 }, { w: [1, 2], h: [1, 2] });

  G('bed', 'Bed', CF, 'bed', { kind: 'single', style: 'wood' }, { placement: 'wall', height: 'low', roomTypes: ['barracks', 'bedroom', 'prison'], max: 6, weight: 2 });

  G('bunk-bed', 'Bunk bed', CF, 'bed', { kind: 'bunk', style: 'wood' }, { placement: 'wall', height: 'tall', roomTypes: ['barracks', 'bedroom'], max: 8, weight: 2 });

  G('bookshelf', 'Bookshelf', CF, 'shelf', { len: 2, kind: 'books' }, { placement: 'wall', height: 'tall', roomTypes: ['library', 'bedroom', 'throne-room', 'shop', 'temple'], max: 6, weight: 3 }, { len: [1, 4] });
  G('table-chairs', 'Table with chairs', CF, 'table', { w: 2, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['barracks', 'library', 'tavern', 'kitchen', 'great-hall', 'chamber'], max: 3, weight: 2 }, { w: [1, 4], h: [1, 2] });
  G('table', 'Table', CF, 'table', { w: 2, h: 1, chairs: false }, { placement: 'free', roomTypes: ['storeroom', 'kitchen', 'smithy', 'library', 'shop', 'chamber'], max: 2 }, { w: [1, 3], h: [1, 2] });
  G('rug', 'Rug', CF, 'rug', { w: 2, h: 3, pattern: 'border' }, { placement: 'centre', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'bedroom', 'library', 'great-hall', 'temple'], max: 1 }, { w: [2, 4], h: [2, 5] });

  A('pillar', 'Pillar', CF, [1, 1], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber'], max: 6, tags: ['column'] }, (g) => {
    g.rect(6, 6, 88, 88, 's', 3); // square plinth
    blocks(g, 6, 6, 88, 88, 22, 44);
    g.circle(50, 50, 36, 'o'); // round capital, seen from above
    g.circle(50, 50, 28, 'm'); // shaft in shadow beneath it
    // Fluting on the capital rim.
    const flutes = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      flutes.push([50 + Math.cos(a) * 29, 50 + Math.sin(a) * 29, 50 + Math.cos(a) * 35, 50 + Math.sin(a) * 35]);
    }
    g.lines(flutes, 't');
    g.circle(50, 50, 20, 'o');
    g.path('M38 42A14 14 0 0 1 50 34', 'l');
  });

  A('statue', 'Statue', CF, [1, 1], { placement: 'corner', height: 'tall', blocksVision: true, roomTypes: ['throne-room', 'temple', 'crypt', 'great-hall', 'chamber', 'library', 'shop', 'garden', 'graveyard'], max: 4 }, (g) => {
    g.rect(6, 6, 88, 88, 's', 3); // plinth
    g.rect(14, 14, 72, 72, 'l', 2);
    // A robed warrior from above: shoulders, cloak, head, a shield and a spear.
    g.path('M22 50Q20 30 50 28Q80 30 78 50Q80 80 50 84Q20 80 22 50Z', 'h'); // cloak
    figure(g, 50, 46, 0.95, 'o');
    g.circle(50, 46, 10, 'm'); // hair
    g.circle(28, 58, 13, 's'); // shield
    g.circle(28, 58, 4, 'k');
    g.line(74, 22, 74, 84, 'l'); // spear
    g.poly([[68, 24], [74, 10], [80, 24]], 'ko');
  });

  A('altar', 'Altar', CF, [2, 1], { placement: 'wall', roomTypes: ['temple', 'crypt'], min: 1, max: 1 }, (g) => {
    g.rect(6, 4, 188, 66, 's', 3); // stone block
    blocks(g, 6, 4, 188, 66, 22, 47);
    g.rect(70, 4, 60, 72, 'o', 2); // altar cloth hanging over the front
    g.path('M74 20H126M74 60H126', 't');
    g.poly([[92, 70], [100, 82], [108, 70]], 'ko');
    candle(g, 30, 36, 8);
    candle(g, 170, 36, 8);
    g.circle(100, 36, 13, 'o'); // offering bowl
    g.circle(100, 36, 7, 'm');
    g.rect(142, 20, 14, 30, 'ko', 2); // holy book
    g.path('M149 24v22', 'pl');
  });

  A('brazier', 'Brazier', CF, [1, 1], { light: { bright: 3, dim: 6, color: '#ff9b40', animation: 'torch' }, placement: 'free', roomTypes: ['temple', 'throne-room', 'crypt', 'great-hall', 'cave'], max: 4 }, (g) => {
    // Three iron legs splayed out under the bowl.
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
      g.line(50, 50, 50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44, 'l');
      g.circle(50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44, 5, 'ko');
    }
    g.circle(50, 50, 32, 'ko'); // iron bowl
    g.circle(50, 50, 26, 'hm'); // coals
    for (const [x, y] of [[38, 44], [58, 40], [62, 58], [42, 62]]) g.circle(x, y, 5, 'm');
    flame(g, 50, 50, 20);
  });

  A('torch', 'Wall torch', CF, [1, 1], { light: { bright: 4, dim: 8, color: '#ff9b40', animation: 'torch' }, placement: 'door', layer: 'overhead', blocksMovement: false, roomTypes: ['*'], max: 2, tags: ['light'] }, (g) => {
    g.circle(50, 34, 20, 'h'); // glow
    g.rect(40, 0, 20, 10, 'ko', 2); // sconce
    g.rect(46, 8, 8, 20, 's', 2); // shaft
    flame(g, 50, 34, 13);
  });

  A('rubble', 'Rubble', CF.concat('scifi'), [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['cave', 'crypt', 'corridor', 'prison', 'cellar', 'mine', 'alien-ruins', 'graveyard', 'crash-site', 'wasteland', 'ruin'], max: 3, tags: ['difficult terrain'] }, (g) => {
    g.poly(stoneShape(32, 32, 18, 3), 's');
    g.poly(stoneShape(66, 60, 21, 7), 'o');
    g.poly(stoneShape(30, 72, 13, 11), 's');
    g.poly(stoneShape(70, 24, 9, 5, 6), 'o');
    g.lines([[60, 52, 72, 66], [24, 28, 36, 36]], 't'); // cracked faces
    for (const [x, y, r] of [[52, 34, 3.5], [46, 52, 4], [84, 40, 3], [50, 84, 3.5], [16, 50, 2.5], [86, 82, 2.5]]) g.circle(x, y, r, 'k');
  });

  A('bones', 'Bones', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['crypt', 'prison', 'cave', 'corridor', 'graveyard', 'ruin'], max: 3 }, (g) => {
    bone(g, 52, 62, 84, 82);
    bone(g, 58, 88, 86, 60);
    // Skull: cranium, eye sockets, nose, teeth.
    g.circle(36, 38, 18, 'o');
    g.rect(28, 50, 16, 10, 'o', 3);
    g.circle(30, 37, 5, 'k');
    g.circle(43, 37, 5, 'k');
    g.poly([[36, 43], [39, 48], [33, 48]], 'k');
    g.lines([[31, 51, 31, 59], [36, 51, 36, 59], [41, 51, 41, 59]], 't');
    g.path('M20 74q6 -4 12 0q-6 4 -12 0Z', 'o'); // rib fragment
  });

  A('cobweb', 'Cobweb', CF, [1, 1], { placement: 'corner', layer: 'overhead', blocksMovement: false, clutter: true, roomTypes: ['crypt', 'cellar', 'storeroom', 'cave', 'prison', 'library', 'corridor', 'ruin'], max: 2 }, (g) => {
    const angles = [0, 0.3, 0.62, 0.95, 1.25, Math.PI / 2];
    g.lines(angles.map((a) => [0, 0, Math.cos(a) * 82, Math.sin(a) * 82]), 't');
    for (const r of [18, 34, 50, 66, 80]) {
      const pts = angles.map((a) => [Math.cos(a) * r, Math.sin(a) * r]);
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const m = [((pts[i - 1][0] + pts[i][0]) / 2) * 0.88, ((pts[i - 1][1] + pts[i][1]) / 2) * 0.88];
        d += `Q${m[0].toFixed(1)} ${m[1].toFixed(1)} ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
      }
      g.path(d, 't');
    }
    g.circle(44, 40, 3, 'hm'); // a trapped leaf
  });

  A('fountain', 'Fountain', CF, [2, 2], { placement: 'centre', roomTypes: ['great-hall', 'temple', 'throne-room'], max: 1 }, (g) => {
    g.star(100, 100, 94, 8, 94, 's', Math.PI / 8); // octagonal basin wall
    const joints = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      joints.push([100 + Math.cos(a) * 80, 100 + Math.sin(a) * 80, 100 + Math.cos(a) * 94, 100 + Math.sin(a) * 94]);
    }
    g.lines(joints, 'l');
    g.star(100, 100, 80, 8, 80, 'm', Math.PI / 8); // water
    // Ripples spreading from the spout.
    g.circle(100, 100, 62, 'pl');
    g.add('<circle class="pl" cx="100" cy="100" r="46" style="stroke-dasharray:10 8"/>');
    g.circle(100, 100, 28, 's'); // central bowl
    g.circle(100, 100, 18, 'm');
    g.circle(100, 100, 8, 'o'); // spout
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      g.circle(100 + Math.cos(a) * 36, 100 + Math.sin(a) * 36, 2.5, 'p'); // splashes
    }
  });

  A('weapon-rack', 'Weapon rack', CF, [2, 1], { placement: 'wall', height: 'tall', roomTypes: ['barracks', 'smithy', 'great-hall'], max: 2 }, (g) => {
    g.rect(6, 4, 188, 14, 's', 3); // wooden rail
    grain(g, 8, 5, 184, 12, 1, 'h', 9);
    g.rect(6, 4, 188, 14, 'l', 3);
    for (const x of [30, 64]) {
      // Swords hilt-down: blade, guard, grip, pommel.
      g.path(`M${x - 5} 18H${x + 5}V60L${x} 66L${x - 5} 60Z`, 'o');
      g.line(x, 22, x, 58, 't');
      g.rect(x - 14, 60, 28, 6, 'ko', 2);
      g.rect(x - 3, 66, 6, 14, 'm', 1);
      g.circle(x, 84, 4.5, 'ko');
    }
    // Spear, head down, and an axe.
    g.line(108, 18, 108, 80, 'l');
    g.poly([[108, 96], [100, 78], [116, 78]], 'ko');
    g.line(146, 18, 146, 86, 'l');
    g.path('M146 52Q176 44 182 66Q178 82 146 74Z', 'o');
    g.path('M150 60Q168 56 174 66', 't');
    g.circle(178, 40, 12, 's'); // a round shield hung on the rail
    g.circle(178, 40, 4, 'k');
  });

  A('desk', 'Desk', CF, [2, 1], { placement: 'wall', roomTypes: ['library', 'bedroom', 'shop', 'chamber'], max: 2 }, (g) => {
    g.rect(8, 4, 184, 56, 'o', 4);
    grain(g, 8, 4, 184, 56, 3, 'h', 5);
    // An open book, a quill in its ink pot, a candle and a scroll.
    g.path('M40 14H66V48H40ZM66 14H92V48H66Z', 'o');
    g.lines([[44, 22, 62, 22], [44, 28, 62, 28], [44, 34, 58, 34], [70, 22, 88, 22], [70, 28, 86, 28]], 't');
    g.line(66, 14, 66, 48, 'l');
    g.circle(118, 34, 6, 'ko');
    g.path('M118 34L134 12', 'l');
    candle(g, 164, 28, 7);
    g.rect(140, 40, 16, 10, 'o', 4);
    g.rect(82, 66, 36, 30, 'o', 7); // chair
    g.rect(82, 88, 36, 8, 'ko', 3);
  });

  A('throne', 'Throne', CF, [1, 1], { placement: 'wall', roomTypes: ['throne-room', 'great-hall'], min: 1, max: 1 }, (g) => {
    g.poly([[10, 2], [22, 14], [36, 2], [50, 14], [64, 2], [78, 14], [90, 2], [90, 32], [10, 32]], 'ko'); // carved back
    g.circle(50, 18, 5, 'p'); // jewel
    g.rect(10, 30, 16, 60, 's', 5); // arms
    g.rect(74, 30, 16, 60, 's', 5);
    g.circle(18, 84, 5, 'ko');
    g.circle(82, 84, 5, 'ko');
    g.rect(26, 30, 48, 60, 'o', 6); // seat
    g.rect(32, 36, 36, 44, 's', 9); // cushion
    g.path('M38 58H62', 't');
    g.circle(50, 58, 2.5, 'k');
  });

  A('sarcophagus', 'Sarcophagus', C, [1, 2], { placement: 'centre', roomTypes: ['crypt'], max: 4, weight: 2 }, (g) => {
    g.poly([[30, 4], [70, 4], [92, 40], [82, 196], [18, 196], [8, 40]], 's');
    g.poly([[34, 14], [66, 14], [80, 42], [72, 186], [28, 186], [20, 42]], 'o');
    // The carved figure on the lid: head, crossed arms, sword.
    g.circle(50, 42, 13, 's');
    g.path('M38 34Q50 26 62 34', 't');
    g.ellipse(50, 110, 20, 56, 's');
    g.line(50, 66, 50, 172, 'l');
    g.rect(40, 80, 20, 7, 'ko', 2);
    g.path('M34 98L66 116M66 98L34 116', 't');
    g.lines([[22, 160, 30, 170], [76, 150, 70, 162]], 't'); // cracks
  });

  A('manacles', 'Manacles', C, [1, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['prison'], max: 4 }, (g) => {
    g.rect(18, 0, 64, 10, 'ko', 2);
    for (const x of [32, 68]) {
      g.circle(x, 6, 3, 'p');
      for (let y = 16; y < 38; y += 7) g.ellipse(x, y, 3, 4.5, 't'); // chain links
      g.circle(x, 46, 10, 'l'); // cuff
      g.circle(x, 46, 6, 't');
    }
  });

  A('cage', 'Cage', C, [1, 1], { placement: 'corner', height: 'tall', roomTypes: ['prison'], max: 2 }, (g) => {
    g.rect(8, 8, 84, 84, 'h', 4); // straw on the floor inside
    for (let i = 0; i < 10; i++) g.line(16 + ((i * 29) % 64), 20 + ((i * 41) % 60), 26 + ((i * 29) % 64), 16 + ((i * 41) % 60), 't');
    g.lines([24, 40, 56, 72].map((x) => [x, 8, x, 92]), 'l');
    g.lines([[8, 36, 92, 36], [8, 64, 92, 64]], 't');
    g.rect(8, 8, 84, 84, 'l', 4);
    for (const [x, y] of [[8, 8], [92, 8], [8, 92], [92, 92]]) g.circle(x, y, 4, 'ko');
    g.rect(86, 42, 12, 16, 'ko', 2); // lock
    g.circle(92, 50, 2, 'p');
  });

  A('straw', 'Straw pile', CF, [1, 1], { placement: 'corner', layer: 'floor', blocksMovement: false, roomTypes: ['prison', 'barracks', 'storeroom', 'cellar'], max: 2 }, (g) => {
    g.path('M14 48Q12 18 46 16Q84 14 88 46Q90 80 52 86Q16 86 14 48Z', 'h');
    const s = [];
    for (let i = 0; i < 34; i++) {
      const x = 16 + ((i * 37) % 66);
      const y = 22 + ((i * 53) % 58);
      const a = ((i * 71) % 180) * (Math.PI / 180);
      s.push([x, y, x + Math.cos(a) * 16, y + Math.sin(a) * 16]);
    }
    g.lines(s, 't');
  });

  A('pit', 'Pit trap', C, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'chamber', 'prison'], max: 1, weight: 0.5, tags: ['trap'], gmOnly: true }, (g) => {
    // Stone-lined shaft dropping into darkness, with spikes at the bottom.
    g.rect(6, 6, 88, 88, 's');
    g.poly([[6, 6], [94, 6], [74, 26], [26, 26]], 'o'); // lit far wall
    g.poly([[6, 6], [26, 26], [26, 74], [6, 94]], 'h');
    blocks(g, 26, 8, 48, 16, 8, 16);
    g.rect(26, 26, 48, 48, 'k');
    for (const [x, y] of [[36, 40], [50, 36], [62, 44], [42, 56], [58, 60]]) g.poly([[x, y - 5], [x + 3, y + 3], [x - 3, y + 3]], 'p');
    g.lines([[6, 6, 26, 26], [94, 6, 74, 26], [6, 94, 26, 74], [94, 94, 74, 74]], 'l');
  });

  A('pressure-plate', 'Pressure plate trap', CF.concat('scifi'), [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['corridor', 'crypt', 'temple', 'throne-room', 'storeroom', 'cave', 'alien-ruins', 'armoury', 'security', 'cellar'], max: 1, weight: 0.4, tags: ['trap'], gmOnly: true }, (g) => {
    g.rect(14, 14, 72, 72, 'h', 3); // gap round the plate
    g.rect(22, 22, 56, 56, 'o', 3); // the plate, slightly raised
    g.lines([[22, 22, 14, 14], [78, 22, 86, 14], [22, 78, 14, 86], [78, 78, 86, 86]], 't');
    g.path('M50 32L64 58H36Z', 'ko'); // warning mark for the GM
    g.circle(50, 66, 3.5, 'k');
    g.lines([[50, 40, 50, 50]], 'pl');
  });

  A('stalagmite', 'Stalagmite', CF.concat('scifi'), [1, 1], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['cave', 'mine', 'alien-ruins'], max: 6, weight: 2 }, (g) => {
    // Rings of dripstone rising to a point: each ring lighter, so it reads as a cone.
    g.poly(stoneShape(50, 52, 42, 5, 10), 's');
    g.poly(stoneShape(48, 48, 29, 9, 8), 'o');
    g.poly(stoneShape(46, 44, 16, 2, 7), 'p');
    g.poly(stoneShape(46, 44, 16, 2, 7), 'l');
    g.circle(44, 42, 4, 'k');
    g.path('M70 70L78 80M24 64L16 70', 't');
  });

  A('boulder', 'Boulder', CF.concat('scifi'), [2, 2], { placement: 'free', height: 'tall', blocksVision: true, roomTypes: ['cave', 'mine', 'alien-ruins', 'landing-pad', 'forest', 'clearing', 'wasteland', 'crash-site'], max: 2 }, (g) => {
    g.poly([[60, 12], [142, 8], [188, 60], [178, 150], [112, 190], [34, 172], [10, 96]], 's');
    g.poly([[66, 26], [134, 22], [166, 62], [148, 118], [94, 130], [44, 96]], 'o'); // lit top face
    g.path('M66 26L94 70L148 118M94 70L134 22M94 70L44 96', 'l'); // facet edges
    g.path('M60 140L80 160M150 140L164 120M30 110L24 130', 't'); // cracks on the dark side
    g.path('M70 56Q82 50 90 58', 't');
  });

  A('mushrooms', 'Mushrooms', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['cave', 'cellar'], max: 3, tags: ['difficult terrain'] }, (g) => {
    // Caps from above: domed, spotted, with gills showing on the one that has tipped over.
    for (const [x, y, r, cls] of [[34, 36, 17, 's'], [64, 60, 21, 'o'], [72, 26, 10, 's']]) {
      g.circle(x, y, r, cls);
      g.circle(x - r * 0.35, y - r * 0.25, r * 0.2, 'p');
      g.circle(x + r * 0.3, y + r * 0.25, r * 0.16, 'hm');
      g.circle(x + r * 0.15, y - r * 0.4, r * 0.12, 'hm');
    }
    g.add('<g transform="rotate(-30 30 74)">');
    g.ellipse(30, 74, 14, 10, 'o');
    g.lines([[18, 74, 42, 74], [20, 69, 40, 79], [20, 79, 40, 69], [30, 64, 30, 84]], 't');
    g.rect(40, 70, 14, 8, 'o', 3);
    g.add('</g>');
  });

  A('campfire', 'Campfire', CF, [1, 1], { light: { bright: 4, dim: 8, color: '#ff9b40', animation: 'torch' }, placement: 'centre', blocksMovement: false, roomTypes: ['cave', 'barracks', 'camp', 'clearing', 'wasteland', 'crash-site'], max: 1 }, (g) => {
    g.circle(50, 50, 30, 'h'); // ash
    [[50, 12, 10, 1], [78, 24, 9, 2], [88, 52, 11, 3], [74, 82, 10, 4], [44, 88, 11, 5], [16, 72, 10, 6], [12, 40, 9, 7], [26, 18, 8, 8]].forEach(([x, y, r, k]) => g.poly(stoneShape(x, y, r, k, 7), k % 2 ? 's' : 'o'));
    // Two crossed logs with their cut ends showing.
    for (const deg of [35, -35]) {
      g.add(`<g transform="rotate(${deg} 50 50)">`);
      g.rect(20, 44, 60, 12, 's', 5);
      g.circle(22, 50, 5, 'o');
      g.circle(78, 50, 5, 'o');
      g.add('</g>');
    }
    flame(g, 50, 50, 24);
  });

  G('dais', 'Dais', C, 'dais', { w: 3, h: 2 }, { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'temple'], max: 1 }, { w: [2, 5], h: [1, 3] });
  G('pew', 'Pew', CF, 'bench', { len: 3, back: true }, { placement: 'free', height: 'low', facing: 'focal', roomTypes: ['temple'], max: 8, weight: 3 }, { len: [2, 5] });

  A('urn', 'Urn', C, [1, 1], { placement: 'balcony', roomTypes: ['*', 'graveyard'], max: 4 }, (g) => {
    g.ellipse(18, 50, 7, 12, 'o'); // handles
    g.ellipse(82, 50, 7, 12, 'o');
    g.circle(50, 50, 32, 's'); // body
    g.path('M26 40A26 26 0 0 1 44 24', 'pl');
    g.circle(50, 50, 18, 'o'); // rim
    g.circle(50, 50, 11, 'k'); // mouth
  });

  A('idol', 'Idol', C, [2, 2], { placement: 'wall', height: 'tall', blocksVision: true, roomTypes: ['temple', 'throne-room'], max: 1 }, (g) => {
    g.rect(8, 8, 184, 184, 's', 4); // stepped plinth
    g.rect(24, 24, 152, 152, 'o', 3);
    blocks(g, 8, 8, 184, 16, 16, 46);
    // A seated many-armed god, from above: lap, arms fanned out, crowned head.
    for (const [a, l] of [[-150, 66], [-120, 70], [-60, 70], [-30, 66]]) {
      const r = (a * Math.PI) / 180;
      g.add(`<path d="M100 96L${(100 + Math.cos(r) * l).toFixed(1)} ${(96 - Math.sin(r) * -l).toFixed(1)}" style="fill:none;stroke:var(--ink,#1b1b1b);stroke-width:14;stroke-linecap:round"/>`);
      g.add(`<path d="M100 96L${(100 + Math.cos(r) * l).toFixed(1)} ${(96 - Math.sin(r) * -l).toFixed(1)}" style="fill:none;stroke:var(--shade,#c6c6c6);stroke-width:7;stroke-linecap:round"/>`);
    }
    g.ellipse(100, 128, 46, 30, 's'); // crossed legs
    g.path('M64 128Q100 112 136 128', 't');
    g.ellipse(100, 98, 36, 22, 's'); // shoulders
    g.circle(100, 86, 20, 'o'); // head
    g.star(100, 80, 18, 5, 10, 'ko'); // crown
    g.circle(100, 80, 4, 'p');
    g.circle(100, 140, 8, 'ko'); // offering bowl
  });

  A('tapestry', 'Tapestry', CF, [2, 1], { placement: 'wall', layer: 'floor', blocksMovement: false, roomTypes: ['throne-room', 'great-hall', 'bedroom', 'temple'], max: 2 }, (g) => {
    g.rect(4, 0, 192, 8, 'ko', 2); // hanging rod
    g.rect(10, 6, 180, 22, 's', 1);
    for (let x = 34; x < 180; x += 36) g.poly([[x, 10], [x + 8, 17], [x, 24], [x - 8, 17]], 'ko');
    g.path('M10 14H190', 't');
    const f = [];
    for (let x = 14; x < 188; x += 7) f.push([x, 28, x, 36]);
    g.lines(f, 't');
  });

  A('candelabra', 'Candelabra', CF, [1, 1], { light: { bright: 1, dim: 3, color: '#ffc870', animation: 'torch' }, placement: 'corner', height: 'tall', blocksMovement: false, roomTypes: ['temple', 'crypt', 'throne-room', 'library'], max: 2 }, (g) => {
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      pts.push([50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30]);
    }
    // Curved iron arms out to each candle.
    for (const [x, y] of pts) g.path(`M50 50Q${((50 + x) / 2 + (y - 50) * 0.3).toFixed(1)} ${((50 + y) / 2 - (x - 50) * 0.3).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`, 'l');
    g.circle(50, 50, 10, 'ko');
    g.circle(50, 50, 3, 'p');
    for (const [x, y] of pts) candle(g, x, y, 6.5);
    g.path('M30 80q-4 6 0 10M70 80q4 6 0 10', 't'); // wax drips
  });

  A('lectern', 'Lectern', CF, [1, 1], { placement: 'centre', roomTypes: ['library', 'temple'], max: 1 }, (g) => {
    g.circle(50, 76, 14, 'm'); // foot
    g.rect(44, 50, 12, 28, 's', 3); // post
    g.poly([[14, 22], [86, 22], [80, 62], [20, 62]], 's'); // sloped top
    grain(g, 18, 24, 64, 36, 2, 'h', 4);
    // The open book on it, with a ribbon.
    g.path('M22 28Q36 24 50 30Q64 24 78 28V58Q64 54 50 60Q36 54 22 58Z', 'o');
    g.line(50, 30, 50, 60, 'l');
    g.lines([[28, 36, 44, 38], [28, 44, 44, 46], [56, 38, 72, 36], [56, 46, 70, 44]], 't');
    g.path('M50 60V74', 'l');
  });
}
