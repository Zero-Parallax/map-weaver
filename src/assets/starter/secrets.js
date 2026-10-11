// Secrets: things only the GM sees (left out of the player map, like traps). Drawn as the real
// thing under a dashed GM ring, so they read as a note on the map: a loose flagstone with a
// stash under it, a lever hidden in a sconce, a floor cache, a hidden wall panel. The
// decorator adds one now and then, and always one in a hidden room (tags: secret).

const F = ['fantasy'];
const S = ['scifi'];
const ROOMS_F = ['bedroom', 'library', 'chamber', 'storeroom', 'cellar', 'crypt', 'throne-room', 'tavern', 'shop', 'barracks', 'kitchen', 'temple', 'great-hall', 'prison', 'smithy'];
const ROOMS_S = ['crew-quarters', 'apartment', 'bridge', 'command-centre', 'cargo-bay', 'armoury', 'lab', 'security', 'detention', 'engine-room', 'server-room', 'cantina', 'market', 'med-bay', 'workshop', 'hangar', 'mess-hall'];

/** The GM's dashed ring and a small keyhole mark in its corner. */
function gmMark(g, cx, cy, r) {
  g.circle(cx, cy, r, 'd');
  g.circle(cx + r * 0.72, cy - r * 0.72, 8, 'k');
  g.circle(cx + r * 0.72, cy - r * 0.76, 2.6, 'p');
  g.rect(cx + r * 0.72 - 1.4, cy - r * 0.74, 2.8, 5, 'p');
}

export default function defineSecrets({ A }) {
  const opts = (placement, roomTypes, extra = {}) => ({ placement, layer: 'floor', blocksMovement: false, roomTypes, max: 1, weight: 1, tags: ['secret'], gmOnly: true, ...extra });

  A('hidden-stash', 'Hidden stash', F, [1, 1], opts('free', ROOMS_F), (g) => {
    // A loose flagstone, lifted a crack, with a small chest in the hollow beneath.
    g.rect(16, 16, 68, 68, 'h', 4);
    g.rect(16, 16, 68, 68, 't', 4);
    g.rect(30, 38, 40, 28, 'k', 3);
    g.line(30, 48, 70, 48, 'pl');
    g.rect(46, 44, 8, 8, 'p', 1);
    gmMark(g, 50, 50, 42);
  });

  A('secret-lever', 'Secret lever', F, [1, 1], opts('wall', ROOMS_F.concat(['corridor'])), (g) => {
    // A wall sconce that pulls down to open something.
    g.rect(38, 4, 24, 12, 'k', 3);
    g.rect(46, 14, 8, 26, 'k', 3);
    g.circle(50, 42, 8, 'k');
    g.circle(50, 42, 3, 'p');
    g.path('M64 18Q74 30 66 44', 'l'); // which way it pulls
    g.poly([[60, 42], [70, 46], [66, 36]], 'k');
    gmMark(g, 50, 32, 30);
  });

  A('floor-cache', 'Floor cache', S, [1, 1], opts('free', ROOMS_S), (g) => {
    // A deck plate that lifts out: a box of contraband in the void under the floor.
    g.chamfer(14, 14, 72, 72, 10, 'h');
    g.chamfer(14, 14, 72, 72, 10, 't');
    for (const [x, y] of [[22, 22], [78, 22], [22, 78], [78, 78]]) g.circle(x, y, 2.6, 'k');
    g.chamfer(30, 36, 40, 30, 5, 'k');
    g.line(30, 50, 70, 50, 'pl');
    g.rect(46, 46, 8, 8, 'p', 1);
    gmMark(g, 50, 50, 42);
  });

  A('hidden-panel', 'Hidden panel', S, [1, 1], opts('wall', ROOMS_S.concat(['corridor'])), (g) => {
    // A wall panel that swings open on a hidden switch.
    g.chamfer(24, 4, 52, 30, 5, 'h');
    g.chamfer(24, 4, 52, 30, 5, 't');
    g.rect(30, 10, 40, 18, 'k', 2);
    g.circle(66, 30, 3, 'k');
    g.path('M30 36Q20 46 30 54', 'l'); // swings out
    g.poly([[26, 52], [34, 56], [32, 46]], 'k');
    gmMark(g, 50, 26, 28);
  });
}
