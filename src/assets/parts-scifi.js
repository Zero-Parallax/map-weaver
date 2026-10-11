// Sci-fi pieces assembled from parts that change with the room's mood (see parts.js for the
// first batch and the shared bits). Moods: 0 pristine, 1 lived-in, 2 neglected, 3 ransacked,
// 4 ruined (neglected and ransacked together).
//
//   kitchenette   clean hob / a pan on, dishes in the sink / grime, dust / pan on the floor
//   serverRack    all lights on / a blade slid out / lights dead / blades torn out
//   toolCart      tools laid straight / in use / one left, dust / tray emptied on the floor
//   welder        put away / sparks flying / cold, dusty / gas bottle knocked over
//   securityDesk  chair tucked / mug, chair pushed back / screens dead / chair over, papers
//   plant         lush / a few picked / wilted, leaves dropped / uprooted, soil spilt / dead
//   stall         stocked / half sold / empty crates / tipped, awning torn
//   vending       full / gaps, a can in the tray / dark, dust / glass smashed, snacks out
//   lounge        cushions plumped / a throw, a cushion askew / sagging, dust / slashed
//   booth         table wiped / drinks and a plate / dust / drinks tipped, glass broken
//   obsBench      plant on the side table / a cup / dust / slashed, cup knocked over
//   tank          clear and occupied / more bubbles / cloudy / cracked and drained

import { Drawing, U } from './svg.js';
import { rng, hash } from '../core/rng.js';
import { screen, slats, seat, bolts, leafCluster } from './motifs.js';
import { DEFAULT_MOOD, moodIndex } from './moods.js';
import { dust, web, shards, spill } from './parts.js';

function at(g, x, y, deg, fn) {
  g.add(`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})${deg ? ` rotate(${Math.round(deg)})` : ''}">`);
  fn();
  g.add('</g>');
}

const moodOf = (mood) => {
  const mi = moodIndex(mood);
  return { mi, worn: mi === 2 || mi === 4, wrecked: mi >= 3 };
};

function lights(g, x, y, cols, rows, gap, off = false) {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) g.circle(x + i * gap, y + j * gap, 2.6, off ? 'hm' : (i + j * 3) % 4 ? 'p' : 'h');
}

/** A sheet of paper lying loose. */
function paper(g, x, y, deg) {
  at(g, x, y, deg, () => {
    g.rect(-7, -9, 14, 18, 'h', 1);
    g.lines([[-4, -5, 4, -5], [-4, -1, 3, -1], [-4, 3, 4, 3]], 't');
  });
}

/** A seat knocked onto its side. */
function seatOver(g, x, y, deg, size = 30) {
  at(g, x, y, deg, () => {
    g.rect(-size / 2, -7, size, 14, 's', 4);
    g.rect(-size / 2, -7, 8, 14, 'ko', 2);
  });
}

// ---- kitchenette ----------------------------------------------------------------

function kitchenette({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('kitchenette', seed, mood));
  g.chamfer(4, 4, 192, 62, 10, 's');
  g.rect(14, 12, 74, 44, 'ko', 6); // hob
  for (const x of [32, 70]) {
    g.circle(x, 34, 14, 'pl');
    g.circle(x, 34, 7, 'pl');
  }
  g.chamfer(110, 12, 76, 40, 10, 'm'); // sink and tap
  g.circle(148, 32, 4, 'k');
  g.path('M148 12V22Q148 28 154 28', 'l');
  if (mi === 0) {
    g.rect(94, 24, 12, 26, 'o', 3); // chopping board and knife, put away straight
    g.line(100, 28, 100, 46, 't');
  } else if (mi === 1) {
    // A pan on the front ring with something cooking; dishes in the sink; a mug.
    g.circle(32, 34, 17, 'm');
    g.rect(48, 30, 24, 8, 'ko', 3);
    for (const [dx, dy] of [[-5, -3], [4, 2], [-2, 6]]) g.circle(32 + dx, 34 + dy, 3.5, 'p');
    g.circle(132, 30, 11, 'o');
    g.circle(138, 34, 9, 'o');
    g.circle(138, 34, 4, 't');
    at(g, 100, 37, (r() - 0.5) * 30, () => {
      g.rect(-6, -13, 12, 26, 'o', 3);
      g.line(0, -9, 0, 9, 't');
    });
  } else if (!wrecked) {
    // Neglected: grime in the sink, a forgotten pan gone mouldy.
    g.circle(70, 34, 15, 'm');
    for (let i = 0; i < 4; i++) g.circle(64 + r() * 12, 28 + r() * 12, 2.5, 'h');
    g.path('M130 24q14 -4 20 6q2 10 -10 10q-14 -2 -10 -16Z', 'hm');
  }
  if (worn) {
    dust(g, r, 14, 10, 172, 50, 10);
    web(g, 10, 8, 1, 1, 20);
  }
  if (wrecked) {
    // The pan knocked onto the floor, food spilt, plates broken in the sink.
    const px = 30 + r() * 120;
    spill(g, r, px, 84, 13);
    at(g, px + 10, 82, r() * 360, () => {
      g.circle(0, 0, 13, 'm');
      g.rect(12, -4, 20, 8, 'ko', 3);
    });
    shards(g, r, 140, 32, 14, 4);
    shards(g, r, 40 + r() * 120, 88, 18, 3);
  }
  return { footprint: { w: 2, h: 1 }, drawing: g };
}

