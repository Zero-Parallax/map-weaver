// Tools for multi-level maps: links between levels, and the edges of open-to-below areas.

import { el, segmented, field } from '../dom.js';
import { EDGE_KINDS, insertLevel } from '../../core/model.js';
import { LINK_TYPES, createLink } from '../../core/links.js';
import { edgeRunAt } from '../../core/level-geometry.js';
import { polylineSegments, projectOnSegment } from '../../core/geom.js';

// ---- links ---------------------------------------------------------------

const TYPE_HINTS = {
  stairs: 'Drag from the foot of the stairs to the top. The level above gets an opening with a railing.',
  spiral: 'Click to place. The level above gets a round opening.',
  ladder: 'Click a square. Passes through every level it spans.',
  lift: 'Drag the lift car (or click for 2×2). Serves every level it spans.',
  trapdoor: 'Click a square on the upper level. The level below shows where it is.',
};

function dominantDir(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'e' : 'w';
  return dy > 0 ? 's' : 'n';
}

export const linkTool = {
  id: 'link',
  label: 'Stairs & lifts',
  key: 's',
  hint: 'Link this level to others with stairs, spiral stairs, ladders, lifts or trapdoors.',
  options(app) {
    const o = app.opts;
    const type = LINK_TYPES.find((t) => t.id === o.linkType);
    return el(
      'div',
      {},
      field('Type', segmented(LINK_TYPES.map((t) => ({ id: t.id, name: t.name })), o.linkType, (v) => app.setOpt('linkType', v))),
      el('p', { class: 'hint' }, TYPE_HINTS[o.linkType]),
      o.linkType === 'spiral' && field('Size', segmented([2, 3].map((n) => ({ id: n, name: `${n}×${n}` })), o.spiralSize, (v) => app.setOpt('spiralSize', v))),
      type.span === 'multi' &&
        field('Levels up', el('input', {
          type: 'number', min: 1, max: 20, value: o.linkSpan,
          onchange: (e) => app.setOpt('linkSpan', Math.max(1, Math.round(+e.target.value) || 1), false),
        })),
    );
  },
  down(app, ev) {
    if (ev.button !== 0) return;
    this.start = ev.point;
    this.end = ev.point;
    this.cell = [Math.floor(ev.world[0]), Math.floor(ev.world[1])];
  },
  move(app, ev) {
    this.hover = ev.world;
    if (this.start) this.end = ev.point;
    else this.cell = [Math.floor(ev.world[0]), Math.floor(ev.world[1])];
    app.requestRender();
  },
  up(app) {
    if (!this.start) return;
    const plan = this.plan(app);
    this.start = null;
    if (plan) this.create(app, plan);
    app.requestRender();
  },
  cancel() {
    this.start = null;
  },
  /** Footprint, direction and level span for the current gesture. */
  plan(app) {
    const t = app.opts.linkType;
    const [a, b] = [this.start, this.end];
    const dragged = a && b && (a[0] !== b[0] || a[1] !== b[1]);
    const rectFromDrag = () => ({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]) });
    const cell = this.cell;
    let rect;
    let dir = 'n';
    if (t === 'stairs') {
      if (!dragged) return null;
      rect = rectFromDrag();
      if (!rect.w || !rect.h) return null;
      dir = dominantDir(b[0] - a[0], b[1] - a[1]);
    } else if (t === 'spiral') {
      const n = app.opts.spiralSize;
      rect = { x: cell[0], y: cell[1], w: n, h: n };
    } else if (t === 'lift') {
      rect = dragged ? rectFromDrag() : { x: cell[0], y: cell[1], w: 2, h: 2 };
      if (!rect.w || !rect.h) return null;
    } else {
      rect = { x: cell[0], y: cell[1], w: 1, h: 1 };
    }
    const index = app.levelIndex;
    let from = index;
    let to = index + (LINK_TYPES.find((x) => x.id === t).span === 'multi' ? app.opts.linkSpan : 1);
    if (t === 'trapdoor') {
      from = index - 1;
      to = index;
    }
    return { type: t, rect, dir, from, to };
  },
  create(app, plan) {
    const levels = app.map.levels;
    if (plan.from < 0) return app.status('A trapdoor goes in the floor of an upper level. Add a level below first.');
    const missing = plan.to - (levels.length - 1);
    if (missing > 0 && !confirm(`This needs ${missing} more level${missing > 1 ? 's' : ''} above. Add ${missing > 1 ? 'them' : 'it'}?`)) return;
    app.commit(`Add ${plan.type}`, (map) => {
      for (let i = 0; i < missing; i++) insertLevel(map, map.levels.length, `Level ${map.levels.length + 1}`);
      map.links.push(createLink(plan.type, map.levels[plan.from].id, map.levels[plan.to].id, plan.rect, plan.dir));
    });
  },
  overlay(app, ctx) {
    if (!this.cell) return;
    const plan = this.plan(app);
    if (!plan) return;
    const { x, y, w, h } = plan.rect;
    ctx.save();
    ctx.fillStyle = 'rgba(40,160,255,0.2)';
    ctx.strokeStyle = '#2a9df4';
    ctx.lineWidth = 2 / app.view.scale;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    if (plan.type === 'stairs') app.drawLabel(ctx, [x + w, y + h], `${w} × ${h}, up to the ${{ n: 'north', e: 'east', s: 'south', w: 'west' }[plan.dir]}`);
  },
};

// ---- edges of open areas -------------------------------------------------

export const edgeTool = {
  id: 'edge',
  label: 'Balcony edge',
  key: 'g',
  hint: 'Click an edge of an open-to-below area to make it a railing, a full wall or an open drop.',
  options: (app) =>
    el(
      'div',
      {},
      field('Make it', segmented(EDGE_KINDS, app.opts.edgeKind, (v) => app.setOpt('edgeKind', v))),
      el('p', { class: 'hint' }, 'Draw open areas with a shape tool in "Open to below" mode.'),
    ),
  move(app, ev) {
    this.hover = edgeRunAt(app.geometry().edgeRuns, ev.world);
    app.requestRender();
  },
  down(app, ev) {
    if (ev.button !== 0) return;
    const run = edgeRunAt(app.geometry().edgeRuns, ev.world);
    if (!run) return app.status('Click on the edge of an open-to-below area.');
    const kind = app.opts.edgeKind;
    const segs = polylineSegments(run.points);
    const onRun = (p) => segs.some(([a, b]) => projectOnSegment(p, a, b).dist < 0.35);
    // Anchor the override at the middle of the run so it stays put if the run is resized.
    const mid = segs[Math.floor(segs.length / 2)];
    const at = [(mid[0][0] + mid[1][0]) / 2, (mid[0][1] + mid[1][1]) / 2];
    app.commit('Change edge', (map, level) => {
      level.edges = level.edges.filter((e) => !onRun(e.at));
      if (kind !== 'railing') level.edges.push({ at, kind });
    });
    this.hover = null;
  },
  cancel() {
    this.hover = null;
  },
  overlay(app, ctx) {
    if (!this.hover) return;
    ctx.save();
    ctx.strokeStyle = '#2a9df4';
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 8 / app.view.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const pts = this.hover.points;
    ctx.moveTo(...pts[0]);
    for (const p of pts.slice(1)) ctx.lineTo(...p);
    ctx.stroke();
    ctx.restore();
  },
};
