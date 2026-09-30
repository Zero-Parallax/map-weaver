// Tools that add or cut floor: rectangle, circle, polygon, cave, brush.
// Alt while drawing flips add <-> subtract. Shift snaps to half squares, Ctrl turns snapping off.

import { el, segmented, checkbox, field, select } from '../dom.js';
import { newId, newSeed } from '../../core/model.js';
import { roundPolygon, circlePoints, dist, snap, simplify } from '../../core/geom.js';
import { rectRing, caveRing } from '../../core/shapes.js';

const RADII = [0, 0.5, 1, 1.5, 2, 3, 4].map((r) => ({ id: String(r), name: r ? `${r} sq` : 'Square' }));

function modeOptions(app, { walled = true, radius = false, extra = [] } = {}) {
  const o = app.opts;
  return el(
    'div',
    {},
    field(
      'Mode',
      segmented(
        [
          { id: 'add', name: 'Add floor', title: 'Hold Alt to cut away instead' },
          { id: 'subtract', name: 'Cut away' },
          { id: 'void', name: 'Open to below', title: 'Balconies, galleries, stairwells: see down to the level below' },
        ],
        o.mode,
        (v) => app.setOpt('mode', v),
      ),
    ),
    walled && o.mode === 'add' && field('Rooms', joinControl(o.walled ? (o.overlap ? 'overlap' : 'top') : 'merge', (v) => {
      app.opts.overlap = v === 'overlap';
      app.setOpt('walled', v !== 'merge');
    })),
    radius && field('Corner rounding', select(RADII, String(o.radius), (v) => app.setOpt('radius', Number(v)))),
    ...extra,
  );
}

export const JOIN_MODES = [
  { id: 'merge', name: 'Merge', title: 'No walls of its own: joins the floor it touches into one room' },
  { id: 'top', name: 'On top', title: 'Its own walls; walls of earlier rooms inside it are removed' },
  { id: 'overlap', name: 'Overlap', title: 'Its own walls and earlier rooms keep theirs: where they cross becomes its own space' },
];

/** Merge / On top / Overlap picker. */
export function joinControl(value, onChange) {
  return segmented(JOIN_MODES, value, onChange);
}

function opFor(app, ev) {
  const mode = app.opts.mode;
  if (!ev.alt) return mode;
  return mode === 'subtract' ? 'add' : 'subtract';
}

const PREVIEW = {
  add: ['rgba(40,160,255,0.18)', '#2a9df4'],
  subtract: ['rgba(220,60,60,0.18)', '#e04848'],
  void: ['rgba(170,90,230,0.22)', '#a55ae6'],
};

function strokePreview(ctx, app, rings, op) {
  ctx.save();
  ctx.beginPath();
  for (const ring of rings) {
    if (ring.length < 2) continue;
    ctx.moveTo(...ring[0]);
    for (const p of ring.slice(1)) ctx.lineTo(...p);
    ctx.closePath();
  }
  const [fill, stroke] = PREVIEW[op] || PREVIEW.add;
  ctx.fillStyle = fill;
  ctx.fill('evenodd');
  ctx.setLineDash([6 / app.view.scale, 4 / app.view.scale]);
  ctx.lineWidth = 2 / app.view.scale;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.restore();
}

function addShape(app, shape, op) {
  const walled = op === 'add' && app.opts.walled && shape.kind !== 'cells';
  const overlap = walled && app.opts.overlap ? { overlap: true } : {};
  app.commit({ add: 'Add floor', subtract: 'Cut floor', void: 'Open to below' }[op], (map, level) => {
    level.shapes.push({ id: newId('s'), op, walled, ...overlap, ...shape });
  });
}

