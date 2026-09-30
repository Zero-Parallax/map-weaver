// Plain geometry helpers. All coordinates are in grid squares; points are [x, y].

export const EPS = 1e-7;

export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const scale = (a, s) => [a[0] * s, a[1] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const len = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const norm = (a) => {
  const l = len(a);
  return l < EPS ? [0, 0] : [a[0] / l, a[1] / l];
};
export const perp = (a) => [-a[1], a[0]];
export const eq = (a, b, eps = EPS) => Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps;

export function snap(v, step) {
  return Math.round(v / step) * step;
}

export function snapPoint(p, step) {
  return [snap(p[0], step), snap(p[1], step)];
}

export function signedArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return a / 2;
}

export function bbox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function ringsBBox(rings) {
  return bbox(rings.flat());
}

// Even-odd test against a set of rings (outer rings and holes together).
export function pointInRings(p, rings) {
  const [x, y] = p;
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

export function projectOnSegment(p, a, b) {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2));
  const q = lerp(a, b, t);
  return { t, point: q, dist: dist(p, q) };
}

export function distToSegment(p, a, b) {
  return projectOnSegment(p, a, b).dist;
}

export function distToRings(p, rings) {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = distToSegment(p, ring[j], ring[i]);
      if (d < best) best = d;
    }
  }
  return best;
}

// Parameters (on a->b) where segment a->b meets segment c->d. Collinear overlaps return both ends.
export function segmentHits(a, b, c, d) {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = cross(r, s);
  const qp = sub(c, a);
  const rr = dot(r, r);
  if (rr < EPS * EPS) return [];
  if (Math.abs(denom) < EPS * Math.max(1, len(r) * len(s))) {
    // Parallel. Only collinear overlaps matter.
    if (Math.abs(cross(qp, r)) > EPS * Math.max(1, len(r))) return [];
    const t0 = dot(qp, r) / rr;
    const t1 = dot(sub(d, a), r) / rr;
    return [t0, t1].filter((t) => t > EPS && t < 1 - EPS);
  }
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return [];
  return t > EPS && t < 1 - EPS ? [t] : [];
}

export function segmentsIntersect(a, b, c, d) {
  const r = sub(b, a);
  const s = sub(d, c);
  const denom = cross(r, s);
  if (Math.abs(denom) < EPS) return false;
  const qp = sub(c, a);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function ringEdges(ring) {
  const edges = [];
  for (let i = 0; i < ring.length; i++) edges.push([ring[i], ring[(i + 1) % ring.length]]);
  return edges;
}

/**
 * Split segments against polygon rings and classify each piece.
 * Returns pieces {a, b, where} with where = 'inside' | 'outside' | 'edge'.
 */
export function classifySegments(segments, rings, edgeEps = 1e-6) {
  const edges = rings.flatMap(ringEdges);
  const box = ringsBBox(rings);
  const out = [];
  for (const [a, b] of segments) {
    const ts = [0, 1];
    const sb = bbox([a, b]);
    const overlaps = !(sb.maxX < box.minX - edgeEps || sb.minX > box.maxX + edgeEps ||
      sb.maxY < box.minY - edgeEps || sb.minY > box.maxY + edgeEps);
    if (overlaps) {
      for (const [c, d] of edges) {
        if (Math.max(c[0], d[0]) < sb.minX - edgeEps || Math.min(c[0], d[0]) > sb.maxX + edgeEps) continue;
        if (Math.max(c[1], d[1]) < sb.minY - edgeEps || Math.min(c[1], d[1]) > sb.maxY + edgeEps) continue;
        ts.push(...segmentHits(a, b, c, d));
      }
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i < ts.length - 1; i++) {
      if (ts[i + 1] - ts[i] < 1e-9) continue;
      const p = lerp(a, b, ts[i]);
      const q = lerp(a, b, ts[i + 1]);
      const mid = lerp(p, q, 0.5);
      let where = 'outside';
      if (overlaps) {
        if (distToRings(mid, rings) < edgeEps) where = 'edge';
        else if (pointInRings(mid, rings)) where = 'inside';
      }
      out.push({ a: p, b: q, where });
    }
  }
  return out;
}

// Merge touching collinear pieces back into longer segments.
export function mergeCollinear(segments) {
  const out = [];
  for (const [a, b] of segments) {
    const last = out[out.length - 1];
    if (last && eq(last[1], a, 1e-9) && Math.abs(cross(sub(last[1], last[0]), sub(b, a))) < 1e-9 &&
      dot(sub(last[1], last[0]), sub(b, a)) > 0) {
      last[1] = b;
    } else {
      out.push([a, b]);
    }
  }
  return out;
}

export function polylineSegments(points, closed = false) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) segs.push([points[i], points[i + 1]]);
  if (closed && points.length > 2) segs.push([points[points.length - 1], points[0]]);
  return segs;
}

