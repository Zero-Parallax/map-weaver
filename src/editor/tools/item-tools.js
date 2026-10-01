// Doors, room tagging, selection and erasing.

import { el, segmented, field, select, checkbox } from '../dom.js';
import { newId, newSeed, DOOR_TYPES } from '../../core/model.js';
import { nearestWall, snapDoor, doorsOverlap } from '../../core/doors.js';
import { regionAt } from '../../core/rooms.js';
import { dist, sub } from '../../core/geom.js';
import { drawDoor } from '../../render/renderer.js';

// ---- doors ---------------------------------------------------------------

export const doorTool = {
  id: 'door',
  label: 'Door',
  key: 'd',
  hint: 'Click a wall to place a door. Clicking an existing door replaces it.',
  options: (app) =>
    el(
      'div',
      {},
      field('Type', select(DOOR_TYPES, app.opts.doorType, (v) => {
        app.setOpt('doorType', v);
        app.setOpt('doorWidth', DOOR_TYPES.find((d) => d.id === v).width);
      })),
      field('Width', segmented([1, 2, 3].map((n) => ({ id: n, name: `${n} sq` })), app.opts.doorWidth, (v) => app.setOpt('doorWidth', v))),
    ),
  preview(app, p, width = app.opts.doorWidth, type = app.opts.doorType) {
    const hit = nearestWall(app.geometry().wallSegments, p, 0.6);
    if (!hit) return null;
    const d = snapDoor(hit.a, hit.b, p, width);
    return d && { ...d, type };
  },
  move(app, ev) {
    this.ghost = this.preview(app, ev.world);
    app.requestRender();
  },
  down(app, ev) {
    if (ev.button !== 0) return;
    const door = this.preview(app, ev.world);
    if (!door) return app.status('Click on a wall to place a door.');
    app.commit('Add door', (map, level) => {
      level.doors = level.doors.filter((d) => !doorsOverlap(d, door) && !doorsOverlap(door, d));
      level.doors.push({ id: newId('d'), ...door });
    });
  },
  cancel() {
    this.ghost = null;
  },
  overlay(app, ctx) {
    if (!this.ghost) return;
    ctx.save();
    ctx.globalAlpha = 0.75;
    drawDoor(ctx, this.ghost, app.style);
    ctx.restore();
  },
};

// ---- room tags -----------------------------------------------------------

export const roomTool = {
  id: 'room',
  label: 'Room type',
  key: 't',
  hint: 'Pick a room type, then click inside rooms to tag them. Right-click clears a tag.',
  options: (app) => {
    const types = app.setting?.roomTypes || [];
    currentRoomType(app);
    return el('div', {},
      checkbox('Decorate rooms when tagged', app.opts.autoDecorate, (v) => app.setOpt('autoDecorate', v)),
      checkbox('Add doors to neighbouring rooms', app.opts.autoDoors, (v) => app.setOpt('autoDoors', v)),
      el(
      'div',
      { class: 'room-types' },
      types.map((t, i) =>
        el(
          'button',
          { type: 'button', class: 'room-type' + (t.id === app.opts.roomType ? ' on' : ''), onclick: () => app.setOpt('roomType', t.id) },
          el('i', { style: { background: app.roomColor(t.id) } }),
          t.name,
        ),
      ),
    ));
  },
  move(app, ev) {
    app.hoverRegion = regionAt(app.geometry().rooms, ev.world);
    app.requestRender();
  },
  down(app, ev) {
    const rooms = app.geometry().rooms;
    const index = regionAt(rooms, ev.world);
    if (index < 0) return app.status('That is not inside a room.');
    const region = rooms.regions[index];
    if (ev.button === 2) {
      if (region.tag) app.commit('Clear room type', (map, level) => {
        level.rooms = level.rooms.filter((r) => rooms.tagRegion.get(r.id) !== index);
      });
      return;
    }
    const type = currentRoomType(app);
    if (!type) return;
    app.commit('Tag room', (map, level) => {
      const tag = tagRegion(level, rooms, index, type, ev.world);
      app.tagged(map, level, [tag.id]);
    });
  },
  cancel(app) {
    if (app) app.hoverRegion = -1;
  },
};

