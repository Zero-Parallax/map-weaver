// Small drawing pieces shared by the starter assets, so similar things look alike across
// settings and each asset's own silhouette carries the difference. Units: 100 per square.

/** Wooden chair seen from above. facing: the way the sitter looks (n, e, s, w). */
export function chair(g, cx, cy, facing, size = 38) {
  const h = size / 2;
  g.rect(cx - h, cy - h, size, size, 'o', 7);
  const back = {
    n: [cx - h, cy + h - 9, size, 9],
    s: [cx - h, cy - h, size, 9],
    e: [cx - h, cy - h, 9, size],
    w: [cx + h - 9, cy - h, 9, size],
  }[facing];
  g.rect(...back, 'ko', 3);
}

/** Round stool. */
export function stool(g, cx, cy, r = 15) {
  g.circle(cx, cy, r, 'o');
  g.circle(cx, cy, r * 0.45, 't');
}

/** Sci-fi seat: rounded pad with a thick back and arm stubs. */
export function seat(g, cx, cy, facing, size = 40) {
  const h = size / 2;
  g.rect(cx - h, cy - h, size, size, 's', 12);
  const back = {
    n: [cx - h, cy + h - 11, size, 11],
    s: [cx - h, cy - h, size, 11],
    e: [cx - h, cy - h, 11, size],
    w: [cx + h - 11, cy - h, 11, size],
  }[facing];
  g.rect(...back, 'ko', 5);
}

/** Planks running across a rectangle. dir 'h' lines are horizontal. */
export function planks(g, x, y, w, h, count, dir = 'h', cls = 't') {
  const segs = [];
  for (let i = 1; i < count; i++) {
    if (dir === 'h') segs.push([x, y + (h * i) / count, x + w, y + (h * i) / count]);
    else segs.push([x + (w * i) / count, y, x + (w * i) / count, y + h]);
  }
  g.lines(segs, cls);
}

/** A dark screen with glowing UI lines: reads as "display" at any size. */
export function screen(g, x, y, w, h, style = 'bars') {
  g.chamfer(x, y, w, h, Math.min(w, h) * 0.2, 'ko');
  const pad = Math.min(w, h) * 0.22;
  if (style === 'bars') {
    const rows = Math.max(1, Math.floor((h - pad * 2) / 9));
    const segs = [];
    for (let i = 0; i < rows; i++) {
      const yy = y + pad + i * 9 + 2;
      segs.push([x + pad, yy, x + pad + (w - pad * 2) * (0.4 + ((i * 37) % 60) / 100), yy]);
    }
    g.lines(segs, 'pl');
  } else if (style === 'radar') {
    const r = Math.min(w, h) / 2 - pad;
    g.circle(x + w / 2, y + h / 2, r, 'pl');
    g.lines([[x + w / 2, y + h / 2, x + w / 2 + r * 0.7, y + h / 2 - r * 0.7]], 'pl');
  } else if (style === 'graph') {
    g.path(`M${x + pad} ${y + h - pad}L${x + w * 0.35} ${y + h * 0.45}L${x + w * 0.55} ${y + h * 0.65}L${x + w - pad} ${y + pad}`, 'pl');
  }
}

/** Row of small ink buttons. */
export function buttons(g, x, y, w, count = 4, r = 3.5) {
  for (let i = 0; i < count; i++) g.circle(x + (w * (i + 0.5)) / count, y, r, 'k');
}

/** Candle seen from above: wax disc with a paper flame dot on ink. */
export function candle(g, cx, cy, r = 7) {
  g.circle(cx, cy, r, 'ko');
  g.circle(cx, cy, r * 0.4, 'p');
}

/** Flame burst: ink star with a paper heart. */
export function flame(g, cx, cy, r) {
  g.star(cx, cy, r, 7, r * 0.5, 'k');
  g.star(cx, cy, r * 0.5, 5, r * 0.25, 'p');
}

/** Top-down person-shaped silhouette (statues, suits, clones). */
export function figure(g, cx, cy, s = 1, cls = 's') {
  g.ellipse(cx, cy + 6 * s, 30 * s, 16 * s, cls);
  g.circle(cx, cy, 13 * s, cls);
  g.ellipse(cx - 30 * s, cy + 8 * s, 7 * s, 11 * s, cls);
  g.ellipse(cx + 30 * s, cy + 8 * s, 7 * s, 11 * s, cls);
}

/** Leafy plant from above. */
export function leaves(g, cx, cy, r, count = 7, cls = 's') {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = cx + Math.cos(a) * r * 0.55;
    const y = cy + Math.sin(a) * r * 0.55;
    g.add(`<ellipse class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(r * 0.48).toFixed(1)}" ry="${(r * 0.22).toFixed(1)}" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }
  g.circle(cx, cy, r * 0.22, 'k');
}

/** Rough stone outline around a centre, seeded so every stone differs. */
export function stoneShape(cx, cy, r, seed, points = 8) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const j = 0.75 + (((seed * 9301 + i * 49297) % 233280) / 233280) * 0.35;
    pts.push([cx + Math.cos(a) * r * j, cy + Math.sin(a) * r * j]);
  }
  return pts;
}

/** Ink hazard stripes inside a rectangle. */
export function hazard(g, x, y, w, h, step = 20) {
  g.rect(x, y, w, h, 'o');
  const segs = [];
  for (let t = -h + step / 2; t < w; t += step) {
    const from = t < 0 ? [x, y + h + t] : [x + t, y + h];
    const to = t + h > w ? [x + w, y + (t + h - w)] : [x + t + h, y];
    segs.push([...from, ...to]);
  }
  g.lines(segs, 'l');
  g.rect(x, y, w, h, 'l');
}
