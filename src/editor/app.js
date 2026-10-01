// Editor state, undo history, input handling and drawing of editor overlays.

import { createMap, loadMap, saveMap, newSeed } from '../core/model.js';
import { computeLevelGeometry, cachedShapeRings, wallPolyline } from '../core/level-geometry.js';
import { translateShape } from '../core/shapes.js';
import { regionAt, sampleX, sampleY, STEP } from '../core/rooms.js';
import { pointInRings, distToRings, distToSegment, snapPoint, polylineSegments, add, sub, scale, norm, perp } from '../core/geom.js';
import { drawLevel, levelPaths } from '../render/renderer.js';
import { linksOnLevel, linkContains } from '../core/links.js';
import { placementContains, snapCentre, rotatedFootprint } from '../assets/library.js';
import { decorateRoom } from '../decorator/decorate.js';
import { planDoors } from '../core/auto-doors.js';
import { generateLayout } from '../generator/layout.js';
import { roomKey } from '../core/room-key.js';
import { newId } from '../core/model.js';
import { resolveStyle } from '../render/style.js';

const HISTORY_LIMIT = 200;
const AUTOSAVE_KEY = 'map-weaver.autosave';

// Tactical overlay colours: cover by level, and difficult terrain.
const TACTICAL = {
  full: { name: 'Full cover (blocks sight)', color: 'rgba(214,48,49,0.35)', edge: '#d63031', mark: 'F' },
  'three-quarters': { name: 'Three-quarters cover', color: 'rgba(230,126,34,0.35)', edge: '#e67e22', mark: '¾' },
  half: { name: 'Half cover', color: 'rgba(241,196,15,0.35)', edge: '#c9a000', mark: '½' },
  difficult: { name: 'Difficult terrain', color: 'rgba(142,94,60,0.35)', edge: '#8e5e3c', mark: '≈' },
};

export class App {
  constructor({ canvas, catalog, assets, tools, onChange }) {
    this.canvas = canvas;
    this.assets = assets;
    assets.onImageReady = () => this.requestRender();
    this.ctx = canvas.getContext('2d');
    this.catalog = catalog;
    this.tools = tools;
    this.onChange = onChange || (() => {});
    this.opts = {
      mode: 'add', walled: true, radius: 0, roughness: 0.5, brush: 1, doorType: 'door', doorWidth: 1, roomType: null,
      linkType: 'stairs', linkSpan: 1, spiralSize: 2, edgeKind: 'wall',
      asset: null, assetParams: null, assetRoom: null, assetSearch: '',
      autoDecorate: true, autoDoors: true, drawType: '', corridorWidth: 2,
    };
    this.showBelow = true;
    this.view = { scale: 32, ox: 40, oy: 40 };
    this.undoStack = [];
    this.redoStack = [];
    this.rev = 0;
    this.geoCache = new Map();
    this.selection = null;
    this.hoverItem = null;
    this.hoverRegion = -1;
    this.fileName = null;
    this.dirty = false;
    this.showLabels = true;
    this.showTactical = false;
    this.newMap();
    this.tool = tools[0];
    this.bindInput();
  }

  // ---- document ----------------------------------------------------------

  get level() {
    return this.map.levels[this.levelIndex];
  }

  get levelBelow() {
    return this.map.levels[this.levelIndex - 1] || null;
  }

  setLevel(index) {
    index = Math.max(0, Math.min(this.map.levels.length - 1, index));
    if (index === this.levelIndex) return;
    this.tool?.cancel?.(this);
    this.levelIndex = index;
    this.selection = null;
    this.hoverItem = null;
    this.onChange('level');
    this.requestRender();
  }

  get setting() {
    return this.catalog.settings.get(this.map.setting);
  }

  get style() {
    if (this._styleRev !== this.rev) {
      this._style = resolveStyle(this.map, this.catalog);
      this._styleRev = this.rev;
    }
    return this._style;
  }

  newMap(settingId) {
    const id = settingId || [...this.catalog.settings.keys()][0] || 'classic';
    const setting = this.catalog.settings.get(id);
    this.setMap(createMap({ setting: id, style: setting?.defaults }), null);
  }

  setMap(map, fileName) {
    this.tool?.cancel?.(this);
    this.map = map;
    this.levelIndex = 0;
    this.fileName = fileName;
    this.undoStack = [];
    this.redoStack = [];
    this.selection = null;
    this.dirty = false;
    this.rev++;
    this.fitView();
    this.changed('Opened');
  }

  geometry(level = this.level) {
    const hit = this.geoCache.get(level.id);
    if (hit && hit.rev === this.rev) return hit.geo;
    const geo = computeLevelGeometry(level, this.map);
    this.geoCache.set(level.id, { rev: this.rev, geo });
    return geo;
  }

  /**
   * Apply an edit as one undo step. fn(map, level) mutates in place.
   * Doors left off any wall and tags left outside any room are removed in the same step.
   */
  commit(label, fn, { prune = true } = {}) {
    const before = JSON.stringify(this.map);
    fn(this.map, this.level);
    if (prune) this.prune(this.level);
    if (JSON.stringify(this.map) === before) return false;
    this.undoStack.push(before);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.dirty = true;
    this.rev++;
    this.changed(label);
    return true;
  }