/** The chosen room type, falling back to the setting's first type. */
function currentRoomType(app) {
  const types = app.setting?.roomTypes || [];
  if (!types.some((t) => t.id === app.opts.roomType)) app.opts.roomType = types[0]?.id ?? null;
  return app.opts.roomType;
}

/** Set the type of the room at region index (creating a tag if needed). */
export function tagRegion(level, rooms, index, type, at) {
  const region = rooms.regions[index];
  const existing = region.tag && level.rooms.find((r) => r.id === region.tag.id);
  if (existing) {
    existing.type = type;
    return existing;
  }
  const tag = { id: newId('r'), type, at: at || region.labelAt, seed: newSeed(), reroll: 0 };
  level.rooms.push(tag);
  return tag;
}

// ---- select / move -------------------------------------------------------

export const selectTool = {
  id: 'select',
  label: 'Select',
  key: 'v',
  hint: 'Click to select a room, wall, door or asset; drag to move it. Drag the round handle to turn an asset (15° steps, Ctrl: free). Delete removes it. Middle-drag or Space-drag pans.',
  options: null,
  down(app, ev) {
    if (ev.button !== 0) return;
    const handle = app.rotationHandle();
    if (handle && dist(handle.point, ev.world) < (app.reach + 2) / app.view.scale) {
      this.turn = { pl: handle.pl, rot: handle.pl.rot };
      return;
    }
    const hit = app.hitTest(ev.world);
    app.select(hit ? { ...hit, at: ev.world } : null);
    this.drag = hit ? { from: ev.point, to: ev.point, world: ev.world, hit } : null;
  },
  move(app, ev) {
    if (this.turn) {
      const { pl } = this.turn;
      const deg = (Math.atan2(ev.world[0] - pl.x, -(ev.world[1] - pl.y)) * 180) / Math.PI;
      this.turn.rot = ev.ctrl ? Math.round(deg) : Math.round(deg / 15) * 15;
      app.requestRender();
      return;
    }
    if (this.drag) {
      this.drag.to = ev.point;
      this.drag.world = ev.world;
    } else {
      app.hoverItem = app.hitTest(ev.world);
      app.hoverRegion = app.hoverItem?.kind === 'shape' ? regionAt(app.geometry().rooms, ev.world) : -1;
    }
    app.requestRender();
  },
  up(app, ev) {
    if (this.turn) {
      const { pl, rot } = this.turn;
      this.turn = null;
      if (rot !== pl.rot) app.setRotation(pl.id, rot);
      return;
    }
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    const [dx, dy] = sub(drag.to, drag.from);
    if (drag.hit.kind === 'door') {
      if (!dx && !dy) return;
      const door = drag.hit.item;
      const ghost = doorTool.preview(app, ev.world, Math.round(dist(door.a, door.b)) || 1, door.type);
      if (!ghost) return app.requestRender();
      app.commit('Move door', (map, level) => {
        const d = level.doors.find((x) => x.id === drag.hit.id);
        if (d) Object.assign(d, { a: ghost.a, b: ghost.b });
      });
      return;
    }
    if (!dx && !dy) return;
    app.moveItem(drag.hit, dx, dy);
  },
  cancel() {
    this.drag = null;
    this.turn = null;
  },
  overlay(app, ctx) {
    if (this.turn) {
      app.drawItemOutline(ctx, { kind: 'placement', id: this.turn.pl.id }, 0, 0, '#2a9df4', this.turn.rot);
      app.drawLabel(ctx, [this.turn.pl.x, this.turn.pl.y], `${((this.turn.rot % 360) + 360) % 360}°`);
      return;
    }
    if (!this.drag) return;
    const [dx, dy] = sub(this.drag.to, this.drag.from);
    if (dx || dy) app.drawItemOutline(ctx, this.drag.hit, dx, dy, '#2a9df4');
  },
};

// ---- erase ---------------------------------------------------------------

export const eraseTool = {
  id: 'erase',
  label: 'Erase',
  key: 'e',
  hint: 'Click a door, wall or shape to delete it.',
  options: null,
  move(app, ev) {
    app.hoverItem = app.hitTest(ev.world);
    app.requestRender();
  },
  down(app, ev) {
    if (ev.button !== 0) return;
    const hit = app.hitTest(ev.world);
    if (hit) app.deleteItem(hit);
    app.hoverItem = app.hitTest(ev.world);
  },
};
