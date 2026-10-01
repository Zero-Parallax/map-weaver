// Painting terrain: water, lava, chasms, mud, ice, roads, paving, grass and sand.
// Three ways to paint: a square brush, a freehand area, or a river / road along a path.
// Alt or right-click erases.

import { el, segmented, field, select } from '../dom.js';
import { newId, newSeed } from '../../core/model.js';
import { dist, simplify } from '../../core/geom.js';
import { caveRing, shapeRings } from '../../core/shapes.js';
import { TERRAIN_KINDS } from '../../core/terrain.js';

const METHODS = [
  { id: 'brush', name: 'Brush', title: 'Paint squares' },
  { id: 'area', name: 'Area', title: 'Drag freehand round an area (ponds, lava pools, chasms)' },
  { id: 'path', name: 'River / road', title: 'Click along a path; double-click or Enter to finish' },
];

function preview(ctx, app, rings, erase) {
  ctx.save();
  ctx.beginPath();
  for (const ring of rings) {
    if (ring.length < 2) continue;
    ctx.moveTo(...ring[0]);
    for (const p of ring.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
  }
  ctx.fillStyle = erase ? 'rgba(220,60,60,0.2)' : 'rgba(40,160,255,0.2)';
  ctx.fill('evenodd');
  ctx.setLineDash([6 / app.view.scale, 4 / app.view.scale]);
  ctx.lineWidth = 2 / app.view.scale;
  ctx.strokeStyle = erase ? '#e04848' : '#2a9df4';
  ctx.stroke();
  ctx.restore();
}

function paint(app, shape, erase) {
  const kind = app.opts.terrainKind;
  app.commit(erase ? 'Erase terrain' : 'Paint terrain', (map, level) => {
    level.terrain ??= [];
    level.terrain.push({ id: newId('t'), kind, op: erase ? 'erase' : 'add', shape });
  });
}

export const terrainTool = {
  id: 'terrain',
  label: 'Terrain',
  key: 'n',
  hint: 'Paint water, lava, chasms, mud, ice, roads and more. Alt or right-click erases.',
  options: (app) =>
    el('div', {},
      field('Terrain', select(TERRAIN_KINDS, app.opts.terrainKind, (v) => app.setOpt('terrainKind', v))),
      field('Paint with', segmented(METHODS, app.opts.terrainMethod, (v) => app.setOpt('terrainMethod', v))),
      app.opts.terrainMethod === 'brush' && field('Brush size', segmented([1, 2, 3, 5].map((n) => ({ id: n, name: `${n}×${n}` })), app.opts.terrainBrush, (v) => app.setOpt('terrainBrush', v))),
      app.opts.terrainMethod === 'path' && field('Width', segmented([1, 2, 3, 4, 6].map((n) => ({ id: n, name: `${n} sq` })), app.opts.terrainWidth, (v) => app.setOpt('terrainWidth', v))),
      el('p', { class: 'hint' }, 'Water, mud and ice are difficult terrain; lava hurts; nobody walks into a chasm (bridges cross it). Roads stay clear of furniture.')),
  points: [],
  cells: null,
  down(app, ev) {
    const erase = ev.alt || ev.button === 2;
    const method = app.opts.terrainMethod;
    if (method === 'brush') {
      this.cells = new Map();
      this.erase = erase;
      this.brush(app, ev);
    } else if (method === 'area') {
      this.points = [ev.world];
      this.erase = erase;
      this.seed = newSeed();
    } else {
      if (ev.button === 2) return this.finish(app);
      const last = this.points[this.points.length - 1];
      if (last && dist(last, ev.world) < 0.2) return this.finish(app);
      this.points.push(ev.world);
      this.erase = ev.alt;
      app.requestRender();
    }
  },
  move(app, ev) {
    this.hover = ev.world;
    const method = app.opts.terrainMethod;
    if (method === 'brush' && this.cells) this.brush(app, ev);
    if (method === 'area' && this.points.length) {
      const last = this.points[this.points.length - 1];
      if (dist(last, ev.world) > 0.15) this.points.push(ev.world);
    }
    app.requestRender();
  },
  up(app) {
    const method = app.opts.terrainMethod;
    if (method === 'brush' && this.cells) {
      const cells = [...this.cells.values()];
      this.cells = null;
      if (cells.length) paint(app, { kind: 'cells', cells }, this.erase);
    } else if (method === 'area' && this.points.length) {
      const pts = simplify(this.points, 0.05).map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
      this.points = [];
      if (pts.length >= 4) paint(app, { kind: 'cave', points: pts, roughness: 0.25, seed: this.seed }, this.erase);
    }
    app.requestRender();
  },
  dblclick(app) {
    if (app.opts.terrainMethod === 'path') this.finish(app);
  },
  onKey(app, e) {
    if (app.opts.terrainMethod !== 'path') return false;
    if (e.key === 'Enter') return this.finish(app), true;
    if (e.key === 'Backspace' && this.points.length) {
      this.points.pop();
      app.requestRender();
      return true;
    }
    return false;
  },
  finish(app) {
    const pts = this.points.filter((p, i, all) => i === 0 || dist(p, all[i - 1]) > 0.2).map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    this.points = [];
    app.requestRender();
    if (pts.length >= 2) paint(app, { kind: 'path', points: pts, width: app.opts.terrainWidth, smooth: true }, this.erase);
  },
  brush(app, ev) {
    const n = app.opts.terrainBrush;
    const x0 = Math.floor(ev.world[0] - (n - 1) / 2);
    const y0 = Math.floor(ev.world[1] - (n - 1) / 2);
    for (let y = y0; y < y0 + n; y++) {
      for (let x = x0; x < x0 + n; x++) {
        if (x < 0 || y < 0 || x >= app.map.size.w || y >= app.map.size.h) continue;
        this.cells.set(`${x},${y}`, [x, y]);
      }
    }
  },
  cancel() {
    this.points = [];
    this.cells = null;
  },
  overlay(app, ctx) {
    const method = app.opts.terrainMethod;
    if (method === 'brush') {
      ctx.save();
      ctx.fillStyle = this.erase ? 'rgba(220,60,60,0.2)' : 'rgba(40,160,255,0.2)';
      for (const [x, y] of this.cells ? this.cells.values() : []) ctx.fillRect(x, y, 1, 1);
      if (this.hover) {
        const n = app.opts.terrainBrush;
        ctx.strokeStyle = '#2a9df4';
        ctx.lineWidth = 2 / app.view.scale;
        ctx.strokeRect(Math.floor(this.hover[0] - (n - 1) / 2), Math.floor(this.hover[1] - (n - 1) / 2), n, n);
      }
      ctx.restore();
    } else if (method === 'area' && this.points.length > 3) {
      preview(ctx, app, [caveRing(this.points, 0.25, this.seed)], this.erase);
    } else if (method === 'path' && this.points.length) {
      const pts = [...this.points, this.hover || this.points[this.points.length - 1]];
      if (pts.length >= 2) preview(ctx, app, shapeRings({ kind: 'path', points: pts, width: app.opts.terrainWidth, smooth: true }), this.erase);
    }
  },
};
