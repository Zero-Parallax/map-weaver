// Ground textures and painted terrain, in the map's two-tone palette. Patterns are seeded per
// square, so they stay put between redraws and exports.

import { ringsBBox } from '../core/geom.js';
import { rng, hash } from '../core/rng.js';

function ringsPath(rings) {
  const path = new Path2D();
  for (const ring of rings) {
    path.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i++) path.lineTo(ring[i][0], ring[i][1]);
    path.closePath();
  }
  return path;
}

/** Call fn(x, y, random) for every square of a box. */
function eachSquare(box, seed, fn) {
  for (let y = Math.floor(box.minY); y < Math.ceil(box.maxY); y++) {
    for (let x = Math.floor(box.minX); x < Math.ceil(box.maxX); x++) fn(x, y, rng(hash(seed, x, y)));
  }
}

// ---- pattern builders: each returns a Path2D of strokes or dots ---------------------------

// Patterns are rebuilt only when their area, seed or settings change.
const memo = new Map();
function cached(name, build) {
  return (...args) => {
    const key = name + JSON.stringify(args);
    let path = memo.get(key);
    if (!path) {
      if (memo.size > 96) memo.delete(memo.keys().next().value);
      path = build(...args);
      memo.set(key, path);
    }
    return path;
  };
}

const tufts = cached('tufts', function tufts(box, seed, perSquare = 2) {
  const p = new Path2D();
  eachSquare(box, seed, (x, y, r) => {
    const n = perSquare + (r() < 0.35 ? 1 : 0) - (r() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const cx = x + r();
      const cy = y + r();
      const s = 0.07 + r() * 0.05;
      p.moveTo(cx - s, cy - s * 1.4);
      p.lineTo(cx, cy);
      p.lineTo(cx + s * 0.2, cy - s * 1.8);
      p.moveTo(cx, cy);
      p.lineTo(cx + s, cy - s * 1.3);
    }
  });
  return p;
});

const dots = cached('dots', function dots(box, seed, perSquare, radius) {
  const p = new Path2D();
  eachSquare(box, seed, (x, y, r) => {
    const n = Math.floor(perSquare + r());
    for (let i = 0; i < n; i++) {
      const cx = x + r();
      const cy = y + r();
      const rad = radius * (0.6 + r() * 0.8);
      p.moveTo(cx + rad, cy);
      p.arc(cx, cy, rad, 0, Math.PI * 2);
    }
  });
  return p;
});

const ripples = cached('ripples', function ripples(box, seed, chance = 0.45) {
  const p = new Path2D();
  eachSquare(box, seed, (x, y, r) => {
    if (r() > chance) return;
    const cx = x + 0.2 + r() * 0.6;
    const cy = y + 0.2 + r() * 0.6;
    const w = 0.18 + r() * 0.16;
    p.moveTo(cx - w, cy);
    p.quadraticCurveTo(cx - w / 2, cy - 0.08, cx, cy);
    p.quadraticCurveTo(cx + w / 2, cy + 0.08, cx + w, cy);
  });
  return p;
});

const cracks = cached('cracks', function cracks(box, seed, chance = 0.5, long = 0.45) {
  const p = new Path2D();
  eachSquare(box, seed, (x, y, r) => {
    if (r() > chance) return;
    let cx = x + r();
    let cy = y + r();
    let a = r() * Math.PI * 2;
    p.moveTo(cx, cy);
    for (let i = 0; i < 3; i++) {
      a += (r() - 0.5) * 1.4;
      cx += Math.cos(a) * long * (0.4 + r() * 0.6);
      cy += Math.sin(a) * long * (0.4 + r() * 0.6);
      p.lineTo(cx, cy);
    }
  });
  return p;
});

const cobbles = cached('cobbles', function cobbles(box, seed) {
  const p = new Path2D();
  for (let y = Math.floor(box.minY * 3) / 3; y < box.maxY; y += 1 / 3) {
    const row = Math.round(y * 3);
    const shift = (row % 2) * 0.25;
    for (let x = Math.floor(box.minX) - shift; x < box.maxX; x += 0.5) {
      const r = rng(hash(seed, row, Math.round(x * 2)));
      const j = (r() - 0.5) * 0.04;
      p.roundRect(x + 0.03 + j, y + 0.03, 0.44, 1 / 3 - 0.06, 0.06);
    }
  }
  return p;
});

const plates = cached('plates', function plates(box) {
  const p = new Path2D();
  for (let y = Math.floor(box.minY / 2) * 2; y < box.maxY; y += 2) {
    for (let x = Math.floor(box.minX / 2) * 2; x < box.maxX; x += 2) {
      p.rect(x + 0.04, y + 0.04, 1.92, 1.92);
      for (const [dx, dy] of [[0.18, 0.18], [1.82, 0.18], [0.18, 1.82], [1.82, 1.82]]) {
        p.moveTo(x + dx + 0.04, y + dy);
        p.arc(x + dx, y + dy, 0.04, 0, Math.PI * 2);
      }
    }
  }
  return p;
});

// ---- drawing -----------------------------------------------------------------------------

