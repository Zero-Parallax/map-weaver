// Draws a level onto a 2D canvas context whose transform maps grid squares to pixels.
// The editor and the PNG export both use this, so what you see is what you export.

import { offset } from '../core/clip.js';
import { ringsBBox, sub, norm, perp, add, scale, dist } from '../core/geom.js';
import { rng, hash } from '../core/rng.js';

function ringsPath(rings, path = new Path2D()) {
  for (const ring of rings) {
    path.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i++) path.lineTo(ring[i][0], ring[i][1]);
    path.closePath();
  }
  return path;
}

function segmentsPath(segments) {
  const path = new Path2D();
  for (const [a, b] of segments) {
    path.moveTo(a[0], a[1]);
    path.lineTo(b[0], b[1]);
  }
  return path;
}

function gridPath(w, h) {
  const path = new Path2D();
  for (let x = 0; x <= w; x++) {
    path.moveTo(x, 0);
    path.lineTo(x, h);
  }
  for (let y = 0; y <= h; y++) {
    path.moveTo(0, y);
    path.lineTo(w, y);
  }
  return path;
}

// Dyson-style clusters: a few parallel strokes per square at a random angle.
function clusterHatch(box, seed) {
  const path = new Path2D();
  for (let cy = Math.floor(box.minY); cy < Math.ceil(box.maxY); cy++) {
    for (let cx = Math.floor(box.minX); cx < Math.ceil(box.maxX); cx++) {
      const r = rng(hash(seed, cx, cy));
      const angle = r() * Math.PI;
      const u = [Math.cos(angle), Math.sin(angle)];
      const n = perp(u);
      const count = 3 + Math.floor(r() * 2);
      const centre = [cx + 0.5 + (r() - 0.5) * 0.3, cy + 0.5 + (r() - 0.5) * 0.3];
      for (let k = 0; k < count; k++) {
        const off = (k - (count - 1) / 2) * 0.22;
        const half = 0.5 + r() * 0.15;
        const c = add(centre, scale(n, off));
        path.moveTo(c[0] - u[0] * half, c[1] - u[1] * half);
        path.lineTo(c[0] + u[0] * half, c[1] + u[1] * half);
      }
    }
  }
  return path;
}

function diagonalLines(box, spacing, both) {
  const path = new Path2D();
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  for (let d = -h; d <= w; d += spacing) {
    path.moveTo(box.minX + d, box.minY);
    path.lineTo(box.minX + d + h, box.maxY);
    if (both) {
      path.moveTo(box.minX + d, box.maxY);
      path.lineTo(box.minX + d + h, box.minY);
    }
  }
  return path;
}

/** Build (or reuse) the paths for this level geometry and style. */
function layers(geo, style, map) {
  const key = style.key + '|' + map.size.w + 'x' + map.size.h;
  if (geo.cache.layersKey === key) return geo.cache.layers;
  const { w, h } = map.size;
  const mapBox = { minX: 0, minY: 0, maxX: w, maxY: h };
  const L = {
    floor: ringsPath(geo.floor),
    walls: ringsPath(geo.floor, segmentsPath(geo.inner)),
    grid: gridPath(w, h),
    rock: ringsPath(geo.floor, ringsPath([[[0, 0], [w, 0], [w, h], [0, h]]])),
  };
  if (style.shading === 'hatch' || style.shading === 'crosshatch') {
    const band = offset(geo.floor, style.band);
    L.band = ringsPath(geo.floor, ringsPath(band));
    const box = band.length ? ringsBBox(band) : mapBox;
    L.hatch = style.shading === 'hatch' ? clusterHatch(box, map.seed) : diagonalLines(box, 0.18, true);
  } else if (style.shading === 'lines') {
    L.hatch = diagonalLines(mapBox, 0.28, false);
  }
  geo.cache.layersKey = key;
  geo.cache.layers = L;
  return L;
}

// ---- doors ---------------------------------------------------------------

function quad(ctx, centre, u, n, halfLen, halfDepth) {
  const p = (s, t) => add(add(centre, scale(u, s)), scale(n, t));
  const pts = [p(-halfLen, -halfDepth), p(halfLen, -halfDepth), p(halfLen, halfDepth), p(-halfLen, halfDepth)];
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (let i = 1; i < 4; i++) ctx.lineTo(...pts[i]);
  ctx.closePath();
}