  prune(level) {
    const geo = computeLevelGeometry(level, this.map);
    level.doors = level.doors.filter((d) => {
      const mid = scale(add(d.a, d.b), 0.5);
      return geo.wallSegments.some(([a, b]) => distToSegment(mid, a, b) < 0.08);
    });
    const seen = new Set();
    level.rooms = level.rooms.filter((t) => {
      const index = regionAt(geo.rooms, t.at);
      if (index < 0 || seen.has(index)) return false;
      seen.add(index);
      return true;
    });
    const styled = new Set();
    level.wallStyles = (level.wallStyles || []).filter((w) => {
      const index = regionAt(geo.rooms, w.at);
      if (index < 0 || styled.has(index)) return false;
      styled.add(index);
      return true;
    });
    // Assets whose centre is no longer on the floor go too.
    level.placements = level.placements.filter((p) => regionAt(geo.rooms, [p.x, p.y]) >= 0);
  }

  /**
   * Decorate rooms on a level in place (call inside commit). Replaces each room's automatic
   * pieces and keeps the ones placed by hand. reroll: bump the room's reroll count first.
   */
  decorateIn(map, level, tagIds, { reroll = false, doors = this.opts.autoDoors } = {}) {
    // Rooms tagged before get their doors the first time they are decorated.
    const blockers = doors ? this.addDoorsIn(map, level, tagIds) : [];
    const geo = computeLevelGeometry(level, map);
    const metas = this.assets.forSetting(map.setting);
    const links = linksOnLevel(map, level);
    let placed = 0;
    for (const id of [...tagIds, ...blockers.filter((b) => !tagIds.includes(b))]) {
      const tag = level.rooms.find((r) => r.id === id);
      const index = geo.rooms.tagRegion.get(id);
      if (!tag || index == null) continue;
      if (reroll && tagIds.includes(id)) tag.reroll = (tag.reroll || 0) + 1;
      const inRoom = (p) => p.room === id || regionAt(geo.rooms, [p.x, p.y]) === index;
      level.placements = level.placements.filter((p) => !(p.auto && inRoom(p)));
      const existing = [];
      for (const p of level.placements) {
        const r = inRoom(p) && this.assets.resolve(p);
        if (!r) continue;
        // Squares covered by the (possibly angled) piece's bounding box.
        const a = (p.rot * Math.PI) / 180;
        const bw = Math.abs(r.footprint.w * Math.cos(a)) + Math.abs(r.footprint.h * Math.sin(a));
        const bh = Math.abs(r.footprint.w * Math.sin(a)) + Math.abs(r.footprint.h * Math.cos(a));
        const x0 = Math.floor(p.x - bw / 2 + 1e-6);
        const y0 = Math.floor(p.y - bh / 2 + 1e-6);
        const x1 = Math.ceil(p.x + bw / 2 - 1e-6);
        const y1 = Math.ceil(p.y + bh / 2 - 1e-6);
        existing.push({ meta: r.meta, footprint: { w: x1 - x0, h: y1 - y0 }, x: x0, y: y0 });
      }
      const out = decorateRoom({
        geo, region: geo.rooms.regions[index], tag, assets: metas, doors: level.doors, links, existing, mapSeed: map.seed,
      });
      for (const p of out.placements) level.placements.push({ id: newId('a'), ...p });
      placed += out.placements.length;
    }
    return placed;
  }

  /**
   * Add doors joining rooms to their neighbours (call inside commit). Each room is done once,
   * unless force. Returns ids of other rooms whose automatic pieces now stand in a doorway.
   * redecorating: the target rooms' own automatic pieces are about to be replaced.
   */
  addDoorsIn(map, level, tagIds, { force = false, redecorating = !force } = {}) {
    const tags = tagIds.map((id) => level.rooms.find((r) => r.id === id)).filter((t) => t && (force || !t.autoDoors));
    if (!tags.length) return [];
    const geo = computeLevelGeometry(level, map);
    const targets = tags.map((t) => geo.rooms.tagRegion.get(t.id)).filter((i) => i != null);
    for (const t of tags) t.autoDoors = true;
    const cfg = this.setting?.doors || {};
    const hubs = new Set(cfg.hubs || []);
    const byRoom = cfg.byRoom || {};
    const replaced = (p) => redecorating && p.auto && targets.includes(regionAt(geo.rooms, [p.x, p.y]));
    const solid = level.placements.filter((p) => this.assets.get(p.asset)?.blocksMovement && !replaced(p));
    const covers = (list, pt) => list.some((p) => {
      const r = this.assets.resolve(p);
      return r && placementContains(p, r.footprint, pt);
    });
    const planned = planDoors({
      geo,
      doors: level.doors,
      targets,
      type: (a, b) => byRoom[a.tag?.type] || byRoom[b.tag?.type] || cfg.type || 'door',
      hub: (r) => hubs.has(r.tag?.type),
      blocked: (pt) => covers(solid, pt),
    });
    const blockers = new Set();
    for (const { a, b, type } of planned) {
      level.doors.push({ id: newId('d'), type, a, b });
      // Automatic pieces now in a doorway: their rooms are redecorated around the door.
      const n = perp(norm(sub(b, a)));
      const c = scale(add(a, b), 0.5);
      for (const pt of [add(c, scale(n, 0.5)), add(c, scale(n, -0.5))]) {
        const index = regionAt(geo.rooms, pt);
        const tag = geo.rooms.regions[index]?.tag;
        if (!tag || (redecorating && targets.includes(index))) continue;
        if (covers(level.placements.filter((p) => p.auto && regionAt(geo.rooms, [p.x, p.y]) === index), pt)) blockers.add(tag.id);
      }
    }
    this.lastDoorCount = planned.length;
    return [...blockers];
  }

