// Hand-drawn walls: straight (any angle between grid points) and arcs.

import { newId } from '../../core/model.js';
import { dist, arcPoints, snap } from '../../core/geom.js';

function strokePreview(app, ctx, pts) {
  ctx.save();
  ctx.strokeStyle = '#2a9df4';
  ctx.lineWidth = 3 / app.view.scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(...pts[0]);
  for (const p of pts.slice(1)) ctx.lineTo(...p);
  ctx.stroke();
  ctx.restore();
}

function dot(app, ctx, p) {
  const r = 4 / app.view.scale;
  ctx.fillStyle = '#2a9df4';
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
}

export const wallTool = {
  id: 'wall',
  label: 'Wall',
  key: 'w',
  hint: 'Click grid points to chain walls (diagonals too). Right-click, Enter or Esc to stop. Walls divide rooms.',
  options: null,
  last: null,
  down(app, ev) {
    if (ev.button !== 0) return this.cancel(app);
    const p = ev.point;
    if (this.last && dist(this.last, p) > 1e-6) {
      const a = this.last;
      app.commit('Add wall', (map, level) => {
        level.walls.push({ id: newId('w'), kind: 'line', a, b: p });
      });
    }
    this.last = p;
    this.pressAt = p;
  },
  up(app, ev) {
    // Press-drag-release draws a single wall too.
    if (this.pressAt && dist(this.pressAt, ev.point) > 1e-6) this.down(app, { ...ev, button: 0 });
    this.pressAt = null;
  },
  move(app, ev) {
    this.hover = ev.point;
    app.requestRender();
  },
  onKey(app, e) {
    if (e.key === 'Enter') return this.cancel(app), true;
    return false;
  },
  cancel(app) {
    this.last = null;
    this.pressAt = null;
    app?.requestRender();
  },
  overlay(app, ctx) {
    if (this.hover) dot(app, ctx, this.hover);
    if (this.last && this.hover) {
      strokePreview(app, ctx, [this.last, this.hover]);
      app.drawLabel(ctx, this.hover, `${dist(this.last, this.hover).toFixed(1)} sq`);
    }
  },
};

const ANGLE_SNAP = Math.PI / 12; // 15 degrees

export const arcTool = {
  id: 'arc',
  label: 'Arc wall',
  key: 'a',
  hint: 'Click the centre, then the start point, then move round and click to end. Angles snap to 15° (Ctrl: free).',
  options: null,
  stage: 0,
  down(app, ev) {
    if (ev.button !== 0) return this.cancel(app);
    if (this.stage === 0) {
      this.centre = ev.point;
      this.stage = 1;
    } else if (this.stage === 1) {
      const r = dist(this.centre, ev.point);
      if (r < 0.25) return;
      this.r = r;
      this.start = Math.atan2(ev.point[1] - this.centre[1], ev.point[0] - this.centre[0]);
      this.lastAngle = this.start;
      this.sweep = 0;
      this.stage = 2;
    } else {
      const sweep = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, this.snappedSweep(ev)));
      const { centre, r, start } = this;
      this.cancel(app);
      if (Math.abs(sweep) > 0.01) {
        app.commit('Add arc wall', (map, level) => {
          level.walls.push({ id: newId('w'), kind: 'arc', c: centre, r, start, sweep });
        });
      }
    }
    app.requestRender();
  },
  move(app, ev) {
    this.hover = ev.point;
    if (this.stage === 2) {
      // Track the total angle travelled so the arc can go either way and past 180 degrees.
      const a = Math.atan2(ev.world[1] - this.centre[1], ev.world[0] - this.centre[0]);
      let d = a - this.lastAngle;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      this.sweep += d;
      this.lastAngle = a;
      this.ctrl = ev.ctrl;
    }
    app.requestRender();
  },
  snappedSweep(ev) {
    return ev?.ctrl || this.ctrl ? this.sweep : snap(this.sweep, ANGLE_SNAP);
  },
  cancel(app) {
    this.stage = 0;
    app?.requestRender();
  },
  overlay(app, ctx) {
    if (this.stage === 0) {
      if (this.hover) dot(app, ctx, this.hover);
      return;
    }
    dot(app, ctx, this.centre);
    if (this.stage === 1 && this.hover) {
      strokePreview(app, ctx, [this.centre, this.hover]);
      app.drawLabel(ctx, this.hover, `r ${dist(this.centre, this.hover).toFixed(1)}`);
    }
    if (this.stage === 2) {
      const sweep = Math.max(-Math.PI * 2, Math.min(Math.PI * 2, this.snappedSweep()));
      if (Math.abs(sweep) > 0.01) strokePreview(app, ctx, arcPoints(this.centre, this.r, this.start, sweep, 0.02));
      app.drawLabel(ctx, this.hover, `${Math.round((Math.abs(sweep) * 180) / Math.PI)}°`);
    }
  },
};
