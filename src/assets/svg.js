// Building asset SVGs. One grid square = 100 SVG units.
//
// Colours are never hard-coded: every shape uses one of the classes below, whose colours come
// from CSS variables (--ink, --paper, --shade, --mid). The fallbacks make the file look right
// on its own; the app injects the map's palette when it draws the asset.

import { writeMeta } from './meta.js';

export const U = 100;

export const STYLE = `
.o{fill:var(--paper,#fff);stroke:var(--ink,#1b1b1b);stroke-width:5;stroke-linejoin:round;stroke-linecap:round}
.s{fill:var(--shade,#c6c6c6);stroke:var(--ink,#1b1b1b);stroke-width:5;stroke-linejoin:round;stroke-linecap:round}
.m{fill:var(--mid,#8d8d8d);stroke:var(--ink,#1b1b1b);stroke-width:5;stroke-linejoin:round;stroke-linecap:round}
.k{fill:var(--ink,#1b1b1b);stroke:none}
.p{fill:var(--paper,#fff);stroke:none}
.h{fill:var(--shade,#c6c6c6);stroke:none}
.l{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:4;stroke-linejoin:round;stroke-linecap:round}
.t{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round}
.d{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:3;stroke-dasharray:8 7;stroke-linecap:round}
`.trim();

const n = (v) => Math.round(v * 10) / 10;

/** Collects SVG elements. Coordinates in SVG units (100 per square). */
export class Drawing {
  constructor() {
    this.parts = [];
  }

  add(markup) {
    this.parts.push(markup);
    return this;
  }

  rect(x, y, w, h, cls = 'o', r = 0) {
    return this.add(`<rect class="${cls}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${r ? ` rx="${n(r)}"` : ''}/>`);
  }

  circle(cx, cy, r, cls = 'o') {
    return this.add(`<circle class="${cls}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`);
  }

  ellipse(cx, cy, rx, ry, cls = 'o') {
    return this.add(`<ellipse class="${cls}" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"/>`);
  }

  line(x1, y1, x2, y2, cls = 'l') {
    return this.add(`<line class="${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`);
  }

  /** Many line segments [[x1, y1, x2, y2], ...] as one path. */
  lines(segs, cls = 'l') {
    if (!segs.length) return this;
    const d = segs.map(([a, b, c, e]) => `M${n(a)} ${n(b)}L${n(c)} ${n(e)}`).join('');
    return this.add(`<path class="${cls}" d="${d}"/>`);
  }

  poly(points, cls = 'o', closed = true) {
    const pts = points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
    return this.add(closed ? `<polygon class="${cls}" points="${pts}"/>` : `<polyline class="${cls}" points="${pts}"/>`);
  }

  path(d, cls = 'l') {
    return this.add(`<path class="${cls}" d="${d}"/>`);
  }

  /** Rectangle with cut corners, the sci-fi house style. */
  chamfer(x, y, w, h, c, cls = 'o') {
    c = Math.min(c, w / 2, h / 2);
    return this.poly([[x + c, y], [x + w - c, y], [x + w, y + c], [x + w, y + h - c], [x + w - c, y + h], [x + c, y + h], [x, y + h - c], [x, y + c]], cls);
  }

  /** Regular polygon or star. */
  star(cx, cy, r, points, inner = r, cls = 'o', rotation = -Math.PI / 2) {
    const pts = [];
    const count = inner === r ? points : points * 2;
    for (let i = 0; i < count; i++) {
      const rr = inner !== r && i % 2 ? inner : r;
      const a = rotation + (i * Math.PI * 2) / count;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return this.poly(pts, cls);
  }

  group(transform, fn) {
    this.add(`<g transform="${transform}">`);
    fn(this);
    return this.add('</g>');
  }

  toString() {
    return this.parts.join('');
  }
}

/** Complete SVG document for an asset. meta.footprint gives the size in squares. */
export function assetSvg(meta, drawing) {
  const W = meta.footprint.w * U;
  const H = meta.footprint.h * U;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
    `<title>${escapeXml(meta.name)}</title>`,
    writeMeta(meta),
    `<style>${STYLE}</style>`,
    String(drawing),
    '</svg>',
    '',
  ].join('\n');
}

export function escapeXml(s) {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
}

/** Give an SVG the map's palette by defining the colour variables on its root. */
export function recolour(svgText, tokens) {
  const vars = `svg{--ink:${tokens.ink};--paper:${tokens.paper};--shade:${tokens.shade};--mid:${tokens.mid}}`;
  return svgText.replace(/<style>/, `<style>${vars}\n`);
}
