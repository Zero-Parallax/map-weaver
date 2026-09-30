// Wall looks: texture and thickness, set for the map and overridable per room.
//
// Every wall piece borders one or two rooms. It takes the look of the room on either side
// that has one set (the thicker if both do), otherwise the map's default. Textures stay
// two-tone: ink outlines and joints over paper or shade.

import { polylineSegments, dist, sub, norm, add, scale, perp, projectOnSegment, lerp as lerpPoint } from '../core/geom.js';
import { regionAt } from '../core/rooms.js';
import { rng, hash } from '../core/rng.js';

export const WALL_TEXTURES = [
  { id: 'solid', name: 'Solid' },
  { id: 'double', name: 'Double line' },
  { id: 'stone', name: 'Stone blocks' },
  { id: 'brick', name: 'Brick' },
  { id: 'wood', name: 'Wooden planks' },
  { id: 'rough', name: 'Rough (sketched)' },
  { id: 'dashed', name: 'Dashed (ruined)' },
];
export const WALL_TEXTURE_IDS = WALL_TEXTURES.map((t) => t.id);

/** Thickness presets in squares. */
export const WALL_WIDTHS = [
  { id: 0.08, name: 'Thin' },
  { id: 0.14, name: 'Normal' },
  { id: 0.22, name: 'Thick' },
  { id: 0.35, name: 'Heavy' },
];

// Join touching segments into polylines so joints space evenly round curves.
function chain(segments) {
  const key = (p) => `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`;
  const starts = new Map();
  segments.forEach((s, i) => {
    const k = key(s[0]);
    if (!starts.has(k)) starts.set(k, []);
    starts.get(k).push(i);
  });
  const used = new Uint8Array(segments.length);
  const lines = [];
  segments.forEach((s, i) => {
    if (used[i]) return;
    used[i] = 1;
    const line = [s[0], s[1]];
    for (;;) {
      const next = (starts.get(key(line[line.length - 1])) || []).find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      line.push(segments[next][1]);
    }
    lines.push(line);
  });
  return lines;
}

/** Call fn(point, normal) every `spacing` along a polyline, starting at `offset`. */
function walk(line, spacing, offset, fn) {
  let d = offset;
  let travelled = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const l = dist(a, b);
    if (l < 1e-9) continue;
    const u = norm(sub(b, a));
    while (d <= travelled + l) {
      fn(add(a, scale(u, d - travelled)), perp(u));
      d += spacing;
    }
    travelled += l;
  }
}

/** The look for each room region, from the level's per-room wall settings. */
function regionLooks(geo, level) {
  const looks = new Map();
  for (const w of level.wallStyles || []) {
    const index = regionAt(geo.rooms, w.at);
    if (index >= 0 && !looks.has(index)) looks.set(index, w);
  }
  return looks;
}

/**
 * Wall pieces grouped by look: [{texture, width, lines}], plus the wall width at each door.
 * defaults: {texture, width} for walls of rooms without their own look.
 */
export function wallGroups(geo, level, defaults) {
  const looks = regionLooks(geo, level);
  const segments = [
    ...geo.structure.flatMap((ring) => polylineSegments(ring, true)),
    ...geo.inner,
    ...geo.edgeRuns.filter((r) => r.kind === 'wall').flatMap((r) => polylineSegments(r.points)),
  ];
  const groups = new Map();
  const owner = [];
  const lookAt = (p, n) => {
    let look = null;
    for (const side of [1, -1]) {
      const l = looks.get(regionAt(geo.rooms, add(p, scale(n, 0.22 * side))));
      if (l && (!look || (l.width ?? defaults.width) > (look.width ?? defaults.width))) look = l;
    }
    return look;
  };
  const push = (a, b, look) => {
    const texture = look?.texture || defaults.texture;
    const width = look?.width ?? defaults.width;
    const k = `${texture}|${width}`;
    if (!groups.has(k)) groups.set(k, { texture, width, segments: [] });
    groups.get(k).segments.push([a, b]);
    owner.push({ a, b, width, texture });
  };
  for (const [a, b] of segments) {
    if (!looks.size) {
      push(a, b, null);
      continue;
    }
    // A long wall can run past several rooms: look along it in short steps and split it
    // where the room beside it changes.
    const n = perp(norm(sub(b, a)));
    const steps = Math.max(1, Math.ceil(dist(a, b) / 0.5));
    let start = a;
    let current = lookAt(lerpPoint(a, b, 0.5 / steps), n);
    for (let i = 1; i < steps; i++) {
      const look = lookAt(lerpPoint(a, b, (i + 0.5) / steps), n);
      if (look !== current) {
        // Narrow down where the change happens.
        let lo = (i - 0.5) / steps;
        let hi = (i + 0.5) / steps;
        for (let k = 0; k < 7; k++) {
          const t = (lo + hi) / 2;
          if (lookAt(lerpPoint(a, b, t), n) === current) lo = t;
          else hi = t;
        }
        const cut = lerpPoint(a, b, (lo + hi) / 2);
        push(start, cut, current);
        start = cut;
        current = look;
      }
    }
    push(start, b, current);
  }
  for (const g of groups.values()) g.lines = chain(g.segments);
  const doorWidth = new Map();
  for (const d of level.doors) {
    const mid = scale(add(d.a, d.b), 0.5);
    let best = null;
    let bestD = 0.3;
    for (const o of owner) {
      const h = projectOnSegment(mid, o.a, o.b);
      if (h.dist < bestD) {
        bestD = h.dist;
        best = o;
      }
    }
    doorWidth.set(d.id, best ? best.width : defaults.width);
  }
  return { groups: [...groups.values()], doorWidth };
}

