// Parametric asset generators: one function draws the asset at any size.
// Each returns {footprint, drawing}. They run in the browser (to remake an asset at another
// size) and in Node (to bake the starter sets).

import { Drawing, U } from './svg.js';
import { rng, hash } from '../core/rng.js';
import { chair, seat, planks, screen, buttons, candle, bolts, slats, hazard, grain, blocks } from './motifs.js';
import { DEFAULT_MOOD, moodIndex } from './moods.js';
import { PART_GENERATORS, counterMood, dust, web } from './parts.js';
import { SCIFI_PART_GENERATORS } from './parts-scifi.js';

/**
 * Table with optional chairs round it. w, h = size of the table top in squares.
 * style: wood (plank top) or metal (sci-fi: bevelled top, seats). mood decides what is on the
 * table and how the chairs stand: laid for dinner, mid-meal, gathering dust, or overturned.
 */
function table({ w = 2, h = 1, chairs = true, round = false, style = 'wood', seed = 1, mood = DEFAULT_MOOD }) {
  const pad = chairs ? 0.5 : 0;
  const g = new Drawing();
  const x0 = pad * U;
  const y0 = pad * U;
  const W = w * U;
  const H = h * U;
  const mi = moodIndex(mood);
  const r = rng(hash('table', w, h, round, style, seed, mood));
  const sit = style === 'metal' ? seat : chair;
  const cx = x0 + W / 2;
  const cy = y0 + H / 2;
  // Each chair: its spot, the way it faces, and an outward direction to pull it along.
  const spots = [];
  if (chairs) {
    if (round) {
      const count = Math.max(4, Math.round((w + h) * 2));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const facing = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'w' : 'e') : Math.sin(a) > 0 ? 'n' : 's';
        spots.push({ x: cx + Math.cos(a) * (W / 2 + 22), y: cy + Math.sin(a) * (H / 2 + 22), facing, out: [Math.cos(a), Math.sin(a)], size: 34 });
      }
    } else {
      for (let i = 0; i < w; i++) {
        spots.push({ x: x0 + (i + 0.5) * U, y: y0 - 24, facing: 's', out: [0, -1], size: 38 });
        spots.push({ x: x0 + (i + 0.5) * U, y: y0 + H + 24, facing: 'n', out: [0, 1], size: 38 });
      }
      for (let j = 0; j < h; j++) {
        if (w >= 2 || h >= 2) {
          spots.push({ x: x0 - 24, y: y0 + (j + 0.5) * U, facing: 'e', out: [-1, 0], size: 38 });
          spots.push({ x: x0 + W + 24, y: y0 + (j + 0.5) * U, facing: 'w', out: [1, 0], size: 38 });
        }
      }
    }
  }
  for (const s of spots) {
    // Pristine: tucked in. Lived-in: some pulled back. Neglected: one or two gone.
    // Ransacked: knocked over or shoved aside.
    const roll = r();
    let push = mi === 0 ? -4 : 0;
    let turn = 0;
    if (mi === 1 && roll < 0.45) {
      push = 5;
      turn = (r() - 0.5) * 30;
    } else if (mi === 2) {
      if (roll < 0.2) continue;
      if (roll < 0.5) turn = (r() - 0.5) * 20;
    } else if (mi >= 3) {
      if (roll < 0.15) continue;
      if (roll < 0.5) {
        // On its side: the seat seen edge-on, turned well round.
        const tx = s.x + s.out[0] * 2;
        const ty = s.y + s.out[1] * 2;
        g.add(`<g transform="rotate(${Math.round(60 + r() * 60) * (r() < 0.5 ? -1 : 1)} ${tx.toFixed(1)} ${ty.toFixed(1)})">`);
        g.rect(tx - s.size / 2, ty - 7, s.size, 14, style === 'metal' ? 's' : 'o', 4);
        g.rect(tx - s.size / 2, ty - 7, 8, 14, 'ko', 2);
        g.add('</g>');
        continue;
      }
      push = 3;
      turn = (r() - 0.5) * 60;
    }
    const px = s.x + s.out[0] * push;
    const py = s.y + s.out[1] * push;
    if (turn) g.add(`<g transform="rotate(${turn.toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})">`);
    sit(g, px, py, s.facing, s.size);
    if (turn) g.add('</g>');
  }

  // The table top.
  if (style === 'metal' && round) {
    g.ellipse(cx, cy, W / 2 - 6, H / 2 - 6, 's');
    g.ellipse(cx, cy, W / 2 - 16, H / 2 - 16, 'd');
    g.circle(cx, cy, 8, 'ko');
    g.circle(cx, cy, 3, 'p');
  } else if (style === 'metal') {
    g.chamfer(x0 + 6, y0 + 6, W - 12, H - 12, 16, 's');
    g.line(x0 + 20, cy, x0 + W - 20, cy, 't');
    bolts(g, x0 + 6, y0 + 6, W - 12, H - 12, 9, 2.4);
  } else if (round) {
    g.ellipse(cx, cy, W / 2 - 6, H / 2 - 6, 'o');
    const seams = [];
    const n = Math.max(3, w * 2 + 1);
    for (let i = 1; i < n; i++) {
      const xx = x0 + 6 + ((W - 12) * i) / n;
      const dy = (H / 2 - 8) * Math.sqrt(Math.max(0, 1 - ((xx - cx) / (W / 2 - 8)) ** 2));
      seams.push([xx, cy - dy, xx, cy + dy]);
    }
    g.lines(seams, 't');
    g.ellipse(cx, cy, W / 2 - 6, H / 2 - 6, 'l');
  } else {
    g.rect(x0 + 6, y0 + 6, W - 12, H - 12, 'o', 5);
    grain(g, x0 + 6, y0 + 6, W - 12, H - 12, Math.max(2, h * 3), 'h', w * 7 + h + seed);
    g.rect(x0 + 6, y0 + 6, W - 12, H - 12, 'l', 5);
  }

  // Places at the table: next to each chair, a little in from the edge.
  const places = spots.length
    ? spots.map((s) => ({ x: s.x - s.out[0] * (round ? 44 : 46), y: s.y - s.out[1] * (round ? 44 : 46) }))
    : Array.from({ length: Math.max(1, w * h) }, (_, i) => ({ x: x0 + ((i % w) + 0.5) * U, y: y0 + (Math.floor(i / w) + 0.5) * U }));
  const metal = style === 'metal';
  const plate = (x, y, food) => {
    if (metal) {
      g.rect(x - 16, y - 10, 32, 20, 'o', 4);
      g.line(x - 2, y - 8, x - 2, y + 8, 't');
      if (food) g.circle(x + 7, y, 4, 'hm');
    } else {
      g.circle(x, y, 11, 'o');
      if (food) g.path(`M${x - 5} ${y - 2}q3 -5 8 -1q2 5 -4 6q-5 0 -4 -5Z`, 'hm');
      else g.circle(x, y, 6, 't');
    }
  };
  const cup = (x, y) => {
    g.circle(x, y, 5, 'o');
    g.circle(x, y, 2.4, metal ? 'k' : 'hm');
  };
  if (mi === 0) {
    // Laid: a plate and cup at every place, cutlery either side, a centrepiece.
    for (const p of places) {
      plate(p.x, p.y, false);
      cup(p.x + 15, p.y - 9);
      if (!metal) g.lines([[p.x - 16, p.y - 7, p.x - 16, p.y + 7], [p.x + 16, p.y - 2, p.x + 16, p.y + 9]], 't');
    }
    if (!metal && (w >= 2 || round)) {
      if (r() < 0.5) candle(g, cx, cy, 7);
      else {
        g.circle(cx, cy, 9, 's'); // a vase of flowers
        for (let i = 0; i < 5; i++) g.circle(cx + Math.cos(i * 1.26) * 8, cy + Math.sin(i * 1.26) * 8, 3.4, 'p');
        g.circle(cx, cy, 3, 'k');
      }
    }
  } else if (mi === 1) {
    // Mid-meal: some plates with food, mugs, bread, a bowl of fruit, a book left open.
    for (const p of places) {
      const pick = r();
      if (pick < 0.45) plate(p.x + (r() - 0.5) * 8, p.y + (r() - 0.5) * 6, true);
      else if (pick < 0.75) cup(p.x + (r() - 0.5) * 14, p.y + (r() - 0.5) * 8);
    }
    if (!metal && (w >= 2 || round)) {
      const pick = r();
      if (pick < 0.4) {
        g.circle(cx, cy, 13, 's'); // fruit bowl
        for (const [dx, dy] of [[-4, -3], [4, -2], [0, 4]]) g.circle(cx + dx, cy + dy, 4, 'p');
      } else if (pick < 0.7) {
        g.ellipse(cx, cy, 15, 8, 's'); // a loaf
        g.path(`M${cx - 7} ${cy - 3}l3 6M${cx} ${cy - 4}l3 7M${cx + 7} ${cy - 3}l2 5`, 't');
      } else candle(g, cx, cy, 7);
    }
    if (places.length && r() < 0.35) {
      const p = places[Math.floor(r() * places.length)];
      g.add(`<g transform="rotate(${Math.round((r() - 0.5) * 50)} ${(p.x + 10).toFixed(1)} ${p.y.toFixed(1)})">`);
      g.path(`M${p.x - 2} ${p.y - 8}h12v16h-12ZM${p.x + 10} ${p.y - 8}h12v16h-12Z`, 'o'); // open book
      g.add('</g>');
    }
  } else {
    // Neglected and worse: little left, a candle burnt to a stub, a cup on its side, dust.
    if (r() < 0.6) {
      g.circle(cx + (r() - 0.5) * W * 0.3, cy, 4, 'k');
      g.circle(cx + (r() - 0.5) * W * 0.3 + 6, cy + 3, 3, 'hm');
    }
    for (const p of places) {
      if (r() < (mi >= 3 ? 0.35 : 0.2)) {
        g.add(`<g transform="rotate(${Math.round(r() * 360)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})">`);
        g.rect(p.x - 8, p.y - 5, 16, 10, 'o', 3); // tipped cup
        g.add('</g>');
      }
    }
    if (mi >= 3) {
      // A spill and broken crockery.
      const sx = cx + (r() - 0.5) * W * 0.4;
      const sy = cy + (r() - 0.5) * H * 0.3;
      g.path(`M${sx} ${sy - 10}q14 -2 16 8q2 12 -10 12q-14 0 -16 -8q-2 -10 10 -12Z`, 'hm');
      for (let i = 0; i < 3; i++) {
        const bx = cx + (r() - 0.5) * W * 0.6;
        const by = cy + (r() - 0.5) * H * 0.5;
        g.poly([[bx, by], [bx + 7, by + 2], [bx + 3, by + 7]], 'o');
      }
    }
    if (mi === 2 || mi === 4) {
      // Cobweb across a corner of the top, and dust.
      const ex = round ? cx + W * 0.25 : x0 + W - 8;
      const ey = round ? cy - H * 0.25 : y0 + 8;
      g.lines([[ex, ey, ex - 22, ey], [ex, ey, ex, ey + 22], [ex, ey, ex - 16, ey + 16]], 't');
      g.path(`M${ex - 12} ${ey}Q${ex - 9} ${ey + 9} ${ex} ${ey + 12}M${ex - 20} ${ey}Q${ex - 15} ${ey + 15} ${ex} ${ey + 20}`, 't');
      for (let i = 0; i < 6; i++) g.circle(x0 + 16 + r() * (W - 32), y0 + 16 + r() * (H - 32), 1.6, 'hm');
    }
  }
  return { footprint: { w: w + pad * 2, h: h + pad * 2 }, drawing: g };
}

