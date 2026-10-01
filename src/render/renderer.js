// Draws a level onto a 2D canvas context whose transform maps grid squares to pixels.
// The editor and the PNG export both use this, so what you see is what you export.

import { offset } from '../core/clip.js';
import { ringsBBox, sub, norm, perp, add, scale, dist } from '../core/geom.js';
import { rng, hash } from '../core/rng.js';
import { drawLink } from './link-symbols.js';
import { wallGroups, drawWallGroups } from './walls.js';
import { BITMAP_PPS } from '../assets/library.js';

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

function polylinesPath(polylines) {
  const path = new Path2D();
  for (const pts of polylines) {
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  }
  return path;
}

// Posts roughly every square along each railing, plus both ends.
function railingPosts(runs) {
  const posts = [];
  for (const run of runs) {
    const pts = run.points;
    posts.push(pts[0]);
    let carried = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const l = dist(a, b);
      let t = 1 - carried;
      while (t <= l) {
        posts.push([a[0] + ((b[0] - a[0]) * t) / l, a[1] + ((b[1] - a[1]) * t) / l]);
        t += 1;
      }
      carried = (carried + l) % 1;
    }
    if (dist(pts[0], pts[pts.length - 1]) > 1e-6) posts.push(pts[pts.length - 1]);
  }
  return posts;
}

/** Build (or reuse) the paths for this level geometry and style. */
function layers(geo, style, map) {
  const key = style.key + '|' + map.size.w + 'x' + map.size.h;
  if (geo.cache.layersKey === key) return geo.cache.layers;
  const { w, h } = map.size;
  const mapBox = { minX: 0, minY: 0, maxX: w, maxY: h };
  const byKind = (kind) => geo.edgeRuns.filter((r) => r.kind === kind);
  const L = {
    floor: ringsPath(geo.floor),
    open: geo.open.length ? ringsPath(geo.open) : null,
    walls: ringsPath(geo.structure, segmentsPath(geo.inner)),
    edgeWalls: polylinesPath(byKind('wall').map((r) => r.points)),
    railings: polylinesPath(byKind('railing').map((r) => r.points)),
    posts: railingPosts(byKind('railing')),
    drops: polylinesPath(byKind('drop').map((r) => r.points)),
    grid: gridPath(w, h),
    rock: ringsPath(geo.structure, ringsPath([[[0, 0], [w, 0], [w, h], [0, h]]])),
  };
  if (style.shading === 'hatch' || style.shading === 'crosshatch') {
    const band = offset(geo.structure, style.band);
    L.band = ringsPath(geo.structure, ringsPath(band));
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

export function drawDoor(ctx, door, style, wallWidth = style.wallWidth) {
  const t = wallWidth;
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

export const OPEN_MODES = [
  { id: 'transparent', name: 'Transparent' },
  { id: 'faded', name: 'Faded level below' },
  { id: 'solid', name: 'Solid fill' },
];

/** Draw a level's placed assets of one layer. Images still loading are skipped. */
export function drawPlacements(ctx, placements, layer, assets, tokens, pxPerSquare = 64) {
  if (!assets) return;
  for (const p of placements) {
    const hit = assets.image(p, tokens);
    if (!hit || hit.meta.layer !== layer) continue;
    const { w, h } = hit.footprint;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate((p.rot * Math.PI) / 180);
    // The cached bitmap is sharp enough up to its own resolution; beyond that draw the SVG.
    const source = hit.bitmap && pxPerSquare * (globalThis.devicePixelRatio || 1) <= BITMAP_PPS * 1.05 ? hit.bitmap : hit.img;
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

/**
 * Draw one level. ctx's transform must already map squares to pixels.
 *  links:    [{link, role}] touching this level
 *  below:    {level, geo, links} for the level underneath (shown through openings)
 *  openMode: how open-to-below areas are filled: 'transparent' | 'faded' | 'solid'
 *  pxPerSquare keeps hairlines visible when zoomed out.
 *  view:     'gm' (everything) or 'player' (no secret doors or traps)
 */
export function drawLevel(ctx, { map, level, geo, style, links = [], below = null, openMode = 'faded', assets = null, pxPerSquare = 64, view = 'gm' }) {
  const { w, h } = map.size;
  const { placements, doors } = visibleTo(level, assets, view);
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

  // Open to below.
  if (L.open) {
    ctx.save();
    ctx.clip(L.open, 'evenodd');
    if (openMode === 'transparent') {
      ctx.clearRect(0, 0, w, h);
    } else if (openMode === 'solid' || !below) {
      ctx.fillStyle = style.tokens.mid;
      ctx.fillRect(0, 0, w, h);
    } else {
      // The level below, washed with a mid tone so it reads as further away.
      drawLevel(ctx, { map, level: below.level, geo: below.geo, style, links: below.links, openMode: 'solid', assets, pxPerSquare, view });
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = style.tokens.shade;
      ctx.fillRect(0, 0, w, h);
    }
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

  // Rugs and decals, then links, then furniture; walls and doors go over them.
  drawPlacements(ctx, placements, 'floor', assets, style.tokens, pxPerSquare);
  for (const { link, role } of links) drawLink(ctx, link, role, style);
  drawPlacements(ctx, placements, 'object', assets, style.tokens, pxPerSquare);

  // Edges of open areas: drops dashed, railings thin with posts.
  ctx.save();
  ctx.strokeStyle = style.ink;
  ctx.lineCap = 'butt';
  ctx.lineWidth = Math.max(hair, 0.04);
  ctx.setLineDash([0.18, 0.12]);
  ctx.stroke(L.drops);
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(hair * 1.5, style.wallWidth * 0.38);
  ctx.stroke(L.railings);
  ctx.fillStyle = style.ink;
  const post = Math.max(0.1, style.wallWidth * 0.9);
  for (const p of L.posts) ctx.fillRect(p[0] - post / 2, p[1] - post / 2, post, post);
  ctx.restore();

  // Walls, each in its room's look.
  const walls = levelWalls(geo, level, style);
  drawWallGroups(ctx, walls, style, pxPerSquare);
  for (const door of doors) drawDoor(ctx, door, style, walls.doorWidth.get(door.id));
  drawPlacements(ctx, placements, 'overhead', assets, style.tokens, pxPerSquare);
}

/**
 * What a view shows. 'gm' shows everything; 'player' leaves out secret doors (the wall stays
 * solid) and pieces marked gmOnly (traps).
 */
export function visibleTo(level, assets, view = 'gm') {
  if (view !== 'player') return { placements: level.placements, doors: level.doors };
  return {
    placements: level.placements.filter((p) => !assets?.get(p.asset)?.gmOnly),
    doors: level.doors.filter((d) => d.type !== 'secret'),
  };
}

/** Wall groups for a level (cached until the geometry, room looks or style change). */
export function levelWalls(geo, level, style) {
  const key = style.key + '|' + JSON.stringify(level.wallStyles || []);
  if (geo.cache.wallsKey !== key) {
    geo.cache.wallsKey = key;
    geo.cache.walls = wallGroups(geo, level, style.wall);
  }
  return geo.cache.walls;
}

/** Paths other code (editor overlays) can reuse. */
export function levelPaths(geo, style, map) {
  return layers(geo, style, map);
}
