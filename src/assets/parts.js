// Pieces assembled from parts that change with the room's mood (see moods.js):
//   supply   the things a room in use has: ration crates, trays, datapads, toolboxes, med kits,
//            ammo cases, personal kit, fuel cells, sample cases, drinks (and fantasy
//            provisions, crockery, books, firewood). Stocked and tidy when pristine, used when
//            lived-in, stale and thinned out when neglected, tipped and strewn when ransacked.
//   console  screens lit, a mug left out / screens dying, dust / panel off, wires out, cracked
//   locker   doors shut / one ajar / dusty / forced open, contents on the floor (storage,
//            weapons, armour)
//   medbed   sheets tucked / thrown back / bare and stained / slashed and bloodied
//   medcab   full / doors ajar, gaps / few left / glass smashed, bottles on the floor
//
// One square = 100 units. Small details use the unstroked classes (k, p, h, hm): the 6-unit
// outline turns anything small into an ink blob.

import { Drawing, U } from './svg.js';
import { rng, hash } from '../core/rng.js';
import { screen, buttons, slats, bolts } from './motifs.js';
import { DEFAULT_MOOD, moodIndex } from './moods.js';

// ---- shared bits ------------------------------------------------------------

/** Draw `fn` with the origin moved to (x, y) and turned by `deg`. */
function at(g, x, y, deg, fn) {
  g.add(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})${deg ? ` rotate(${Math.round(deg)})` : ''}">`);
  fn();
  g.add('</g>');
}

/** A scatter of dust specks over a box. */
export function dust(g, r, x, y, w, h, count = 6) {
  for (let i = 0; i < count; i++) g.circle(x + r() * w, y + r() * h, 1.4 + r() * 1.2, 'hm');
}

/** A cobweb strung across a corner at (x, y); sx, sy = which way it opens (+1 or -1). */
export function web(g, x, y, sx = 1, sy = 1, size = 22) {
  g.lines([[x, y, x + sx * size, y], [x, y, x, y + sy * size], [x, y, x + sx * size * 0.72, y + sy * size * 0.72]], 't');
  g.path(`M${x + sx * size * 0.55} ${y}Q${x + sx * size * 0.4} ${y + sy * size * 0.4} ${x} ${y + sy * size * 0.55}`, 't');
}

/** Broken glass: a few sharp slivers round (x, y). */
export function shards(g, r, x, y, spread = 14, count = 3) {
  for (let i = 0; i < count; i++) {
    const bx = x + (r() - 0.5) * spread * 2;
    const by = y + (r() - 0.5) * spread * 2;
    const a = r() * Math.PI;
    const dx = Math.cos(a) * 7;
    const dy = Math.sin(a) * 7;
    g.poly([[bx - dx, by - dy], [bx + dx, by + dy], [bx + dy * 0.4, by - dx * 0.4]], 'k');
  }
}

/** A spill: an irregular puddle. */
export function spill(g, r, x, y, size = 12) {
  const a = size * (0.8 + r() * 0.4);
  g.path(`M${x - a} ${y}q${a * 0.3} ${-a * 0.9} ${a} ${-a * 0.6}q${a * 0.9} ${a * 0.1} ${a * 0.8} ${a * 0.7}q${-a * 0.2} ${a * 0.8} ${-a * 0.9} ${a * 0.6}q${-a * 0.8} 0 ${-a * 0.9} ${-a * 0.7}Z`, 'hm');
}

// ---- supplies -----------------------------------------------------------------

