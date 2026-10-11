// Pieces for ruined rooms (room type "ruin": only the decorator's ruin pass uses them).

import { stoneShape, grain, leaf } from '../motifs.js';

const ALL = ['fantasy', 'scifi'];
const CF = ['fantasy'];
const S = ['scifi'];
const RUIN = ['ruin'];

export default function define({ A }) {
  A('collapsed-masonry', 'Collapsed masonry', CF, [2, 2], { placement: 'free', layer: 'floor', blocksMovement: false, roomTypes: RUIN, cover: 'half', tags: ['difficult terrain'] }, (g) => {
    // Dressed blocks fallen in a heap: squared stones with chipped corners, dust and chips round them.
    for (const [x, y] of [[20, 90], [180, 100], [100, 190], [30, 170], [176, 30], [14, 30]]) g.circle(x, y, 4, 'k');
    const blocksAt = [[40, 50, 46, 30, -12], [100, 34, 52, 32, 8], [152, 66, 40, 30, 30], [62, 110, 54, 34, -20], [124, 106, 58, 36, 12], [160, 154, 40, 28, -8], [76, 162, 46, 30, 18], [124, 164, 30, 22, 40]];
    blocksAt.forEach(([x, y, w, h, deg], i) => {
      g.add(`<g transform="rotate(${deg} ${x} ${y})">`);
      g.path(`M${x - w / 2 + 6} ${y - h / 2}H${x + w / 2}V${y + h / 2 - 5}L${x + w / 2 - 6} ${y + h / 2}H${x - w / 2}V${y - h / 2 + 6}Z`, i % 3 ? 's' : 'o');
      g.line(x - w / 2 + 6, y - h / 2 + 6, x + w / 2 - 8, y - h / 2 + 6, 't');
      g.add('</g>');
    });
  });

  A('fallen-beam', 'Fallen beam', CF, [3, 1], { placement: 'free', roomTypes: RUIN, cover: 'half' }, (g) => {
    g.add('<g transform="rotate(-6 150 50)">');
    g.rect(10, 30, 270, 40, 's', 4);
    grain(g, 12, 32, 266, 36, 2, 'h', 17);
    g.path('M280 30l12 8l-10 6l12 8l-10 6l10 12H280Z', 's'); // splintered end
    g.path('M280 30l12 8l-10 6l12 8l-10 6l10 12', 'l');
    g.rect(40, 30, 14, 40, 'ko', 2); // iron strap
    g.circle(47, 40, 2, 'p');
    g.circle(47, 60, 2, 'p');
    g.add('</g>');
  });

  A('fallen-girder', 'Fallen girder', S, [3, 1], { placement: 'free', roomTypes: RUIN, cover: 'half' }, (g) => {
    // A steel girder lying on its side: flanges, a web with lightening holes, a torn end.
    g.add('<g transform="rotate(5 150 50)">');
    g.rect(8, 24, 270, 52, 's', 3);
    g.rect(8, 24, 270, 10, 'ko', 2);
    g.rect(8, 66, 270, 10, 'ko', 2);
    for (let x = 44; x < 260; x += 52) {
      g.circle(x, 50, 10, 'ko');
      g.circle(x, 50, 5, 'm');
    }
    for (let x = 18; x < 276; x += 26) {
      g.circle(x, 29, 2.2, 'p');
      g.circle(x, 71, 2.2, 'p');
    }
    g.path('M278 24L292 34L282 44L296 56L284 66L290 76H278', 'ko');
    g.add('</g>');
  });

  A('broken-furniture', 'Broken furniture', CF, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    // A smashed chair: seat on its side, snapped legs, splinters.
    g.add('<g transform="rotate(-20 40 40)">').rect(16, 30, 50, 16, 'o', 2).line(20, 38, 62, 38, 't').path('M66 30l6 4l-4 4l6 4l-8 4', 'l').add('</g>');
    g.add('<g transform="rotate(35 62 62)">').rect(40, 56, 46, 12, 's', 2).add('</g>');
    g.lines([[22, 70, 36, 84], [70, 22, 84, 30], [30, 52, 22, 58]], 'l');
    for (const [x, y] of [[50, 26], [16, 46], [80, 82], [56, 86]]) g.line(x, y, x + 5, y + 3, 't');
  });

  A('vines', 'Creeping vines', ALL, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    g.path('M6 90C30 70 24 46 48 40S80 20 94 8', 'l');
    g.path('M30 60C44 66 58 74 70 92', 't');
    [[20, 76, 200], [44, 42, 290], [70, 28, 20], [52, 74, 110], [86, 14, 240], [30, 58, 140], [62, 84, 330]].forEach(([x, y, a], i) => leaf(g, x, y, a, 16, 11, i % 2 ? 'o' : 's', 0.2, 1));
  });

  A('scrap', 'Scrap', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, weight: 2 }, (g) => {
    // Bent plates, a bolt-holed bracket and a loose spring.
    g.poly([[12, 28], [46, 18], [52, 44], [18, 54]], 's');
    g.line(16, 41, 49, 31, 't');
    g.poly([[54, 56], [86, 50], [82, 84], [58, 80]], 'o');
    g.rect(22, 64, 22, 12, 'm', 2);
    g.circle(28, 70, 2.4, 'k');
    g.circle(38, 70, 2.4, 'k');
    g.path('M62 16q4 6 8 0t8 0t8 0', 'l');
    for (const [x, y] of [[18, 32], [44, 24], [60, 60], [80, 56]]) g.circle(x, y, 2.5, 'k');
  });

  A('sparking-cables', 'Sparking cables', S, [1, 1], { placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes: RUIN, light: { bright: 0, dim: 1, color: '#9fdcff', animation: 'torch' } }, (g) => {
    // A severed cable, its frayed ends arcing.
    g.path('M4 20C30 30 34 58 46 56', 'l');
    g.path('M96 84C72 74 68 56 58 56', 'l');
    g.path('M46 56l-5 -5M46 56l-6 3M46 56l-2 6M58 56l5 -6M58 56l6 2M58 56l3 6', 't');
    g.star(52, 54, 18, 7, 6, 'k');
    g.star(52, 54, 8, 5, 3, 'p');
    for (const [x, y] of [[36, 40], [70, 42], [64, 72], [34, 70]]) g.circle(x, y, 2, 'k');
  });
}
