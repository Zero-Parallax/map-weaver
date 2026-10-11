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
  // Grain across the seat.
  if (facing === 'n' || facing === 's') g.line(cx - h + 7, cy + (facing === 's' ? 4 : -4), cx + h - 7, cy + (facing === 's' ? 4 : -4), 't');
  else g.line(cx + (facing === 'e' ? 4 : -4), cy - h + 7, cx + (facing === 'e' ? 4 : -4), cy + h - 7, 't');
}

/** Round stool. */
export function stool(g, cx, cy, r = 15) {
  g.circle(cx, cy, r, 'o');
  g.line(cx - r * 0.6, cy - r * 0.2, cx + r * 0.6, cy - r * 0.35, 't');
  g.line(cx - r * 0.55, cy + r * 0.3, cx + r * 0.5, cy + r * 0.2, 't');
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
  // Cushion seam across the pad, parallel to the back.
  const q = size * 0.18;
  if (facing === 'n' || facing === 's') g.line(cx - h + q, cy, cx + h - q, cy, 't');
  else g.line(cx, cy - h + q, cx, cy + h - q, 't');
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

/** Candle seen from above: a glow ring round a wax top with its wick. */
export function candle(g, cx, cy, r = 7) {
  g.circle(cx, cy, r * 1.7, 'h');
  g.circle(cx, cy, r, 'o');
  g.circle(cx, cy, r * 0.35, 'k');
}

/** Fire seen from above: licking tongues of flame (ink) round a bright heart (paper). */
export function flame(g, cx, cy, r) {
  const tongues = 7;
  let d = '';
  for (let i = 0; i < tongues; i++) {
    const a = (i / tongues) * Math.PI * 2;
    const a2 = ((i + 1) / tongues) * Math.PI * 2;
    const tip = r * (i % 2 ? 0.85 : 1);
    const p = (ang, rr) => `${(cx + Math.cos(ang) * rr).toFixed(1)} ${(cy + Math.sin(ang) * rr).toFixed(1)}`;
    if (!i) d += `M${p(a, r * 0.45)}`;
    d += `Q${p(a + 0.08, tip * 0.8)} ${p(a + 0.32, tip)}Q${p(a + 0.42, r * 0.6)} ${p(a2, r * 0.45)}`;
  }
  g.path(d + 'Z', 'k');
  g.circle(cx, cy, r * 0.42, 'p');
  g.circle(cx, cy, r * 0.18, 'h');
}

/** Wood grain inside a box: plank seams plus wavy grain and a knot (seeded). dir 'h': planks run across. */
export function grain(g, x, y, w, h, planksCount = 3, dir = 'h', seed = 1) {
  let s0 = seed * 7907 + 13;
  const rnd = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
  const f = (v) => v.toFixed(1);
  const along = dir === 'h' ? w : h;
  const across = dir === 'h' ? h : w;
  const step = across / planksCount;
  const pt = (u, v) => (dir === 'h' ? [x + u, y + v] : [x + v, y + u]);
  let seams = '';
  let d = '';
  for (let i = 0; i < planksCount; i++) {
    if (i) {
      const [ax, ay] = pt(0, i * step);
      const [bx, by] = pt(along, i * step);
      seams += `M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}`;
    }
    // One grain stroke per plank, running part of its length with a gentle wave.
    const v = i * step + step * (0.35 + rnd() * 0.3);
    const u0 = along * rnd() * 0.3;
    const u1 = along * (0.6 + rnd() * 0.4);
    const [ax, ay] = pt(u0, v);
    const [mx, my] = pt((u0 + u1) / 2, v + (rnd() - 0.5) * step * 0.5);
    const [bx, by] = pt(u1, v);
    d += `M${f(ax)} ${f(ay)}Q${f(mx)} ${f(my)} ${f(bx)} ${f(by)}`;
  }
  if (seams) g.path(seams, 'l');
  g.path(d, 't');
  if (along > 60 && step > 14) {
    const [kx, ky] = pt(along * (0.2 + rnd() * 0.6), step * (Math.floor(rnd() * planksCount) + 0.5));
    g.add(`<ellipse class="t" cx="${f(kx)}" cy="${f(ky)}" rx="${dir === 'h' ? 5 : 3}" ry="${dir === 'h' ? 3 : 5}"/>`);
  }
}

/** Running-bond stone blocks inside a box (walls of fireplaces, wells, plinths). */
export function blocks(g, x, y, w, h, rowH = 16, blockW = 26) {
  const segs = [];
  let row = 0;
  for (let yy = y + rowH; yy < y + h - 2; yy += rowH) segs.push([x, yy, x + w, yy]);
  for (let yy = y; yy < y + h - 2; yy += rowH, row++) {
    for (let xx = x + (row % 2 ? blockW / 2 : blockW); xx < x + w - 4; xx += blockW) segs.push([xx, yy, xx, Math.min(y + h, yy + rowH)]);
  }
  g.lines(segs, 't');
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

/** Ink hazard stripes inside a rectangle: solid ink bands on paper, at 45 degrees. */
export function hazard(g, x, y, w, h, step = 20) {
  g.rect(x, y, w, h, 'o');
  const half = step / 2;
  for (let t = -h; t < w; t += step) {
    // Band between the lines u = t and u = t + half, where u = (px - x) - (y + h - py).
    g.poly(bandInBox(t, half, x, y, w, h), 'k');
  }
  g.rect(x, y, w, h, 'l');
}

/** Polygon of a 45-degree band (u in [t, t + half]) clipped to a box. */
function bandInBox(t, half, x, y, w, h) {
  // Sample the band outline and clip each edge to the box with Sutherland-Hodgman.
  let poly = [[x + t, y + h], [x + t + half, y + h], [x + t + half + h, y], [x + t + h, y]];
  const edges = [
    (p) => p[0] >= x, (p) => p[0] <= x + w, (p) => p[1] >= y, (p) => p[1] <= y + h,
  ];
  const cut = [
    (a, b) => lerpAt(a, b, (x - a[0]) / (b[0] - a[0])), (a, b) => lerpAt(a, b, (x + w - a[0]) / (b[0] - a[0])),
    (a, b) => lerpAt(a, b, (y - a[1]) / (b[1] - a[1])), (a, b) => lerpAt(a, b, (y + h - a[1]) / (b[1] - a[1])),
  ];
  for (let e = 0; e < 4 && poly.length; e++) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ina = edges[e](a);
      const inb = edges[e](b);
      if (ina) out.push(a);
      if (ina !== inb) out.push(cut[e](a, b));
    }
    poly = out;
  }
  return poly;
}
const lerpAt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Small ink bolt heads at the corners of a panel. */
export function bolts(g, x, y, w, h, inset = 7, r = 2.6) {
  for (const [bx, by] of [[x + inset, y + inset], [x + w - inset, y + inset], [x + inset, y + h - inset], [x + w - inset, y + h - inset]]) g.circle(bx, by, r, 'k');
}