// ---- server rack ----------------------------------------------------------------

function serverRack({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('server', seed, mood));
  g.chamfer(6, 4, 88, 192, 8, 'ko');
  const units = [16, 22, 16, 30, 16, 22, 16, 22];
  const out = mi === 1 ? Math.floor(r() * units.length) : -1;
  let y = 12;
  const pulled = [];
  units.forEach((h, i) => {
    if (wrecked && r() < 0.35) {
      // Torn out: an empty slot with cables hanging.
      g.rect(14, y, 64, h, 'k', 2);
      g.path(`M${24 + r() * 20} ${y + 2}q${(r() - 0.5) * 16} ${h * 0.6} ${(r() - 0.5) * 10} ${h}`, 'pl');
      pulled.push(h);
      y += h + 4;
      return;
    }
    const dx = i === out ? 10 : 0;
    g.rect(14 + dx, y, 64, h, 's', 2);
    if (h > 20) slats(g, 40 + dx, y + 3, 34, h - 6, 4, 'v', 't');
    lights(g, 21 + dx, y + h / 2, h > 20 ? 2 : 4, 1, 7, worn || (wrecked && r() < 0.5));
    g.rect(80 + dx, y + 2, 6, h - 4, 'k', 1);
    y += h + 4;
  });
  g.path('M90 10V190', 'l');
  if (worn) {
    dust(g, r, 14, 12, 64, 180, 8);
    web(g, 10, 8, 1, 1, 18);
  }
  // Ransacked: the blades that were torn out lie across the bottom of the rack.
  pulled.slice(0, 2).forEach((h) => at(g, 30 + r() * 40, 150 + r() * 36, (r() - 0.5) * 70, () => {
    g.rect(-30, -h / 2, 60, h, 's', 2);
    g.circle(-20, 0, 2.4, 'hm');
  }));
  return { footprint: { w: 1, h: 2 }, drawing: g };
}

// ---- tool cart and welder -------------------------------------------------------

function spanner(g, x, y, deg, len = 40) {
  at(g, x, y, deg, () => {
    g.rect(-len / 2, -3.5, len, 7, 'k', 3);
    g.circle(len / 2, 0, 9, 'k');
    g.circle(len / 2 + 2, -3, 3.5, 'p');
  });
}

function driver(g, x, y, deg) {
  at(g, x, y, deg, () => {
    g.rect(-3.5, -16, 7, 18, 'hm', 2);
    g.rect(-1, 2, 2, 14, 'k');
  });
}

