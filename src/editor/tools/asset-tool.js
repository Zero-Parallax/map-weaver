// Asset library panel and stamping assets onto the map by hand.

import { el, field, select } from '../dom.js';
import { newId } from '../../core/model.js';
import { snapCentre, rotatedFootprint } from '../../assets/library.js';
import { GENERATORS } from '../../assets/generators.js';
import { openImportDialog } from '../import-dialog.js';

const PLACEMENT_NAMES = { wall: 'against wall', corner: 'corner', centre: 'centre', door: 'near door', balcony: 'balcony edge', free: 'anywhere' };

/** Number inputs for a generator asset's size parameters. */
export function sizeFields(meta, params, onChange) {
  if (!meta.generator) return null;
  const ranges = meta.generator.sizes || GENERATORS[meta.generator.id]?.params || {};
  const current = { ...meta.generator.params, ...params };
  const keys = Object.keys(ranges);
  if (!keys.length) return null;
  return el(
    'div',
    { class: 'row' },
    keys.map((k) =>
      field(k === 'len' ? 'Length' : k === 'w' ? 'Width' : k === 'h' ? 'Depth' : k, el('input', {
        type: 'number', min: ranges[k][0], max: ranges[k][1], value: current[k],
        onchange: (e) => {
          const v = Math.max(ranges[k][0], Math.min(ranges[k][1], Math.round(+e.target.value) || current[k]));
          onChange({ ...params, [k]: v });
        },
      })),
    ),
  );
}

function thumb(app, meta) {
  const img = el('img', { alt: '', style: { background: app.style.tokens.paper } });
  app.assets.thumbnail(meta, app.style.tokens).then((url) => (img.src = url));
  return img;
}

export const assetTool = {
  id: 'asset',
  label: 'Assets',
  key: 'q',
  hint: 'Pick an asset, then click to place it. Right-click or ] turns 90°, [ turns back; Shift+[ ] turn 15°.',
  rot: 0,
  options(app) {
    const o = app.opts;
    const types = app.setting?.roomTypes || [];
    const all = app.assets.forSetting(app.map.setting, o.assetRoom || null);
    const chosen = app.assets.get(o.asset);
    const grid = el('div', { class: 'asset-grid' });
    const search = el('input', {
      type: 'text', placeholder: 'Search…', value: o.assetSearch || '',
      oninput: (e) => {
        o.assetSearch = e.target.value;
        fill();
      },
    });
    function fill() {
      const q = (o.assetSearch || '').toLowerCase();
      grid.replaceChildren(
        ...all
          .filter((m) => !q || m.name.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q)))
          .map((m) =>
            el('button', {
              type: 'button', class: 'asset' + (m.id === o.asset ? ' on' : ''),
              title: `${m.name}: ${m.footprint.w}×${m.footprint.h}, ${PLACEMENT_NAMES[m.placement]}`,
              onclick: () => {
                o.assetParams = null;
                app.setOpt('asset', m.id);
              },
            }, thumb(app, m), el('span', {}, m.name)),
          ),
      );
      if (!grid.children.length) grid.append(el('p', { class: 'hint' }, 'No assets match.'));
    }
    fill();
    const imported = chosen && app.assets.isImported(chosen.id);
    const importArt = (edit) => openImportDialog({
      app, assets: app.assets, catalog: app.catalog, edit,
      onSaved: (ids) => {
        if (ids.length === 1) app.opts.asset = ids[0];
        app.setOpt('assetSearch', app.opts.assetSearch);
      },
    });
    return el(
      'div',
      {},
      el('div', { class: 'actions', style: { marginTop: 0, marginBottom: '8px' } },
        el('button', { type: 'button', onclick: () => importArt(null), title: 'Add your own PNG art to the library' }, 'Import PNG art…')),
      el('div', { class: 'row' },
        search,
        select([{ id: '', name: 'All rooms' }, ...types], o.assetRoom || '', (v) => app.setOpt('assetRoom', v || null))),
      chosen &&
        el('div', { class: 'asset-chosen' },
          el('strong', {}, chosen.name),
          el('small', {}, ` ${PLACEMENT_NAMES[chosen.placement]}${chosen.blocksMovement ? ', blocks movement' : ''}`),
          sizeFields(chosen, o.assetParams || {}, (params) => app.setOpt('assetParams', params)),
          imported && el('div', { class: 'actions' },
            el('button', { type: 'button', onclick: () => importArt({ meta: chosen, path: app.assets.entry(chosen.id).path }) }, 'Edit tags'),
            el('button', { type: 'button', class: 'danger', onclick: async () => {
              if (!confirm(`Delete "${chosen.name}" from the library? Pieces already on maps will disappear.`)) return;
              const file = app.assets.entry(chosen.id).path.split('/').pop();
              await fetch(`/api/assets/imported/${encodeURIComponent(file)}`, { method: 'DELETE' });
              await app.assets.load();
              app.assets.forget(chosen.id);
              app.setOpt('asset', null);
            } }, 'Delete'))),
      grid,
      app.assets.invalid.length > 0 &&
        el('p', { class: 'hint' }, `${app.assets.invalid.length} SVG file(s) in assets/ have no valid metadata and are hidden.`),
    );
  },
  placement(app, world) {
    const meta = app.assets.get(app.opts.asset);
    if (!meta || !world) return null;
    const p = { asset: meta.id, x: 0, y: 0, rot: this.rot };
    if (app.opts.assetParams) p.params = app.opts.assetParams;
    const r = app.assets.resolve(p);
    // Quarter turns snap to squares; angled pieces snap their centre to half squares.
    if (this.rot % 90 === 0) [p.x, p.y] = snapCentre(world, r.footprint, this.rot);
    else [p.x, p.y] = [Math.round(world[0] * 2) / 2, Math.round(world[1] * 2) / 2];
    return p;
  },
  move(app, ev) {
    this.hover = ev.world;
    app.requestRender();
  },
  down(app, ev) {
    if (ev.button === 2) return this.rotate(app, 90);
    if (ev.button !== 0) return;
    const p = this.placement(app, ev.world);
    if (!p) return app.status('Pick an asset in the panel first.');
    app.commit('Place asset', (map, level) => level.placements.push({ id: newId('a'), ...p, auto: false }));
  },
  rotate(app, by) {
    this.rot = (((this.rot + by) % 360) + 360) % 360;
    app.requestRender();
  },
  onKey(app, e) {
    if (e.key === ']') return this.rotate(app, 90), true;
    if (e.key === '[') return this.rotate(app, -90), true;
    if (e.key === '}') return this.rotate(app, 15), true;
    if (e.key === '{') return this.rotate(app, -15), true;
    return false;
  },
  cancel() {
    this.hover = null;
  },
  overlay(app, ctx) {
    const p = this.placement(app, this.hover);
    if (!p) return;
    const hit = app.assets.image(p, app.style.tokens);
    const f = hit?.footprint || app.assets.resolve(p).footprint;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rot * Math.PI) / 180);
    ctx.globalAlpha = 0.7;
    if (hit) ctx.drawImage(hit.img, -f.w / 2, -f.h / 2, f.w, f.h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a9df4';
    ctx.lineWidth = 2 / app.view.scale;
    ctx.strokeRect(-f.w / 2, -f.h / 2, f.w, f.h);
    ctx.restore();
    const rf = rotatedFootprint(f, p.rot);
    app.drawLabel(ctx, [p.x + rf.w / 2, p.y + rf.h / 2], `${rf.w}×${rf.h}${p.rot ? `, ${p.rot}°` : ''}`);
  },
};
