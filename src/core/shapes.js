// Floor shapes -> polygon rings. Each shape kind has a small parametric description.
//
// rect   {x, y, w, h, radius}           corner radius in squares (0 = square corners)
// circle {cx, cy, r}
// poly   {points: [[x,y]...], radius}   any angles, optional rounded corners
// cave   {points, roughness, seed}      freehand outline, smoothed then roughened
// cells  {cells: [[x,y]...]}            painted squares
// path   {points, width}                a corridor: the centre line drawn width squares wide

import { roundPolygon, circlePoints, chaikin, densify, simplify, signedArea, add, sub, scale, norm, perp, bbox } from './geom.js';
import { normalize, strokePath } from './clip.js';
import { rng, hash } from './rng.js';

const TOL = 0.004;

export function rectRing({ x, y, w, h }) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

// 1D value noise that wraps around, for cave roughness.
function loopNoise(random, count) {
  const values = Array.from({ length: count }, () => random() * 2 - 1);
  return (t) => {
    const f = ((t % 1) + 1) % 1 * count;
    const i = Math.floor(f);
    const u = f - i;
    const s = u * u * (3 - 2 * u);
    return values[i % count] * (1 - s) + values[(i + 1) % count] * s;
  };
}

export function caveRing(points, roughness = 0.5, seed = 1) {
  if (points.length < 3) return [];
  let ring = simplify(points, 0.15);
  if (ring.length < 3) return [];
  ring = chaikin(ring, 3);
  ring = densify(ring, 0.2);
  if (!roughness) return ring;
  const random = rng(hash('cave', seed));
  const coarse = loopNoise(random, Math.max(8, Math.round(ring.length / 12)));
  const fine = loopNoise(random, Math.max(16, Math.round(ring.length / 3)));
  const dir = signedArea(ring) > 0 ? 1 : -1;
  const n = ring.length;
  return ring.map((p, i) => {
    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    const normal = scale(norm(perp(sub(next, prev))), dir);
    const t = i / n;
    const amount = roughness * (0.35 * coarse(t) + 0.12 * fine(t));
    return add(p, scale(normal, amount));
  });
}

function cellRings(cells) {
  return cells.map(([x, y]) => rectRing({ x, y, w: 1, h: 1 }));
}

/** Rings (clean, non-overlapping) covered by a shape. */
export function shapeRings(shape) {
  switch (shape.kind) {
    case 'rect': {
      const ring = rectRing(shape);
      return normalize([shape.radius > 0 ? roundPolygon(ring, shape.radius, TOL) : ring]);
    }
    case 'circle':
      return shape.r > 0 ? normalize([circlePoints([shape.cx, shape.cy], shape.r, TOL)]) : [];
    case 'poly':
      if (!shape.points || shape.points.length < 3) return [];
      return normalize([shape.radius > 0 ? roundPolygon(shape.points, shape.radius, TOL) : shape.points]);
    case 'cave':
      return normalize([caveRing(shape.points || [], shape.roughness ?? 0.5, shape.seed ?? 1)].filter((r) => r.length >= 3));
    case 'cells':
      return normalize(cellRings(shape.cells || []));
    case 'path':
      return strokePath(shape.points || [], shape.width || 1);
    default:
      return [];
  }
}

/** Shallow description of the shape's reference points, for moving and hit tests. */
export function translateShape(shape, dx, dy) {
  const s = structuredClone(shape);
  const move = (p) => [p[0] + dx, p[1] + dy];
  switch (s.kind) {
    case 'rect':
      s.x += dx;
      s.y += dy;
      break;
    case 'circle':
      s.cx += dx;
      s.cy += dy;
      break;
    case 'poly':
    case 'cave':
    case 'path':
      s.points = s.points.map(move);
      break;
    case 'cells':
      s.cells = s.cells.map(move);
      break;
  }
  return s;
}

export function shapeBBox(shape) {
  const rings = shapeRings(shape);
  return rings.length ? bbox(rings.flat()) : null;
}
