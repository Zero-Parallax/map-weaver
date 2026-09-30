// Editor state, undo history, input handling and drawing of editor overlays.

import { createMap, loadMap, saveMap } from '../core/model.js';
import { computeLevelGeometry, cachedShapeRings, wallPolyline } from '../core/level-geometry.js';
import { translateShape } from '../core/shapes.js';
import { regionAt, sampleX, sampleY, STEP } from '../core/rooms.js';
import { pointInRings, distToRings, distToSegment, snapPoint, polylineSegments, add, scale } from '../core/geom.js';
import { drawLevel, levelPaths } from '../render/renderer.js';
import { linksOnLevel, linkContains } from '../core/links.js';
import { placementContains, snapCentre, rotatedFootprint } from '../assets/library.js';
import { decorateRoom } from '../decorator/decorate.js';
import { newId } from '../core/model.js';
import { resolveStyle } from '../render/style.js';

const HISTORY_LIMIT = 200;
const AUTOSAVE_KEY = 'map-weaver.autosave';

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
      autoDecorate: true,
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
    // Assets whose centre is no longer on the floor go too.
    level.placements = level.placements.filter((p) => regionAt(geo.rooms, [p.x, p.y]) >= 0);
  }

  /**
   * Decorate rooms on a level in place (call inside commit). Replaces each room's automatic
   * pieces and keeps the ones placed by hand. reroll: bump the room's reroll count first.
   */
  decorateIn(map, level, tagIds, { reroll = false } = {}) {
    const geo = computeLevelGeometry(level, map);
    const metas = this.assets.forSetting(map.setting);
    const links = linksOnLevel(map, level);
    let placed = 0;
    for (const id of tagIds) {
      const tag = level.rooms.find((r) => r.id === id);
      const index = geo.rooms.tagRegion.get(id);
      if (!tag || index == null) continue;
      if (reroll) tag.reroll = (tag.reroll || 0) + 1;
      const inRoom = (p) => p.room === id || regionAt(geo.rooms, [p.x, p.y]) === index;
      level.placements = level.placements.filter((p) => !(p.auto && inRoom(p)));
      const existing = [];
      for (const p of level.placements) {
        const r = inRoom(p) && this.assets.resolve(p);
        if (!r) continue;
        const f = rotatedFootprint(r.footprint, p.rot);
        existing.push({ meta: r.meta, footprint: f, x: Math.round(p.x - f.w / 2), y: Math.round(p.y - f.h / 2) });
      }
      const out = decorateRoom({
        geo, region: geo.rooms.regions[index], tag, assets: metas, doors: level.doors, links, existing, mapSeed: map.seed,
      });
      for (const p of out.placements) level.placements.push({ id: newId('a'), ...p });
      placed += out.placements.length;
    }
    return placed;
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
    const tol = Math.max(0.2, 8 / this.view.scale);
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
        for (const t of level.rooms) {
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

  /** Rotate the selected asset by a multiple of 90 degrees, keeping it on the grid. */
  rotateSelection(by) {
    if (this.selection?.kind !== 'placement') return;
    this.commit('Rotate', (map, level) => {
      const pl = level.placements.find((x) => x.id === this.selection.id);
      const r = pl && this.assets.resolve(pl);
      if (!r) return;
      pl.rot = (((pl.rot + by) % 360) + 360) % 360;
      [pl.x, pl.y] = snapCentre([pl.x, pl.y], r.footprint, pl.rot);
      pl.auto = false;
    });
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
    const step = e.shiftKey ? 0.5 : 1;
    return {
      screen: [sx, sy],
      world,
      point: e.ctrlKey || e.metaKey ? world : snapPoint(world, step),
      button: e.button ?? 0,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
    };
  }

  bindInput() {
    const c = this.canvas;
    let pan = null;
    this.spaceDown = false;

    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
        pan = { x: e.clientX, y: e.clientY, ox: this.view.ox, oy: this.view.oy };
        c.classList.add('panning');
        return;
      }
      this.tool.down?.(this, this.makeEvent(e));
      this.requestRender();
    });
    c.addEventListener('pointermove', (e) => {
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
    c.addEventListener('pointerup', (e) => {
      if (pan) {
        pan = null;
        c.classList.remove('panning');
        return;
      }
      this.tool.up?.(this, this.makeEvent(e));
      this.requestRender();
    });
    c.addEventListener('dblclick', (e) => this.tool.dblclick?.(this, this.makeEvent(e)));
    c.addEventListener('pointerleave', () => {
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
    if (this.hoverItem && this.hoverItem.id !== this.selection?.id) this.drawItemOutline(ctx, this.hoverItem, 0, 0, 'rgba(42,157,244,0.6)');
    if (this.selection) this.drawItemOutline(ctx, this.selection, 0, 0, '#ff9f1c');
    this.tool.overlay?.(this, ctx);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.showLabels) this.drawRoomLabels(ctx, geo);
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

  drawRoomLabels(ctx, geo) {
    const { scale: s, ox, oy } = this.view;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const r of geo.rooms.regions) {
      if (!r.tag) continue;
      const text = this.roomTypeName(r.tag.type);
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

  drawItemOutline(ctx, hit, dx, dy, color) {
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
        ctx.rotate((item.rot * Math.PI) / 180);
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