function toolCart({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('toolcart', seed, mood));
  const casters = [[16, 18], [84, 18], [16, 82], [84, 82]];
  casters.forEach(([x, y], i) => {
    if (!(wrecked && i === 3)) g.circle(x, y, 6, 'ko');
  });
  g.chamfer(12, 16, 76, 68, 8, 's');
  g.rect(18, 22, 64, 44, 'o', 4);
  if (mi === 0) {
    // Laid out straight.
    spanner(g, 44, 32, 0, 36);
    spanner(g, 44, 46, 0, 28);
    driver(g, 74, 46, 0);
  } else if (mi === 1) {
    spanner(g, 42, 44, -35, 40);
    g.circle(27, 55, 7, 'k');
    g.circle(27, 55, 3, 'p');
    driver(g, 71, 40, 10);
  } else if (!wrecked) {
    spanner(g, 46, 40, -12, 34);
  }
  g.rect(16, 70, 68, 10, 'ko', 3); // push handle
  if (worn) dust(g, r, 20, 24, 60, 40, 6);
  if (wrecked) {
    // Tray tipped out over the floor round the cart.
    spanner(g, 10 + r() * 20, 8 + r() * 10, r() * 360, 30);
    driver(g, 80 + r() * 10, 88, r() * 360);
    for (let i = 0; i < 3; i++) g.circle(r() * 100, 90 + r() * 8, 3, 'k');
  }
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

function welder({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('welder', seed, mood));
  g.chamfer(4, 4, 92, 40, 8, 's'); // bench
  g.circle(22, 24, 12, 'ko'); // gas bottles
  g.circle(22, 24, 4, 'p');
  if (wrecked) {
    // The second bottle knocked over, rolled out across the floor.
    at(g, 62, 84, 15 + r() * 40, () => {
      g.rect(-26, -9, 52, 18, 'ko', 8);
      g.rect(-32, -4, 8, 8, 'k', 2);
    });
  } else {
    g.circle(46, 24, 10, 'ko');
    g.circle(46, 24, 3.5, 'p');
  }
  if (!wrecked) {
    g.path('M64 12h22v20h-22Z', 'o'); // welding mask on the bench
    g.rect(68, 18, 14, 6, 'ko', 2);
  } else at(g, 24, 74, r() * 360, () => {
    g.path('M-11 -10h22v20h-22Z', 'o');
    g.rect(-7, -4, 14, 6, 'ko', 2);
  });
  if (mi === 0) {
    g.path('M46 34Q60 40 74 36', 'l'); // torch hung up
    g.rect(72, 32, 16, 8, 'ko', 2);
  } else {
    g.path('M46 34Q52 66 36 72', 'l');
    g.rect(28, 66, 16, 8, 'ko', 2);
  }
  if (mi === 1 || mi === 3) {
    g.rect(44, 74, 44, 16, 'm', 3); // the workpiece
    if (mi === 1) {
      g.star(44, 76, 13, 8, 4, 'k'); // sparks
      for (const [x, y] of [[30, 86], [58, 62], [26, 70], [54, 92]]) g.circle(x, y, 2, 'k');
    }
  } else if (mi === 2 || mi === 4) g.rect(44, 74, 44, 16, 'h', 3);
  if (worn) {
    dust(g, r, 8, 8, 84, 32, 5);
    web(g, 8, 6, 1, 1, 16);
  }
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

// ---- security desk --------------------------------------------------------------

function securityDesk({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('secdesk', seed, mood));
  g.path('M4 4H196V58H150Q100 82 50 58H4Z', 's');
  [['bars', 12], ['radar', 74], ['graph', 136]].forEach(([style, x]) => {
    const dead = (worn && r() < 0.7) || (wrecked && r() < 0.4);
    if (dead) g.chamfer(x, 8, 52, 26, 5, 'ko');
    else screen(g, x, 8, 52, 26, style);
    if (wrecked && r() < 0.6) g.path(`M${x + 14} 10L${x + 22} 20L${x + 16} 26L${x + 30} 32M${x + 22} 20L${x + 36} 14`, 'pl');
  });
  g.rect(74, 40, 52, 12, 'o', 3); // keyboard
  slats(g, 78, 41, 44, 10, 3.5, 'v', 't');
  if (mi === 0) seat(g, 100, 78, 'n', 26);
  else if (mi === 1) {
    g.circle(160, 46, 6, 'o'); // mug
    g.circle(160, 46, 3, 'm');
    at(g, 92, 88, -20 + r() * 10, () => seat(g, 0, 0, 'n', 26));
    paper(g, 40, 44, (r() - 0.5) * 40);
  } else if (!wrecked) seat(g, 100, 84, 'n', 26);
  if (worn) {
    dust(g, r, 10, 8, 180, 50, 9);
    web(g, 8, 6, 1, 1, 18);
  }
  if (wrecked) {
    seatOver(g, 60 + r() * 80, 86, r() * 360, 28);
    for (let i = 0; i < 4; i++) paper(g, 14 + r() * 172, 66 + r() * 26, r() * 360);
    spill(g, r, 160, 46, 8);
  }
  return { footprint: { w: 2, h: 1 }, drawing: g };
}

// ---- plants ---------------------------------------------------------------------

/**
 * One plant at (x, y) of size `rad`, as the mood has it. inSoil: the soil under it is ink, so
 * stems are drawn in paper.
 */
function plantAt(g, x, y, rad, seedN, state, r, inSoil = true) {
  if (state === 'gone') return;
  if (state === 'dead') {
    const segs = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r();
      segs.push([x, y, x + Math.cos(a) * rad * 0.7, y + Math.sin(a) * rad * 0.7]);
    }
    g.lines(segs, inSoil ? 'pl' : 't');
    return;
  }
  if (state === 'picked') return leafCluster(g, x, y, rad * 0.45, 3, seedN, ['s', 'o']);
  if (state === 'wilted') return leafCluster(g, x, y, rad * 0.8, 4, seedN, ['h', 'hm']);
  leafCluster(g, x, y, rad, 4, seedN, ['s', 'o']);
  if (state === 'fruit') g.circle(x + rad * 0.3, y - rad * 0.2, 4.5, 'p');
}

/** What each plant spot holds in this mood. */
function plantState(mi, r) {
  const roll = r();
  if (mi === 0) return 'lush';
  if (mi === 1) return roll < 0.25 ? 'picked' : roll < 0.45 ? 'fruit' : 'lush';
  if (mi === 2) return roll < 0.2 ? 'dead' : 'wilted';
  if (mi === 3) return roll < 0.45 ? 'gone' : roll < 0.6 ? 'wilted' : 'lush';
  return roll < 0.3 ? 'gone' : 'dead';
}

/** Uprooted plants and spilt soil on the floor round a planter. */
function uprooted(g, r, spots, box) {
  spots.slice(0, 3).forEach(({ x, y }, i) => {
    const fx = Math.min(box.w - 14, Math.max(14, x + (r() - 0.5) * 40));
    const fy = r() < 0.5 ? box.h - 8 - r() * 6 : 8 + r() * 6;
    for (let k = 0; k < 3; k++) g.circle(fx + (r() - 0.5) * 20, fy + (r() - 0.5) * 8, 3 + r() * 3, 'hm');
    if (i === 0) leafCluster(g, fx, fy, 14, 3, 7 + i, ['h', 's']);
  });
}

function plant({ kind = 'tray', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('plant', kind, seed, mood));
  let box;
  let spots = [];
  if (kind === 'tower') {
    // A column with leaves fanned round it.
    box = { w: U, h: U };
    const leaves = [[20, 17, 10, 's'], [78, 16, 9, 'o'], [150, 17, 10, 's'], [205, 15, 9, 'o'], [265, 16, 10, 's'], [320, 15, 9, 'o'], [110, 13, 8, 's'], [355, 13, 8, 'o']];
    for (const [ang, rx0, ry0, c0] of leaves) {
      const state = plantState(mi, r);
      if (state === 'gone' || state === 'dead') continue;
      const k = state === 'wilted' ? 0.75 : state === 'picked' ? 0.55 : 1;
      const rx = rx0 * k;
      const ry = ry0 * k;
      const c = state === 'wilted' ? (c0 === 's' ? 'h' : 'hm') : c0;
      const a = (ang * Math.PI) / 180;
      const d = 24 + rx * 0.55;
      const x = 50 + Math.cos(a) * d;
      const y = 50 + Math.sin(a) * d;
      g.add(`<g transform="rotate(${ang} ${x.toFixed(1)} ${y.toFixed(1)})">`);
      g.ellipse(x, y, rx, ry, c);
      g.line(x - rx * 0.8, y, x + rx * 0.7, y, 't');
      g.add('</g>');
    }
    g.circle(50, 50, 22, 'm');
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      g.circle(50 + Math.cos(a) * 16, 50 + Math.sin(a) * 16, 3.2, 'k');
    }
    g.circle(50, 50, 8, 'o');
    g.circle(50, 50, 3, 'k');
    if (mi === 2 || mi === 4) for (let i = 0; i < 4; i++) g.ellipse(10 + r() * 80, r() < 0.5 ? 8 + r() * 6 : 86 + r() * 6, 6, 3.5, 'hm'); // dropped leaves
    if (wrecked) spots = [{ x: 50, y: 50 }];
  } else {
    const bed = kind === 'bed';
    const W = 2 * U;
    const H = (bed ? 3 : 1) * U;
    box = { w: W, h: H };
    if (bed) {
      g.chamfer(6, 6, 188, 288, 16, 'm');
      g.chamfer(16, 16, 168, 268, 10, 'ko');
      g.line(100, 20, 100, 280, 'd');
      for (let y = 50; y < 280; y += 52) for (const x of [56, 144]) spots.push({ x, y });
    } else {
      g.chamfer(4, 12, 192, 76, 12, 'm');
      g.chamfer(12, 20, 176, 60, 8, 'ko');
      g.line(16, 50, 184, 50, 'd');
      spots = [38, 82, 126, 168].map((x) => ({ x, y: 50 }));
    }
    const rad = bed ? 34 : 24;
    const gone = [];
    spots.forEach((s, i) => {
      const state = plantState(mi, r);
      if (state === 'gone') gone.push(s);
      plantAt(g, s.x, s.y, rad, i + 3, state, r);
    });
    if (bed) bolts(g, 6, 6, 188, 288, 8, 3);
    if (mi === 2 || mi === 4) for (let i = 0; i < 3 + (bed ? 4 : 0); i++) g.ellipse(10 + r() * (W - 20), r() * H, 6, 3.5, 'hm');
    spots = gone;
  }
  if (worn) dust(g, r, 10, 10, box.w - 20, box.h - 20, 4);
  if (wrecked && spots.length) uprooted(g, r, spots, box);
  return { footprint: { w: box.w / U, h: box.h / U }, drawing: g };
}