function linesPath(lines) {
  const p = new Path2D();
  for (const line of lines) {
    p.moveTo(...line[0]);
    for (let i = 1; i < line.length; i++) p.lineTo(...line[i]);
  }
  return p;
}

/** Draw grouped walls with their textures. */
export function drawWallGroups(ctx, { groups }, style, pxPerSquare = 64) {
  const hair = 1 / pxPerSquare;
  for (const g of groups) {
    const w = g.width;
    const path = (g.path ??= linesPath(g.lines));
    const o = Math.max(hair * 1.2, Math.min(0.035, w * 0.18)); // outline thickness
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = style.ink;
    ctx.lineWidth = w;
    switch (g.texture) {
      case 'double':
        ctx.stroke(path);
        ctx.strokeStyle = style.paper;
        ctx.lineWidth = w * 0.38;
        ctx.stroke(path);
        break;
      case 'dashed':
        ctx.lineCap = 'butt';
        ctx.setLineDash([Math.max(0.2, w * 2.2), Math.max(0.12, w * 1.2)]);
        ctx.stroke(path);
        break;
      case 'rough': {
        ctx.lineWidth = w * 0.75;
        ctx.stroke(path);
        ctx.lineWidth = Math.max(hair, w * 0.28);
        const r = rng(hash('rough', g.lines.length, w));
        const extra = new Path2D();
        for (const line of g.lines) {
          for (let pass = 0; pass < 2; pass++) {
            const j = () => (r() - 0.5) * w * 0.9;
            extra.moveTo(line[0][0] + j(), line[0][1] + j());
            for (let i = 1; i < line.length; i++) extra.lineTo(line[i][0] + j(), line[i][1] + j());
          }
        }
        ctx.stroke(extra);
        break;
      }
      case 'stone':
      case 'brick':
      case 'wood': {
        ctx.stroke(path);
        const inner = w - 2 * o;
        if (inner > hair) {
          ctx.strokeStyle = g.texture === 'brick' ? style.tokens.shade : style.paper;
          ctx.lineWidth = inner;
          ctx.stroke(path);
        }
        const joints = (g.joints ??= textureJoints(g, inner / 2));
        ctx.strokeStyle = style.ink;
        ctx.lineCap = 'butt';
        ctx.lineWidth = Math.max(hair, o * 0.7);
        ctx.stroke(joints);
        break;
      }
      default:
        ctx.stroke(path);
    }
    ctx.restore();
  }
}

// Block joints, brick courses or plank lines inside the wall band (half-width h).
function textureJoints(g, h) {
  const p = new Path2D();
  if (h <= 0.01) return p;
  const seg = (a, b) => {
    p.moveTo(...a);
    p.lineTo(...b);
  };
  const r = rng(hash('joints', g.texture, g.width, g.lines.length));
  for (const line of g.lines) {
    if (g.texture === 'stone') {
      const spacing = Math.max(0.3, g.width * 1.8);
      walk(line, spacing, spacing * (0.3 + r() * 0.4), (pt, n) => {
        const t = (r() - 0.5) * spacing * 0.25;
        const c = add(pt, scale(perp(n), t));
        seg(add(c, scale(n, -h)), add(c, scale(n, h)));
      });
    } else if (g.texture === 'brick') {
      // Two courses with a line between them; joints offset by half a brick.
      for (let i = 1; i < line.length; i++) seg(line[i - 1], line[i]);
      const spacing = Math.max(0.18, g.width * 1.2);
      walk(line, spacing, spacing / 2, (pt, n) => seg(pt, add(pt, scale(n, h))));
      walk(line, spacing, spacing, (pt, n) => seg(pt, add(pt, scale(n, -h))));
    } else {
      // Planks run along the wall, with an occasional butt joint.
      for (const f of [-1 / 3, 1 / 3]) {
        const off = line.map((q, i) => {
          const a = line[Math.max(0, i - 1)];
          const b = line[Math.min(line.length - 1, i + 1)];
          return add(q, scale(perp(norm(sub(b, a))), h * 2 * f));
        });
        for (let i = 1; i < off.length; i++) seg(off[i - 1], off[i]);
      }
      walk(line, 1.1, 0.4 + r() * 0.5, (pt, n) => seg(add(pt, scale(n, -h)), add(pt, scale(n, h))));
    }
  }
  return p;
}
