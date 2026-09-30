// Polygon boolean operations and offsetting, backed by the vendored Clipper library.
// Browser: clipper.js is loaded as a classic script before the app. Node (tests): required directly.

let CL = globalThis.ClipperLib;
if (!CL) {
  const { createRequire } = await import('node:module');
  CL = createRequire(import.meta.url)('../vendor/clipper.js');
}

// Clipper works in integers; 1 grid square = 10000 units.
const SCALE = 10000;

const toPath = (ring) => ring.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));
const fromPath = (path) => path.map((p) => [p.X / SCALE, p.Y / SCALE]);

function run(type, subject, clip, subjFill = CL.PolyFillType.pftNonZero, clipFill = CL.PolyFillType.pftNonZero) {
  const c = new CL.Clipper();
  if (subject.length) c.AddPaths(subject.map(toPath), CL.PolyType.ptSubject, true);
  if (clip.length) c.AddPaths(clip.map(toPath), CL.PolyType.ptClip, true);
  const out = new CL.Paths();
  c.Execute(type, out, subjFill, clipFill);
  return out.map(fromPath).filter((r) => r.length >= 3);
}

/** Union of two sets of rings. */
export function union(a, b) {
  if (!b.length) return a;
  return run(CL.ClipType.ctUnion, a, b);
}

/** Rings of a minus rings of b. */
export function difference(a, b) {
  if (!a.length || !b.length) return a;
  return run(CL.ClipType.ctDifference, a, b);
}

export function intersection(a, b) {
  if (!a.length || !b.length) return [];
  return run(CL.ClipType.ctIntersection, a, b);
}

/** Normalise arbitrary (possibly self-intersecting) rings into clean non-overlapping rings. */
export function normalize(rings) {
  if (!rings.length) return rings;
  return run(CL.ClipType.ctUnion, rings, []);
}

/** Grow (delta > 0) or shrink (delta < 0) rings with rounded joins. */
export function offset(rings, delta, arcTolerance = 0.02) {
  if (!rings.length) return [];
  const co = new CL.ClipperOffset(2, arcTolerance * SCALE);
  co.AddPaths(rings.map(toPath), CL.JoinType.jtRound, CL.EndType.etClosedPolygon);
  const out = new CL.Paths();
  co.Execute(out, delta * SCALE);
  return out.map(fromPath).filter((r) => r.length >= 3);
}