// ---- market stall and vending machine --------------------------------------------

function stall({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('stall', seed, mood));
  const keep = [1, 0.6, 0.15, 0.3, 0.1][mi];
  g.chamfer(10, 70, 180, 112, 12, 'o'); // counter
  const crates = [
    [20, 's', (x) => { for (const [dx, dy] of [[10, 10], [24, 12], [38, 10], [14, 24], [30, 26]]) if (r() < keep) g.circle(x + dx, 86 + dy, 6, 'o'); }],
    [76, 'm', (x) => { for (let i = 0; i < 6; i++) if (r() < keep) g.circle(x + 10 + (i % 3) * 14, 96 + Math.floor(i / 3) * 14, 5, 'ko'); }],
    [132, 's', (x) => { if (r() < keep) g.path(`M${x + 8} 96h14v10h-14Z`, 'o'); if (r() < keep) g.path(`M${x + 26} 100h14v14h-14Z`, 'o'); }],
  ];
  const tipped = wrecked ? Math.floor(r() * 3) : -1;
  crates.forEach(([x, cls, fill], i) => {
    if (i === tipped) {
      // Knocked off the counter: the crate on its side in front, wares rolled out.
      at(g, x + 24, 192, (r() - 0.5) * 40, () => g.rect(-24, -9, 48, 18, cls, 4));
      for (let k = 0; k < 4; k++) g.circle(x + r() * 60, 178 + r() * 18, 4.5, 'k');
      return;
    }
    g.rect(x, 86, 48, 36, cls, 4);
    fill(x);
  });
  g.rect(24, 134, 120, 34, 's', 6);
  if (worn) g.chamfer(150, 134, 30, 22, 5, 'ko');
  else screen(g, 150, 134, 30, 22, 'bars');
  g.circle(60, 151, 10, 'o');
  g.line(50, 151, 70, 151, 't');
  // Striped awning along the back; torn and hanging when ransacked.
  g.rect(4, 4, 192, 52, 'o', 6);
  for (let x = 4; x < 196; x += 32) g.rect(x, 4, 16, 52, 'k');
  let d = 'M4 56';
  for (let x = 4; x < 196; x += 16) d += 'q8 10 16 0';
  g.path(d, 'l');
  g.rect(4, 4, 192, 52, 'l', 6);
  if (wrecked) {
    const tx = 40 + r() * 100;
    g.path(`M${tx} 4L${tx + 10} 30L${tx - 4} 56L${tx + 30} 56L${tx + 24} 24L${tx + 36} 4Z`, 'h');
    g.path(`M${tx} 4L${tx + 10} 30L${tx - 4} 56M${tx + 36} 4L${tx + 24} 24L${tx + 30} 56`, 'l');
  }
  if (worn) {
    dust(g, r, 16, 76, 168, 100, 10);
    web(g, 12, 72, 1, 1, 18);
  }
  return { footprint: { w: 2, h: 2 }, drawing: g };
}