export function drawDoor(ctx, door, style) {
  const t = style.wallWidth;
  const len = dist(door.a, door.b);
  if (len < 1e-6) return;
  const u = norm(sub(door.b, door.a));
  const n = perp(u);
  const m = scale(add(door.a, door.b), 0.5);
  const stroke = Math.max(0.035, t * 0.4);
  ctx.save();
  ctx.lineWidth = stroke;
  ctx.strokeStyle = style.ink;
  ctx.fillStyle = style.paper;
  ctx.lineJoin = 'miter';

  const gap = () => {
    quad(ctx, m, u, n, len / 2, t * 0.5 + stroke);
    ctx.fill();
  };
  const leaf = (centre, halfLen, halfDepth) => {
    quad(ctx, centre, u, n, halfLen, halfDepth);
    ctx.fill();
    ctx.stroke();
  };
  const leafDepth = Math.max(t * 0.9, 0.1);

  switch (door.type) {
    case 'secret': {
      ctx.translate(m[0], m[1]);
      ctx.rotate(Math.atan2(u[1], u[0]));
      ctx.scale(1 / 64, 1 / 64);
      ctx.font = 'bold 40px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 10;
      ctx.strokeStyle = style.paper;
      ctx.strokeText('S', 0, 2);
      ctx.fillStyle = style.ink;
      ctx.fillText('S', 0, 2);
      break;
    }
    case 'archway':
      gap();
      ctx.fillStyle = style.ink;
      for (const end of [door.a, door.b]) {
        quad(ctx, end, u, n, t * 0.9, t * 0.9);
        ctx.fill();
      }
      break;
    case 'portcullis': {
      gap();
      ctx.fillStyle = style.ink;
      const count = Math.max(3, Math.round(len / 0.2));
      for (let i = 0; i <= count; i++) {
        const c = add(door.a, scale(u, (len * i) / count));
        ctx.beginPath();
        ctx.arc(c[0], c[1], Math.max(0.035, t * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'window':
      gap();
      leaf(m, len / 2, t * 0.5);
      ctx.beginPath();
      ctx.moveTo(...door.a);
      ctx.lineTo(...door.b);
      ctx.lineWidth = stroke * 0.6;
      ctx.stroke();
      break;
    case 'sliding': {
      gap();
      const q = len / 4;
      leaf(add(add(m, scale(u, -q)), scale(n, -t * 0.25)), q * 1.05, t * 0.3);
      leaf(add(add(m, scale(u, q)), scale(n, t * 0.25)), q * 1.05, t * 0.3);
      break;
    }
    case 'double':
      gap();
      leaf(m, len * 0.45, leafDepth);
      ctx.beginPath();
      ctx.moveTo(...add(m, scale(n, -leafDepth)));
      ctx.lineTo(...add(m, scale(n, leafDepth)));
      ctx.stroke();
      break;
    case 'locked':
      gap();
      leaf(m, len * 0.43, leafDepth);
      ctx.beginPath();
      ctx.moveTo(...add(m, scale(n, -leafDepth * 1.9)));
      ctx.lineTo(...add(m, scale(n, leafDepth * 1.9)));
      ctx.lineWidth = stroke * 1.6;
      ctx.stroke();
      break;
    default:
      gap();
      leaf(m, len * 0.43, leafDepth);
  }
  ctx.restore();
}

// ---- level ---------------------------------------------------------------

/**
 * Draw one level. ctx's transform must already map squares to pixels.
 * opts.pxPerSquare keeps hairlines visible when zoomed out.
 */
export function drawLevel(ctx, { map, level, geo, style, pxPerSquare = 64 }) {
  const { w, h } = map.size;
  const L = layers(geo, style, map);
  const hair = 1 / pxPerSquare;

  // Paper and rock.
  ctx.fillStyle = style.paper;
  ctx.fillRect(0, 0, w, h);
  if (style.shading === 'solid') {
    ctx.fillStyle = style.ink;
    ctx.fill(L.rock, 'evenodd');
  } else if (L.hatch) {
    ctx.save();
    ctx.clip(L.band || L.rock, 'evenodd');
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = Math.max(hair, 0.03);
    ctx.lineCap = 'round';
    ctx.stroke(L.hatch);
    ctx.restore();
  }

  // Grid.
  if (style.gridMode !== 'off') {
    ctx.save();
    if (style.gridMode === 'floor') ctx.clip(L.floor, 'evenodd');
    ctx.strokeStyle = style.grid;
    ctx.lineWidth = Math.max(hair, 0.025);
    ctx.stroke(L.grid);
    ctx.restore();
  }

  // Walls.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = style.ink;
  ctx.lineWidth = style.wallWidth;
  ctx.stroke(L.walls);
  if (style.wallStyle === 'double') {
    ctx.strokeStyle = style.paper;
    ctx.lineWidth = style.wallWidth * 0.38;
    ctx.stroke(L.walls);
  }
  ctx.restore();

  for (const door of level.doors) drawDoor(ctx, door, style);
}

/** Paths other code (editor overlays) can reuse. */
export function levelPaths(geo, style, map) {
  return layers(geo, style, map);
}