// Number of segments for a curve of given radius and sweep so chords stay close to the arc.
export function arcSteps(r, sweep, tolerance = 0.01) {
  if (r <= tolerance) return 1;
  const maxAngle = 2 * Math.acos(1 - tolerance / r);
  return Math.max(4, Math.ceil(Math.abs(sweep) / maxAngle));
}

export function arcPoints(c, r, start, sweep, tolerance = 0.01) {
  const n = arcSteps(r, sweep, tolerance);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (sweep * i) / n;
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return pts;
}

export function circlePoints(c, r, tolerance = 0.01) {
  const pts = arcPoints(c, r, 0, Math.PI * 2, tolerance);
  pts.pop();
  return pts;
}

// Round every corner of a closed polygon with radius r (clamped to fit each corner).
export function roundPolygon(points, r, tolerance = 0.01) {
  if (!(r > 0) || points.length < 3) return points.slice();
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const v1 = norm(sub(prev, cur));
    const v2 = norm(sub(next, cur));
    const cosA = Math.max(-1, Math.min(1, dot(v1, v2)));
    const angle = Math.acos(cosA); // interior angle between the edges
    if (angle < 1e-3 || Math.PI - angle < 1e-3) {
      out.push(cur);
      continue;
    }
    const maxCut = Math.min(dist(prev, cur), dist(next, cur)) / 2;
    let cut = r / Math.tan(angle / 2);
    let rr = r;
    if (cut > maxCut) {
      cut = maxCut;
      rr = cut * Math.tan(angle / 2);
    }
    const p1 = add(cur, scale(v1, cut));
    const p2 = add(cur, scale(v2, cut));
    const bis = norm(add(v1, v2));
    const centre = add(cur, scale(bis, rr / Math.sin(angle / 2)));
    const a1 = Math.atan2(p1[1] - centre[1], p1[0] - centre[0]);
    const a2 = Math.atan2(p2[1] - centre[1], p2[0] - centre[0]);
    let sweep = a2 - a1;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    out.push(...arcPoints(centre, rr, a1, sweep, tolerance));
  }
  return out;
}

// Ramer-Douglas-Peucker simplification of an open polyline.
export function simplify(points, tolerance) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let best = -1;
    let bestD = tolerance;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(points[i], points[s], points[e]);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([s, best], [best, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Chaikin corner cutting for a closed ring.
export function chaikin(ring, iterations = 2) {
  let pts = ring;
  for (let k = 0; k < iterations; k++) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push(lerp(a, b, 0.25), lerp(a, b, 0.75));
    }
    pts = next;
  }
  return pts;
}

// Insert points so no edge of a closed ring is longer than maxLen.
export function densify(ring, maxLen) {
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const n = Math.max(1, Math.ceil(dist(a, b) / maxLen));
    for (let k = 0; k < n; k++) out.push(lerp(a, b, k / n));
  }
  return out;
}

export function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}