function vending({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('vending', seed, mood));
  const keep = [1, 0.7, 0.45, 0.15, 0.1][mi];
  g.chamfer(8, 2, 84, 72, 8, 'ko');
  g.rect(14, 8, 50, 50, worn || wrecked ? 'h' : 'p', 3); // glass front (dark when the power's off)
  let taken = 0;
  for (let j = 0; j < 4; j++) {
    g.line(14, 19 + j * 12, 64, 19 + j * 12, 't');
    for (let i = 0; i < 4; i++) {
      if (r() < keep) g.rect(18 + i * 11.5, 10 + j * 12, 8, 8, (i + j) % 3 ? 'hm' : 'k', 1.5);
      else taken++;
    }
  }
  if (wrecked) g.path('M20 12L32 26L26 34L40 50M32 26L50 16M40 50L56 44', 'l'); // smashed glass
  g.rect(70, 10, 16, 26, 'o', 3);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) g.circle(75 + i * 6, 16 + j * 7, 1.8, worn ? 'hm' : 'k');
  g.rect(70, 42, 16, 6, 'k', 1);
  g.rect(14, 62, 50, 8, 'o', 3);
  if (mi === 1) {
    g.rect(30, 63, 10, 6, 'k', 2); // a can waiting in the tray
  }
  if (worn) {
    dust(g, r, 14, 8, 72, 60, 6);
    web(g, 12, 6, 1, 1, 14);
  }
  if (wrecked) {
    shards(g, r, 40, 84, 22, 5);
    for (let i = 0; i < Math.min(5, taken); i++) {
      at(g, 14 + r() * 72, 80 + r() * 16, r() * 360, () => g.rect(-4, -4, 8, 8, i % 2 ? 'hm' : 'k', 1.5));
    }
  }
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