export const rectTool = {
  id: 'rect',
  label: 'Rectangle',
  key: 'r',
  hint: 'Drag to draw a room. Alt: cut away. Shift: half squares.',
  options: (app) => modeOptions(app, { radius: true }),
  down(app, ev) {
    this.start = ev.point;
    this.end = ev.point;
    this.op = opFor(app, ev);
  },
  move(app, ev) {
    if (!this.start) return;
    this.end = ev.point;
    this.op = opFor(app, ev);
    app.requestRender();
  },
  up(app) {
    if (!this.start) return;
    const r = this.rect();
    this.start = null;
    if (r.w > 0 && r.h > 0) addShape(app, { kind: 'rect', ...r, radius: app.opts.radius }, this.op);
    app.requestRender();
  },
  cancel() {
    this.start = null;
  },
  rect() {
    const [a, b] = [this.start, this.end];
    return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) };
  },
  overlay(app, ctx) {
    if (!this.start) return;
    const ring = rectRing(this.rect());
    strokePreview(ctx, app, [app.opts.radius ? roundPolygon(ring, app.opts.radius) : ring], this.op);
    app.drawDimensions(ctx, this.rect());
  },
};

export const circleTool = {
  id: 'circle',
  label: 'Circle',
  key: 'c',
  hint: 'Drag from the centre. Radius snaps to half squares. Alt: cut away.',
  options: (app) => modeOptions(app),
  down(app, ev) {
    this.centre = ev.point;
    this.r = 0;
    this.op = opFor(app, ev);
  },
  move(app, ev) {
    if (!this.centre) return;
    const r = dist(this.centre, ev.world);
    this.r = ev.ctrl ? r : Math.max(0.5, snap(r, 0.5));
    this.op = opFor(app, ev);
    app.requestRender();
  },
  up(app) {
    if (!this.centre) return;
    const { centre, r } = this;
    this.centre = null;
    if (r > 0) addShape(app, { kind: 'circle', cx: centre[0], cy: centre[1], r }, this.op);
    app.requestRender();
  },
  cancel() {
    this.centre = null;
  },
  overlay(app, ctx) {
    if (!this.centre || !this.r) return;
    strokePreview(ctx, app, [circlePoints(this.centre, this.r, 0.02)], this.op);
    app.drawLabel(ctx, [this.centre[0], this.centre[1] - this.r], `r ${this.r}`);
  },
};

export const polyTool = {
  id: 'poly',
  label: 'Polygon',
  key: 'p',
  hint: 'Click corners (any angle). Click the first corner, double-click or Enter to finish. Backspace: undo corner.',
  options: (app) => modeOptions(app, { radius: true }),
  points: [],
  down(app, ev) {
    if (ev.button !== 0) return this.finish(app);
    const p = ev.point;
    if (this.points.length >= 3 && dist(p, this.points[0]) < 0.3) return this.finish(app);
    const last = this.points[this.points.length - 1];
    if (!last || dist(last, p) > 1e-6) this.points.push(p);
    this.op = opFor(app, ev);
    app.requestRender();
  },
  dblclick(app) {
    this.finish(app);
  },
  move(app, ev) {
    this.hover = ev.point;
    if (this.points.length) app.requestRender();
  },
  onKey(app, e) {
    if (e.key === 'Enter') return this.finish(app), true;
    if (e.key === 'Backspace' && this.points.length) {
      this.points.pop();
      app.requestRender();
      return true;
    }
    return false;
  },
  finish(app) {
    const pts = this.points;
    this.points = [];
    if (pts.length >= 3) addShape(app, { kind: 'poly', points: pts, radius: app.opts.radius }, this.op || opFor(app, {}));
    app.requestRender();
  },
  cancel() {
    this.points = [];
  },
  overlay(app, ctx) {
    if (!this.points.length) return;
    const pts = [...this.points, this.hover || this.points[this.points.length - 1]];
    strokePreview(ctx, app, [pts], this.op);
    ctx.fillStyle = '#2a9df4';
    for (const p of this.points) ctx.fillRect(p[0] - 3 / app.view.scale, p[1] - 3 / app.view.scale, 6 / app.view.scale, 6 / app.view.scale);
  },
};

