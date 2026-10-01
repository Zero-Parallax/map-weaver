// Pieces for ruined rooms (room type "ruin": only the decorator's ruin pass uses them).

import { stoneShape, leaves } from '../motifs.js';

const ALL = ['fantasy', 'scifi'];
const CF = ['fantasy'];
const S = ['scifi'];
const RUIN = ['ruin'];

export default function define({ A }) {
  A('collapsed-masonry', 'Collapsed masonry', CF, [2, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: RUIN, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    const stones = [[40, 50, 26, 1], [96, 34, 30, 2], [150, 60, 24, 3], [60, 110, 30, 4], [120, 100, 34, 5], [160, 150, 22, 6], [70, 160, 24, 7], [120, 160, 18, 8]];
    for (const [x, y, r, s] of stones) g.poly(stoneShape(x, y, r, s), s % 3 ? 's' : 'o');
    g.lines([[30, 46, 52, 56], [88, 30, 104, 42], [112, 96, 132, 108]], 't');
    for (const [x, y] of [[20, 90], [180, 100], [100, 190], [30, 170]]) g.circle(x, y, 5, 'k');
  });

  A('fallen-beam', 'Fallen beam', CF, [3, 1], { placement: 'free', roomTypes: RUIN, cover: 'half' }, (g) => {
    g.add('<g transform="rotate(-6 150 50)">');
    g.rect(10, 30, 280, 40, 's', 4);
    g.lines([[30, 42, 140, 40], [120, 58, 260, 60], [200, 40, 280, 42]], 't');
    g.path('M290 30l-14 10l12 6l-10 8l12 6l-12 10', 'l');
    g.add('</g>');
  });

  A('fallen-girder', 'Fallen girder', S, [3, 1], { placement: 'free', roomTypes: RUIN, cover: 'half' }, (g) => {
    g.add('<g transform="rotate(5 150 50)">');
    g.rect(8, 26, 284, 48, 'ko', 3);
    g.rect(8, 40, 284, 20, 's', 2);
    for (let x = 30; x < 290; x += 40) g.circle(x, 33, 3.5, 'p');
    g.add('</g>');
  });

  A('broken-furniture', 'Broken furniture', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    g.add('<g transform="rotate(-20 40 40)">').rect(16, 30, 50, 14, 'o', 2).add('</g>');
    g.add('<g transform="rotate(35 62 62)">').rect(40, 56, 46, 12, 's', 2).add('</g>');
    g.lines([[22, 70, 36, 84], [70, 22, 84, 30], [30, 52, 22, 58]], 'l');
  });

  A('vines', 'Creeping vines', ALL, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    g.path('M6 90C30 70 24 46 48 40S80 20 94 8', 'l');
    g.path('M30 60C44 66 58 74 70 92', 't');
    for (const [x, y] of [[20, 76], [44, 42], [70, 28], [52, 74], [86, 14]]) leaves(g, x, y, 10, 3, 's');
  });

  A('scrap', 'Scrap', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    g.poly([[14, 30], [44, 22], [48, 44], [20, 52]], 's');
    g.poly([[54, 58], [84, 52], [80, 82], [58, 78]], 'o');
    g.lines([[30, 70, 46, 86], [62, 20, 80, 34], [14, 82, 24, 66]], 'l');
    for (const [x, y] of [[20, 34], [44, 26], [60, 62], [78, 56]]) g.circle(x, y, 2.5, 'k');
  });

  A('sparking-cables', 'Sparking cables', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, light: { bright: 0, dim: 1, color: '#9fdcff', animation: 'torch' } }, (g) => {
    g.path('M4 20C30 30 34 60 52 56', 'l');
    g.path('M96 84C70 74 66 48 52 56', 'l');
    g.star(52, 56, 16, 6, 6, 'hm');
    g.circle(52, 56, 4, 'k');
  });
}