// ---- seating ---------------------------------------------------------------------

/** Slashes with stuffing coming out, across (x, y). */
function slashed(g, r, x, y, w) {
  g.path(`M${x - w * 0.35} ${y - 4}l${w * 0.6} ${8}M${x - w * 0.2} ${y + 8}l${w * 0.45} 6`, 'l');
  for (let i = 0; i < 3; i++) g.circle(x - w * 0.2 + r() * w * 0.4, y + r() * 8, 3 + r() * 2, 'p');
}

function lounge({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('lounge', seed, mood));
  g.chamfer(4, 8, 192, 82, 18, 'ko');
  const cls = worn ? 'h' : 's';
  g.rect(16, 28, 82, 52, cls, 10);
  g.rect(102, 28, 82, 52, cls, 10);
  g.lines([[24, 64, 90, 64], [110, 64, 176, 64]], 't');
  if (mi === 0) {
    for (const x of [28, 150]) {
      g.rect(x, 36, 22, 18, 'o', 6);
      g.line(x + 4, 45, x + 18, 45, 't');
    }
  } else if (mi === 1) {
    at(g, 70 + r() * 20, 46, (r() - 0.5) * 40, () => g.rect(-11, -9, 22, 18, 'o', 6));
    // A throw dragged over one seat.
    g.path('M110 32Q140 26 172 36L176 78Q144 84 112 76Z', 'm');
    g.path('M120 50q20 8 44 0', 't');
  } else if (mi === 2) {
    g.path('M30 50q24 10 50 0M118 50q24 10 50 0', 't'); // sagging
  }
  if (worn) dust(g, r, 18, 30, 164, 48, 8);
  if (wrecked) {
    slashed(g, r, 56, 52, 60);
    if (r() < 0.6) slashed(g, r, 142, 52, 60);
    at(g, 40 + r() * 120, 92, r() * 360, () => g.rect(-11, -8, 22, 16, 'o', 6)); // cushion on the floor
  }
  return { footprint: { w: 2, h: 1 }, drawing: g };
}