function stroke(ctx, path, color, width, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.restore();
}

function fillDots(ctx, path, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

/** Texture for outdoor ground or a painted ground-like kind, inside the current clip. */
function groundTexture(ctx, kind, box, seed, style, hair) {
  const { ink, tokens } = style;
  const thin = Math.max(hair, 0.025);
  switch (kind) {
    case 'grass':
      stroke(ctx, tufts(box, hash(seed, 'grass'), 1), ink, thin, 0.3);
      break;
    case 'dirt':
      fillDots(ctx, dots(box, hash(seed, 'dirt'), 4, 0.022), ink, 0.35);
      break;
    case 'sand':
      fillDots(ctx, dots(box, hash(seed, 'sand'), 3, 0.016), ink, 0.3);
      stroke(ctx, ripples(box, hash(seed, 'dune'), 0.12), tokens.mid, thin, 0.6);
      break;
    case 'snow':
      fillDots(ctx, dots(box, hash(seed, 'snow'), 1, 0.018), tokens.mid, 0.6);
      break;
    case 'rock':
      stroke(ctx, cracks(box, hash(seed, 'rock'), 0.35, 0.3), ink, thin, 0.4);
      break;
    case 'plating':
      stroke(ctx, plates(box), ink, thin, 0.35);
      break;
  }
}

/** Outdoor ground: texture over everything that isn't a building. */
export function drawGround(ctx, geo, kind, style, seed, hair) {
  if (!geo.ground?.length || !kind) return;
  const key = 'ground|' + kind;
  geo.cache.groundPath ??= ringsPath(geo.ground);
  ctx.save();
  ctx.clip(geo.cache.groundPath, 'evenodd');
  groundTexture(ctx, kind, ringsBBox(geo.ground), seed, style, hair);
  ctx.restore();
  return key;
}

/** Painted terrain, each kind clipped to its area and to the floor. */
export function drawTerrain(ctx, geo, style, seed, hair, floorPath) {
  if (!geo.terrain?.size) return;
  const { ink, paper, tokens } = style;
  const thin = Math.max(hair, 0.025);
  geo.cache.terrainPaths ??= new Map();
  for (const [kind, rings] of geo.terrain) {
    if (!geo.cache.terrainPaths.has(kind)) geo.cache.terrainPaths.set(kind, ringsPath(rings));
    const path = geo.cache.terrainPaths.get(kind);
    const box = ringsBBox(rings);
    const s = hash(seed, kind);
    ctx.save();
    if (floorPath) ctx.clip(floorPath, 'evenodd');
    ctx.save();
    ctx.clip(path, 'evenodd');
    switch (kind) {
      case 'water':
        ctx.fillStyle = tokens.shade;
        ctx.fill(path, 'evenodd');
        stroke(ctx, ripples(box, s), tokens.mid, thin * 1.4);
        break;
      case 'deep-water':
        ctx.fillStyle = tokens.mid;
        ctx.fill(path, 'evenodd');
        stroke(ctx, ripples(box, s, 0.35), paper, thin * 1.4, 0.8);
        break;
      case 'lava':
        ctx.fillStyle = ink;
        ctx.fill(path, 'evenodd');
        stroke(ctx, cracks(box, s, 0.8, 0.5), tokens.shade, thin * 2);
        fillDots(ctx, dots(box, hash(s, 'glow'), 1, 0.05), paper, 0.7);
        break;
      case 'chasm':
        ctx.fillStyle = ink;
        ctx.fill(path, 'evenodd');
        break;
      case 'ice':
        ctx.fillStyle = paper;
        ctx.fill(path, 'evenodd');
        stroke(ctx, cracks(box, s, 0.45, 0.4), tokens.mid, thin);
        break;
      case 'mud':
        ctx.fillStyle = tokens.shade;
        ctx.fill(path, 'evenodd');
        fillDots(ctx, dots(box, s, 3, 0.04), tokens.mid, 0.9);
        break;
      case 'road':
        ctx.fillStyle = tokens.shade;
        ctx.globalAlpha = 0.55;
        ctx.fill(path, 'evenodd');
        ctx.globalAlpha = 1;
        fillDots(ctx, dots(box, s, 3, 0.02), ink, 0.4);
        break;
      case 'paving':
        ctx.fillStyle = paper;
        ctx.fill(path, 'evenodd');
        stroke(ctx, cobbles(box, s), ink, thin, 0.45);
        break;
      case 'grass':
      case 'sand':
        ctx.fillStyle = paper;
        ctx.fill(path, 'evenodd');
        groundTexture(ctx, kind, box, s, style, hair);
        break;
    }
    ctx.restore();
    // Edges: water and ice get a shore line, lava a glow, chasms a sharp rim.
    const edge = { water: [ink, 1.6], 'deep-water': [ink, 2], lava: [tokens.shade, 3], chasm: [tokens.mid, 2.5], ice: [tokens.mid, 1.4], mud: [tokens.mid, 1] }[kind];
    if (edge) stroke(ctx, path, edge[0], thin * edge[1]);
    ctx.restore();
  }
}