export const caveTool = {
  id: 'cave',
  label: 'Cave',
  key: 'k',
  hint: 'Drag freehand around the cave outline. Roughness is set in the panel.',
  options: (app) =>
    modeOptions(app, {
      extra: [
        field(
          'Roughness',
          el('input', {
            type: 'range', min: 0, max: 1, step: 0.05, value: app.opts.roughness,
            oninput: (e) => app.setOpt('roughness', Number(e.target.value), false),
          }),
        ),
      ],
    }),
  points: [],
  down(app, ev) {
    this.points = [ev.world];
    this.op = opFor(app, ev);
    this.seed = newSeed();
  },
  move(app, ev) {
    if (!this.points.length) return;
    const last = this.points[this.points.length - 1];
    if (dist(last, ev.world) > 0.15) {
      this.points.push(ev.world);
      app.requestRender();
    }
  },
  up(app) {
    const pts = simplify(this.points, 0.05).map((p) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
    this.points = [];
    if (pts.length >= 4) {
      addShape(app, { kind: 'cave', points: pts, roughness: app.opts.roughness, seed: this.seed }, this.op);
    }
    app.requestRender();
  },
  cancel() {
    this.points = [];
  },
  overlay(app, ctx) {
    if (this.points.length < 2) return;
    const ring = this.points.length >= 4 ? caveRing(this.points, app.opts.roughness, this.seed) : this.points;
    strokePreview(ctx, app, [ring.length ? ring : this.points], this.op);
  },
};

export const brushTool = {
  id: 'brush',
  label: 'Floor brush',
  key: 'b',
  hint: 'Paint floor squares. Alt: erase floor. Each stroke extends the floor it touches.',
  options: (app) =>
    el(
      'div',
      {},
      field(
        'Mode',
        segmented(
          [
            { id: 'add', name: 'Paint' },
            { id: 'subtract', name: 'Erase' },
            { id: 'void', name: 'Open' },
          ],
          app.opts.mode,
          (v) => app.setOpt('mode', v),
        ),
      ),
      field(
        'Brush size',
        segmented(
          [1, 2, 3, 5].map((n) => ({ id: n, name: `${n}×${n}` })),
          app.opts.brush,
          (v) => app.setOpt('brush', v),
        ),
      ),
    ),
  cells: null,
  down(app, ev) {
    this.cells = new Map();
    this.op = opFor(app, ev);
    this.paint(app, ev);
  },
  move(app, ev) {
    this.hover = ev.world;
    if (this.cells) this.paint(app, ev);
    app.requestRender();
  },
  paint(app, ev) {
    const n = app.opts.brush;
    const x0 = Math.floor(ev.world[0] - (n - 1) / 2);
    const y0 = Math.floor(ev.world[1] - (n - 1) / 2);
    for (let y = y0; y < y0 + n; y++) {
      for (let x = x0; x < x0 + n; x++) {
        if (x < 0 || y < 0 || x >= app.map.size.w || y >= app.map.size.h) continue;
        this.cells.set(`${x},${y}`, [x, y]);
      }
    }
  },
  up(app) {
    if (!this.cells) return;
    const cells = [...this.cells.values()];
    this.cells = null;
    if (cells.length) addShape(app, { kind: 'cells', cells }, this.op);
  },
  cancel() {
    this.cells = null;
  },
  overlay(app, ctx) {
    const cells = this.cells ? [...this.cells.values()] : [];
    ctx.save();
    ctx.fillStyle = (this.cells && PREVIEW[this.op]?.[0]) || PREVIEW.add[0];
    for (const [x, y] of cells) ctx.fillRect(x, y, 1, 1);
    if (this.hover) {
      const n = app.opts.brush;
      const x0 = Math.floor(this.hover[0] - (n - 1) / 2);
      const y0 = Math.floor(this.hover[1] - (n - 1) / 2);
      ctx.strokeStyle = '#2a9df4';
      ctx.lineWidth = 2 / app.view.scale;
      ctx.strokeRect(x0, y0, n, n);
    }
    ctx.restore();
  },
};
