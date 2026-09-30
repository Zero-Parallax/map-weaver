// Asset library in the browser: the list from the server, SVG text, and ready-to-draw images
// recoloured to the map's palette. Generator assets can be remade at other sizes.

import { runGenerator } from './generators.js';
import { assetSvg, recolour } from './svg.js';
import { suitsRoom } from './meta.js';

export class AssetLibrary {
  constructor() {
    this.assets = new Map(); // id -> {path, meta}
    this.invalid = [];
    this.texts = new Map(); // key -> svg text (promise)
    this.images = new Map(); // key|palette -> {img, ready}
    this.onImageReady = () => {};
    this.version = Date.now(); // cache-buster for re-saved PNGs
  }

  entry(id) {
    return this.assets.get(id) || null;
  }

  /** Imported PNG art (not recoloured; can be re-tagged). */
  isImported(id) {
    return /^assets\/imported\/.+\.png$/i.test(this.assets.get(id)?.path || '');
  }

  /** Drop cached text and images for an asset (after it was re-saved). */
  forget(id) {
    this.version = Date.now();
    for (const k of [...this.texts.keys()]) if (k === id || k.startsWith(id + ':')) this.texts.delete(k);
    for (const k of [...this.images.keys()]) if (k.split('|')[0] === id || k.startsWith(id + ':')) this.images.delete(k);
  }

  async load() {
    const res = await fetch('/api/assets');
    if (!res.ok) throw new Error('Could not list assets');
    this.assets.clear();
    this.invalid = [];
    for (const entry of await res.json()) {
      if (!entry.meta || entry.errors?.length) this.invalid.push(entry);
      else this.assets.set(entry.meta.id, entry);
    }
  }

  get(id) {
    return this.assets.get(id)?.meta || null;
  }

  forSetting(settingId, roomType = null) {
    return [...this.assets.values()]
      .map((a) => a.meta)
      .filter((m) => m.settings.includes(settingId) && (!roomType || suitsRoom(m, roomType)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Footprint and cache key for a placement (generator assets may carry their own params). */
  resolve(placement) {
    const meta = this.get(placement.asset);
    if (!meta) return null;
    if (meta.generator && placement.params) {
      const params = { ...meta.generator.params, ...placement.params };
      const key = `${meta.id}:${JSON.stringify(params)}`;
      let cached = this.texts.get(key);
      if (!cached) {
        const out = runGenerator(meta.generator.id, params);
        const text = assetSvg({ ...meta, footprint: out.footprint, generator: { ...meta.generator, params } }, out.drawing);
        cached = { footprint: out.footprint, text: Promise.resolve(text) };
        this.texts.set(key, cached);
      }
      return { meta, footprint: cached.footprint, key };
    }
    return { meta, footprint: meta.footprint, key: meta.id };
  }

  svgText(key, meta) {
    let cached = this.texts.get(key);
    if (!cached) {
      const entry = this.assets.get(meta.id);
      cached = { footprint: meta.footprint, text: fetch(entry.path).then((r) => r.text()) };
      this.texts.set(key, cached);
    }
    return cached.text;
  }

  /** Image for a placement in the given palette, or null while it loads. */
  image(placement, tokens) {
    const r = this.resolve(placement);
    if (!r) return null;
    const key = `${r.key}|${tokens.ink}|${tokens.paper}`;
    let entry = this.images.get(key);
    if (!entry && this.isImported(r.meta.id)) {
      // PNG art is drawn as it is.
      entry = { img: new Image(), ready: false };
      this.images.set(key, entry);
      entry.url = `/${this.assets.get(r.meta.id).path}?v=${this.version}`;
      entry.promise = new Promise((resolve) => {
        entry.img.onload = () => {
          entry.ready = true;
          resolve();
          this.onImageReady();
        };
        entry.img.onerror = () => resolve();
        entry.img.src = entry.url;
      });
    }
    if (!entry) {
      entry = { img: new Image(), ready: false };
      this.images.set(key, entry);
      entry.promise = this.svgText(r.key, r.meta).then(
        (text) =>
          new Promise((resolve) => {
            const url = URL.createObjectURL(new Blob([recolour(text, tokens)], { type: 'image/svg+xml' }));
            entry.img.onload = () => {
              entry.ready = true;
              resolve();
              this.onImageReady();
            };
            entry.img.onerror = () => resolve();
            entry.img.src = url;
            entry.url = url;
          }),
      );
    }
    return entry.ready ? { img: entry.img, footprint: r.footprint, meta: r.meta } : null;
  }

  /** Wait until every placement's image is ready (for export). */
  async ready(placements, tokens) {
    for (const p of placements) this.image(p, tokens);
    await Promise.all([...this.images.values()].map((e) => e.promise));
  }

  /** Object URL for a thumbnail. */
  async thumbnail(meta, tokens) {
    this.image({ asset: meta.id }, tokens);
    const key = `${meta.id}|${tokens.ink}|${tokens.paper}`;
    await this.images.get(key).promise;
    return this.images.get(key).url;
  }
}

/** Footprint of a placement after rotation (90 and 270 swap width and height). */
export function rotatedFootprint(footprint, rot) {
  const quarter = Math.round((((rot % 360) + 360) % 360) / 90) % 2 === 1;
  return quarter ? { w: footprint.h, h: footprint.w } : footprint;
}

/** Point p in a placement's own (unrotated, centred) coordinates. */
export function toPlacementSpace(placement, p) {
  const a = (-placement.rot * Math.PI) / 180;
  const dx = p[0] - placement.x;
  const dy = p[1] - placement.y;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}

export function placementContains(placement, footprint, p) {
  const [x, y] = toPlacementSpace(placement, p);
  return Math.abs(x) <= footprint.w / 2 && Math.abs(y) <= footprint.h / 2;
}

/** Centre that keeps a footprint on the grid when its top-left snaps to a square corner. */
export function snapCentre(p, footprint, rot) {
  const f = rotatedFootprint(footprint, rot);
  const x = Math.round(p[0] - f.w / 2) + f.w / 2;
  const y = Math.round(p[1] - f.h / 2) + f.h / 2;
  return [x, y];
}