/** Long bench or pew. back: a backrest along the top edge. */
function bench({ len = 2, back = false }) {
  const g = new Drawing();
  const W = len * U;
  const top = back ? 34 : 30;
  g.rect(8, top, W - 16, 40, 'o', 5);
  grain(g, 8, top, W - 16, 40, 2, 'h', len * 3 + (back ? 1 : 0));
  if (back) {
    g.rect(8, 12, W - 16, 18, 's', 4);
    g.rect(8, 12, W - 16, 18, 'l', 4);
    for (let x = 8 + U / 2; x < W - 10; x += U) g.circle(x, 21, 3, 'k');
  }
  const legs = [];
  for (let i = 0; i <= len; i++) legs.push([Math.min(W - 14, Math.max(14, i * U)), top + 2, Math.min(W - 14, Math.max(14, i * U)), top + 38]);
  g.lines(legs, 'l');
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/**
 * Shelf against a wall (the top edge). kind: books, bottles, goods, scrolls, parts.
 * mood: pristine shelves are full and straight; lived-in ones have gaps and a book on its
 * side; neglected ones are half empty with cobwebs; ransacked ones are emptied onto the floor
 * in front.
 */
function shelf({ len = 2, kind = 'books', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const mi = moodIndex(mood);
  const r = rng(hash('shelf', len, kind, seed));
  const rm = rng(hash('shelf-mood', len, kind, seed, mood));
  const W = len * U;
  const depth = 48;
  const gap = [0, 0.1, 0.3, 0.5, 0.55][mi];
  const keep = () => rm() >= gap;
  const fallen = []; // things knocked onto the floor in front
  g.rect(4, 4, W - 8, depth, 's', 3);
  g.rect(4, 4, W - 8, 8, 'ko', 2);
  g.line(6, depth + 1, W - 6, depth + 1, 't');
  if (kind === 'books') {
    let x = 12;
    let leaned = mi === 0;
    while (x < W - 14) {
      const bw = mi === 0 ? 8 + r() * 4 : 7 + r() * 9;
      const bh = mi === 0 ? 28 + r() * 6 : 22 + r() * 16;
      const cls = ['o', 'k', 'o', 's', 'm'][Math.floor(r() * 5)];
      if (keep()) g.rect(x, 12, Math.min(bw, W - 12 - x), bh, cls === 'k' ? 'ko' : cls, 1.5);
      else {
        if (mi >= 3) fallen.push(cls);
        if (!leaned && x < W - 50) {
          // A book fallen sideways into the gap.
          leaned = true;
          g.rect(x, 30, 26, 10, 'o', 1.5);
          x += 20;
        }
      }
      x += bw + 1.5;
    }
  } else if (kind === 'bottles') {
    const lat = [];
    for (let x = 4; x < W; x += 20) lat.push([x, 12, x + 20, 52], [x + 20, 12, x, 52]);
    g.lines(lat, 't');
    for (let x = 18; x < W - 14; x += 20) {
      for (const [bx, by] of [[x, 22], [x + 10, 42]]) {
        if (bx > W - 12) continue;
        if (!keep()) {
          if (mi >= 3) fallen.push('glass');
          continue;
        }
        g.circle(bx, by, 7.5, r() > 0.5 ? 'k' : 'hm');
        g.circle(bx, by, 2.6, 'p');
      }
    }
  } else if (kind === 'scrolls') {
    for (let x = 16; x < W - 14; x += 24) {
      if (!keep()) {
        if (mi >= 3) fallen.push('scroll');
        continue;
      }
      g.rect(x - 9, 14, 18, 32, 'o', 8);
      g.line(x - 9, 22, x + 9, 22, 't');
      g.circle(x, 14, 4, 'k');
    }
  } else if (kind === 'parts') {
    for (let x = 12; x < W - 26; x += 30) {
      if (!keep()) {
        if (mi >= 3) fallen.push('part');
        continue;
      }
      g.chamfer(x, 14, 24, 30, 5, r() > 0.5 ? 'o' : 'm');
      g.line(x + 6, 29, x + 18, 29, 't');
    }
  } else {
    let x = 12;
    while (x < W - 26) {
      const pick = r();
      const show = keep();
      if (!show && mi >= 3) fallen.push(pick > 0.66 ? 'jar' : 'box');
      if (pick > 0.66) {
        if (show) {
          g.circle(x + 10, 30, 10, 'o');
          g.circle(x + 10, 30, 5, 'hm');
        }
        x += 24;
      } else if (pick > 0.33) {
        if (show) {
          g.rect(x, 14, 24, 30 + r() * 6, 'o', 2);
          g.line(x, 26, x + 24, 26, 't');
        }
        x += 28;
      } else {
        if (show) {
          g.ellipse(x + 12, 30, 12, 16, 's');
          g.circle(x + 12, 16, 3.5, 'ko');
        }
        x += 28;
      }
    }
  }
  for (let i = 1; i < len; i++) g.rect(i * U - 3, 4, 6, depth, 'ko');
  if (mi === 2 || mi === 4) {
    // Cobweb in an upper corner of the case.
    const ex = rm() < 0.5 ? 10 : W - 10;
    const s = ex < W / 2 ? 1 : -1;
    g.lines([[ex, 12, ex + s * 22, 12], [ex, 12, ex, 34], [ex, 12, ex + s * 16, 28]], 't');
    g.path(`M${ex + s * 12} 12Q${ex + s * 9} 21 ${ex} 24M${ex + s * 20} 12Q${ex + s * 15} 26 ${ex} 32`, 't');
  }
  // Ransacked: what came off the shelves lies on the floor in front.
  for (const what of fallen.slice(0, 2 + len * 2)) {
    const fx = 12 + rm() * (W - 24);
    const fy = 62 + rm() * 28;
    const deg = Math.round(rm() * 360);
    g.add(`<g transform="rotate(${deg} ${fx.toFixed(1)} ${fy.toFixed(1)})">`);
    if (what === 'glass') {
      g.poly([[fx, fy], [fx + 8, fy + 3], [fx + 2, fy + 8]], 'o');
      g.path(`M${fx + 10} ${fy + 4}q8 -2 10 4q-4 6 -10 2Z`, 'hm');
    } else if (what === 'scroll') g.rect(fx - 12, fy - 5, 24, 10, 'o', 5);
    else if (what === 'part' || what === 'box') g.rect(fx - 10, fy - 8, 20, 16, 'o', 2);
    else if (what === 'jar') g.circle(fx, fy, 8, 'o');
    else {
      // An open book, face down.
      g.path(`M${fx - 14} ${fy - 6}L${fx} ${fy - 2}L${fx + 14} ${fy - 6}V${fy + 8}L${fx} ${fy + 12}L${fx - 14} ${fy + 8}Z`, what === 'k' ? 'ko' : what === 's' || what === 'm' ? what : 'o');
      g.line(fx, fy - 2, fx, fy + 12, 't');
    }
    g.add('</g>');
  }
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/**
 * A bed, assembled from parts: frame, mattress, pillows, blanket and odds and ends.
 * kind: single (1x2), double (2x2), bunk (1x2, a ladder up the side), pod (sci-fi double).
 * style: wood or metal. mood decides how each part looks: made, slept in, gone to dust or
 * torn apart; seed gives each bed its own small differences.
 */
function bed({ kind = 'single', style = 'wood', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const mi = moodIndex(mood);
  const r = rng(hash('bed', kind, style, seed, mood));
  const double = kind === 'double' || kind === 'pod';
  const W = (double ? 2 : 1) * U;
  const H = 2 * U;
  const metal = style === 'metal';
  // Frame and head.
  if (metal) {
    g.chamfer(4, 4, W - 8, H - 8, double ? 26 : 14, 'ko');
    if (double) {
      g.circle(22, 18, 4.5, 'p');
      g.circle(W - 22, 18, 4.5, 'p');
    } else g.circle(W - 20, 14, 4, 'p');
  } else {
    g.rect(6, 4, W - 12, H - 8, 's', 5);
    g.rect(6, 4, W - 12, 16, 'ko', 4);
    if (double) for (const x of [4, W - 20]) g.rect(x, 0, 16, 24, 'ko', 4);
    g.rect(6, H - 12, W - 12, 8, 'ko', 3);
  }
  const mx = metal ? 12 : 13;
  const my = metal ? 14 : 22;
  const mw = W - mx * 2;
  const mh = H - my - (metal ? 12 : 14);
  g.rect(mx, my, mw, mh, 'o', 6); // mattress
  if (mi >= 3) {
    // Slashed mattress with stuffing coming out.
    g.path(`M${mx + mw * 0.3} ${my + mh * 0.5}l${mw * 0.35} ${mh * 0.12}M${mx + mw * 0.25} ${my + mh * 0.62}l${mw * 0.3} ${mh * 0.1}`, 'l');
    for (let i = 0; i < 4; i++) g.circle(mx + mw * (0.3 + r() * 0.4), my + mh * (0.5 + r() * 0.2), 3 + r() * 2, 'p');
  }
  if (mi === 2 || mi === 4) g.path(`M${mx + mw * 0.6} ${my + mh * 0.35}q10 -6 18 2q-2 10 -14 8q-8 -2 -4 -10Z`, 'hm'); // stain

  // Pillows.
  const pillowSlots = double ? [mx + mw * 0.27, mx + mw * 0.73] : [mx + mw / 2];
  const pw = double ? mw * 0.4 : mw * 0.72;
  pillowSlots.forEach((px, i) => {
    let ox = 0;
    let oy = 0;
    let turn = 0;
    if (mi === 1) {
      ox = (r() - 0.5) * 8;
      oy = r() * 4;
      turn = (r() - 0.5) * 16;
    } else if (mi >= 3) {
      if (i === pillowSlots.length - 1 && r() < 0.7) {
        // Thrown down the bed.
        oy = mh * (0.35 + r() * 0.3);
        ox = (r() - 0.5) * mw * 0.3;
        turn = 30 + r() * 80;
      } else if (r() < 0.4) return; // gone
      else turn = (r() - 0.5) * 30;
    }
    const cx = px + ox;
    const cy = my + 18 + oy;
    if (turn) g.add(`<g transform="rotate(${turn.toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})">`);
    g.rect(cx - pw / 2, cy - 12, pw, 24, mi === 2 || mi === 4 ? 's' : 'o', 10);
    if (mi === 0) g.path(`M${cx - pw / 2 + 6} ${cy}H${cx + pw / 2 - 6}`, 't');
    else if (mi === 1) g.path(`M${cx - pw * 0.2} ${cy - 2}q${pw * 0.2} 6 ${pw * 0.4} 0`, 't'); // head dent
    else g.path(`M${cx - pw * 0.3} ${cy + 4}q${pw * 0.3} -3 ${pw * 0.6} 0`, 't');
    if (turn) g.add('</g>');
  });

  // Blanket.
  const top = my + mh * (mi === 0 ? 0.32 : 0.36);
  const bottom = my + mh;
  if (mi === 0) {
    // Made: square corners, the sheet turned down, quilting.
    g.rect(mx, top, mw, bottom - top, 's', 5);
    g.rect(mx, top, mw, 14, 'o', 4);
    for (let x = mx + 16; x < mx + mw - 8; x += 26) for (let y = top + 36; y < bottom - 10; y += 30) g.poly([[x, y - 8], [x + 8, y], [x, y + 8], [x - 8, y]], 't');
    if (r() < 0.6) {
      g.rect(mx + 4, bottom - 28, mw - 8, 18, 'm', 3); // folded throw at the foot
      g.line(mx + 4, bottom - 19, mx + mw - 4, bottom - 19, 'pl');
    }
  } else if (mi === 1) {
    // Slept in: thrown back on one side, rucked into folds.
    const left = r() < 0.5;
    const fold = left ? mx : mx + mw;
    const d = `M${mx} ${top + 10}Q${mx + mw * 0.3} ${top - 4} ${mx + mw * 0.55} ${top + 8}T${mx + mw} ${top + 4}V${bottom}H${mx}Z`;
    g.path(d, 's');
    g.path(`M${fold} ${top + 6}L${fold + (left ? 1 : -1) * mw * 0.45} ${top + 4}L${fold} ${top + mh * 0.3}Z`, 'o'); // corner thrown back
    g.path(`M${mx + mw * 0.2} ${top + 40}q${mw * 0.2} 14 ${mw * 0.5} 4M${mx + mw * 0.15} ${top + 74}q${mw * 0.3} -10 ${mw * 0.65} 8`, 't');
    const extra = r();
    if (extra < 0.35) {
      // A book left open on the bed.
      const bx = mx + mw * (0.3 + r() * 0.4);
      const by = top + 50 + r() * 30;
      g.path(`M${bx - 12} ${by - 7}h12v14h-12ZM${bx} ${by - 7}h12v14h-12Z`, 'o');
    } else if (extra < 0.65) {
      // Clothes dropped at the foot.
      const bx = mx + mw * (0.3 + r() * 0.4);
      g.path(`M${bx - 16} ${bottom - 22}q8 -12 20 -6q14 2 10 14q-6 8 -18 6q-14 -2 -12 -14Z`, 'm');
      g.path(`M${bx - 8} ${bottom - 20}q6 6 14 2`, 't');
    }
  } else if (mi === 2) {
    // Neglected: thin and grey, moth holes, a cobweb in the head corner.
    g.rect(mx, top, mw, bottom - top, 'h', 5);
    g.rect(mx, top, mw, bottom - top, 't', 5);
    for (let i = 0; i < 3; i++) g.circle(mx + mw * (0.2 + r() * 0.6), top + (bottom - top) * (0.2 + r() * 0.7), 2.5 + r() * 2, 'hm');
    const ex = metal ? 10 : 8;
    g.lines([[ex, 6, ex + 24, 6], [ex, 6, ex, 30], [ex, 6, ex + 18, 24]], 't');
    g.path(`M${ex + 14} 6Q${ex + 10} 16 ${ex} 20`, 't');
  } else {
    // Ransacked: the blanket dragged half off the side onto the floor.
    const off = r() < 0.5 ? -1 : 1;
    const edge = off < 0 ? 0 : W;
    g.path(`M${mx + mw * 0.2} ${top + 30}Q${mx + mw * 0.5} ${top + 10} ${edge + off * -2} ${top + 40}L${edge + off * -2} ${bottom - 30}Q${mx + mw * 0.6} ${bottom - 10} ${mx + mw * 0.3} ${bottom - 40}Z`, 's');
    g.path(`M${mx + mw * 0.35} ${top + 44}q${mw * 0.2} 10 ${mw * 0.35} 0M${mx + mw * 0.4} ${bottom - 60}q${mw * 0.2} -8 ${mw * 0.3} 6`, 't');
  }

  if (kind === 'bunk') {
    // Posts and the ladder up to the top bunk.
    for (const [x, y] of [[0, 0], [W - 16, 0], [0, H - 16], [W - 16, H - 16]]) g.rect(x, y, 16, 16, 'ko', 3);
    g.lines([[W - 30, 112, W - 30, 184], [W - 14, 112, W - 14, 184]], 'l');
    g.lines([[W - 30, 128, W - 14, 128], [W - 30, 146, W - 14, 146], [W - 30, 164, W - 14, 164]], 'l');
  }
  return { footprint: { w: double ? 2 : 1, h: 2 }, drawing: g };
}

/** Counter along a wall. kind: bar, kitchen, shop, lab, cantina. mood: see counterMood. */
function counter({ len = 3, kind = 'bar', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const r = rng(hash('counter', len, kind, seed));
  const mi = moodIndex(mood);
  const rm = rng(hash('counter-stock', len, kind, seed, mood));
  // How much is left on the shelves and how many glasses stand about.
  const stocked = () => rm() < [1, 0.85, 0.45, 0.3, 0.2][mi];
  const glassesOut = [0.2, 1, 0.4, 0.6, 0.3][mi];
  const W = len * U;
  const depth = kind === 'bar' || kind === 'cantina' ? 64 : 58;
  if (kind === 'cantina' || kind === 'lab') g.chamfer(4, 4, W - 8, depth, 14, 's');
  else g.rect(4, 4, W - 8, depth, 's', 4);
  g.rect(12, depth - 14, W - 24, 10, 'o', 3); // the front lip
  if (kind === 'cantina') {
    // Bottle shelf along the wall, taps, glasses and a till on the bar top.
    g.rect(12, 8, W - 24, 12, 'ko', 3);
    for (let x = 20; x < W - 16; x += 9 + r() * 4) {
      const c = r() > 0.5 ? 'p' : 'h';
      if (stocked()) g.circle(x, 14, 3, c);
    }
    for (let x = 34; x < W - 40; x += 46 + r() * 22) {
      g.rect(x - 5, 22, 10, 10, 'ko', 2);
      g.circle(x, 28, 2, 'p');
      const gx = x + 18 + r() * 8;
      const full = r() > 0.5;
      if (rm() < glassesOut) {
        g.circle(gx, 34, 7, 'o');
        g.circle(gx, 34, 3.5, full && mi === 1 ? 'm' : 't');
      }
    }
    screen(g, W - 44, 22, 28, 16, 'bars');
  } else if (kind === 'bar') {
    // Wooden bar: planked top, taps on little kegs, tankards and a towel.
    grain(g, 6, 6, W - 12, depth - 22, 2, 'h', len);
    for (let x = 30; x < W - 26; x += 52 + r() * 22) {
      g.circle(x, 20, 9, 's'); // keg end
      g.circle(x, 20, 3, 'k');
      const tx = x + 22 + r() * 8;
      if (rm() < glassesOut) {
        g.circle(tx, 34, 8, 'o'); // tankard
        g.circle(tx, 34, 4.5, mi === 1 ? 'hm' : 't');
        g.rect(tx + 7, 31, 5, 6, 'ko', 1);
      }
    }
    if (mi < 2) g.path(`M${W - 50} 18h20l-4 14h-16Z`, 'o'); // towel
  } else if (kind === 'kitchen') {
    // Stone basin with a pump, a chopping board with a cleaver and veg, a mixing bowl.
    g.rect(W - 96, 12, 66, 36, 'o', 8);
    g.rect(W - 90, 18, 54, 24, 'm', 6);
    g.rect(W - 26, 16, 12, 12, 'ko', 2);
    g.line(W - 26, 22, W - 44, 26, 'l');
    g.rect(18, 14, 50, 32, 'o', 3);
    grain(g, 18, 14, 50, 32, 1, 'v', len);
    g.path('M26 22h16v10h-16Z', 'k');
    g.line(42, 27, 50, 27, 'l');
    for (const [cx, cy] of [[58, 22], [60, 36], [52, 38]]) g.circle(cx, cy, 4, 'hm');
    if (len > 2) {
      g.circle(W / 2, 30, 15, 'o');
      g.circle(W / 2, 30, 9, 'm');
      g.line(W / 2 + 2, 26, W / 2 + 18, 14, 'l');
    }
  } else if (kind === 'lab') {
    // Microscope, flasks, a rack of test tubes and a readout.
    g.rect(18, 12, 26, 30, 's', 4);
    g.circle(31, 22, 7, 'ko');
    g.circle(31, 22, 2.5, 'p');
    g.rect(24, 32, 14, 6, 'o', 2);
    let x = 56;
    while (x < W - 86) {
      if (r() > 0.45) {
        g.circle(x + 8, 26, 10, 'o');
        g.circle(x + 8, 28, 6, r() > 0.5 ? 'm' : 'h');
        g.circle(x + 8, 18, 3, 'ko');
        x += 26;
      } else {
        g.rect(x, 16, 34, 22, 'ko', 3);
        for (let i = 0; i < 4; i++) g.circle(x + 6 + i * 7.3, 27, 2.6, i % 2 ? 'p' : 'h');
        x += 42;
      }
    }
    if (mi === 2 || mi === 4) g.chamfer(W - 70, 12, 54, 26, 6, 'ko');
    else screen(g, W - 70, 12, 54, 26, mi === 1 ? 'bars' : 'graph');
    if (mi === 1) {
      // An experiment running: a datapad of notes on the bench.
      g.rect(46, 34, 22, 16, 'ko', 3);
      g.lines([[50, 39, 62, 39], [50, 44, 58, 44]], 'pl');
    }
  } else {
    // Shop counter: wares laid out on cloth, a set of scales, a coin box.
    grain(g, 6, 6, W - 12, depth - 22, 2, 'h', len + 2);
    let x = 16;
    while (x < W - 70) {
      g.rect(x, 12, 26, 26, 's', 3);
      const pick = r();
      if (pick > 0.5) for (const [dx, dy] of [[7, 8], [17, 9], [12, 18]]) g.circle(x + dx, 12 + dy, 4.5, 'p');
      else g.rect(x + 5, 17, 16, 16, 'ko', 2);
      x += 32;
    }
    g.line(W - 58, 24, W - 22, 24, 'l'); // scales
    g.circle(W - 58, 24, 8, 'o');
    g.circle(W - 22, 24, 8, 'o');
    g.circle(W - 40, 24, 3, 'k');
  }
  counterMood(g, { W, depth, kind, mood, seed });
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/** Rug or carpet. pattern: border, diamond, stripes, round. */
function rug({ w = 2, h = 3, pattern = 'border' }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  if (pattern === 'round') {
    g.ellipse(W / 2, H / 2, W / 2 - 8, H / 2 - 8, 's');
    g.ellipse(W / 2, H / 2, W / 2 - 22, H / 2 - 22, 'o');
    g.ellipse(W / 2, H / 2, W / 2 - 36, H / 2 - 36, 'd');
    g.star(W / 2, H / 2, Math.min(W, H) * 0.14, 8, Math.min(W, H) * 0.07, 'ko');
    return { footprint: { w, h }, drawing: g };
  }
  g.rect(10, 10, W - 20, H - 20, 's', 2);
  // Border band of little diamonds.
  for (let x = 22; x < W - 18; x += 16) {
    g.poly([[x, 12], [x + 5, 16], [x, 20], [x - 5, 16]], 'k');
    g.poly([[x, H - 20], [x + 5, H - 16], [x, H - 12], [x - 5, H - 16]], 'k');
  }
  for (let y = 22; y < H - 18; y += 16) {
    g.poly([[12, y], [16, y + 5], [20, y], [16, y - 5]], 'k');
    g.poly([[W - 20, y], [W - 16, y + 5], [W - 12, y], [W - 16, y - 5]], 'k');
  }
  g.rect(22, 22, W - 44, H - 44, 'o');
  g.rect(30, 30, W - 60, H - 60, 'd');
  if (pattern === 'diamond' || pattern === 'border') {
    g.poly([[W / 2, 40], [W - 40, H / 2], [W / 2, H - 40], [40, H / 2]], 's');
    g.poly([[W / 2, 58], [W - 58, H / 2], [W / 2, H - 58], [58, H / 2]], 't');
    g.poly([[W / 2, H / 2 - 18], [W / 2 + 18, H / 2], [W / 2, H / 2 + 18], [W / 2 - 18, H / 2]], 'ko');
    g.circle(W / 2, H / 2, 4, 'p');
  }
  if (pattern === 'stripes') {
    const segs = [];
    for (let y = 40; y < H - 36; y += 16) segs.push([30, y, W - 30, y]);
    g.lines(segs, 'l');
  }
  const fringe = [];
  const long = H >= W;
  for (let t = 18; t < (long ? W : H) - 14; t += 9) fringe.push(long ? [t, 0, t, 10] : [0, t, 10, t], long ? [t, H - 10, t, H] : [W - 10, t, W, t]);
  g.lines(fringe, 't');
  return { footprint: { w, h }, drawing: g };
}

/** Raised platform with steps down the front. */
function dais({ w = 3, h = 2 }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  // Three stepped tiers, each a course of dressed stone, the top one lit.
  g.rect(4, 4, W - 8, H - 8, 'h');
  blocks(g, 4, H - 22, W - 8, 18, 18, 34);
  g.rect(4, 4, W - 8, H - 8, 'l');
  g.rect(18, 4, W - 36, H - 26, 's');
  blocks(g, 18, H - 44, W - 36, 18, 18, 30);
  g.rect(32, 4, W - 64, H - 48, 'o');
  g.rect(32, 4, W - 64, H - 48, 't');
  return { footprint: { w, h }, drawing: g };
}

/** Wooden crate (style crate) or sci-fi cargo container (style container). */
function cargo({ w = 1, h = 1, style = 'crate', seed = 1, mood = DEFAULT_MOOD }) {
  const g = new Drawing();
  const W = w * U;
  const H = h * U;
  const r = rng(hash('cargo', w, h, style, seed));
  const mi = moodIndex(mood);
  const rm = rng(hash('cargo-mood', w, h, style, seed, mood));
  // Prised open and emptied (ransacked), or half unpacked (lived-in, now and then).
  const opened = mi >= 3 ? rm() < 0.75 : mi === 1 ? rm() < 0.25 : false;
  const box = (x, y, bw, bh) => {
    if (style === 'container' && bw <= U && bh <= U) {
      // Hard-shell cargo case: ribbed lid, latches on two sides, carry handles, stencil.
      g.chamfer(x + 6, y + 6, bw - 12, bh - 12, 12, 's');
      g.chamfer(x + 16, y + 16, bw - 32, bh - 32, 8, 'o');
      slats(g, x + 20, y + 20, bw - 40, bh - 40, 9, 'v', 't');
      g.rect(x + bw / 2 - 14, y + bh / 2 - 8, 28, 16, 'ko', 3);
      g.line(x + bw / 2 - 8, y + bh / 2, x + bw / 2 + 8, y + bh / 2, 'pl');
      for (const yy of [y + 2, y + bh - 10]) g.rect(x + bw / 2 - 10, yy, 20, 8, 'ko', 2);
      for (const xx of [x + 2, x + bw - 10]) g.rect(xx, y + bh / 2 - 12, 8, 24, 'ko', 2);
    } else if (style === 'container') {
      // Shipping container: corrugated roof, corner castings, door bars at one end.
      g.chamfer(x + 4, y + 4, bw - 8, bh - 8, 10, 's');
      const long = bw >= bh;
      const ribs = [];
      for (let t = 26; t < (long ? bw : bh) - 30; t += 12) ribs.push(long ? [x + t, y + 12, x + t, y + bh - 12] : [x + 12, y + t, x + bw - 12, y + t]);
      g.lines(ribs, 't');
      for (const [cx, cy] of [[x + 4, y + 4], [x + bw - 20, y + 4], [x + 4, y + bh - 20], [x + bw - 20, y + bh - 20]]) g.rect(cx, cy, 16, 16, 'ko', 2);
      if (long) g.lines([[x + bw - 14, y + 22, x + bw - 14, y + bh - 22], [x + bw - 24, y + 22, x + bw - 24, y + bh - 22]], 'l');
      else g.lines([[x + 22, y + bh - 14, x + bw - 22, y + bh - 14], [x + 22, y + bh - 24, x + bw - 22, y + bh - 24]], 'l');
      g.rect(x + bw / 2 - 18, y + bh / 2 - 11, 36, 22, 'ko', 3);
      g.lines([[x + bw / 2 - 11, y + bh / 2 - 3, x + bw / 2 + 11, y + bh / 2 - 3], [x + bw / 2 - 11, y + bh / 2 + 4, x + bw / 2 + 4, y + bh / 2 + 4]], 'pl');
    } else {
      g.rect(x + 6, y + 6, bw - 12, bh - 12, 'o', 2);
      grain(g, x + 6, y + 6, bw - 12, bh - 12, Math.max(3, Math.round(bh / 25)), 'h', Math.round(x + y + bw));
      g.rect(x + 6, y + 6, bw - 12, 10, 's', 1); // battens
      g.rect(x + 6, y + bh - 16, bw - 12, 10, 's', 1);
      g.lines([[x + 12, y + 16, x + bw - 12, y + bh - 16]], 'l'); // brace
      for (const [cx, cy] of [[x + 6, y + 6], [x + bw - 18, y + 6], [x + 6, y + bh - 18], [x + bw - 18, y + bh - 18]]) g.rect(cx, cy, 12, 12, 'ko', 2);
    }
  };
  const big = style === 'container' && (w > 1 || h > 1);
  if (opened && !big) {
    // Lid off: the dark inside with what's left, the lid leant against it.
    const inset = style === 'container' ? 8 : 6;
    if (style === 'container') g.chamfer(inset, inset, W - inset * 2, H - inset * 2, 12, 's');
    else g.rect(inset, inset, W - inset * 2, H - inset * 2, 'o', 2);
    g.rect(inset + 10, inset + 10, W - inset * 2 - 20, H - inset * 2 - 20, 'k', 3);
    const left = mi >= 3 ? 1 : 3;
    for (let i = 0; i < left; i++) g.rect(inset + 16 + rm() * (W - inset * 2 - 52), inset + 16 + rm() * (H - inset * 2 - 52), 16, 14, 'h', 2);
    const lx = W * (0.2 + rm() * 0.6);
    g.add(`<g transform="rotate(${Math.round((rm() - 0.5) * 50)} ${lx.toFixed(1)} ${(H - 10).toFixed(1)})">`);
    g.rect(lx - W * 0.35, H - 22, W * 0.7, 16, style === 'container' ? 'm' : 's', 3);
    g.add('</g>');
    if (mi >= 3) for (let i = 0; i < 3; i++) g.rect(rm() * (W - 14), rm() < 0.5 ? rm() * 10 : H - 12, 12, 10, 'k', 2);
  } else if (style === 'crate' && w * h > 1) {
    // Stacks: a big crate with a smaller one on top.
    box(0, 0, W, H);
    const sw = W * (0.45 + r() * 0.15);
    const sh = H * (0.45 + r() * 0.15);
    box(W - sw - 4, 4, sw, sh);
  } else {
    box(0, 0, W, H);
  }
  if (big && mi >= 3) {
    // Doors forced: the end swung open, dark inside.
    const long = W >= H;
    if (long) g.rect(W - 34, 14, 26, H - 28, 'k', 2);
    else g.rect(14, H - 34, W - 28, 26, 'k', 2);
  }
  if (mi === 2 || mi === 4) {
    dust(g, rm, 10, 10, W - 20, H - 20, Math.round((w + h) * 3));
    if (rm() < 0.5) web(g, 8, 8, 1, 1, 18);
  }
  return { footprint: { w, h }, drawing: g };
}

/** Straight run of railing (the editor draws edge railings itself). */
function railing({ len = 3, style = 'posts' }) {
  const g = new Drawing();
  const W = len * U;
  if (style === 'panel') g.chamfer(4, 40, W - 8, 20, 6, 's');
  else g.rect(4, 44, W - 8, 12, 'o', 3);
  for (let x = 0; x <= len; x++) g.rect(Math.min(W - 16, Math.max(0, x * U - 8)), 40, 16, 20, 'ko', 3);
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/**
 * Bridge spanning `len` squares (along x), `width` wide. style: wood (planks and rails),
 * stone (arched slabs with parapets) or metal (grated gantry with handrails).
 */
function bridge({ len = 4, width = 2, style = 'wood' }) {
  const g = new Drawing();
  const W = len * U;
  const H = width * U;
  if (style === 'stone') {
    // Flagged deck between parapet walls of dressed blocks.
    g.rect(0, 10, W, H - 20, 'o', 8);
    const flags = [];
    for (let row = 0, y = 18; y < H - 22; y += 26, row++) {
      flags.push([2, y + 26 > H - 22 ? H - 22 : y + 26, W - 2, y + 26 > H - 22 ? H - 22 : y + 26]);
      for (let x = (row % 2 ? 20 : 40); x < W; x += 40) flags.push([x, y, x, Math.min(H - 22, y + 26)]);
    }
    g.lines(flags.slice(0, -1), 't');
    g.rect(0, 0, W, 18, 's', 5);
    g.rect(0, H - 18, W, 18, 's', 5);
    for (let x = 25; x < W; x += 50) g.lines([[x, 0, x, 18], [x, H - 18, x, H]], 't');
    g.path(`M30 ${H / 2}Q40 ${H / 2 - 6} 50 ${H / 2}`, 't'); // worn patch
  } else if (style === 'metal') {
    // Grated gantry: cross-hatched deck, beams under each square, handrails on posts.
    g.chamfer(0, 8, W, H - 16, 10, 's');
    g.rect(6, 18, W - 12, H - 36, 'o', 2);
    const grid = [];
    for (let x = 16; x < W - 8; x += 12) grid.push([x, 18, x, H - 18]);
    for (let y = 30; y < H - 20; y += 12) grid.push([6, y, W - 6, y]);
    g.lines(grid, 't');
    for (let x = U; x < W; x += U) g.rect(x - 4, 14, 8, H - 28, 'm', 2);
    g.rect(0, 2, W, 10, 'ko', 3);
    g.rect(0, H - 12, W, 10, 'ko', 3);
    for (let x = 0; x <= len; x++) {
      const px = Math.min(W - 6, Math.max(6, x * U));
      g.circle(px, 7, 5, 'p');
      g.circle(px, H - 7, 5, 'p');
    }
  } else {
    g.rect(0, 12, W, H - 24, 'o', 4);
    const boards = [];
    for (let x = 25; x < W; x += 25) boards.push([x, 14, x, H - 14]);
    g.lines(boards, 'l');
    for (let x = 25; x < W; x += 25) g.circle(x - 12.5, (x * 7) % (H - 40) + 20, 2, 'k'); // nail heads
    g.lines([[0, H / 2 - 12, W, H / 2 - 12], [0, H / 2 + 12, W, H / 2 + 12]], 't');
    g.rect(0, 4, W, 12, 's', 4);
    g.rect(0, H - 16, W, 12, 's', 4);
    for (let x = 0; x <= len; x++) {
      const px = Math.min(W - 16, Math.max(0, x * U - 8));
      g.rect(px, 0, 16, 20, 'ko', 3);
      g.rect(px, H - 20, 16, 20, 'ko', 3);
    }
  }
  return { footprint: { w: len, h: width }, drawing: g };
}

/** A straight fence `len` squares long. style: wood (rails), iron (spiked) or barrier (sci-fi). */
function fence({ len = 3, style = 'wood' }) {
  const g = new Drawing();
  const W = len * U;
  if (style === 'barrier') {
    // Jersey barriers: a sloped base (shade) under a narrow top (paper) with chevrons.
    for (let x = 0; x < len; x++) {
      g.chamfer(x * U + 4, 28, U - 8, 44, 10, 's');
      g.rect(x * U + 12, 40, U - 24, 20, 'o', 3);
      hazard(g, x * U + 16, 44, U - 32, 12, 10);
      g.circle(x * U + 10, 50, 2.6, 'k');
      g.circle(x * U + U - 10, 50, 2.6, 'k');
    }
  } else if (style === 'iron') {
    // Rail with spear-headed bars and square stone-capped posts.
    g.line(0, 50, W, 50, 'l');
    for (let x = 10; x < W; x += 16) g.poly([[x, 41], [x + 4, 48], [x, 56], [x - 4, 48]], 'k');
    for (let x = 0; x <= len; x++) {
      const px = Math.min(W - 18, Math.max(0, x * U - 9));
      g.rect(px, 38, 18, 24, 's', 2);
      g.rect(px + 4, 42, 10, 16, 'ko', 1);
    }
  } else {
    // Split-rail fence: two rough rails between posts.
    g.rect(0, 40, W, 9, 'o', 3);
    g.rect(0, 53, W, 9, 'o', 3);
    g.lines([[10, 44, W * 0.45, 45], [W * 0.5, 57, W - 10, 58]], 't');
    for (let x = 0; x <= len; x++) {
      const px = Math.min(W - 16, Math.max(0, x * U - 8));
      g.rect(px, 32, 16, 36, 's', 4);
      g.circle(px + 8, 50, 4, 't');
    }
  }
  return { footprint: { w: len, h: 1 }, drawing: g };
}

/**
 * Registry: id -> {name, params (defaults and allowed ranges), make(params)}. `moods`: the
 * generator also takes mood and seed, so the same piece varies with how cared-for the room is.
 */
export const GENERATORS = {
  table: { name: 'Table', params: { w: [1, 4], h: [1, 3] }, make: table, moods: true },
  bed: { name: 'Bed', params: {}, make: bed, moods: true },
  bench: { name: 'Bench', params: { len: [1, 5] }, make: bench },
  shelf: { name: 'Shelf', params: { len: [1, 4] }, make: shelf, moods: true },
  counter: { name: 'Counter', params: { len: [2, 6] }, make: counter, moods: true },
  ...PART_GENERATORS,
  ...SCIFI_PART_GENERATORS,
  rug: { name: 'Rug', params: { w: [1, 5], h: [1, 6] }, make: rug },
  dais: { name: 'Dais', params: { w: [2, 6], h: [1, 4] }, make: dais },
  cargo: { name: 'Cargo', params: { w: [1, 4], h: [1, 4] }, make: cargo, moods: true },
  railing: { name: 'Railing', params: { len: [1, 8] }, make: railing },
  bridge: { name: 'Bridge', params: { len: [2, 12], width: [1, 4] }, make: bridge },
  fence: { name: 'Fence', params: { len: [1, 8] }, make: fence },
};

export function runGenerator(id, params) {
  const gen = GENERATORS[id];
  if (!gen) throw new Error(`Unknown generator "${id}"`);
  return gen.make(params || {});
}