// Each kind: slots (where the items stand when stocked, backs to the top edge = the wall),
// item(g, state, index, r) drawn round the origin (state: neat | open | broken), and bit(g, r):
// a small loose thing (a ration pack, a cup, a spanner) that ends up on the floor.
const SUPPLY_KINDS = {
  rations: {
    slots: [[30, 28], [70, 28], [50, 64]],
    item(g, st) {
      if (st === 'broken') {
        g.poly([[-18, -9], [14, -15], [19, 10], [-13, 14]], 's');
        g.rect(-9, -5, 11, 7, 'p', 1);
        g.rect(3, 1, 11, 7, 'p', 1);
        return;
      }
      g.chamfer(-18, -14, 36, 28, 5, 's');
      if (st === 'open') {
        g.rect(-12, -8, 24, 16, 'k', 2);
        for (const x of [-7, 0, 7]) g.rect(x - 2.5, -6, 5, 12, 'p', 1);
      } else {
        g.line(-18, 0, 18, 0, 't');
        g.rect(-7, -10, 14, 6, 'k', 1);
        g.rect(-7, 4, 14, 6, 'k', 1);
      }
    },
    bit(g) {
      g.rect(-7, -4.5, 14, 9, 'k', 1.5);
      g.rect(-4, -2, 8, 4, 'p', 1);
    },
  },
  tray: {
    slots: [[34, 34], [66, 62]],
    item(g, st, i, r) {
      if (st === 'broken') {
        g.rect(-20, -13, 40, 26, 's', 5); // face down
        g.line(-14, 0, 14, 0, 't');
        return;
      }
      g.rect(-21, -14, 42, 28, 'o', 5);
      g.line(-5, -10, -5, 10, 't');
      if (st === 'open') {
        g.circle(-13, 2, 5.5, 'hm');
        g.circle(7, -3, 4.5, 'hm');
        g.circle(12, 6, 3, 'k');
      } else {
        for (const x of [-13, 8]) {
          g.circle(x, 0, 5.5, 'k');
          g.circle(x, 0, 2.4, 'p');
        }
        g.line(16, -8, 16, 8, 't');
      }
    },
    bit(g) {
      g.circle(0, 0, 6, 'k');
      g.circle(0, 0, 3, 'p');
    },
  },
  datapads: {
    slots: [[44, 38], [50, 44], [56, 50]],
    item(g, st) {
      g.rect(-12, -16, 24, 32, 'ko', 3);
      if (st === 'broken') g.path('M-6 -10L1 -2L-3 3L5 11M1 -2L7 -6', 'pl');
      else if (st === 'open') {
        g.rect(-8, -12, 16, 20, 'h', 1);
        g.lines([[-5, -8, 5, -8], [-5, -3, 3, -3], [-5, 2, 4, 2]], 'pl');
      } else g.lines([[-6, -9, 6, -9], [-6, -4, 3, -4]], 'pl');
    },
    bit(g) {
      g.rect(-2, -9, 4, 18, 'k', 2); // stylus
    },
  },
  toolbox: {
    slots: [[38, 32], [66, 66]],
    item(g, st, i) {
      if (i % 2) {
        // Spare-parts crate: a ribbed box.
        g.chamfer(-16, -16, 32, 32, 5, st === 'broken' ? 'o' : 's');
        if (st !== 'broken') slats(g, -10, -10, 20, 20, 6, 'v', 't');
        else for (const [x, y] of [[-6, -4], [5, 5]]) g.rect(x - 4, y - 4, 8, 8, 'k', 1);
        return;
      }
      if (st === 'broken') {
        g.rect(-22, -10, 44, 20, 'm', 3);
        g.rect(-17, -6, 34, 12, 'k', 2);
        return;
      }
      g.rect(-23, -12, 46, 24, 'm', 3);
      if (st === 'open') {
        g.rect(-18, -8, 36, 16, 'k', 2);
        g.lines([[-13, -3, 2, -3], [-12, 3, 10, 3]], 'pl');
      } else {
        g.rect(-10, -4, 20, 8, 'k', 2); // handle
        g.line(-23, 6, 23, 6, 't');
      }
    },
    bit(g) {
      // A spanner.
      g.rect(-2.5, -10, 5, 20, 'k', 2);
      g.circle(0, -11, 5, 'k');
      g.circle(0, -13, 2.2, 'p');
    },
  },
  medkit: {
    slots: [[34, 34], [68, 40]],
    item(g, st) {
      g.chamfer(-17, -13, 34, 26, 4, 'o');
      if (st === 'neat') {
        g.rect(-2.5, -8, 5, 16, 'k');
        g.rect(-8, -2.5, 16, 5, 'k');
      } else {
        g.rect(-12, -8, 24, 16, 'h', 2);
        if (st === 'open') {
          g.circle(-5, 0, 5, 'p');
          g.circle(-5, 0, 2, 'k');
          g.rect(3, -5, 4, 10, 'k', 1);
        } else g.rect(3, -5, 4, 10, 'hm', 1);
      }
    },
    bit(g) {
      g.rect(-2.5, -7, 5, 14, 'k', 1.5); // a vial
      g.rect(-2.5, -9, 5, 3, 'hm');
    },
  },
  ammo: {
    slots: [[30, 30], [68, 30], [48, 64]],
    item(g, st) {
      g.rect(-19, -12, 38, 24, 's', 2);
      if (st === 'neat') {
        g.rect(-4, -12, 8, 6, 'k', 1); // latch
        g.lines([[-13, 3, 13, 3]], 't');
      } else {
        g.rect(-15, -8, 30, 16, 'k', 2);
        if (st === 'open') for (let x = -11; x <= 11; x += 5.5) g.circle(x, 0, 2.2, 'p');
      }
    },
    bit(g) {
      g.rect(-1.8, -5, 3.6, 10, 'k', 1);
      g.rect(5, -2, 3.6, 8, 'k', 1);
    },
  },
  personal: {
    slots: [[36, 34], [68, 62]],
    item(g, st, i) {
      if (i % 2) {
        // A pair of boots.
        const off = st === 'neat' ? 0 : 8;
        g.ellipse(-8, 0, 7.5, 14, 'm');
        g.ellipse(9, off, 7.5, 14, 'm');
        g.line(-8, -6, -8, 4, 't');
        if (st !== 'broken') g.line(9, off - 6, 9, off + 4, 't');
        return;
      }
      if (st === 'neat') {
        // A folded jacket.
        g.rect(-18, -14, 36, 28, 'm', 4);
        g.path('M-8 -14L0 -6L8 -14', 't');
        g.line(0, -6, 0, 14, 't');
      } else {
        g.path('M-20 -6Q-10 -18 4 -12Q20 -12 18 2Q16 16 0 14Q-18 14 -20 -6Z', 'm');
        g.path('M-8 -4Q0 4 10 -2', 't');
      }
    },
    bit(g) {
      // A holo-frame face down.
      g.rect(-7, -9, 14, 18, 'k', 2);
      g.rect(-4, -6, 8, 6, 'h', 1);
    },
  },
  'fuel-cells': {
    slots: [[34, 36], [58, 36], [34, 62], [58, 62]],
    base(g) {
      g.chamfer(18, 20, 56, 58, 6, 'k');
    },
    item(g, st) {
      if (st === 'broken') {
        g.rect(-8, -17, 16, 34, 's', 7); // rolled on its side
        g.rect(-8, -17, 16, 6, 'k', 2);
        return;
      }
      g.circle(0, 0, 10.5, 's');
      g.circle(0, 0, 4.5, st === 'open' ? 'hm' : 'p');
    },
    bit(g) {
      g.circle(0, 0, 5, 'k');
      g.circle(0, 0, 2, 'p');
    },
  },
  samples: {
    slots: [[36, 34], [66, 60]],
    item(g, st) {
      g.chamfer(-19, -12, 38, 24, 5, 's');
      if (st === 'neat') {
        g.rect(-4, -12, 8, 5, 'k', 1);
        g.line(-19, 0, 19, 0, 't');
      } else {
        g.rect(-15, -8, 30, 16, 'k', 2);
        if (st === 'open') for (const [x, c] of [[-10, 'p'], [-4, 'hm'], [2, 'p'], [8, 'h']]) g.circle(x, 0, 2.5, c);
      }
    },
    bit(g) {
      g.rect(-2.5, -7, 5, 14, 'k', 2);
    },
  },
  drinks: {
    slots: [[36, 38], [68, 62]],
    item(g, st, i, r) {
      g.rect(-20, -20, 40, 40, 'o', 3);
      g.lines([[-20, -6.7, 20, -6.7], [-20, 6.7, 20, 6.7], [-6.7, -20, -6.7, 20], [6.7, -20, 6.7, 20]], 't');
      const full = st === 'neat' ? 1 : st === 'open' ? 0.6 : 0.25;
      for (const x of [-13.3, 0, 13.3]) {
        for (const y of [-13.3, 0, 13.3]) {
          if (r() > full) continue;
          g.circle(x, y, 4.2, 'k');
          g.circle(x, y, 1.6, 'p');
        }
      }
    },
    bit(g) {
      g.rect(-4.5, -11, 9, 22, 'k', 4); // a bottle on its side
      g.rect(-2, -16, 4, 6, 'k', 1);
    },
  },
  // Fantasy
  provisions: {
    slots: [[36, 38], [68, 60]],
    item(g, st, i, r) {
      if (i % 2) {
        // A sack of flour or grain, tied at the neck.
        g.path('M-16 -6Q-18 -16 -6 -18Q8 -20 14 -12Q20 0 14 12Q4 18 -8 16Q-18 12 -16 -6Z', st === 'broken' ? 'o' : 's');
        g.circle(0, -16, 4, 'k');
        if (st === 'broken') g.path('M8 10q10 4 14 12', 'l');
        return;
      }
      g.circle(0, 0, 18, 'm'); // basket
      g.circle(0, 0, 12, 'k');
      if (st === 'broken') return;
      const n = st === 'neat' ? 4 : 2;
      for (let k = 0; k < n; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        g.circle(Math.cos(a) * 6, Math.sin(a) * 6, 4.8, k % 2 ? 'h' : 'p');
      }
    },
    bit(g) {
      g.circle(0, 0, 5, 'hm'); // an apple, a turnip
      g.rect(-0.8, -7, 1.6, 3, 'k');
    },
  },
  crockery: {
    slots: [[34, 34], [66, 40], [50, 68]],
    item(g, st, i) {
      if (i % 3 === 1) {
        // A pot with its handle.
        g.circle(0, 0, 14, 's');
        g.circle(0, 0, 8, st === 'neat' ? 'k' : 'hm');
        g.rect(13, -3, 10, 6, 'k', 2);
        return;
      }
      if (st === 'broken') {
        for (const [x, y, a] of [[-6, -4, 0], [6, 5, 1.6]]) g.poly([[x, y], [x + 12 * Math.cos(a), y + 12 * Math.sin(a)], [x + 6, y + 9]], 'o');
        return;
      }
      g.circle(0, 0, 15, 'o'); // a stack of plates
      g.circle(0, 0, 9, 't');
    },
    bit(g) {
      g.poly([[-6, -4], [7, -2], [1, 6]], 'k');
    },
  },
  books: {
    slots: [[40, 36], [62, 62]],
    item(g, st) {
      if (st === 'broken') {
        g.path('M-16 -8L0 -3L16 -8V8L0 13L-16 8Z', 'o'); // open, face down
        g.line(0, -3, 0, 13, 't');
        return;
      }
      g.rect(-17, -12, 34, 24, 'm', 2);
      g.rect(-15, -8, 32, 18, 'o', 2);
      if (st === 'open') g.line(1, -8, 1, 10, 't');
      else g.lines([[-15, -2, 17, -2], [-15, 4, 17, 4]], 't');
    },
    bit(g) {
      g.rect(-6, -8, 12, 16, 'h', 1); // a loose page
      g.lines([[-3, -4, 3, -4], [-3, 0, 3, 0]], 't');
    },
  },
  firewood: {
    slots: [[50, 34], [50, 58]],
    item(g, st, i) {
      for (const y of [-7, 7]) {
        g.rect(-24, y - 6.5, 48, 13, 'm', 6);
        g.circle(-20, y, 4, 'h');
      }
      if (st === 'broken') g.rect(-14, -3, 28, 6, 'k', 3);
    },
    bit(g) {
      g.rect(-10, -2, 20, 4, 'k', 2);
    },
  },
};

