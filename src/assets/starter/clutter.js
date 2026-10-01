// Clutter: small floor decals that make rooms look lived-in (cracks, puddles, stains, papers,
// cables). They never block movement; the decorator scatters them after the furniture, by the
// room's clutter amount. Drawn loose inside the square so they read as random when turned.

import { stoneShape } from '../motifs.js';

const ALL = ['classic', 'fantasy', 'scifi'];
const CF = ['classic', 'fantasy'];
const S = ['scifi'];
const opts = (roomTypes, more = {}) => ({ placement: 'free', layer: 'floor', blocksMovement: false, clutter: true, roomTypes, ...more });

/** A splat: blob with a few droplets, from fixed offsets so it stays the same each build. */
function splat(g, cx, cy, r, cls) {
  const pts = [];
  const k = 14;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2;
    const j = [1, 0.7, 1.15, 0.8, 1.05, 0.65, 1.2, 0.9, 0.75, 1.1, 0.85, 1.25, 0.7, 0.95][i];
    pts.push([cx + Math.cos(a) * r * j, cy + Math.sin(a) * r * j * 0.85]);
  }
  g.poly(pts, cls);
  for (const [dx, dy, s] of [[1.5, -0.6, 0.18], [-1.4, 0.9, 0.14], [0.9, 1.3, 0.12], [-0.6, -1.5, 0.1]]) g.circle(cx + dx * r, cy + dy * r, r * s, cls);
}

export default function define({ A }) {
  A('cracks', 'Floor cracks', ALL, [1, 1], opts(['*'], { weight: 2 }), (g) => {
    g.path('M14 30L34 42L44 38L58 56L82 60', 'l');
    g.path('M44 38L48 22L56 14', 't');
    g.path('M58 56L54 74L62 88', 't');
    g.path('M34 42L28 60', 't');
  });

  A('puddle', 'Puddle', ALL, [1, 1], opts(['cave', 'cellar', 'crypt', 'prison', 'corridor', 'mine', 'hangar', 'landing-pad', 'hydroponics-bay', 'kitchen', 'engine-room', 'alien-ruins', 'forest', 'farmyard', 'jungle', 'clearing', 'ruin']), (g) => {
    splat(g, 48, 52, 28, 'h');
    g.ellipse(40, 46, 10, 5, 'pl');
    g.ellipse(60, 60, 6, 3, 'pl');
  });

  A('bloodstain', 'Bloodstain', ALL, [1, 1], opts(['prison', 'crypt', 'barracks', 'cave', 'detention', 'med-bay', 'security', 'alien-ruins', 'mine', 'clinic', 'throne-room', 'ruin'])
    , (g) => {
      splat(g, 46, 50, 20, 'hm');
      g.path('M60 58Q70 66 74 80', 't');
      g.circle(76, 84, 4, 'hm');
    });

  A('papers', 'Scattered papers', ALL, [1, 1], opts(['library', 'chamber', 'bridge', 'command-centre', 'lab', 'security', 'server-room', 'shop', 'bedroom', 'apartment', 'throne-room']), (g) => {
    g.add('<g transform="rotate(-18 36 40)">').rect(20, 26, 32, 40, 'o', 2).lines([[26, 36, 46, 36], [26, 44, 46, 44], [26, 52, 40, 52]], 't').add('</g>');
    g.add('<g transform="rotate(24 64 60)">').rect(48, 44, 30, 36, 'o', 2).lines([[54, 54, 72, 54], [54, 62, 72, 62]], 't').add('</g>');
  });

  A('loose-straw', 'Loose straw', CF, [1, 1], opts(['barracks', 'prison', 'cellar', 'storeroom', 'tavern', 'smithy', 'kitchen']), (g) => {
    const segs = [[18, 40, 46, 30], [24, 56, 54, 50], [40, 70, 70, 76], [50, 34, 80, 44], [58, 58, 86, 52], [30, 76, 44, 58], [62, 24, 70, 40]];
    g.lines(segs, 'l');
    g.lines(segs.map(([a, b, c, d]) => [a + 3, b + 3, (a + c) / 2 + 3, (b + d) / 2 + 3]), 't');
  });

  A('scorch', 'Scorch mark', ALL, [1, 1], opts(['smithy', 'engine-room', 'armoury', 'hangar', 'workshop', 'alien-ruins', 'kitchen', 'temple', 'landing-pad', 'crash-site', 'camp', 'ruin']), (g) => {
    g.star(50, 50, 36, 18, 9, 'h');
    splat(g, 50, 50, 16, 'hm');
    g.circle(50, 50, 6, 'k');
  });

  A('pebbles', 'Pebbles', ALL, [1, 1], opts(['cave', 'mine', 'alien-ruins', 'crypt', 'wasteland', 'clearing', 'ruin']), (g) => {
    for (const [x, y, r, s] of [[28, 34, 9, 1], [56, 26, 6, 2], [70, 52, 10, 3], [40, 64, 7, 4], [64, 78, 5, 5], [22, 70, 5, 6]]) g.poly(stoneShape(x, y, r, s), s % 2 ? 's' : 'o');
  });

  A('rat', 'Rat', CF, [1, 1], opts(['cellar', 'prison', 'crypt', 'storeroom', 'cave', 'kitchen', 'corridor']), (g) => {
    g.path('M30 56Q14 64 18 80Q22 90 34 86', 'l');
    g.ellipse(48, 50, 18, 10, 'm');
    g.poly([[62, 44], [78, 50], [62, 56]], 'm');
    g.circle(60, 42, 4, 's');
    g.circle(60, 58, 4, 's');
    g.circle(72, 48, 2, 'k');
  });

  A('spilled-ale', 'Spilled tankard', ['fantasy'], [1, 1], opts(['tavern', 'kitchen', 'great-hall', 'cellar']), (g) => {
    splat(g, 60, 58, 20, 'h');
    g.rect(22, 30, 34, 24, 'o', 4);
    g.rect(22, 30, 8, 24, 's', 3);
    g.path('M38 54Q38 66 48 66', 'l');
  });

  A('cables', 'Loose cables', S, [1, 1], opts(['corridor', 'engine-room', 'server-room', 'workshop', 'bridge', 'lab', 'command-centre', 'mine', 'cargo-bay']), (g) => {
    g.path('M6 30C30 20 40 60 62 46S86 70 94 64', 'l');
    g.path('M6 70C24 76 36 44 56 58S78 30 94 34', 'l');
    g.rect(52, 50, 12, 10, 'ko', 2);
  });

  A('oil-stain', 'Oil stain', S, [1, 1], opts(['hangar', 'cargo-bay', 'engine-room', 'workshop', 'landing-pad', 'mine']), (g) => {
    splat(g, 50, 50, 26, 'hm');
    g.ellipse(44, 44, 9, 5, 'pl');
  });

  A('debris', 'Debris', S, [1, 1], opts(['alien-ruins', 'mine', 'cargo-bay', 'hangar', 'corridor', 'engine-room', 'crash-site', 'wasteland', 'ruin'], { tags: ['difficult terrain'] }), (g) => {
    g.poly([[14, 22], [46, 16], [52, 40], [20, 48]], 's');
    g.poly([[56, 50], [86, 58], [78, 84], [50, 76]], 'o');
    g.poly([[24, 62], [40, 58], [42, 72]], 'm');
    for (const [x, y] of [[20, 26], [44, 22], [60, 56], [80, 62]]) g.circle(x, y, 2.5, 'k');
    g.lines([[30, 34, 40, 30], [62, 70, 74, 66]], 't');
  });
}
