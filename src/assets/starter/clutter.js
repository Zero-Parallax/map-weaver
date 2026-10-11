// Clutter: small floor decals that make rooms look lived-in (cracks, puddles, stains, papers,
// cables). They never block movement; the decorator scatters them after the furniture, by the
// room's clutter amount. Drawn loose inside the square so they read as random when turned.

import { stoneShape } from '../motifs.js';

const ALL = ['fantasy', 'scifi'];
const CF = ['fantasy'];
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

function drawCracks(g) {
  // A main fracture that splits and tapers, with a chip knocked out where it forks.
  g.path('M10 30L30 42L44 38L58 56L74 58L90 66', 'l');
  g.path('M44 38L48 22L58 12', 't');
  g.path('M58 56L54 72L62 88', 't');
  g.path('M30 42L26 58L18 64', 't');
  g.poly([[42, 36], [48, 34], [50, 40], [44, 42]], 'hm');
}

export default function define({ A }) {
  // Cracks belong in old stone and rough places, never on a ship or in a lived-in home.
  A('cracks', 'Floor cracks', CF, [1, 1], opts(['chamber', 'throne-room', 'temple', 'crypt', 'storeroom', 'prison', 'cellar', 'cave', 'ruin'], { weight: 2 }), drawCracks);
  A('cracked-floor', 'Cracked floor', S, [1, 1], opts(['alien-ruins', 'mine', 'ruin'], { weight: 2 }), drawCracks);

  A('puddle', 'Puddle', ALL, [1, 1], opts(['cave', 'cellar', 'crypt', 'prison', 'corridor', 'mine', 'hangar', 'landing-pad', 'hydroponics-bay', 'kitchen', 'engine-room', 'alien-ruins', 'forest', 'farmyard', 'jungle', 'clearing', 'ruin']), (g) => {
    splat(g, 48, 52, 28, 'h');
    splat(g, 50, 54, 16, 'hm');
    g.path('M30 44Q38 38 48 42', 'pl'); // reflections
    g.path('M58 62Q64 60 68 64', 'pl');
  });

  A('bloodstain', 'Bloodstain', ALL, [1, 1], opts(['prison', 'crypt', 'barracks', 'cave', 'detention', 'med-bay', 'security', 'alien-ruins', 'mine', 'clinic', 'throne-room', 'ruin'])
    , (g) => {
      splat(g, 46, 50, 20, 'hm');
      splat(g, 44, 48, 9, 'k');
      g.path('M60 58Q70 66 74 80', 'l'); // a smear
      g.circle(76, 84, 4, 'hm');
      for (const [x, y, r] of [[22, 24, 2.5], [80, 30, 2], [16, 74, 2]]) g.circle(x, y, r, 'hm');
    });

  A('papers', 'Scattered papers', ALL, [1, 1], opts(['library', 'chamber', 'bridge', 'command-centre', 'lab', 'security', 'server-room', 'shop', 'bedroom', 'apartment', 'throne-room']), (g) => {
    g.add('<g transform="rotate(-18 36 40)">').rect(20, 26, 32, 40, 'o', 2).lines([[26, 36, 46, 36], [26, 43, 46, 43], [26, 50, 40, 50]], 't').path('M42 66l10-10v10Z', 's').add('</g>');
    g.add('<g transform="rotate(24 64 60)">').rect(48, 44, 30, 36, 'o', 2).lines([[54, 53, 72, 53], [54, 60, 72, 60], [54, 67, 66, 67]], 't').add('</g>');
    g.add('<g transform="rotate(-50 70 26)">').rect(58, 22, 26, 9, 'o', 4).circle(58, 26.5, 4.5, 'o').add('</g>'); // a rolled scroll
  });

  A('loose-straw', 'Loose straw', CF, [1, 1], opts(['barracks', 'prison', 'cellar', 'storeroom', 'tavern', 'smithy', 'kitchen']), (g) => {
    const segs = [[18, 40, 46, 30], [24, 56, 54, 50], [40, 70, 70, 76], [50, 34, 80, 44], [58, 58, 86, 52], [30, 76, 44, 58], [62, 24, 70, 40], [14, 62, 30, 66], [70, 66, 84, 80]];
    g.lines(segs, 'l');
    g.lines(segs.map(([a, b, c, d]) => [a + 3, b + 4, (a + c) / 2 + 3, (b + d) / 2 + 4]), 't');
  });

  A('scorch', 'Scorch mark', ALL, [1, 1], opts(['smithy', 'engine-room', 'armoury', 'hangar', 'workshop', 'alien-ruins', 'kitchen', 'temple', 'landing-pad', 'crash-site', 'camp', 'ruin']), (g) => {
    g.star(50, 50, 38, 18, 12, 'h');
    splat(g, 50, 50, 20, 'hm');
    splat(g, 50, 50, 9, 'k');
    for (const [x, y] of [[20, 22], [82, 30], [76, 80], [18, 70]]) g.circle(x, y, 2.4, 'hm');
  });

  A('pebbles', 'Pebbles', ALL, [1, 1], opts(['cave', 'mine', 'alien-ruins', 'crypt', 'wasteland', 'clearing', 'ruin']), (g) => {
    for (const [x, y, r, s] of [[28, 34, 10, 1], [56, 26, 7, 2], [70, 52, 11, 3], [40, 64, 8, 4], [64, 80, 6, 5], [22, 72, 6, 6], [84, 30, 5, 7]]) g.poly(stoneShape(x, y, r, s), s % 2 ? 's' : 'o');
    for (const [x, y] of [[46, 44], [80, 70], [30, 52], [52, 86]]) g.circle(x, y, 2.2, 'k');
  });

  // Animals are tokens, not scenery: the rat is only for placing by hand.
  A('rat', 'Rat', CF, [1, 1], opts(['by-hand']), (g) => {
    g.path('M30 54Q12 60 16 78Q20 90 34 86', 'l'); // tail
    g.path('M38 42l-4 -6M40 58l-4 6M56 42l2 -6M56 58l2 6', 't'); // feet
    g.path('M28 50Q30 38 48 38Q64 40 68 48Q76 50 82 50Q76 52 68 52Q64 60 48 62Q30 62 28 50Z', 'm'); // body and snout
    g.circle(58, 40, 4.5, 's'); // ears
    g.circle(58, 60, 4.5, 's');
    g.circle(70, 46, 1.8, 'p'); // eyes
    g.circle(70, 54, 1.8, 'p');
    g.path('M82 50l8 -4M82 50l8 4', 't'); // whiskers
  });

  A('spilled-ale', 'Spilled tankard', ['fantasy'], [1, 1], opts(['tavern', 'kitchen', 'great-hall', 'cellar']), (g) => {
    splat(g, 60, 60, 22, 'h');
    // A tankard on its side: base, body with hoops, handle.
    g.rect(20, 28, 38, 26, 'o', 4);
    g.ellipse(20, 41, 5, 13, 's');
    g.lines([[32, 28, 32, 54], [46, 28, 46, 54]], 't');
    g.path('M36 54Q36 68 48 66', 'l');
    g.path('M58 34Q64 40 58 48', 't');
  });

  A('cables', 'Loose cables', S, [1, 1], opts(['corridor', 'engine-room', 'server-room', 'workshop', 'bridge', 'lab', 'command-centre', 'mine', 'cargo-bay']), (g) => {
    g.path('M6 30C30 20 40 60 62 46S80 64 86 62', 'l');
    g.path('M6 70C24 76 36 44 56 58S74 34 82 34', 'l');
    // Plugs on the loose ends.
    g.add('<g transform="rotate(-15 86 62)">').rect(82, 56, 12, 12, 'ko', 2).lines([[94, 59, 98, 59], [94, 65, 98, 65]], 't').add('</g>');
    g.add('<g transform="rotate(10 82 34)">').rect(78, 28, 12, 12, 'ko', 2).lines([[90, 31, 94, 31], [90, 37, 94, 37]], 't').add('</g>');
  });

  A('oil-stain', 'Oil stain', S, [1, 1], opts(['hangar', 'cargo-bay', 'engine-room', 'workshop', 'landing-pad', 'mine']), (g) => {
    splat(g, 50, 50, 26, 'hm');
    g.ellipse(44, 44, 9, 5, 'pl');
  });

  A('debris', 'Debris', S, [1, 1], opts(['alien-ruins', 'mine', 'cargo-bay', 'hangar', 'corridor', 'engine-room', 'crash-site', 'wasteland', 'ruin'], { tags: ['difficult terrain'] }), (g) => {
    // Torn hull plates with rivets and a snapped pipe.
    g.poly([[12, 22], [46, 14], [52, 30], [44, 34], [50, 44], [18, 50]], 's');
    g.poly([[54, 50], [88, 56], [80, 86], [58, 82], [62, 70], [50, 72]], 'o');
    g.rect(18, 60, 26, 9, 'm', 3);
    g.path('M44 60l4 4l-3 3l4 3', 't');
    for (const [x, y] of [[20, 26], [42, 20], [22, 44], [60, 56], [82, 62], [76, 80]]) g.circle(x, y, 2.5, 'k');
    g.lines([[28, 30, 40, 28], [64, 66, 76, 70]], 't');
  });
}