export const SUPPLY_KIND_IDS = Object.keys(SUPPLY_KINDS);

/**
 * A small heap of supplies on one square. kind: see SUPPLY_KINDS. The top edge goes to the wall.
 */
function supply({ kind = 'rations', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const def = SUPPLY_KINDS[kind] || SUPPLY_KINDS.rations;
  const mi = moodIndex(mood);
  const r = rng(hash('supply', kind, seed, mood));
  const draws = rng(hash('supply-draw', kind, seed)); // per-item looks that don't change with mood
  const keep = [1, 0.9, 0.5, 0.7, 0.35][mi];
  const bits = [0, 1, 0, 3, 2][mi];
  if (def.base && mi < 3) def.base(g);
  const items = def.slots.map(([x, y], i) => ({ x, y, i })).filter((_, i) => i === 0 || r() < keep);
  const opened = mi === 1 ? Math.floor(r() * items.length) : -1;
  for (const it of items) {
    let { x, y } = it;
    let deg = 0;
    let st = 'neat';
    if (mi === 1) {
      x += (r() - 0.5) * 8;
      y += (r() - 0.5) * 6;
      deg = (r() - 0.5) * 24;
      if (it === items[opened]) st = 'open';
    } else if (mi === 2) {
      deg = (r() - 0.5) * 10;
    } else if (mi >= 3) {
      // Tipped and strewn over the square.
      x = 24 + r() * 52;
      y = 24 + r() * 52;
      deg = r() * 360;
      st = r() < 0.6 ? 'broken' : 'open';
    }
    const dr = rng(hash('supply-item', kind, seed, it.i));
    at(g, x, y, deg, () => def.item(g, st, it.i, dr));
    if (mi === 2 || mi === 4) dust(g, draws, x - 14, y - 10, 28, 20, 3);
  }
  for (let i = 0; i < bits; i++) at(g, 14 + r() * 72, 14 + r() * 72, r() * 360, () => def.bit(g, r));
  if (mi >= 3 && r() < 0.5) spill(g, r, 20 + r() * 60, 20 + r() * 60, 8);
  if (mi >= 3 && ['drinks', 'medkit', 'samples', 'crockery'].includes(kind)) shards(g, r, 30 + r() * 40, 30 + r() * 40, 14, 3);
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

// ---- console ------------------------------------------------------------------

/**
 * Sci-fi console against a wall: screens over a control deck. Pristine: every screen lit.
 * Lived-in: a mug and a datapad left on the deck. Neglected: some screens dead, dust.
 * Ransacked: a deck panel off with the wiring pulled out, screens cracked.
 */
function consoleUnit({ len = 2, screens = true, seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const W = len * U;
  const mi = moodIndex(mood);
  const styles = ['bars', 'radar', 'graph'];
  const r = rng(hash('console', len, seed));
  const rm = rng(hash('console-mood', len, seed, mood));
  g.chamfer(4, 4, W - 8, 64, 14, 's');
  g.rect(10, 4, W - 20, 6, 'ko', 2);
  if (screens) {
    for (let i = 0; i < len; i++) {
      const x = i * U + 14;
      const style = styles[Math.floor(r() * 3)];
      const dead = (mi === 2 && rm() < 0.5) || (mi >= 3 && rm() < 0.35) || mi === 4;
      if (dead) {
        g.chamfer(x, 13, U - 28, 26, 5, 'ko');
        g.line(x + 8, 19, x + 18, 19, 't'); // a dull glint
      } else screen(g, x, 13, U - 28, 26, style);
      if (mi >= 3 && rm() < 0.6) g.path(`M${x + 20} 15L${x + 28} 24L${x + 22} 29L${x + 32} 37M${x + 28} 24L${x + 40} 20`, 'pl');
    }
  }
  // Sloped keyboard deck: rows of keys and a dial per station.
  const pulled = mi >= 3 ? Math.floor(rm() * len) : -1;
  g.rect(12, 44, W - 24, 18, 'o', 4);
  for (let i = 0; i < len; i++) {
    if (i === pulled) {
      // Panel off: a dark hole with cables hanging out over the edge.
      g.rect(i * U + 16, 45, U - 30, 16, 'k', 2);
      g.path(`M${i * U + 30} 56q6 18 -4 30M${i * U + 46} 56q-4 16 8 26M${i * U + 60} 56q10 10 4 24`, 'l');
      g.rect(i * U + 58, 74, 18, 10, 's', 2); // the panel, dropped
      continue;
    }
    for (let k = 0; k < 6; k++) {
      g.rect(i * U + 18 + k * 9, 47, 6, 4, 'k', 1);
      g.rect(i * U + 18 + k * 9, 54, 6, 4, k === 2 ? 'h' : 'k', 1);
    }
    g.circle(i * U + 84, 53, 5, 'ko');
    g.circle(i * U + 84, 53, 1.8, 'p');
  }
  if (mi === 1) {
    // A mug and a datapad left on the deck.
    const mx = 22 + rm() * (W - 50);
    g.circle(mx, 53, 6.5, 'o');
    g.circle(mx, 53, 3, 'hm');
    if (rm() < 0.6) at(g, 20 + rm() * (W - 40), 76, (rm() - 0.5) * 30, () => {
      g.rect(-12, -8, 24, 16, 'ko', 3);
      g.lines([[-6, -2, 6, -2], [-6, 3, 3, 3]], 'pl');
    });
  }
  if (mi === 2 || mi === 4) {
    dust(g, rm, 14, 44, W - 28, 18, 4 + len * 2);
    web(g, 10, 10, 1, 1, 20);
  }
  if (mi >= 3) {
    // The mug knocked off, its contents on the floor.
    const sx = 20 + rm() * (W - 40);
    spill(g, rm, sx, 84, 9);
    g.circle(sx + 12, 80, 6, 'o');
  }
  return { footprint: { w: len, h: 1 }, drawing: g };
}

// ---- lockers and racks ---------------------------------------------------------

/** A rifle stood muzzle-up in a rack, centred on x. */
function rifle(g, x, y = 0) {
  g.rect(x - 2, y + 12, 4, 14, 'k', 1);
  g.rect(x - 6, y + 24, 12, 18, 'k', 2);
  g.rect(x - 2, y + 20, 4, 6, 'k');
  g.rect(x + 6, y + 30, 7, 10, 'k', 1);
  g.path(`M${x - 6} ${y + 40}H${x + 6}L${x + 8} ${y + 56}H${x - 8}Z`, 'k');
}

/** A rifle lying on the floor, centred on (x, y), along the x axis. */
function rifleDown(g, x, y, deg) {
  at(g, x, y, deg, () => {
    g.rect(-30, -2, 22, 4, 'k', 1);
    g.rect(-10, -6, 20, 12, 'k', 2);
    g.rect(2, 6, 8, 7, 'k', 1);
    g.path('M10 -6L28 -8V8L10 6Z', 'k');
  });
}

/** Armour suit on its stand, centred on x. */
function suit(g, x, cls = 's') {
  g.rect(x - 18, 12, 36, 16, 'm', 4); // backpack against the wall
  slats(g, x - 12, 14, 24, 12, 5, 'h', 't');
  g.ellipse(x, 44, 32, 15, cls);
  g.circle(x - 30, 46, 11, cls);
  g.circle(x + 30, 46, 11, cls);
  g.rect(x - 41, 50, 10, 24, cls, 4);
  g.rect(x + 31, 50, 10, 24, cls, 4);
  g.circle(x, 44, 13, 'o');
  g.path(`M${x - 10} 50Q${x} 58 ${x + 10} 50`, 'l');
  g.rect(x - 9, 47, 18, 7, 'ko', 3);
}

/**
 * Lockers against a wall, two squares long. kind: storage (four doors), weapons (a rifle rack
 * behind a door) or armour (two suits on stands). Mood: all shut and full / one door ajar,
 * something signed out / dusty, half empty / forced open, contents on the floor in front.
 */
function locker({ kind = 'storage', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const mi = moodIndex(mood);
  const r = rng(hash('locker', kind, seed, mood));
  const W = 2 * U;
  const floor = []; // things lying in front
  if (kind === 'weapons') {
    g.chamfer(4, 4, 192, 62, 10, 's');
    g.rect(12, 10, 148, 50, 'o', 3);
    const keep = [1, 0.75, 0.5, 0.2, 0.15][mi];
    [32, 68, 104, 140].forEach((x, i) => {
      if (i === 0 && mi < 3) rifle(g, x);
      else if (r() < keep) rifle(g, x);
      else if (mi >= 3 && r() < 0.6) floor.push('rifle');
      g.line(x - 12, 32, x + 12, 32, 't');
    });
    g.chamfer(166, 12, 24, 46, 4, 'ko'); // lock panel
    if (mi >= 3) {
      g.rect(169, 16, 18, 14, 'k', 2);
      g.path('M172 34q4 14 -4 26M182 34q2 12 8 20', 'l'); // lock ripped out
    } else {
      g.rect(171, 18, 14, 10, mi === 2 ? 'h' : 'o', 2);
      buttons(g, 171, 40, 14, 2, 2.6);
      buttons(g, 171, 49, 14, 2, 2.6);
    }
  } else if (kind === 'armour') {
    g.rect(4, 4, 192, 10, 'ko', 3);
    [52, 148].forEach((x, i) => {
      const there = mi === 0 || (mi === 1 && (i === 0 || r() < 0.5)) || (mi === 2 && i === 0) || (mi >= 3 && i === 0 && r() < 0.4);
      if (there) suit(g, x, mi === 2 || mi === 4 ? 'h' : 's');
      else {
        // The empty stand: a post and a bare hanger.
        g.rect(x - 18, 12, 36, 16, 'm', 4);
        g.rect(x - 4, 26, 8, 32, 'ko', 2);
        g.line(x - 26, 30, x + 26, 30, 'l');
        if (mi >= 3) floor.push('suit');
        else if (mi === 1) floor.push('helmet');
      }
    });
  } else {
    g.chamfer(4, 4, 192, 56, 8, 's');
    const open = new Set();
    if (mi === 1) open.add(Math.floor(r() * 4));
    if (mi === 2 && r() < 0.5) open.add(Math.floor(r() * 4));
    if (mi >= 3) for (let i = 0; i < 4; i++) if (r() < 0.6) open.add(i);
    for (let i = 0; i < 4; i++) {
      const x = 10 + i * 46;
      if (open.has(i)) {
        // Door open: the inside shows; the door swings out (bent and hanging when forced).
        g.rect(x, 10, 42, 44, 'm', 3);
        g.line(x + 8, 18, x + 34, 18, 'l');
        if (mi < 3 || r() < 0.4) g.path(`M${x + 14} 18v14h14v-14`, 't');
        else floor.push(r() < 0.5 ? 'box' : 'clothes');
        if (mi >= 3) g.poly([[x + 42, 54], [x + 46, 50], [x + 70, 84], [x + 58, 92]], 'o');
        else g.poly([[x + 42, 54], [x + 46, 54], [x + 76, 86], [x + 72, 90]], 'o');
        continue;
      }
      g.rect(x, 10, 42, 44, 'o', 3);
      slats(g, x + 8, 14, 26, 14, 5, 'h', 't');
      g.rect(x + 8, 34, 14, 6, 'ko', 1);
      g.rect(x + 32, 34, 5, 12, 'k', 1);
    }
  }
  if (mi === 2 || mi === 4) {
    dust(g, r, 12, 12, W - 24, 44, 8);
    web(g, r() < 0.5 ? 10 : W - 10, 10, 1, 1, 18);
  }
  // On the floor in front: what was taken out or knocked down.
  for (const what of floor.slice(0, 3)) {
    const fx = 26 + r() * (W - 52);
    const fy = 74 + r() * 14;
    const deg = r() * 360;
    if (what === 'rifle') rifleDown(g, fx, fy, (r() - 0.5) * 40);
    else if (what === 'suit') at(g, fx, fy, deg, () => {
      g.ellipse(0, 0, 24, 11, 's');
      g.circle(-22, 4, 9, 'o');
      g.rect(-27, 1, 10, 5, 'k', 2);
    });
    else if (what === 'helmet') at(g, fx, fy, deg, () => {
      g.circle(0, 0, 12, 'o');
      g.rect(-8, -2, 16, 7, 'k', 3);
    });
    else if (what === 'clothes') at(g, fx, fy, deg, () => g.path('M-16 -4Q-8 -14 4 -10Q16 -8 14 2Q10 12 -2 10Q-16 10 -16 -4Z', 'm'));
    else at(g, fx, fy, deg, () => g.rect(-12, -10, 24, 20, 's', 2));
  }
  return { footprint: { w: 2, h: 1 }, drawing: g };
}

// ---- medical --------------------------------------------------------------------

/**
 * Med bed with its wall monitor and drip stand. Pristine: sheet tucked, monitor tracing.
 * Lived-in: sheet thrown back, drip bag hung. Neglected: bare stained mattress, monitor dead.
 * Ransacked: mattress slashed, sheet bloodied and half off, drip stand knocked over.
 */
function medbed({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const mi = moodIndex(mood);
  const r = rng(hash('medbed', seed, mood));
  g.chamfer(8, 4, 84, 26, 6, 's'); // monitor unit on the wall
  if (mi === 2 || mi === 4) {
    g.chamfer(14, 8, 48, 18, 4, 'ko');
    g.line(20, 12, 28, 12, 't');
  } else {
    screen(g, 14, 8, 48, 18, mi === 0 ? 'graph' : 'bars');
    if (mi >= 3) g.path('M30 10L36 17L32 21L40 25', 'pl');
  }
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.circle(70 + i * 9, 12 + j * 9, 2.6, mi >= 2 ? 'h' : (i + j) % 2 ? 'p' : 'h');
  g.chamfer(10, 32, 80, 162, 12, 's'); // bed frame
  g.rect(18, 38, 64, 150, mi === 2 || mi === 4 ? 'h' : 'o', 10); // mattress
  if (mi === 2 || mi === 4) {
    g.rect(18, 38, 64, 150, 't', 10);
    g.path('M44 110q12 -6 20 2q-2 12 -14 10q-10 -2 -6 -12Z', 'hm');
    dust(g, r, 22, 44, 56, 140, 7);
  }
  if (mi >= 3) {
    g.path('M30 120l36 10M34 140l28 8', 'l');
    for (let i = 0; i < 4; i++) g.circle(34 + r() * 30, 122 + r() * 22, 3 + r() * 2, 'p');
  }
  if (mi < 2 || (mi === 3 && r() < 0.6)) {
    g.rect(28, 44, 44, 22, mi === 3 ? 's' : 'o', 9); // pillow
    if (mi === 0) g.line(36, 55, 64, 55, 't');
  }
  if (mi === 0) {
    g.rect(18, 90, 64, 98, 's', 8);
    g.rect(18, 90, 64, 14, 'o', 4);
    g.lines([[28, 130, 72, 130], [28, 158, 72, 158]], 't');
  } else if (mi === 1) {
    g.path('M18 118Q40 104 62 116T82 112V188H18Z', 's');
    g.path('M82 112L52 112L82 140Z', 'o');
    g.path('M28 150q18 10 40 2', 't');
  } else if (mi === 3) {
    // Sheet dragged half off the bed, blood on it.
    g.path('M30 100Q60 92 100 118L100 170Q62 180 34 150Z', 's');
    g.path('M58 128q10 -6 16 2q-2 8 -10 8q-8 -2 -6 -10Z', 'k');
  }
  // Side rail, drip stand and bag.
  g.rect(91, 70, 6, 60, 'ko', 2);
  if (mi >= 3) {
    at(g, 70, 190, 70, () => {
      g.rect(-2, -34, 4, 40, 'k', 2);
      g.circle(0, 8, 6, 'ko');
    });
  } else {
    g.circle(94, 44, 6, 'ko');
    if (mi === 1) g.rect(87, 34, 14, 12, 'o', 3);
  }
  return { footprint: { w: 1, h: 2 }, drawing: g };
}

/**
 * Medical cabinet on the wall. Pristine: full shelves behind glass. Lived-in: a door ajar, gaps.
 * Neglected: a few bottles left, dust. Ransacked: glass smashed, bottles on the floor in front.
 */
function medcab({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const mi = moodIndex(mood);
  const r = rng(hash('medcab', seed, mood));
  const keep = [1, 0.75, 0.35, 0.2, 0.15][mi];
  g.chamfer(6, 4, 88, 54, 8, 's');
  const glass = mi >= 3 ? 'h' : 'o';
  g.rect(12, 10, 36, 42, glass, 3);
  g.rect(52, 10, 36, 42, glass, 3);
  g.lines([[12, 31, 48, 31], [52, 31, 88, 31]], 't');
  const spots = [[19, 21, 'hm'], [28, 21, 'k'], [38, 21, 'hm'], [60, 42, 'k'], [70, 42, 'hm'], [19, 42, 'h'], [81, 21, 'hm'], [78, 42, 'k'], [62, 21, 'k'], [30, 42, 'hm']];
  let dropped = 0;
  for (const [x, y, c] of spots) {
    if (r() < keep) g.circle(x, y, 4.5, c);
    else dropped++;
  }
  if (mi >= 3) {
    // Glass smashed out of the doors.
    for (const [x0] of [[12], [52]]) g.path(`M${x0 + 4} 12L${x0 + 14} 24L${x0 + 8} 34L${x0 + 20} 48M${x0 + 14} 24L${x0 + 30} 18`, 'l');
  } else {
    g.chamfer(39, 14, 22, 22, 4, 'ko'); // cross plate on the door seam
    g.rect(47, 17, 6, 16, 'p');
    g.rect(42, 22, 16, 6, 'p');
  }
  if (mi === 1) g.poly([[88, 54], [92, 52], [98, 78], [94, 80]], 'o'); // door ajar
  if (mi === 2 || mi === 4) {
    dust(g, r, 12, 10, 76, 42, 6);
    web(g, 10, 8, 1, 1, 16);
  }
  if (mi >= 3) {
    for (let i = 0; i < Math.min(4, dropped); i++) {
      at(g, 16 + r() * 68, 70 + r() * 20, r() * 360, () => {
        g.rect(-3, -7, 6, 14, 'k', 2);
        g.rect(-2, -10, 4, 4, 'hm');
      });
    }
    shards(g, r, 50, 72, 26, 5);
    if (r() < 0.6) spill(g, r, 30 + r() * 40, 82, 8);
  }
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

/**
 * Mood dressing for counters (lab benches, bars): drawn over the counter. Neglected: dust and a
 * cobweb; ransacked: smashed glass and a spill on the top, something knocked to the floor.
 */
export function counterMood(g, { W, depth, kind, mood, seed }) {
  const mi = moodIndex(mood);
  const r = rng(hash('counter-mood', kind, W, seed, mood));
  if (mi === 2 || mi === 4) {
    dust(g, r, 12, 10, W - 24, depth - 22, Math.round(W / 25));
    web(g, 10, 8, 1, 1, 18);
  }
  if (mi >= 3) {
    for (let i = 0; i < Math.max(1, Math.round(W / 120)); i++) {
      const x = 24 + r() * (W - 48);
      spill(g, r, x, 28 + r() * 12, 10);
      shards(g, r, x + 8, 30, 12, 3);
    }
    // Something off the top, on the floor in front.
    const fx = 20 + r() * (W - 40);
    shards(g, r, fx, depth + 20, 14, 4);
    if (kind === 'lab' || kind === 'cantina' || kind === 'bar') spill(g, r, fx + 10, depth + 22, 9);
  }
}

export const PART_GENERATORS = {
  supply: { name: 'Supplies', params: {}, make: supply, moods: true },
  console: { name: 'Console', params: { len: [1, 4] }, make: consoleUnit, moods: true },
  locker: { name: 'Locker', params: {}, make: locker, moods: true },
  medbed: { name: 'Med bed', params: {}, make: medbed, moods: true },
  medcab: { name: 'Medical cabinet', params: {}, make: medcab, moods: true },
};
