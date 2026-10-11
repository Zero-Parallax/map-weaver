// Fantasy assets: taverns, homes, shops, smithies. Backs face the top edge (wallSide n).
// Same house style as common.js: planks and grain on wood, blocks on stone, bands on metal.

import { stool, candle, flame, grain, blocks, leafCluster } from '../motifs.js';

const F = ['fantasy'];

export default function define({ A, G }) {
  G('bar-counter', 'Bar counter', F, 'counter', { len: 4, kind: 'bar' }, { placement: 'wall', roomTypes: ['tavern'], min: 1, max: 1 }, { len: [2, 6] });

  A('stool', 'Stool', F, [1, 1], { placement: 'free', height: 'low', blocksMovement: false, roomTypes: ['tavern', 'kitchen', 'smithy'], max: 6 }, (g) => {
    for (const a of [0.8, 2.4, 3.9, 5.5]) g.circle(50 + Math.cos(a) * 24, 50 + Math.sin(a) * 24, 5, 'ko'); // splayed legs
    stool(g, 50, 50, 26);
  });

  G('round-table', 'Round table', F, 'table', { w: 2, h: 2, chairs: true, round: true }, { placement: 'centre', roomTypes: ['tavern', 'great-hall', 'library'], max: 4, weight: 2 }, { w: [1, 3], h: [1, 3] });
  G('long-table', 'Long table', F, 'table', { w: 4, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['great-hall', 'tavern'], max: 2 }, { w: [3, 6], h: [1, 2] });

  A('keg-rack', 'Keg rack', F, [2, 1], { placement: 'wall', height: 'tall', roomTypes: ['tavern', 'cellar'], max: 2 }, (g) => {
    g.rect(4, 4, 192, 64, 's', 3); // cradle
    grain(g, 6, 6, 188, 60, 1, 'h', 7);
    for (const x of [52, 148]) {
      // A keg lying on its side: staves, hoops, tap.
      g.rect(x - 44, 12, 88, 48, 'o', 22);
      g.lines([[x - 30, 14, x - 30, 58], [x + 30, 14, x + 30, 58]], 'l');
      g.lines([[x - 40, 26, x + 40, 26], [x - 40, 46, x + 40, 46]], 't');
      g.rect(x - 5, 60, 10, 12, 'ko', 2);
      g.circle(x, 74, 3, 'k');
    }
  });

  A('fireplace', 'Fireplace', F, [2, 1], { light: { bright: 3, dim: 6, color: '#ff8a30', animation: 'torch' }, placement: 'wall', height: 'tall', roomTypes: ['tavern', 'great-hall', 'bedroom', 'kitchen', 'library'], max: 1 }, (g) => {
    g.rect(6, 0, 188, 58, 's', 2); // stone surround
    blocks(g, 6, 0, 188, 58, 19, 30);
    g.rect(46, 0, 108, 46, 'ko'); // firebox
    g.rect(60, 18, 80, 10, 'o', 4); // logs
    g.rect(66, 30, 68, 9, 's', 4);
    flame(g, 100, 24, 18);
    g.rect(40, 56, 120, 14, 'o', 2); // hearthstone
    g.lines([[80, 56, 80, 70], [120, 56, 120, 70]], 't');
    g.lines([[164, 60, 186, 82], [172, 58, 192, 76]], 'l'); // poker and tongs
  });

  A('stove', 'Stove', F, [1, 1], { light: { bright: 1, dim: 2, color: '#ff8a30', animation: 'torch' }, placement: 'wall', roomTypes: ['kitchen'], min: 1, max: 1 }, (g) => {
    g.rect(40, 0, 20, 10, 'ko', 2); // flue
    g.rect(8, 6, 84, 74, 'ko', 6); // iron range
    for (const x of [30, 70]) {
      g.circle(x, 30, 13, 'm'); // hot plates
      g.circle(x, 30, 8, 't');
    }
    g.circle(70, 30, 10, 'o'); // a pot on the right plate
    g.circle(70, 30, 6, 'hm');
    g.line(80, 30, 92, 30, 'l');
    g.rect(18, 52, 64, 20, 'hm', 3); // fire door, glowing
    g.lines([[26, 58, 74, 58], [26, 66, 74, 66]], 'pl');
  });

  G('kitchen-counter', 'Kitchen counter', F, 'counter', { len: 3, kind: 'kitchen' }, { placement: 'wall', roomTypes: ['kitchen'], max: 2 }, { len: [2, 5] });

  A('cauldron', 'Cauldron', F, [1, 1], { light: { bright: 1, dim: 2, color: '#ff8a30', animation: 'torch' }, placement: 'centre', roomTypes: ['kitchen', 'cave', 'library'], max: 1 }, (g) => {
    g.circle(50, 50, 44, 'hm'); // fire beneath, showing round the edge
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + 0.2;
      g.circle(50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 4, 'k');
    }
    g.circle(50, 50, 36, 'ko'); // iron pot
    g.circle(50, 50, 28, 'm'); // the brew
    for (const [x, y, r] of [[40, 42, 6], [58, 56, 7], [60, 38, 4], [42, 62, 4]]) g.circle(x, y, r, 'o'); // bubbles
    g.path('M14 50A36 36 0 0 1 86 50', 'l'); // bail handle
    g.line(62, 30, 90, 8, 'l'); // ladle
    g.circle(62, 30, 5, 'ko');
  });

  G('double-bed', 'Double bed', F, 'bed', { kind: 'double', style: 'wood' }, { placement: 'wall', height: 'low', roomTypes: ['bedroom'], max: 1 });

  A('wardrobe', 'Wardrobe', F, [2, 1], { placement: 'wall', height: 'tall', roomTypes: ['bedroom'], max: 1 }, (g) => {
    g.rect(6, 4, 188, 60, 'o', 3);
    g.rect(6, 4, 188, 10, 'ko', 2); // cornice
    g.line(100, 14, 100, 64, 'l');
    for (const x of [18, 112]) {
      g.rect(x, 20, 70, 38, 's', 2); // panelled doors
      grain(g, x, 20, 70, 38, 2, 'v', x);
    }
    g.circle(92, 40, 3.5, 'k');
    g.circle(108, 40, 3.5, 'k');
    g.rect(84, 60, 32, 6, 'ko', 2); // feet
  });

  A('nightstand', 'Nightstand', F, [1, 1], { placement: 'wall', roomTypes: ['bedroom'], max: 2 }, (g) => {
    g.rect(16, 4, 68, 56, 's', 4);
    grain(g, 16, 4, 68, 56, 2, 'h', 8);
    candle(g, 62, 24, 8); // candle in a holder
    g.rect(24, 12, 20, 26, 'o', 2); // a book
    g.line(28, 12, 28, 38, 't');
    g.rect(38, 48, 24, 6, 'ko', 2); // drawer pull
  });

  A('armchair', 'Armchair', F, [1, 1], { placement: 'free', height: 'low', roomTypes: ['bedroom', 'library', 'great-hall'], max: 3 }, (g) => {
    g.path('M10 32Q10 6 50 6Q90 6 90 32V36H10Z', 'ko'); // wing back
    g.rect(8, 22, 22, 70, 's', 10); // rolled arms
    g.rect(70, 22, 22, 70, 's', 10);
    g.path('M14 30Q18 26 24 30M76 30Q82 26 86 30', 't');
    g.rect(28, 32, 44, 56, 'o', 10); // cushion
    g.line(34, 60, 66, 60, 't');
    g.circle(40, 46, 2, 'k'); // buttons
    g.circle(60, 46, 2, 'k');
  });

  A('anvil', 'Anvil', F, [1, 1], { placement: 'centre', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
    g.circle(50, 56, 34, 's'); // tree-stump base
    g.circle(50, 56, 24, 't');
    g.poly([[4, 34], [30, 26], [86, 26], [96, 38], [86, 50], [64, 50], [60, 62], [40, 62], [36, 50], [26, 46]], 'ko'); // horn and face
    g.path('M34 34H84', 'pl');
    g.rect(72, 30, 8, 8, 'p', 1); // hardy hole
    g.rect(56, 70, 34, 12, 'm', 3); // hammer
    g.line(62, 80, 46, 96, 'l');
  });

  A('forge', 'Forge', F, [2, 2], { light: { bright: 3, dim: 6, color: '#ff6a2a', animation: 'torch' }, placement: 'wall', height: 'tall', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
    g.rect(60, 0, 80, 22, 'ko', 2); // chimney hood
    g.rect(8, 16, 184, 136, 's', 6); // brick hearth
    blocks(g, 8, 16, 184, 136, 17, 28);
    g.rect(36, 36, 128, 92, 'ko', 8); // fire pit
    for (let i = 0; i < 12; i++) g.circle(52 + (i % 6) * 19, 56 + Math.floor(i / 6) * 50, 9, i % 3 ? 'hm' : 'm'); // coals
    flame(g, 100, 82, 26);
    g.rect(60, 128, 80, 14, 'o', 3); // quench trough
    g.rect(64, 131, 72, 8, 'm', 2);
    g.poly([[150, 150], [196, 162], [196, 196], [150, 188]], 'o'); // bellows
    g.lines([[160, 160, 188, 170], [160, 174, 188, 182]], 't');
    g.line(150, 168, 132, 140, 'l');
  });

  A('grindstone', 'Grindstone', F, [1, 1], { placement: 'free', roomTypes: ['smithy'], max: 1 }, (g) => {
    g.rect(20, 28, 60, 44, 'o', 3); // frame
    grain(g, 20, 28, 60, 44, 2, 'h', 6);
    g.ellipse(50, 50, 13, 40, 'm'); // wheel seen edge-on
    g.lines([[42, 20, 58, 20], [40, 34, 60, 34], [38, 50, 62, 50], [40, 66, 60, 66], [42, 80, 58, 80]], 't');
    g.line(4, 50, 96, 50, 'l'); // axle and crank
    g.rect(88, 40, 8, 20, 'ko', 2);
    g.path('M24 82L18 96M76 82L82 96', 'l'); // treadle legs
  });

  A('workbench', 'Workbench', F, [2, 1], { placement: 'wall', roomTypes: ['smithy', 'shop', 'cellar'], max: 2 }, (g) => {
    g.rect(6, 4, 188, 60, 'o', 3);
    grain(g, 6, 4, 188, 60, 3, 'h', 11);
    g.rect(8, 10, 24, 24, 'ko', 3); // vice
    g.rect(14, 34, 12, 8, 'm', 2);
    // A hammer, a saw and a few nails.
    g.rect(48, 16, 34, 11, 'm', 2);
    g.rect(62, 27, 6, 26, 's', 2);
    g.path('M104 18H164L170 32H104Z', 'o');
    g.path('M104 32l5 6l5-6l5 6l5-6l5 6l5-6l5 6l5-6l5 6l5-6l5 6l5-6', 't');
    g.rect(164, 16, 18, 18, 's', 4);
    for (const [x, y] of [[96, 50], [110, 52], [124, 48]]) g.line(x, y, x + 8, y - 2, 'l');
  });

  G('display-counter', 'Display counter', F, 'counter', { len: 3, kind: 'shop' }, { placement: 'centre', roomTypes: ['shop'], min: 1, max: 2 }, { len: [2, 5] });
  G('goods-shelf', 'Goods shelf', F, 'shelf', { len: 2, kind: 'goods' }, { placement: 'wall', height: 'tall', roomTypes: ['shop', 'cellar', 'kitchen', 'storeroom'], max: 4, weight: 2 }, { len: [1, 4] });
  G('wine-rack', 'Wine rack', F, 'shelf', { len: 2, kind: 'bottles' }, { placement: 'wall', height: 'tall', roomTypes: ['cellar', 'tavern'], max: 3 }, { len: [1, 4] });

  A('plant', 'Potted plant', F, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['great-hall', 'bedroom', 'shop', 'tavern', 'library'], max: 2 }, (g) => {
    g.circle(50, 50, 24, 's'); // clay pot rim
    g.circle(50, 50, 18, 'hm'); // soil
    leafCluster(g, 50, 50, 38, 6, 5, ['o', 's']);
    g.circle(50, 50, 5, 'k');
  });

  A('planter', 'Planter box', F, [1, 1], { placement: 'balcony', roomTypes: ['*'], max: 4 }, (g) => {
    g.rect(6, 16, 88, 50, 's', 4);
    grain(g, 6, 16, 88, 50, 1, 'h', 3);
    g.rect(12, 22, 76, 38, 'hm', 3);
    [[28, 40], [50, 40], [72, 40]].forEach(([x, y], i) => leafCluster(g, x, y, 17, 4, i + 21, ['o', 's']));
  });

  A('doormat', 'Doormat', F, [1, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['tavern', 'shop', 'great-hall'], max: 1 }, (g) => {
    g.rect(10, 20, 80, 60, 's', 4);
    // Woven rush: alternating hatch blocks.
    const d = [];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 4; i++) {
        const x = 16 + i * 17;
        const y = 26 + j * 17;
        if ((i + j) % 2) for (let k = 3; k < 16; k += 4) d.push([x + k, y, x + k, y + 15]);
        else for (let k = 3; k < 16; k += 4) d.push([x, y + k, x + 15, y + k]);
      }
    }
    g.lines(d, 't');
    const fringe = [];
    for (let x = 14; x < 88; x += 6) fringe.push([x, 80, x, 88], [x, 12, x, 20]);
    g.lines(fringe, 't');
  });

  A('coat-rack', 'Coat rack', F, [1, 1], { placement: 'door', height: 'tall', blocksMovement: false, roomTypes: ['tavern', 'great-hall', 'bedroom'], max: 1 }, (g) => {
    // A cloak and a hat hanging on a post, with the feet showing beneath.
    g.lines([[50, 50, 22, 78], [50, 50, 78, 78], [50, 50, 50, 90]], 'l');
    g.path('M24 28Q14 50 26 70Q40 76 48 60Q46 36 36 24Z', 's'); // cloak
    g.path('M28 40Q30 56 26 66', 't');
    g.circle(70, 34, 18, 'o'); // hat brim
    g.circle(70, 34, 10, 'm'); // crown
    g.circle(50, 50, 9, 'ko'); // post top
    g.circle(50, 50, 3, 'p');
  });

  A('well', 'Well', F, [2, 2], { placement: 'centre', height: 'mid', roomTypes: ['cellar', 'cave', 'great-hall', 'farmyard', 'clearing'], max: 1 }, (g) => {
    g.circle(100, 100, 76, 's'); // stone ring
    const joints = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      joints.push([100 + Math.cos(a) * 56, 100 + Math.sin(a) * 56, 100 + Math.cos(a) * 76, 100 + Math.sin(a) * 76]);
    }
    g.lines(joints, 'l');
    g.circle(100, 100, 56, 'k'); // the shaft, dark
    g.circle(100, 100, 40, 'hm'); // water far below
    g.add('<circle class="pl" cx="100" cy="100" r="28" style="stroke-dasharray:8 8"/>');
    // Roof beam and winch across the top, with the bucket on its rope.
    g.rect(8, 92, 184, 16, 's', 3);
    g.rect(8, 92, 184, 16, 'l', 3);
    for (const x of [8, 176]) g.rect(x, 84, 16, 32, 'ko', 3);
    g.rect(184, 96, 14, 8, 'ko', 2); // crank
    g.circle(118, 128, 12, 'o'); // bucket
    g.circle(118, 128, 6, 'm');
    g.line(118, 108, 118, 116, 'l');
  });
}