function booth({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('booth', seed, mood));
  g.path('M6 6H194V190H160V50H40V190H6Z', 'ko');
  g.path('M22 22H178V180H164V50Q100 40 36 50V180H22Z', worn ? 'h' : 's');
  g.lines([[22, 100, 36, 100], [164, 100, 178, 100], [70, 22, 70, 46], [130, 22, 130, 46]], 't');
  g.chamfer(56, 76, 88, 80, 16, 'o');
  if (mi === 0) {
    g.rect(92, 84, 16, 10, 'ko', 3); // condiments, centred
  } else if (mi === 1) {
    g.circle(80, 104, 9, 'o');
    g.circle(80, 104, 4, 'm');
    g.circle(118, 98, 7, 'o');
    g.circle(118, 98, 3, 'k');
    g.circle(100, 132, 14, 'o');
    g.circle(100, 132, 9, 't');
  } else if (mi === 2) {
    g.circle(118, 98, 7, 'o');
    g.circle(118, 98, 3, 'hm');
  }
  if (worn) {
    dust(g, r, 60, 80, 80, 72, 8);
    web(g, 10, 10, 1, 1, 22);
  }
  if (wrecked) {
    at(g, 86, 108, r() * 360, () => g.rect(-8, -5, 16, 10, 'o', 3)); // tipped glass
    spill(g, r, 104, 116, 13);
    shards(g, r, 100, 170, 18, 4);
    slashed(g, r, 30, 120, 20);
  }
  return { footprint: { w: 2, h: 2 }, drawing: g };
}

function obsBench({ seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('obsbench', seed, mood));
  g.rect(10, 26, 180, 12, 'ko', 4);
  for (const x of [14, 64, 114]) {
    g.rect(x, 36, 46, 34, worn ? 'h' : 's', 8);
    g.line(x + 6, 52, x + 40, 52, 't');
  }
  g.rect(164, 36, 26, 34, 'o', 6); // side table
  if (mi === 0) leafCluster(g, 177, 53, 11, 4, seed, ['s', 'o']);
  else if (mi === 1) {
    g.circle(177, 53, 6, 'o');
    g.circle(177, 53, 3, 'hm');
  } else if (mi === 2) g.circle(177, 53, 6, 'ko');
  if (worn) dust(g, r, 14, 36, 172, 34, 6);
  if (wrecked) {
    slashed(g, r, 37 + Math.floor(r() * 3) * 50, 52, 40);
    spill(g, r, 176, 84, 8);
    at(g, 160, 84, r() * 360, () => g.rect(-6, -4, 12, 8, 'o', 2));
  }
  return { footprint: { w: 2, h: 1 }, drawing: g };
}

// ---- tanks ------------------------------------------------------------------------

/**
 * Specimen tank (kind specimen: square, a many-armed thing inside) or cloning vat (round, a
 * clone). Clear and lit / extra bubbling / cloudy, the shape inside faint / glass cracked and
 * drained, the contents slumped at the bottom, fluid across the floor.
 */
