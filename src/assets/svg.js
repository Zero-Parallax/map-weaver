// Building asset SVGs. One grid square = 100 SVG units.
//
// Colours are never hard-coded: every shape uses one of the classes below, whose colours come
// from CSS variables (--ink, --paper, --shade, --mid). The fallbacks make the file look right
// on its own; the app injects the map's palette when it draws the asset.
//   o  paper, ink outline      s  shade, ink outline     m  mid, ink outline
//   k  solid ink               ko ink with a rounded outline
//   p  paper, no outline       h  shade, no outline      hm mid, no outline
//   l  ink line                t  thin ink line          pl paper line (on ink)   d dashed

import { writeMeta } from './meta.js';

export const U = 100;

export const STYLE = `
.o{fill:var(--paper,#fff);stroke:var(--ink,#1b1b1b);stroke-width:6;stroke-linejoin:round;stroke-linecap:round}
.s{fill:var(--shade,#c6c6c6);stroke:var(--ink,#1b1b1b);stroke-width:6;stroke-linejoin:round;stroke-linecap:round}
.m{fill:var(--mid,#8d8d8d);stroke:var(--ink,#1b1b1b);stroke-width:6;stroke-linejoin:round;stroke-linecap:round}
.k{fill:var(--ink,#1b1b1b);stroke:none}
.ko{fill:var(--ink,#1b1b1b);stroke:var(--ink,#1b1b1b);stroke-width:6;stroke-linejoin:round}
.p{fill:var(--paper,#fff);stroke:none}
.h{fill:var(--shade,#c6c6c6);stroke:none}
.hm{fill:var(--mid,#8d8d8d);stroke:none}
.l{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:4.5;stroke-linejoin:round;stroke-linecap:round}
.t{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}
.pl{fill:none;stroke:var(--paper,#fff);stroke-width:3.5;stroke-linejoin:round;stroke-linecap:round}
.d{fill:none;stroke:var(--ink,#1b1b1b);stroke-width:3.5;stroke-dasharray:8 7;stroke-linecap:round}
`.trim();

// Soft ink shadow under furniture so it stands off the floor.
const SHADOW = '<defs><filter id="sh" x="-15%" y="-15%" width="130%" height="130%"><feDropShadow dx="3" dy="5" stdDeviation="3" style="flood-color:var(--ink,#1b1b1b);flood-opacity:0.35"/></filter></defs>';

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
    ...(meta.layer === 'floor' ? [String(drawing)] : [SHADOW, `<g filter="url(#sh)">`, String(drawing), '</g>']),
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
