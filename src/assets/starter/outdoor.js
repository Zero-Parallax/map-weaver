// Outdoor assets: trees, rocks, camps, graveyards, farmyards, alien jungles, crash sites.
// Bridges and stepping stones are for placing by hand (and the generator), not decorating.

import { stoneShape, grain, canopyPath, tufts, leaf, leafCluster } from '../motifs.js';

const ALL = ['fantasy', 'scifi'];
const CF = ['fantasy'];
const S = ['scifi'];
const MANUAL = ['by-hand']; // no room type: the decorator never picks these

export default function define({ A, G }) {
  // ---- fantasy ----------------------------------------------------------------

  A('oak', 'Oak tree', CF, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['forest', 'clearing', 'camp', 'graveyard', 'farmyard', 'garden'], max: 3, weight: 4, cover: 'three-quarters' }, (g) => {
    // Broad scalloped crown, lit from the top left, with leaf texture and a few branches showing.
    g.path(canopyPath(100, 100, 80, 12, 7, 0.26), 's');
    g.path(canopyPath(90, 88, 54, 9, 3, 0.3), 'o');
    tufts(g, 100, 100, 74, 26, 4, 9);
    g.path('M100 100L70 62M100 100L140 80M100 100L96 146M100 100L60 120', 't');
    g.circle(100, 100, 7, 'hm');
  });

  A('pine', 'Pine tree', CF, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['forest', 'camp'], max: 3, weight: 3, cover: 'three-quarters' }, (g) => {
    // A ragged, many-pointed crown (boughs seen from above), lit on one side, branches radiating from the trunk.
    const jag = (cx, cy, r, n, seed) => {
      let s0 = seed * 7919 + 17;
      const rnd = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2 + (rnd() - 0.5) * 0.12;
        const rr = i % 2 ? r * (0.72 + rnd() * 0.08) : r * (0.92 + rnd() * 0.12);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      return pts;
    };
    g.poly(jag(100, 100, 90, 22, 3), 's');
    g.poly(jag(90, 90, 58, 16, 8), 'o');
    const branches = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      branches.push([100, 100, 100 + Math.cos(a) * 70, 100 + Math.sin(a) * 70]);
      branches.push([100 + Math.cos(a) * 40, 100 + Math.sin(a) * 40, 100 + Math.cos(a + 0.25) * 60, 100 + Math.sin(a + 0.25) * 60]);
    }
    g.lines(branches, 't');
    g.circle(100, 100, 7, 'ko');
  });

  A('bush', 'Bush', CF, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['forest', 'clearing', 'garden', 'graveyard', 'camp', 'farmyard'], max: 4, weight: 3, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    g.path(canopyPath(50, 50, 36, 8, 11, 0.32), 's');
    g.path(canopyPath(45, 45, 22, 6, 4, 0.34), 'o');
    tufts(g, 50, 50, 32, 10, 8, 7);
    for (const [x, y] of [[66, 40], [36, 64], [60, 66]]) g.circle(x, y, 3, 'k'); // berries
  });

  A('stump', 'Tree stump', CF, [1, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp'], max: 2 }, (g) => {
    g.path('M50 20L46 6M78 58L94 66M24 66L8 76M70 28L84 16', 'l'); // roots
    g.path(canopyPath(50, 50, 30, 9, 2, 0.1, 0.05), 's'); // bark
    g.circle(50, 50, 24, 'o'); // cut face
    g.circle(50, 50, 17, 't'); // growth rings
    g.circle(50, 50, 10, 't');
    g.circle(52, 50, 3, 'k');
    g.path('M50 50L68 40', 't'); // crack
    g.path('M30 36l6 4l-4 4', 't'); // axe mark
  });

  A('fallen-log', 'Fallen log', CF, [3, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp'], max: 2 }, (g) => {
    g.lines([[90, 26, 78, 6], [92, 26, 104, 10], [210, 74, 224, 92]], 'l'); // snapped branches
    g.rect(14, 26, 270, 48, 's', 22);
    // Bark furrows along the log.
    g.path('M36 38Q90 32 140 38T246 36M44 50Q110 56 170 50T260 52M30 62Q80 66 130 62T230 64', 't');
    g.ellipse(272, 50, 14, 24, 'o'); // sawn end
    g.ellipse(272, 50, 8, 14, 't');
    g.circle(272, 50, 2.5, 'k');
    g.path('M60 40Q66 34 72 40Q66 46 60 40Z', 'hm'); // moss
    g.path('M180 56Q188 50 198 56Q188 62 180 56Z', 'hm');
  });

  A('tent', 'Tent', CF, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['camp'], max: 3, weight: 2, blocksVision: true }, (g) => {
    // Guy ropes to pegs, then the canvas: shaded side, lit side, ridge pole, open flap.
    for (const [x, y, px, py] of [[20, 34, 6, 14], [180, 34, 194, 14], [12, 166, 4, 190], [188, 166, 196, 190]]) {
      g.line(x, y, px, py, 't');
      g.circle(px, py, 4, 'ko');
    }
    g.poly([[24, 30], [100, 24], [100, 176], [14, 170]], 's');
    g.poly([[100, 24], [176, 30], [186, 170], [100, 176]], 'o');
    g.lines([[40, 60, 100, 56], [32, 110, 100, 106], [100, 56, 168, 60], [100, 106, 178, 110]], 't'); // canvas seams
    g.line(100, 18, 100, 182, 'l');
    g.poly([[78, 176], [100, 136], [122, 176]], 'k'); // doorway
    g.poly([[100, 136], [122, 176], [140, 186]], 'o'); // flap tied back
  });

  A('bedroll', 'Bedroll', CF, [1, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['camp'], max: 3 }, (g) => {
    g.rect(18, 12, 64, 176, 's', 16);
    g.rect(24, 18, 52, 36, 'o', 12); // rolled pillow
    g.path('M30 36H70', 't');
    g.rect(18, 70, 64, 118, 'o', 14); // blanket thrown back
    g.path('M18 70Q50 90 82 70', 'l');
    g.lines([[26, 120, 74, 116], [26, 156, 74, 152]], 't');
    g.rect(18, 166, 64, 8, 'ko', 2); // strap
  });

  A('wagon', 'Wagon', CF, [2, 3], { placement: 'free', roomTypes: ['camp', 'farmyard'], max: 1, cover: 'three-quarters' }, (g) => {
    for (const [x, y] of [[8, 54], [192, 54], [8, 226], [192, 226]]) {
      g.rect(x - 8, y - 28, 16, 56, 'ko', 5); // wheels, edge-on
      g.line(x, y - 22, x, y + 22, 'pl');
    }
    g.rect(22, 20, 156, 246, 'o', 6); // bed
    grain(g, 22, 20, 156, 246, 6, 'v', 12);
    g.rect(22, 20, 156, 246, 'l', 6);
    // Cargo: a crate, sacks and a barrel.
    g.rect(40, 40, 52, 52, 's', 3);
    g.path('M44 44L88 88', 't');
    g.circle(132, 66, 24, 's');
    g.circle(132, 66, 18, 't');
    g.path('M44 130Q70 116 92 132Q96 160 70 164Q44 160 44 130Z', 's');
    g.lines([[100, 266, 100, 298], [70, 298, 130, 298]], 'l'); // shaft and yoke
  });

  A('gravestone', 'Gravestone', CF, [1, 1], { placement: 'free', roomTypes: ['graveyard'], max: 8, weight: 8 }, (g) => {
    g.rect(22, 54, 56, 40, 'h', 8); // grave mound
    g.path('M30 62q8 -4 16 0t16 0t14 0', 't');
    g.path('M28 58V28A22 22 0 0 1 72 28V58Z', 'o'); // headstone
    g.path('M28 58V28A22 22 0 0 1 36 12', 's');
    g.lines([[50, 22, 50, 48], [40, 32, 60, 32]], 'l'); // carved cross
    g.path('M64 40l4 6l-3 4', 't'); // crack
  });

  A('haystack', 'Haystack', CF, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['farmyard'], max: 2, blocksVision: true }, (g) => {
    // A lumpy mound of loose hay: shaded body, a lit crown, straws lying every which way, a few strays on the ground.
    const strays = [[12, 30, 26, 20], [180, 160, 194, 172], [30, 182, 44, 192], [170, 22, 186, 30], [8, 120, 20, 112]];
    g.lines(strays, 't');
    g.path(canopyPath(100, 100, 82, 9, 5, 0.22, 0.1), 's');
    g.path(canopyPath(88, 86, 50, 7, 9, 0.24, 0.1), 'o');
    const straw = [];
    for (let i = 0; i < 70; i++) {
      const a = ((i * 137.5) % 360) * (Math.PI / 180);
      const rr = 76 * Math.sqrt(((i * 53) % 97) / 97);
      const x = 100 + Math.cos(a) * rr;
      const y = 100 + Math.sin(a) * rr;
      const o = ((i * 71) % 180) * (Math.PI / 180);
      straw.push([x, y, x + Math.cos(o) * 15, y + Math.sin(o) * 15]);
    }
    g.lines(straw, 't');
    g.add('<g transform="rotate(-20 136 140)">');
    g.rect(118, 132, 40, 6, 'k', 2); // pitchfork left in the hay
    g.path('M158 130h12M158 135h12M158 140h12', 'l');
    g.add('</g>');
  });

  A('hedge', 'Hedge', CF, [2, 1], { placement: 'free', height: 'tall', roomTypes: ['garden', 'graveyard'], max: 4, blocksVision: true }, (g) => {
    let d = 'M10 50';
    for (let x = 10; x < 190; x += 20) d += `Q${x + 10} 6 ${x + 20} 22`;
    d += 'L190 50';
    for (let x = 190; x > 10; x -= 20) d += `Q${x - 10} 94 ${x - 20} 78`;
    g.path(d + 'Z', 's');
    g.rect(16, 30, 168, 40, 'o', 18); // clipped top, catching the light
    tufts(g, 100, 50, 80, 20, 6, 8);
    g.lines([[30, 50, 170, 50]], 't');
  });

  G('wood-fence', 'Wooden fence', CF, 'fence', { len: 3, style: 'wood' }, { placement: 'free', roomTypes: ['farmyard', 'garden', 'camp'], max: 3, cover: 'half' }, { len: [2, 5] });
  G('iron-fence', 'Iron railings', CF, 'fence', { len: 3, style: 'iron' }, { placement: 'free', roomTypes: ['graveyard', 'garden'], max: 3, cover: 'half' }, { len: [2, 5] });

  A('flowers', 'Flowers', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['garden', 'clearing', 'graveyard', 'farmyard'] }, (g) => {
    // Clumps of leaves with a few blooms on top.
    [[30, 36], [64, 28], [50, 62], [24, 72], [76, 68]].forEach(([x, y], i) => {
      leafCluster(g, x, y, 12, 3, i + 40, ['s']);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        g.circle(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 3.6, 'p');
      }
      g.circle(x, y, 2.6, 'k');
    });
  });

  A('tall-grass', 'Tall grass', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['forest', 'clearing', 'camp', 'farmyard', 'graveyard', 'ruin'], weight: 2 }, (g) => {
    let d = '';
    for (const [x, y, k] of [[26, 72, 1], [52, 80, 0.9], [74, 66, 1], [40, 46, 0.8], [66, 40, 0.85]]) {
      d += `M${x} ${y}q${-12 * k} ${-12 * k} ${-12 * k} ${-30 * k}M${x} ${y}q${2 * k} ${-18 * k} ${2 * k} ${-36 * k}M${x} ${y}q${12 * k} ${-10 * k} ${14 * k} ${-28 * k}M${x} ${y}q${-4 * k} ${-14 * k} ${-6 * k} ${-22 * k}`;
    }
    g.path(d, 'l');
  });

  A('fallen-leaves', 'Fallen leaves', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['forest', 'graveyard', 'garden', 'ruin'] }, (g) => {
    for (const [x, y, a, c] of [[24, 30, 20, 's'], [62, 38, 150, 'o'], [36, 70, 250, 's'], [74, 74, 330, 'o'], [50, 52, 80, 's']]) leaf(g, x, y, a, 20, 13, c, 0.2, 2);
  });

  // ---- any setting ----------------------------------------------------------------------

  A('rock', 'Rock', ALL, [1, 1], { placement: 'free', roomTypes: ['forest', 'clearing', 'camp', 'graveyard', 'wasteland', 'crash-site', 'jungle'], max: 3, weight: 2 }, (g) => {
    g.poly(stoneShape(50, 54, 40, 4, 9), 's');
    g.poly(stoneShape(44, 46, 24, 8, 7), 'o'); // lit top
    g.path('M44 46L60 66M44 46L24 58M44 46L50 26', 't'); // facets
    g.path('M70 62Q74 70 68 78', 't');
    g.path('M30 70Q36 66 40 72Q34 76 30 70Z', 'hm'); // lichen
  });

  A('stepping-stones', 'Stepping stones', ALL, [2, 1], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL }, (g) => {
    for (const [x, y, r, s] of [[30, 54, 21, 1], [92, 42, 19, 2], [152, 58, 21, 3]]) {
      g.poly(stoneShape(x, y + 3, r, s), 'h'); // wet shadow
      g.poly(stoneShape(x, y, r, s), 'o');
      g.path(`M${x - r * 0.4} ${y - r * 0.1}Q${x} ${y - r * 0.4} ${x + r * 0.4} ${y - r * 0.1}`, 't');
    }
  });

  G('wooden-bridge', 'Wooden bridge', CF, 'bridge', { len: 4, width: 2, style: 'wood' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 3] });
  G('stone-bridge', 'Stone bridge', CF, 'bridge', { len: 4, width: 2, style: 'stone' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 4] });

  // ---- sci-fi ---------------------------------------------------------------------------

  A('alien-tree', 'Alien tree', S, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['jungle', 'colony-yard', 'crash-site'], max: 3, weight: 4, cover: 'three-quarters' }, (g) => {
    // Hanging tendrils with seed bulbs, under a scalloped canopy with glowing pods.
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9 + 0.2;
      const x0 = 100 + Math.cos(a) * 70;
      const y0 = 100 + Math.sin(a) * 70;
      const x1 = 100 + Math.cos(a + 0.12) * 94;
      const y1 = 100 + Math.sin(a + 0.12) * 94;
      g.path(`M${x0.toFixed(1)} ${y0.toFixed(1)}Q${((x0 + x1) / 2 + 6).toFixed(1)} ${((y0 + y1) / 2 - 6).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, 'l');
      g.circle(x1, y1, 4, 'o');
    }
    g.path(canopyPath(100, 100, 74, 11, 2), 's');
    g.path(canopyPath(92, 92, 50, 8, 5, 0.3), 'o');
    tufts(g, 100, 100, 70, 22, 9, 9);
    for (const [x, y, r] of [[118, 118, 8], [132, 96, 6], [80, 126, 6.5], [110, 70, 5.5], [72, 88, 5]]) {
      g.circle(x, y, r, 'm');
      g.circle(x - r * 0.25, y - r * 0.25, r * 0.4, 'p');
    }
  });

  A('spore-pods', 'Spore pods', S, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['jungle', 'wasteland', 'alien-ruins'], max: 4, weight: 2, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    leafCluster(g, 50, 52, 40, 6, 11, ['m', 's']); // root rosette
    for (const [x, y, r] of [[38, 42, 17], [64, 38, 13], [58, 64, 18], [30, 66, 11]]) {
      g.circle(x, y, r, 's');
      for (const [dx, dy, k] of [[0.35, 0.2, 0.18], [-0.2, 0.45, 0.14], [0.4, -0.35, 0.12]]) g.circle(x + dx * r, y + dy * r, r * k, 'hm');
      g.circle(x - r * 0.35, y - r * 0.35, r * 0.28, 'p');
    }
    g.circle(78, 18, 6, 'd'); // drifting spores
    g.circle(18, 22, 4, 'd');
  });

  A('wreckage', 'Wreckage', S, [2, 2], { placement: 'free', roomTypes: ['crash-site', 'wasteland'], max: 3, weight: 3, cover: 'three-quarters' }, (g) => {
    // A torn hull plate with exposed ribs and a burnt-through hole, and a bent fin beside it.
    g.poly([[150, 130], [190, 150], [176, 192], [126, 172]], 'm');
    g.line(150, 140, 168, 180, 't');
    g.poly([[14, 52], [60, 20], [96, 34], [124, 14], [170, 62], [150, 104], [162, 130], [96, 170], [70, 150], [36, 160], [22, 110], [34, 88]], 's');
    g.poly([[40, 70], [118, 46], [142, 98], [86, 140], [48, 120]], 'o');
    g.lines([[40, 70, 48, 120], [80, 58, 66, 130], [118, 46, 100, 132]], 't'); // panel seams
    g.lines([[124, 14, 112, 2], [170, 62, 190, 54], [36, 160, 18, 176]], 'l'); // ribs sticking out
    for (const [x, y] of [[46, 76], [84, 64], [112, 54], [130, 92], [96, 132], [56, 116]]) g.circle(x, y, 3, 'k');
    g.star(98, 92, 22, 9, 10, 'ko'); // burn hole
    g.circle(98, 92, 7, 'hm');
  });

  A('escape-pod', 'Escape pod', S, [2, 2], { placement: 'free', height: 'tall', roomTypes: ['crash-site'], max: 1, blocksVision: true }, (g) => {
    g.poly(stoneShape(100, 104, 92, 21, 14), 'h'); // scorched landing scar
    g.path('M150 150Q176 176 190 160Q182 186 160 190Z', 'hm'); // spent chute
    g.add('<path class="d" d="M140 140L170 172M150 128L184 166"/>');
    for (const [x, y] of [[40, 64], [160, 64], [40, 136], [160, 136]]) g.rect(x - 10, y - 14, 20, 28, 'ko', 4); // thrusters
    g.chamfer(44, 22, 112, 156, 36, 's'); // capsule
    g.chamfer(54, 32, 92, 40, 16, 'ko'); // heat-shield end
    g.lines([[60, 40, 70, 64], [86, 38, 92, 62], [114, 38, 108, 64], [136, 42, 128, 62]], 'pl');
    g.chamfer(68, 86, 64, 44, 10, 'o'); // viewport frame
    g.chamfer(76, 92, 48, 32, 8, 'ko');
    g.path('M84 116L96 100', 'pl');
    g.lines([[52, 146, 148, 146], [52, 160, 148, 160]], 't');
    g.add('<g transform="rotate(-25 52 144)">');
    g.chamfer(4, 136, 48, 30, 8, 'o'); // hatch blown open
    g.line(10, 151, 46, 151, 't');
    g.add('</g>');
  });

  A('crater', 'Crater', S, [2, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: ['crash-site', 'wasteland'], max: 2, tags: ['difficult terrain'] }, (g) => {
    g.poly(stoneShape(100, 100, 88, 12, 16), 'h');
    // Ejecta streaks.
    const rays = [];
    for (let i = 0; i < 14; i++) {
      const a = (i * Math.PI * 2) / 14 + (i % 3) * 0.1;
      rays.push([100 + Math.cos(a) * 66, 100 + Math.sin(a) * 66, 100 + Math.cos(a) * (84 + (i % 4) * 4), 100 + Math.sin(a) * (84 + (i % 4) * 4)]);
    }
    g.lines(rays, 't');
    g.poly(stoneShape(100, 100, 60, 3, 14), 'hm');
    g.poly(stoneShape(102, 100, 30, 7, 10), 'k');
    // Rim boulders.
    for (const [x, y, r, s] of [[36, 62, 10, 1], [150, 48, 8, 2], [164, 128, 11, 3], [70, 160, 9, 4], [122, 170, 7, 5]]) g.poly(stoneShape(x, y, r, s, 7), 's');
  });

  A('comms-mast', 'Comms mast', S, [1, 1], { placement: 'free', height: 'tall', roomTypes: ['colony-yard', 'crash-site'], max: 1, light: { bright: 0, dim: 2, color: '#ff4040', animation: 'pulse' } }, (g) => {
    // Guy wires to anchors, lattice tower, a dish with its feed horn and a beacon.
    for (const [x, y] of [[8, 8], [92, 10], [90, 92], [10, 90]]) {
      g.line(50, 50, x, y, 't');
      g.circle(x, y, 4, 'ko');
    }
    g.rect(34, 34, 32, 32, 's', 2);
    g.path('M34 34L66 66M66 34L34 66M50 34V66M34 50H66', 't');
    g.add('<g transform="rotate(-30 56 44)">');
    g.ellipse(56, 44, 22, 16, 'o');
    g.ellipse(56, 44, 14, 9, 's');
    g.add('</g>');
    g.path('M56 44L40 28M56 44L70 30M56 44L46 60', 't');
    g.circle(56, 44, 4, 'k');
    g.circle(30, 70, 6, 'ko');
    g.circle(30, 70, 2.4, 'p');
  });

  A('solar-panel', 'Solar panel', S, [2, 1], { placement: 'free', roomTypes: ['colony-yard', 'wasteland'], max: 4, cover: 'half' }, (g) => {
    g.rect(94, 84, 12, 14, 'ko', 2); // post
    g.path('M100 92Q140 98 196 96', 'l'); // cable
    for (const x of [6, 102]) {
      g.chamfer(x, 8, 92, 78, 6, 's');
      g.rect(x + 6, 14, 80, 66, 'ko', 2);
      const cells = [];
      for (let i = 1; i < 4; i++) cells.push([x + 6 + i * 20, 14, x + 6 + i * 20, 80]);
      for (let j = 1; j < 3; j++) cells.push([x + 6, 14 + j * 22, x + 86, 14 + j * 22]);
      g.lines(cells, 'pl');
      g.path(`M${x + 14} 70L${x + 40} 22`, 'pl'); // glint
    }
  });

  G('barrier', 'Barrier', S, 'fence', { len: 3, style: 'barrier' }, { placement: 'free', roomTypes: ['colony-yard', 'crash-site', 'wasteland'], max: 3, cover: 'half' }, { len: [2, 5] });
  G('gantry-bridge', 'Gantry bridge', S, 'bridge', { len: 4, width: 2, style: 'metal' }, { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: MANUAL, tags: ['bridge'] }, { len: [2, 10], width: [1, 3] });

  A('alien-grass', 'Alien grass', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: ['jungle', 'colony-yard', 'ruin'], weight: 2 }, (g) => {
    // Tufts of curling blades, each tipped with a glowing bulb.
    for (const [x, y, k] of [[26, 70, 1], [58, 78, 0.8], [76, 50, 1], [40, 40, 0.85]]) {
      g.path(`M${x} ${y}q${-14 * k} ${-18 * k} ${-6 * k} ${-34 * k}`, 'l');
      g.path(`M${x} ${y}q${2 * k} ${-20 * k} ${12 * k} ${-30 * k}`, 'l');
      g.path(`M${x} ${y}q${12 * k} ${-6 * k} ${20 * k} ${-14 * k}`, 't');
      g.circle(x - 6 * k, y - 34 * k, 4.5, 'hm');
      g.circle(x + 12 * k, y - 30 * k, 4.5, 'hm');
      g.circle(x + 20 * k, y - 14 * k, 3, 'k');
    }
  });
}