  /** Add doors for rooms now (the Add doors buttons). */
  addDoors(tagIds) {
    this.lastDoorCount = 0;
    this.commit('Add doors', (map, level) => {
      const blockers = this.addDoorsIn(map, level, tagIds, { force: true });
      if (blockers.length) this.decorateIn(map, level, blockers, { doors: false });
    });
    const n = this.lastDoorCount;
    this.status(n ? `Added ${n} door${n === 1 ? '' : 's'}.` : 'No new doors needed: the neighbouring rooms are already joined.');
  }

  /** After tagging rooms: doors and decoration, as the room tool's options say. */
  tagged(map, level, tagIds) {
    if (this.opts.autoDecorate) return this.decorateIn(map, level, tagIds);
    if (!this.opts.autoDoors) return 0;
    const blockers = this.addDoorsIn(map, level, tagIds, { redecorating: false });
    return blockers.length ? this.decorateIn(map, level, blockers, { doors: false }) : 0;
  }

  /**
   * Replace this level with a generated layout: rooms, corridors, room types, doors and
   * decoration. The map grows if it is too small for the rooms asked for.
   */
  generateLevel({ styleId, count = 8, seed = newSeed(), combat = false }) {
    const style = (this.setting?.generator || []).find((g) => g.id === styleId);
    if (!style) return;
    let grew = false;
    this.commit('Generate layout', (map, level) => {
      const side = Math.ceil(Math.sqrt(count * (style.layout === 'building' ? 40 : 75) * 4 / 3));
      const size = { w: Math.max(map.size.w, side), h: Math.max(map.size.h, Math.round((side * 3) / 4)) };
      if (style.layout === 'ship') size.w = Math.max(size.w, 14 + Math.ceil((count - 2) / 2) * 6);
      grew = size.w !== map.size.w || size.h !== map.size.h;
      map.size = size;
      const out = generateLayout({ style, map, count, seed, doorType: this.setting?.doors?.type });
      if (combat) for (const r of out.rooms) if (r.type !== style.corridor?.type) r.combat = true;
      Object.assign(level, { shapes: out.shapes, walls: [], doors: out.doors, edges: [], rooms: out.rooms, wallStyles: [], placements: [] });
      this.decorateIn(map, level, level.rooms.map((r) => r.id), { doors: true });
    });
    this.generatedRev = this.rev;
    if (grew) this.fitView();
    const rooms = this.level.rooms.filter((r) => r.type !== style.corridor?.type).length;
    this.status(`Generated ${rooms} room${rooms === 1 ? '' : 's'}${grew ? ' (the map was enlarged to fit)' : ''}. Generate again for another layout; Undo goes back.`);
  }

  decorate(tagIds, { reroll = false } = {}) {
    let placed = 0;
    this.commit(reroll ? 'Reroll' : 'Decorate', (map, level) => {
      placed = this.decorateIn(map, level, tagIds, { reroll });
    });
    this.status(`Placed ${placed} asset${placed === 1 ? '' : 's'}.`);
  }

