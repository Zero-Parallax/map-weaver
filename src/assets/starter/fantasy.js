// Fantasy assets: taverns, homes, shops, smithies. Backs face the top edge (wallSide n).

import { stool, candle, leaves, planks, figure } from '../motifs.js';

const F = ['fantasy'];

export default function define({ A, G }) {
  G('bar-counter', 'Bar counter', F, 'counter', { len: 4, kind: 'bar' }, { placement: 'wall', roomTypes: ['tavern'], min: 1, max: 1 }, { len: [2, 6] });

  A('stool', 'Stool', F, [1, 1], { placement: 'free', blocksMovement: false, roomTypes: ['tavern', 'kitchen', 'smithy'], max: 6 }, (g) => {
    stool(g, 50, 50, 28);
  });

  G('round-table', 'Round table', F, 'table', { w: 2, h: 2, chairs: true, round: true }, { placement: 'centre', roomTypes: ['tavern', 'great-hall', 'library'], max: 4, weight: 2 }, { w: [1, 3], h: [1, 3] });
  G('long-table', 'Long table', F, 'table', { w: 4, h: 1, chairs: true }, { placement: 'centre', roomTypes: ['great-hall', 'tavern'], max: 2 }, { w: [3, 6], h: [1, 2] });

  A('keg-rack', 'Keg rack', F, [2, 1], { placement: 'wall', roomTypes: ['tavern', 'cellar'], max: 2 }, (g) => {
    g.rect(4, 4, 192, 64, 'ko', 3);
    for (const x of [52, 148]) {
      g.ellipse(x, 36, 42, 24, 'o');
      g.lines([[x - 26, 14, x - 26, 58], [x + 26, 14, x + 26, 58]], 'l');
      g.rect(x - 5, 60, 10, 12, 'ko', 2); // tap
    }
  });

  A('fireplace', 'Fireplace', F, [2, 1], { light: { bright: 3, dim: 6, color: '#ff8a30', animation: 'torch' }, placement: 'wall', roomTypes: ['tavern', 'great-hall', 'bedroom', 'kitchen', 'library'], max: 1 }, (g) => {
    g.rect(6, 0, 188, 58, 's', 2);
    g.lines([[6, 20, 46, 20], [154, 20, 194, 20], [6, 40, 46, 40], [154, 40, 194, 40], [26, 0, 26, 20], [174, 0, 174, 20], [36, 20, 36, 40], [164, 20, 164, 40]], 't');
    g.rect(46, 0, 108, 44, 'ko');
    g.rect(64, 20, 72, 10, 'o', 4);
    g.rect(70, 30, 60, 9, 's', 4);
    g.star(100, 20, 18, 7, 8, 'p');
    g.rect(40, 58, 120, 14, 'o', 2); // hearthstone
  });

  A('stove', 'Stove', F, [1, 1], { placement: 'wall', roomTypes: ['kitchen'], min: 1, max: 1 }, (g) => {
    g.rect(8, 4, 84, 76, 'ko', 6);
    g.circle(30, 28, 12, 'pl');
    g.circle(70, 28, 12, 'pl');
    g.circle(30, 28, 4, 'p');
    g.circle(70, 28, 4, 'p');
    g.rect(20, 50, 60, 20, 's', 3);
    g.line(30, 60, 70, 60, 'l');
  });

  G('kitchen-counter', 'Kitchen counter', F, 'counter', { len: 3, kind: 'kitchen' }, { placement: 'wall', roomTypes: ['kitchen'], max: 2 }, { len: [2, 5] });

  A('cauldron', 'Cauldron', F, [1, 1], { light: { bright: 1, dim: 2, color: '#ff8a30', animation: 'torch' }, placement: 'centre', roomTypes: ['kitchen', 'cave', 'library'], max: 1 }, (g) => {
    g.lines([[50, 12, 50, 2], [18, 70, 8, 80], [82, 70, 92, 80]], 'l');
    g.circle(50, 50, 38, 'ko');
    g.circle(50, 50, 29, 'm');
    for (const [x, y, r] of [[40, 42, 6], [58, 56, 8], [60, 38, 4], [42, 62, 4]]) g.circle(x, y, r, 'o');
    g.line(62, 28, 88, 8, 'l');
  });

  A('double-bed', 'Double bed', F, [2, 2], { placement: 'wall', roomTypes: ['bedroom'], max: 1 }, (g) => {
    g.rect(8, 4, 184, 192, 'o', 6);
    g.rect(8, 4, 184, 16, 'ko', 4);
    g.rect(22, 26, 70, 32, 'o', 12);
    g.rect(108, 26, 70, 32, 'o', 12);
    g.rect(8, 70, 184, 126, 's', 6);
    g.rect(8, 70, 184, 18, 'o', 4);
    for (let x = 30; x < 190; x += 36) g.poly([[x, 110], [x + 12, 122], [x, 134], [x - 12, 122]], 't');
  });

  A('wardrobe', 'Wardrobe', F, [2, 1], { placement: 'wall', roomTypes: ['bedroom'], max: 1 }, (g) => {
    g.rect(6, 4, 188, 58, 'o', 3);
    g.rect(6, 4, 188, 10, 'ko', 2);
    g.line(100, 14, 100, 62, 'l');
    g.rect(18, 20, 70, 34, 't');
    g.rect(112, 20, 70, 34, 't');
    g.circle(90, 38, 4, 'k');
    g.circle(110, 38, 4, 'k');
  });

  A('nightstand', 'Nightstand', F, [1, 1], { placement: 'wall', roomTypes: ['bedroom'], max: 2 }, (g) => {
    g.rect(18, 4, 64, 52, 's', 4);
    g.rect(26, 12, 22, 28, 'o', 2);
    candle(g, 64, 26, 8);
    g.line(30, 48, 70, 48, 'l');
  });

  A('armchair', 'Armchair', F, [1, 1], { placement: 'free', roomTypes: ['bedroom', 'library', 'great-hall'], max: 3 }, (g) => {
    g.rect(10, 8, 80, 24, 'ko', 10);
    g.rect(10, 20, 20, 70, 's', 10);
    g.rect(70, 20, 20, 70, 's', 10);
    g.rect(28, 30, 44, 56, 'o', 10);
    g.line(34, 58, 66, 58, 't');
  });

  A('anvil', 'Anvil', F, [1, 1], { placement: 'centre', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
    g.rect(30, 60, 40, 30, 's', 3); // stump
    g.poly([[4, 34], [30, 26], [86, 26], [96, 38], [86, 50], [64, 50], [60, 62], [40, 62], [36, 50], [26, 46]], 'ko');
    g.rect(56, 72, 34, 10, 'o', 3); // hammer head
    g.line(62, 80, 50, 96, 'l');
  });

  A('forge', 'Forge', F, [2, 2], { light: { bright: 3, dim: 6, color: '#ff6a2a', animation: 'torch' }, placement: 'wall', roomTypes: ['smithy'], min: 1, max: 1 }, (g) => {
    g.rect(60, 0, 80, 22, 'ko', 2); // chimney
    g.rect(8, 16, 184, 140, 's', 6);
    const bricks = [];
    for (let y = 40; y < 156; y += 24) bricks.push([8, y, 30, y], [170, y, 192, y]);
    g.lines(bricks, 't');
    g.rect(34, 34, 132, 100, 'ko', 6);
    for (let i = 0; i < 8; i++) g.circle(56 + (i % 4) * 30, 64 + Math.floor(i / 4) * 34, 11, i % 3 ? 'hm' : 'p');
    g.star(100, 82, 26, 7, 12, 'p');
    g.poly([[150, 150], [196, 164], [196, 196], [150, 186]], 'o'); // bellows
    g.lines([[160, 160, 188, 172], [160, 174, 188, 184]], 't');
  });

  A('grindstone', 'Grindstone', F, [1, 1], { placement: 'free', roomTypes: ['smithy'], max: 1 }, (g) => {
    g.rect(22, 30, 56, 40, 'o', 3);
    g.ellipse(50, 50, 14, 38, 'm');
    g.line(6, 50, 94, 50, 'l');
    g.circle(94, 50, 6, 'ko');
    g.line(30, 76, 70, 92, 'l');
  });

  A('workbench', 'Workbench', F, [2, 1], { placement: 'wall', roomTypes: ['smithy', 'shop', 'cellar'], max: 2 }, (g) => {
    g.rect(6, 4, 188, 60, 'o', 3);
    planks(g, 6, 4, 188, 60, 3, 'h');
    g.rect(8, 10, 22, 22, 'ko', 3); // vice
    g.rect(52, 18, 36, 10, 's', 2); // hammer
    g.line(70, 28, 70, 50, 'l');
    g.path('M110 20L170 20L170 34L110 34Z', 'o'); // saw
    g.path('M112 34l6 6l6-6l6 6l6-6l6 6l6-6l6 6l6-6l6 6', 't');
  });

  G('display-counter', 'Display counter', F, 'counter', { len: 3, kind: 'shop' }, { placement: 'centre', roomTypes: ['shop'], min: 1, max: 2 }, { len: [2, 5] });
  G('goods-shelf', 'Goods shelf', ['classic', 'fantasy'], 'shelf', { len: 2, kind: 'goods' }, { placement: 'wall', roomTypes: ['shop', 'cellar', 'kitchen', 'storeroom'], max: 4, weight: 2 }, { len: [1, 4] });
  G('wine-rack', 'Wine rack', F, 'shelf', { len: 2, kind: 'bottles' }, { placement: 'wall', roomTypes: ['cellar', 'tavern'], max: 3 }, { len: [1, 4] });

  A('plant', 'Potted plant', F, [1, 1], { placement: 'corner', blocksMovement: false, roomTypes: ['great-hall', 'bedroom', 'shop', 'tavern', 'library'], max: 2 }, (g) => {
    g.circle(50, 50, 22, 's');
    leaves(g, 50, 50, 42, 7, 'o');
  });

  A('planter', 'Planter box', F, [1, 1], { placement: 'balcony', roomTypes: ['*'], max: 4 }, (g) => {
    g.rect(8, 18, 84, 46, 's', 4);
    for (const x of [28, 50, 72]) leaves(g, x, 40, 22, 5, 'o');
  });

  A('doormat', 'Doormat', F, [1, 1], { placement: 'door', layer: 'floor', blocksMovement: false, roomTypes: ['tavern', 'shop', 'great-hall'], max: 1 }, (g) => {
    g.rect(10, 18, 80, 64, 's', 6);
    g.rect(20, 28, 60, 44, 'd');
  });

  A('coat-rack', 'Coat rack', F, [1, 1], { placement: 'door', blocksMovement: false, roomTypes: ['tavern', 'great-hall', 'bedroom'], max: 1 }, (g) => {
    g.lines([[50, 50, 22, 26], [50, 50, 78, 26], [50, 50, 22, 74], [50, 50, 78, 74]], 'l');
    g.ellipse(24, 30, 12, 16, 's');
    g.ellipse(76, 72, 12, 16, 'o');
    g.circle(50, 50, 10, 'ko');
  });

  A('well', 'Well', F, [2, 2], { placement: 'centre', roomTypes: ['cellar', 'cave', 'great-hall', 'farmyard', 'clearing'], max: 1 }, (g) => {
    g.circle(100, 100, 74, 's');
    const blocks = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      blocks.push([100 + Math.cos(a) * 56, 100 + Math.sin(a) * 56, 100 + Math.cos(a) * 74, 100 + Math.sin(a) * 74]);
    }
    g.lines(blocks, 't');
    g.circle(100, 100, 56, 'm');
    g.circle(100, 100, 40, 'pl');
    g.rect(14, 92, 172, 16, 'ko', 3);
    g.circle(100, 100, 14, 'o');
  });

}