function tank({ kind = 'specimen', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const { mi, worn, wrecked } = moodOf(mood);
  const r = rng(hash('tank', kind, seed, mood));
  const vat = kind === 'vat';
  if (wrecked) spill(g, r, 20 + r() * 60, 86 + r() * 8, 14);
  if (vat) {
    g.circle(50, 50, 45, 's');
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      g.circle(50 + Math.cos(a) * 40.5, 50 + Math.sin(a) * 40.5, 2.4, 'k');
    }
    g.circle(50, 50, 35, wrecked ? 'o' : 'm');
  } else {
    g.chamfer(4, 4, 92, 92, 20, 'ko');
    g.chamfer(14, 14, 72, 72, 14, wrecked ? 'o' : 'm');
  }
  const body = wrecked ? 's' : mi === 2 ? 'hm' : 's';
  if (wrecked && mi === 4) {
    // Long drained and empty: a stain where it lay.
    g.ellipse(50, 60, 16, 9, 'h');
  } else if (vat) {
    const dy = wrecked ? 10 : 0;
    const sprawl = wrecked ? 6 : 0;
    g.path(`M${44 - sprawl} ${42 + dy}L${33 - sprawl} ${58 + dy}M${56 + sprawl} ${42 + dy}L${67 + sprawl} ${58 + dy}`, wrecked ? 'l' : 'o');
    g.path(`M46 ${62 + dy}L41 ${79 + dy * 0.4}M54 ${62 + dy}L59 ${79 + dy * 0.4}`, wrecked ? 'l' : 'o');
    g.rect(42, 36 + dy, 16, 30, body, 7);
    g.circle(50, 29 + dy, 7.5, body);
  } else {
    const cy = wrecked ? 64 : 52;
    const k = wrecked ? 0.7 : 1;
    for (const [a, l] of [[0.3, 26], [1.2, 24], [2.1, 28], [3.0, 22], [3.9, 27], [4.9, 24]]) {
      const x1 = 50 + Math.cos(a) * l;
      const y1 = cy + Math.sin(a) * l * k;
      g.path(`M50 ${cy}Q${(50 + Math.cos(a + 0.6) * l * 0.7).toFixed(1)} ${(cy + Math.sin(a + 0.6) * l * 0.7 * k).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`, mi === 2 ? 't' : 'l');
    }
    g.ellipse(50, cy - 2, 14, 11, body);
    if (!wrecked) {
      g.circle(46, cy - 4, 3, 'k');
      g.circle(55, cy - 4, 2, 'k');
    }
  }
  if (mi === 2) {
    // Cloudy fluid: pale murk drifting through it.
    for (const [x, y, rr] of [[34, 34, 10], [64, 62, 12], [40, 70, 8], [66, 32, 7]]) g.circle(x, y, rr, 'h');
  }
  if (!wrecked) {
    const list = mi === 1
      ? [[70, 26, 3.5], [74, 36, 2.2], [26, 70, 2.6], [30, 60, 2], [68, 72, 2.6], [62, 20, 1.8], [24, 32, 2.2]]
      : mi === 2 ? [[70, 30, 2]] : [[70, 26, 3.5], [74, 36, 2.2], [26, 70, 2.6]];
    for (const [x, y, rr] of list) g.circle(x, y, rr, 'o');
    g.path(vat ? 'M22 40A30 30 0 0 1 38 22' : 'M22 40A30 30 0 0 1 34 24', 'pl');
  } else {
    // Cracked glass.
    g.path('M20 30L34 44L28 52L44 66M34 44L52 36M70 20L62 34L74 44', 'l');
  }
  if (!vat) for (const [x, y] of [[12, 12], [88, 12], [12, 88], [88, 88]]) g.circle(x, y, 2.6, 'p');
  if (worn) dust(g, r, 10, 10, 80, 80, 5);
  return { footprint: { w: 1, h: 1 }, drawing: g };
}

export const SCIFI_PART_GENERATORS = {
  kitchenette: { name: 'Kitchenette', params: {}, make: kitchenette, moods: true },
  'server-rack': { name: 'Server rack', params: {}, make: serverRack, moods: true },
  'tool-cart': { name: 'Tool cart', params: {}, make: toolCart, moods: true },
  welder: { name: 'Welding station', params: {}, make: welder, moods: true },
  'security-desk': { name: 'Security desk', params: {}, make: securityDesk, moods: true },
  plant: { name: 'Planter', params: {}, make: plant, moods: true },
  stall: { name: 'Market stall', params: {}, make: stall, moods: true },
  vending: { name: 'Vending machine', params: {}, make: vending, moods: true },
  lounge: { name: 'Lounge seat', params: {}, make: lounge, moods: true },
  booth: { name: 'Booth', params: {}, make: booth, moods: true },
  'obs-bench': { name: 'Observation bench', params: {}, make: obsBench, moods: true },
  tank: { name: 'Tank', params: {}, make: tank, moods: true },
};