  /** Remove the automatic pieces from rooms, keeping hand-placed ones. */
  clearDecoration(tagIds) {
    this.commit('Clear decoration', (map, level) => {
      const geo = computeLevelGeometry(level, map);
      const indexes = new Set(tagIds.map((id) => geo.rooms.tagRegion.get(id)));
      level.placements = level.placements.filter((p) => !(p.auto && (tagIds.includes(p.room) || indexes.has(regionAt(geo.rooms, [p.x, p.y])))));
    });
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.map));
    this.restore(this.undoStack.pop(), 'Undo');
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.map));
    this.restore(this.redoStack.pop(), 'Redo');
  }

  restore(json, label) {
    this.tool?.cancel?.(this);
    this.map = JSON.parse(json);
    this.levelIndex = Math.min(this.levelIndex, this.map.levels.length - 1);
    this.selection = null;
    this.dirty = true;
    this.rev++;
    this.changed(label);
  }

  changed(label) {
    this.levelIndex = Math.max(0, Math.min(this.levelIndex, this.map.levels.length - 1));
    this.requestRender();
    this.onChange(label);
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ fileName: this.fileName, map: this.map }));
      } catch {
        // Storage full or blocked: autosave is only a safety net.
      }
    }, 800);
  }

  recoverAutosave() {
    try {
      const saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null');
      if (!saved) return false;
      this.setMap(loadMap(saved.map), saved.fileName);
      this.dirty = true;
      return true;
    } catch {
      return false;
    }
  }

  serialize() {
    return saveMap(this.map);
  }

  // ---- options, tools, status ------------------------------------------

  setOpt(key, value, refreshPanel = true) {
    this.opts[key] = value;
    if (refreshPanel) this.onChange('options');
    this.requestRender();
  }

  setTool(tool) {
    if (typeof tool === 'string') tool = this.tools.find((t) => t.id === tool);
    if (!tool || tool === this.tool) return;
    this.tool?.cancel?.(this);
    this.tool = tool;
    this.hoverItem = null;
    this.hoverRegion = -1;
    this.canvas.dataset.tool = tool.id;
    this.onChange('tool');
    this.requestRender();
  }

  status(message) {
    this.statusMessage = message;
    this.onChange('status');
  }

  roomColor(typeId) {
    const types = this.setting?.roomTypes || [];
    const i = Math.max(0, types.findIndex((t) => t.id === typeId));
    return `hsl(${(i * 137.5) % 360} 70% 55%)`;
  }

  roomTypeName(typeId) {
    return this.setting?.roomTypes.find((t) => t.id === typeId)?.name || `${typeId} (not in this setting)`;
  }

  select(sel) {
    this.selection = sel;
    this.onChange('selection');
    this.requestRender();
  }

  // ---- items: hit test, move, delete -------------------------------------

  hitTest(p) {
    const level = this.level;
    const tol = Math.max(0.2, this.reach / this.view.scale);
    for (let i = level.doors.length - 1; i >= 0; i--) {
      const d = level.doors[i];
      if (distToSegment(p, d.a, d.b) < tol) return { kind: 'door', id: d.id, item: d };
    }
    const layerOrder = { overhead: 0, object: 1, floor: 2 };
    const placed = level.placements
      .map((pl, i) => ({ pl, i, r: this.assets.resolve(pl) }))
      .filter((x) => x.r)
      .sort((a, b) => layerOrder[a.r.meta.layer] - layerOrder[b.r.meta.layer] || b.i - a.i);
    for (const { pl, r } of placed) {
      if (placementContains(pl, r.footprint, p)) return { kind: 'placement', id: pl.id, item: pl };
    }
    for (const { link } of linksOnLevel(this.map, level).reverse()) {
      if (linkContains(link, p)) return { kind: 'link', id: link.id, item: link };
    }
    for (let i = level.walls.length - 1; i >= 0; i--) {
      const w = level.walls[i];
      if (polylineSegments(wallPolyline(w)).some(([a, b]) => distToSegment(p, a, b) < tol)) return { kind: 'wall', id: w.id, item: w };
    }
    for (let i = level.shapes.length - 1; i >= 0; i--) {
      const s = level.shapes[i];
      const rings = cachedShapeRings(s);
      if (!rings.length) continue;
      if (pointInRings(p, rings) || distToRings(p, rings) < tol) return { kind: 'shape', id: s.id, item: s };
    }
    return null;
  }

  findItem(level, hit) {
    const list = { door: level.doors, wall: level.walls, shape: level.shapes, link: this.map.links, placement: level.placements }[hit.kind];
    return list?.find((x) => x.id === hit.id);
  }

  moveItem(hit, dx, dy) {
    this.commit('Move', (map, level) => {
      if (hit.kind === 'shape') {
        const index = level.shapes.findIndex((s) => s.id === hit.id);
        if (index < 0) return;
        const rings = cachedShapeRings(level.shapes[index]);
        level.shapes[index] = translateShape(level.shapes[index], dx, dy);
        // Room tags and doors belonging to the shape travel with it.
        for (const t of [...level.rooms, ...(level.wallStyles || [])]) {
          if (pointInRings(t.at, rings)) t.at = [t.at[0] + dx, t.at[1] + dy];
        }
        for (const pl of level.placements) {
          if (pointInRings([pl.x, pl.y], rings)) {
            pl.x += dx;
            pl.y += dy;
          }
        }
        for (const d of level.doors) {
          const mid = scale(add(d.a, d.b), 0.5);
          if (distToRings(mid, rings) < 0.08) {
            d.a = [d.a[0] + dx, d.a[1] + dy];
            d.b = [d.b[0] + dx, d.b[1] + dy];
          }
        }
      } else if (hit.kind === 'placement') {
        const pl = level.placements.find((x) => x.id === hit.id);
        if (pl) {
          pl.x += dx;
          pl.y += dy;
          pl.auto = false;
        }
      } else if (hit.kind === 'link') {
        const k = map.links.find((x) => x.id === hit.id);
        if (k) {
          k.x += dx;
          k.y += dy;
        }
      } else if (hit.kind === 'wall') {
        const w = level.walls.find((x) => x.id === hit.id);
        if (!w) return;
        if (w.kind === 'line') {
          w.a = [w.a[0] + dx, w.a[1] + dy];
          w.b = [w.b[0] + dx, w.b[1] + dy];
        } else {
          w.c = [w.c[0] + dx, w.c[1] + dy];
        }
      }
    });
    if (this.selection?.at) this.selection.at = [this.selection.at[0] + dx, this.selection.at[1] + dy];
  }

  deleteItem(hit) {
    const key = { door: 'doors', wall: 'walls', shape: 'shapes', link: 'links', placement: 'placements' }[hit.kind];
    if (!key) return;
    this.commit('Delete', (map, level) => {
      const owner = key === 'links' ? map : level;
      owner[key] = owner[key].filter((x) => x.id !== hit.id);
    });
    if (this.selection?.id === hit.id) this.select(null);
  }

  /** Rotate the selected asset by `by` degrees. Quarter turns stay on the grid. */
  rotateSelection(by) {
    if (this.selection?.kind !== 'placement') return;
    const pl = this.level.placements.find((x) => x.id === this.selection.id);
    if (pl) this.setRotation(pl.id, pl.rot + by);
  }

  /** Set an asset's angle (degrees, any value; the UI uses 15 degree steps). */
  setRotation(id, deg) {
    this.commit('Rotate', (map, level) => {
      const pl = level.placements.find((x) => x.id === id);
      const r = pl && this.assets.resolve(pl);
      if (!r) return;
      pl.rot = Math.round(((deg % 360) + 360) % 360 * 100) / 100;
      if (pl.rot % 90 === 0) [pl.x, pl.y] = snapCentre([pl.x, pl.y], r.footprint, pl.rot);
      pl.auto = false;
    });
  }

  /** Copy the selected asset one square down and right, and select the copy. */
  duplicateSelection() {
    if (this.selection?.kind !== 'placement') return;
    const copy = { ...this.level.placements.find((x) => x.id === this.selection.id), id: newId('a'), auto: false };
    copy.x += 1;
    copy.y += 1;
    this.commit('Duplicate', (map, level) => level.placements.push(copy));
    this.select({ kind: 'placement', id: copy.id, item: copy });
  }

  /** Where the rotation handle of a selected asset sits, or null. */
  rotationHandle() {
    if (this.selection?.kind !== 'placement') return null;
    const pl = this.level.placements.find((x) => x.id === this.selection.id);
    const r = pl && this.assets.resolve(pl);
    if (!r) return null;
    const a = (pl.rot * Math.PI) / 180;
    const d = r.footprint.h / 2 + 18 / this.view.scale;
    return { pl, point: [pl.x + Math.sin(a) * d, pl.y - Math.cos(a) * d] };
  }

  /** Change a generator asset's size, keeping its top-left corner where it was. */
  resizePlacement(id, params) {
    this.commit('Resize asset', (map, level) => {
      const pl = level.placements.find((x) => x.id === id);
      const before = pl && this.assets.resolve(pl);
      if (!before) return;
      const f0 = rotatedFootprint(before.footprint, pl.rot);
      const corner = [pl.x - f0.w / 2, pl.y - f0.h / 2];
      pl.params = params;
      const f1 = rotatedFootprint(this.assets.resolve(pl).footprint, pl.rot);
      pl.x = corner[0] + f1.w / 2;
      pl.y = corner[1] + f1.h / 2;
      pl.auto = false;
    });
  }

  deleteSelection() {
    if (this.selection) this.deleteItem(this.selection);
  }

  // ---- view --------------------------------------------------------------

  fitView() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !this.map) return;
    const { w, h } = this.map.size;
    const s = Math.max(4, Math.min(120, Math.min((rect.width - 60) / w, (rect.height - 60) / h)));
    this.view = { scale: s, ox: (rect.width - w * s) / 2, oy: (rect.height - h * s) / 2 };
    this.requestRender();
  }

  zoomAt(sx, sy, factor) {
    const v = this.view;
    const s = Math.max(4, Math.min(240, v.scale * factor));
    const wx = (sx - v.ox) / v.scale;
    const wy = (sy - v.oy) / v.scale;
    this.view = { scale: s, ox: sx - wx * s, oy: sy - wy * s };
    this.onChange('view');
    this.requestRender();
  }

  toWorld(sx, sy) {
    return [(sx - this.view.ox) / this.view.scale, (sy - this.view.oy) / this.view.scale];
  }

  // ---- input -------------------------------------------------------------

  makeEvent(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    const world = this.toWorld(sx, sy);
    const step = e.shiftKey || this.snapMode === 'half' ? 0.5 : 1;
    const free = e.ctrlKey || e.metaKey || this.snapMode === 'free';
    return {
      screen: [sx, sy],
      world,
      touch: e.pointerType === 'touch',
      point: free ? world : snapPoint(world, step),
      button: e.button ?? 0,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: free,
    };
  }

  bindInput() {
    const c = this.canvas;
    let pan = null;
    this.spaceDown = false;
    // Touch: one finger uses the tool, two fingers pan and pinch-zoom. A first touch waits a
    // moment so a second finger can turn it into a gesture before anything gets drawn.
    const touches = new Map();
    let pending = null; // first touch not yet handed to the tool
    let gesture = null; // two-finger pan / zoom
    let toolActive = false; // the tool has seen a pointerdown
    let ignoreUntilClear = false; // after a gesture, ignore fingers until all are lifted

    const startTool = (e) => {
      toolActive = true;
      this.tool.down?.(this, this.makeEvent(e));
      this.requestRender();
    };
    const flushPending = () => {
      if (!pending) return;
      clearTimeout(pending.timer);
      const e = pending.e;
      pending = null;
      startTool(e);
    };
    const gestureState = () => {
      const [a, b] = [...touches.values()];
      return { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2], d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    };

    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointerType = e.pointerType;
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (ignoreUntilClear) return;
        if (touches.size === 2 && !toolActive) {
          if (pending) clearTimeout(pending.timer);
          pending = null;
          const g = gestureState();
          gesture = { ...g, view: { ...this.view } };
          return;
        }
        if (touches.size === 1) {
          const snapshot = { clientX: e.clientX, clientY: e.clientY, button: 0, pointerType: 'touch', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false };
          pending = { e: snapshot, x: e.clientX, y: e.clientY, timer: setTimeout(flushPending, 120) };
        }
        return;
      }
      if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
        pan = { x: e.clientX, y: e.clientY, ox: this.view.ox, oy: this.view.oy };
        c.classList.add('panning');
        return;
      }
      startTool(e);
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (gesture && touches.size >= 2) {
          const g = gestureState();
          const r = c.getBoundingClientRect();
          const v = gesture.view;
          const s = Math.max(4, Math.min(240, v.scale * (g.d / gesture.d)));
          // Keep the world point under the starting midpoint under the fingers' midpoint.
          const wx = (gesture.mid[0] - r.left - v.ox) / v.scale;
          const wy = (gesture.mid[1] - r.top - v.oy) / v.scale;
          this.view = { scale: s, ox: g.mid[0] - r.left - wx * s, oy: g.mid[1] - r.top - wy * s };
          this.onChange('view');
          this.requestRender();
          return;
        }
        if (ignoreUntilClear) return;
        if (pending && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 8) flushPending();
        if (pending) return;
      }
      if (pan) {
        this.view.ox = pan.ox + e.clientX - pan.x;
        this.view.oy = pan.oy + e.clientY - pan.y;
        this.requestRender();
        return;
      }
      const ev = this.makeEvent(e);
      this.cursor = ev.world;
      this.tool.move?.(this, ev);
      this.onChange('cursor');
    });
    const end = (e) => {
      if (e.pointerType === 'touch') {
        touches.delete(e.pointerId);
        if (gesture) {
          gesture = null;
          ignoreUntilClear = touches.size > 0;
          return;
        }
        if (ignoreUntilClear) {
          if (!touches.size) ignoreUntilClear = false;
          return;
        }
        if (pending) {
          // A quick tap: hand the tool a press and a release in the same spot.
          flushPending();
        }
        if (!toolActive) return;
      }
      if (pan) {
        pan = null;
        c.classList.remove('panning');
        return;
      }
      if (e.type === 'pointercancel') {
        toolActive = false;
        this.tool.cancel?.(this);
        this.requestRender();
        return;
      }
      toolActive = false;
      this.tool.up?.(this, this.makeEvent(e));
      this.requestRender();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('dblclick', (e) => this.tool.dblclick?.(this, this.makeEvent(e)));
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      this.hoverItem = null;
      this.hoverRegion = -1;
      this.requestRender();
    });
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const r = c.getBoundingClientRect();
        this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
      },
      { passive: false },
    );
    new ResizeObserver(() => this.requestRender()).observe(c);
  }

  /** Screen pixels a tap may miss by: bigger for fingers than for a mouse. */
  get reach() {
    return this.pointerType === 'touch' ? 22 : 9;
  }

  /** Keyboard shortcuts. Returns true when handled. */
  handleKey(e) {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return false;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === ' ') {
      this.spaceDown = e.type === 'keydown';
      this.canvas.classList.toggle('pan-ready', this.spaceDown);
      return true;
    }
    if (e.type !== 'keydown') return false;
    if (ctrl && e.key.toLowerCase() === 'z') return e.shiftKey ? this.redo() : this.undo(), true;
    if (ctrl && e.key.toLowerCase() === 'y') return this.redo(), true;
    if (ctrl) return false;
    if (this.tool.onKey?.(this, e)) return true;
    if (e.key === 'Escape') {
      this.tool.cancel?.(this);
      this.select(null);
      return true;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') return this.deleteSelection(), true;
    if (e.key === ']') return this.rotateSelection(90), true;
    if (e.key === '[') return this.rotateSelection(-90), true;
    if (e.key === '}') return this.rotateSelection(15), true;
    if (e.key === '{') return this.rotateSelection(-15), true;
    if (e.key.toLowerCase() === 'd' && e.shiftKey) return this.duplicateSelection(), true;
    if (e.key === 'f') return this.fitView(), true;
    if (e.key === 'PageUp') return this.setLevel(this.levelIndex + 1), true;
    if (e.key === 'PageDown') return this.setLevel(this.levelIndex - 1), true;
    if (e.key === '+' || e.key === '=') return this.zoomAt(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2, 1.25), true;
    if (e.key === '-') return this.zoomAt(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2, 0.8), true;
    const tool = this.tools.find((t) => t.key === e.key.toLowerCase());
    if (tool) return this.setTool(tool), true;
    return false;
  }

  // ---- drawing -----------------------------------------------------------

  requestRender() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  render() {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(c).getPropertyValue('--stage-bg') || '#2b2d31';
    ctx.fillRect(0, 0, w, h);

    const { scale: s, ox, oy } = this.view;
    const world = () => ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    world();
    const geo = this.geometry();
    const style = this.style;
    const below = this.levelBelow;
    drawLevel(ctx, {
      map: this.map,
      level: this.level,
      geo,
      style,
      links: linksOnLevel(this.map, this.level),
      below: below && { level: below, geo: this.geometry(below), links: linksOnLevel(this.map, below) },
      openMode: 'faded',
      assets: this.assets,
      pxPerSquare: s,
    });
    if (below && this.showBelow) this.drawGhost(ctx, below);

    // Map border.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1 / s;
    ctx.strokeRect(0, 0, this.map.size.w, this.map.size.h);

    this.drawRoomOverlays(ctx, geo, style);
    if (this.showTactical) this.drawTactical(ctx);
    if (this.hoverItem && this.hoverItem.id !== this.selection?.id) this.drawItemOutline(ctx, this.hoverItem, 0, 0, 'rgba(42,157,244,0.6)');
    if (this.selection) this.drawItemOutline(ctx, this.selection, 0, 0, '#ff9f1c');
    const handle = this.tool.id === 'select' && this.rotationHandle();
    if (handle) {
      ctx.save();
      ctx.strokeStyle = '#ff9f1c';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 2 / s;
      ctx.beginPath();
      ctx.moveTo(handle.pl.x, handle.pl.y);
      ctx.lineTo(...handle.point);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(handle.point[0], handle.point[1], 6 / s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    this.tool.overlay?.(this, ctx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.showLabels) this.drawRoomLabels(ctx, geo);
    if (this.showTactical) this.drawTacticalLegend(ctx);
  }

  // The level below as faint outlines, for lining things up.
  drawGhost(ctx, below) {
    const geo = this.geometry(below);
    const paths = levelPaths(geo, this.style, this.map);
    const s = this.view.scale;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#e05cc8';
    ctx.lineWidth = 1.5 / s;
    ctx.setLineDash([5 / s, 3 / s]);
    ctx.stroke(paths.walls);
    ctx.stroke(paths.edgeWalls);
    ctx.stroke(paths.railings);
    for (const { link } of linksOnLevel(this.map, below)) ctx.strokeRect(link.x, link.y, link.w, link.h);
    ctx.restore();
  }

  regionPath(geo, index) {
    geo.cache.regionPaths ??= new Map();
    let path = geo.cache.regionPaths.get(index);
    if (path) return path;
    path = new Path2D();
    const { grid, labels, regions } = geo.rooms;
    const r = regions[index];
    for (let j = r.minJ; j <= r.maxJ; j++) {
      let run = -1;
      for (let i = r.minI; i <= r.maxI + 1; i++) {
        const inside = i <= r.maxI && labels[j * grid.nx + i] === index;
        if (inside && run < 0) run = i;
        if (!inside && run >= 0) {
          path.rect(sampleX(run) - STEP / 2, sampleY(j) - STEP / 2, (i - run) * STEP, STEP);
          run = -1;
        }
      }
    }
    geo.cache.regionPaths.set(index, path);
    return path;
  }

  drawRoomOverlays(ctx, geo, style) {
    const paths = levelPaths(geo, style, this.map);
    const showTypes = this.tool.id === 'room';
    ctx.save();
    ctx.clip(paths.floor, 'evenodd');
    if (showTypes) {
      for (const r of geo.rooms.regions) {
        if (!r.tag) continue;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = this.roomColor(r.tag.type);
        ctx.fill(this.regionPath(geo, r.index));
      }
    }
    const selRegion = this.selection?.at ? regionAt(geo.rooms, this.selection.at) : -1;
    for (const [index, alpha] of [[this.hoverRegion, 0.14], [selRegion, 0.12]]) {
      if (index < 0 || !geo.rooms.regions[index]) continue;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = index === selRegion ? '#ff9f1c' : '#2a9df4';
      ctx.fill(this.regionPath(geo, index));
    }
    ctx.restore();
  }

  /** Cover and difficult terrain, square by square: what a combat looks like on this map. */
  drawTactical(ctx) {
    const s = this.view.scale;
    ctx.save();
    for (const p of this.level.placements) {
      const r = this.assets.resolve(p);
      if (!r) continue;
      const fill = TACTICAL[r.meta.tags?.includes('difficult terrain') ? 'difficult' : r.meta.blocksMovement ? r.meta.cover : 'none'];
      if (!fill) continue;
      const f = rotatedFootprint(r.footprint, p.rot || 0);
      const x0 = Math.round(p.x - f.w / 2);
      const y0 = Math.round(p.y - f.h / 2);
      ctx.fillStyle = fill.color;
      ctx.fillRect(x0, y0, f.w, f.h);
      ctx.strokeStyle = fill.edge;
      ctx.lineWidth = 2 / s;
      ctx.strokeRect(x0 + 1 / s, y0 + 1 / s, f.w - 2 / s, f.h - 2 / s);
      if (fill.mark && s >= 18) {
        ctx.fillStyle = fill.edge;
        ctx.font = `bold ${Math.min(0.45, f.h * 0.45)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(fill.mark, p.x, p.y);
      }
    }
    ctx.restore();
  }

  drawTacticalLegend(ctx) {
    const rows = Object.values(TACTICAL);
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const x = 12;
    let y = this.canvas.clientHeight - 14 - rows.length * 18;
    ctx.fillStyle = 'rgba(31,33,37,0.9)';
    ctx.beginPath();
    ctx.roundRect(x - 6, y - 12, 190, rows.length * 18 + 8, 8);
    ctx.fill();
    for (const r of rows) {
      ctx.fillStyle = r.edge;
      ctx.fillRect(x, y - 6, 12, 12);
      ctx.fillStyle = '#fff';
      ctx.fillText(r.name, x + 20, y);
      y += 18;
    }
    ctx.restore();
  }

  /** Numbered rooms of the whole map, as the GM export shows them. */
  roomKey() {
    return roomKey(this.map, { geometry: (lv) => this.geometry(lv), typeName: (id) => this.roomTypeName(id) });
  }

  drawRoomLabels(ctx, geo) {
    const { scale: s, ox, oy } = this.view;
    const numbers = new Map(this.roomKey().map((e) => [e.tag.id, e.n]));
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const r of geo.rooms.regions) {
      if (!r.tag) continue;
      const n = numbers.get(r.tag.id);
      const text = (n ? `${n} · ` : '') + (r.tag.name?.trim() || this.roomTypeName(r.tag.type));
      const x = ox + r.labelAt[0] * s;
      const y = oy + r.labelAt[1] * s;
      const w = ctx.measureText(text).width + 26;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#1f2125';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - 10, w, 20, 10);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.roomColor(r.tag.type);
      ctx.beginPath();
      ctx.arc(x - w / 2 + 9, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x + 6, y + 0.5);
    }
    ctx.restore();
  }

  drawItemOutline(ctx, hit, dx, dy, color, rotOverride = null) {
    const item = this.findItem(this.level, hit);
    if (!item) return;
    const s = this.view.scale;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 / s;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (hit.kind === 'shape') {
      ctx.setLineDash([6 / s, 4 / s]);
      for (const ring of cachedShapeRings(item)) {
        ctx.moveTo(...ring[0]);
        for (const p of ring.slice(1)) ctx.lineTo(...p);
        ctx.closePath();
      }
    } else if (hit.kind === 'wall') {
      const pts = wallPolyline(item);
      ctx.moveTo(...pts[0]);
      for (const p of pts.slice(1)) ctx.lineTo(...p);
      ctx.lineWidth = 6 / s;
    } else if (hit.kind === 'link') {
      ctx.rect(item.x, item.y, item.w, item.h);
    } else if (hit.kind === 'placement') {
      const r = this.assets.resolve(item);
      if (r) {
        ctx.translate(item.x, item.y);
        ctx.rotate(((rotOverride ?? item.rot) * Math.PI) / 180);
        ctx.rect(-r.footprint.w / 2, -r.footprint.h / 2, r.footprint.w, r.footprint.h);
      }
    } else if (hit.kind === 'door') {
      ctx.moveTo(...item.a);
      ctx.lineTo(...item.b);
      ctx.lineWidth = 8 / s;
      ctx.globalAlpha = 0.6;
    }
    ctx.stroke();
    ctx.restore();
  }

  drawLabel(ctx, at, text) {
    const s = this.view.scale;
    ctx.save();
    ctx.translate(at[0], at[1]);
    ctx.scale(1 / s, 1 / s);
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = 'rgba(20,22,26,0.85)';
    ctx.beginPath();
    ctx.roundRect(10, -26, w, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 15, -17);
    ctx.restore();
  }

  drawDimensions(ctx, r) {
    this.drawLabel(ctx, [r.x + r.w, r.y + r.h], `${r.w} × ${r.h}`);
  }
}
