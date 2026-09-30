// Drawing stairs, spiral stairs, ladders, lifts and trapdoors in the two-tone style.

import { dirVector, spiralCentre } from '../core/links.js';

function frame(ctx, link, style, fill = style.paper) {
  ctx.fillStyle = fill;
  ctx.fillRect(link.x, link.y, link.w, link.h);
  ctx.strokeRect(link.x, link.y, link.w, link.h);
}

function arrow(ctx, from, to, size) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const l = Math.hypot(dx, dy) || 1;
  const u = [dx / l, dy / l];
  const n = [-u[1], u[0]];
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.lineTo(...to);
  ctx.moveTo(to[0] - u[0] * size + n[0] * size * 0.6, to[1] - u[1] * size + n[1] * size * 0.6);
  ctx.lineTo(...to);
  ctx.lineTo(to[0] - u[0] * size - n[0] * size * 0.6, to[1] - u[1] * size - n[1] * size * 0.6);
  ctx.stroke();
}

function stairs(ctx, link, style) {
  frame(ctx, link, style);
  const v = dirVector(link.dir);
  const along = v[0] ? link.w : link.h; // length in the climbing direction
  const steps = Math.max(3, Math.round(along * 3));
  ctx.beginPath();
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (v[0]) {
      const x = link.x + link.w * t;
      ctx.moveTo(x, link.y);
      ctx.lineTo(x, link.y + link.h);
    } else {
      const y = link.y + link.h * t;
      ctx.moveTo(link.x, y);
      ctx.lineTo(link.x + link.w, y);
    }
  }
  ctx.stroke();
  // Arrow points up the stairs.
  const c = [link.x + link.w / 2, link.y + link.h / 2];
  const half = along / 2 - 0.25;
  ctx.save();
  ctx.lineWidth *= 1.6;
  arrow(ctx, [c[0] - v[0] * half, c[1] - v[1] * half], [c[0] + v[0] * half, c[1] + v[1] * half], 0.3);
  ctx.restore();
}

function spiral(ctx, link, style) {
  const c = spiralCentre(link);
  const r = Math.min(link.w, link.h) / 2;
  ctx.fillStyle = style.paper;
  ctx.beginPath();
  ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const steps = Math.round(r * 10);
  const v = dirVector(link.dir);
  const top = Math.atan2(v[1], v[0]);
  ctx.beginPath();
  for (let i = 0; i < steps; i++) {
    const a = top + (i / steps) * Math.PI * 2;
    ctx.moveTo(c[0] + Math.cos(a) * r * 0.18, c[1] + Math.sin(a) * r * 0.18);
    ctx.lineTo(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.fillStyle = style.ink;
  ctx.beginPath();
  ctx.arc(c[0], c[1], r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Curved arrow ending at the top step.
  ctx.save();
  ctx.lineWidth *= 1.6;
  const ar = r * 0.6;
  ctx.beginPath();
  ctx.arc(c[0], c[1], ar, top + Math.PI * 0.5, top + Math.PI * 1.9);
  ctx.stroke();
  const end = top + Math.PI * 1.9;
  const tip = [c[0] + Math.cos(end) * ar, c[1] + Math.sin(end) * ar];
  const tangent = [-Math.sin(end), Math.cos(end)];
  arrow(ctx, [tip[0] - tangent[0] * 0.01, tip[1] - tangent[1] * 0.01], tip, 0.22);
  ctx.restore();
}

function ladder(ctx, link, style, role) {
  // Levels above the bottom show the hole the ladder passes through.
  frame(ctx, link, style, role === 'bottom' ? style.paper : style.tokens.mid);
  const railInset = link.w * 0.25;
  ctx.beginPath();
  ctx.moveTo(link.x + railInset, link.y + 0.1);
  ctx.lineTo(link.x + railInset, link.y + link.h - 0.1);
  ctx.moveTo(link.x + link.w - railInset, link.y + 0.1);
  ctx.lineTo(link.x + link.w - railInset, link.y + link.h - 0.1);
  const rungs = Math.max(3, Math.round(link.h * 4));
  for (let i = 1; i < rungs; i++) {
    const y = link.y + (link.h * i) / rungs;
    ctx.moveTo(link.x + railInset, y);
    ctx.lineTo(link.x + link.w - railInset, y);
  }
  ctx.stroke();
}

function lift(ctx, link, style) {
  frame(ctx, link, style);
  const i = Math.min(link.w, link.h) * 0.12;
  ctx.strokeRect(link.x + i, link.y + i, link.w - 2 * i, link.h - 2 * i);
  ctx.beginPath();
  ctx.moveTo(link.x + i, link.y + i);
  ctx.lineTo(link.x + link.w - i, link.y + link.h - i);
  ctx.moveTo(link.x + link.w - i, link.y + i);
  ctx.lineTo(link.x + i, link.y + link.h - i);
  ctx.stroke();
}

function trapdoor(ctx, link, style, role) {
  if (role === 'bottom') {
    // Mark where the trapdoor above is.
    ctx.save();
    ctx.setLineDash([0.15, 0.1]);
    ctx.strokeRect(link.x + 0.05, link.y + 0.05, link.w - 0.1, link.h - 0.1);
    ctx.restore();
    return;
  }
  frame(ctx, { x: link.x + 0.08, y: link.y + 0.08, w: link.w - 0.16, h: link.h - 0.16 }, style);
  ctx.beginPath();
  const planks = Math.max(2, Math.round(link.w * 3));
  for (let i = 1; i < planks; i++) {
    const x = link.x + 0.08 + ((link.w - 0.16) * i) / planks;
    ctx.moveTo(x, link.y + 0.08);
    ctx.lineTo(x, link.y + link.h - 0.08);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(link.x + link.w / 2, link.y + link.h - 0.25, 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

/** Draw one link as seen from a level in the given role (bottom / middle / top). */
export function drawLink(ctx, link, role, style) {
  ctx.save();
  ctx.strokeStyle = style.ink;
  ctx.lineWidth = Math.max(0.035, style.wallWidth * 0.35);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (link.type) {
    case 'stairs':
      if (role === 'bottom') stairs(ctx, link, style);
      break;
    case 'spiral':
      if (role === 'bottom') spiral(ctx, link, style);
      break;
    case 'ladder':
      ladder(ctx, link, style, role);
      break;
    case 'lift':
      lift(ctx, link, style);
      break;
    case 'trapdoor':
      trapdoor(ctx, link, style, role);
      break;
  }
  ctx.restore();
}