/** Parallel slats (vents, grilles, treads). dir 'h': horizontal lines stacked down the box. */
export function slats(g, x, y, w, h, step = 8, dir = 'h', cls = 't') {
  const segs = [];
  if (dir === 'h') for (let yy = y + step / 2; yy < y + h; yy += step) segs.push([x, yy, x + w, yy]);
  else for (let xx = x + step / 2; xx < x + w; xx += step) segs.push([xx, y, xx, y + h]);
  g.lines(segs, cls);
}

/**
 * A single leaf seen from above, growing from (x, y) at `angle` degrees: tapered, slightly
 * curled (bend), with a midrib and side veins so it never reads as a petal.
 */
export function leaf(g, x, y, angle, len, width, cls = 's', bend = 0.15, veins = 3) {
  const a = (angle * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const N = 14;
  const L = [];
  const R = [];
  const C = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const off = bend * len * t * t;
    const bx = x + ca * len * t - sa * off;
    const by = y + sa * len * t + ca * off;
    const half = (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.8) * (1 - 0.3 * t);
    C.push([bx, by]);
    L.push([bx - sa * half, by + ca * half]);
    R.push([bx + sa * half, by - ca * half]);
  }
  g.poly([...L, ...R.reverse()], cls);
  R.reverse();
  g.path('M' + C.slice(1, N - 1).map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L'), 't');
  const d = [];
  for (let k = 1; k <= veins; k++) {
    const i = Math.round(2 + (k * (N - 6)) / veins);
    const j = Math.min(N, i + 2);
    for (const side of [L, R]) {
      const ex = side[j][0] * 0.7 + C[j][0] * 0.3;
      const ey = side[j][1] * 0.7 + C[j][1] * 0.3;
      d.push(`M${C[i][0].toFixed(1)} ${C[i][1].toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
    }
  }
  if (d.length) g.path(d.join(''), 't');
}

/** A cluster of leaves round a point, at irregular angles and lengths (seeded). */
export function leafCluster(g, cx, cy, r, count, seed, classes = ['s', 'o']) {
  let s0 = seed * 9301 + 49297;
  const rnd = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
  const start = rnd() * 360;
  for (let i = 0; i < count; i++) {
    const a = start + (i * 360) / count + (rnd() - 0.5) * 40;
    leaf(g, cx, cy, a, r * (0.8 + rnd() * 0.3), r * (0.8 + rnd() * 0.25), classes[i % classes.length], (rnd() - 0.5) * 0.5, 2);
  }
}

/** Scalloped canopy outline (trees, bushes): a ring of soft bulges round a centre. */
export function canopyPath(cx, cy, r, lobes, seed, bulge = 0.28, jitter = 0.12) {
  let s0 = seed * 7919 + 104729;
  const rnd = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
  const pts = [];
  for (let i = 0; i < lobes; i++) pts.push([((i + (rnd() - 0.5) * 0.4) / lobes) * Math.PI * 2, r * (1 + (rnd() - 0.5) * 2 * jitter)]);
  let d = '';
  for (let i = 0; i < lobes; i++) {
    const [a, rr] = pts[i];
    let [a2, r2] = pts[(i + 1) % lobes];
    if (i === lobes - 1) a2 += Math.PI * 2;
    const am = (a + a2) / 2;
    const rm = ((rr + r2) / 2) * (1 + bulge);
    const f = (v) => v.toFixed(1);
    if (!i) d += `M${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
    d += `Q${f(cx + Math.cos(am) * rm)} ${f(cy + Math.sin(am) * rm)} ${f(cx + Math.cos(a2) * r2)} ${f(cy + Math.sin(a2) * r2)}`;
  }
  return d + 'Z';
}

/** Short curved strokes scattered in a disc: foliage texture. */
export function tufts(g, cx, cy, r, count, seed, size = 8) {
  let s0 = seed * 4111 + 7;
  const rnd = () => ((s0 = (s0 * 9301 + 49297) % 233280) / 233280);
  const f = (v) => v.toFixed(1);
  let d = '';
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = r * Math.sqrt(0.15 + rnd() * 0.85);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const o = rnd() * Math.PI;
    const x1 = x + Math.cos(o) * size;
    const y1 = y + Math.sin(o) * size;
    d += `M${f(x)} ${f(y)}Q${f((x + x1) / 2 + Math.cos(o + 1.57) * size * 0.5)} ${f((y + y1) / 2 + Math.sin(o + 1.57) * size * 0.5)} ${f(x1)} ${f(y1)}`;
  }
  g.path(d, 't');
}
