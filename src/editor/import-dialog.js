// Tagging screen for your own PNG art. The tags are written into each PNG, which is saved to
// assets/imported/ and appears in the library like any other asset.

import { el, field, select, checkbox } from './dom.js';
import { PLACEMENTS, LAYERS, SIDES } from '../assets/meta.js';
import { readPngMeta, writePngMeta, pngSize, isPng } from '../assets/png-meta.js';

const PLACEMENT_NAMES = { wall: 'Against a wall', corner: 'In a corner', centre: 'Room centre', door: 'Near a door', balcony: 'Balcony edge', free: 'Anywhere' };
const SIDE_NAMES = { n: 'Top', e: 'Right', s: 'Bottom', w: 'Left' };

const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'asset';
const title = (s) => s.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

/**
 * Open the tagging screen.
 *  edit: {meta, path} to re-tag an imported asset; omit to pick new files.
 */
export function openImportDialog({ app, assets, catalog, edit = null, onSaved }) {
  const settings = [...catalog.settings.values()];
  const items = []; // {bytes, url, meta, size, card}
  const dialog = el('dialog', { class: 'import-dialog' });
  const list = el('div', { class: 'import-list' });
  const status = el('p', { class: 'hint' });
  let sourcePps = 100;

  const guessFootprint = (size) => ({
    w: Math.max(1, Math.round(size.width / sourcePps)),
    h: Math.max(1, Math.round(size.height / sourcePps)),
  });

  function uniqueId(base, self) {
    let id = `user.${base}`;
    let n = 2;
    const taken = (x) => (assets.get(x) && x !== self) || items.some((it) => it.meta.id === x && it.meta !== self);
    while (taken(id)) id = `user.${base}-${n++}`;
    return id;
  }

  function card(item) {
    const m = item.meta;
    const preview = el('div', { class: `import-preview side-${m.placement === 'free' || m.placement === 'centre' ? 'none' : m.wallSide}` }, el('img', { src: item.url, alt: '' }));
    const roomTypes = () => {
      const types = new Map();
      for (const s of settings) if (m.settings.includes(s.id)) for (const t of s.roomTypes) types.set(t.id, t.name);
      return [...types];
    };
    const rooms = el('div', { class: 'import-rooms' });
    const drawRooms = () => {
      const any = m.roomTypes.includes('*');
      rooms.replaceChildren(
        checkbox('Any room', any, (v) => {
          m.roomTypes = v ? ['*'] : [];
          drawRooms();
        }),
        ...(any ? [] : roomTypes().map(([id, name]) => checkbox(name, m.roomTypes.includes(id), (v) => {
          m.roomTypes = v ? [...m.roomTypes, id] : m.roomTypes.filter((x) => x !== id);
        }))),
      );
    };
    drawRooms();
    const num = (label, key, min, sub) => field(label, el('input', {
      type: 'number', min, value: sub ? m[key][sub] : m[key],
      onchange: (e) => {
        const v = Math.max(min, Math.round(+e.target.value) || min);
        if (sub) m[key][sub] = v;
        else m[key] = v;
      },
    }));
    const refreshPreview = () => {
      preview.className = `import-preview side-${m.placement === 'free' || m.placement === 'centre' ? 'none' : m.wallSide}`;
    };
    const body = el('div', { class: 'import-fields' },
      el('div', { class: 'row' },
        field('Name', el('input', { type: 'text', value: m.name, onchange: (e) => (m.name = e.target.value.trim() || m.name) })),
        field('Id', el('input', { type: 'text', value: m.id, disabled: !!edit, onchange: (e) => (m.id = uniqueId(slug(e.target.value), m)) }))),
      field('Settings', el('div', { class: 'import-settings' }, settings.map((s) => checkbox(s.name, m.settings.includes(s.id), (v) => {
        m.settings = v ? [...m.settings, s.id] : m.settings.filter((x) => x !== s.id);
        drawRooms();
      })))),
      el('div', { class: 'row' }, num('Width (squares)', 'footprint', 1, 'w'), num('Depth (squares)', 'footprint', 1, 'h')),
      el('div', { class: 'row' },
        field('Placement', select(PLACEMENTS.map((id) => ({ id, name: PLACEMENT_NAMES[id] })), m.placement, (v) => {
          m.placement = v;
          refreshPreview();
        })),
        field('Side facing the wall', select(SIDES.map((id) => ({ id, name: SIDE_NAMES[id] })), m.wallSide, (v) => {
          m.wallSide = v;
          refreshPreview();
        }))),
      el('div', { class: 'row' },
        field('Layer', select(LAYERS.map((id) => ({ id, name: { floor: 'Floor (rugs, decals)', object: 'Furniture', overhead: 'Overhead' }[id] })), m.layer, (v) => (m.layer = v))),
        num('Weight', 'weight', 1), num('Min', 'min', 0), num('Max (0 = any)', 'max', 0)),
      el('div', { class: 'row' },
        checkbox('Blocks movement', m.blocksMovement, (v) => (m.blocksMovement = v)),
        checkbox('Blocks vision', m.blocksVision, (v) => (m.blocksVision = v))),
      field('Room types', rooms),
      field('Search tags', el('input', { type: 'text', value: m.tags.join(', '), onchange: (e) => (m.tags = e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)) })),
      !edit && el('button', { type: 'button', class: 'danger', onclick: () => {
        items.splice(items.indexOf(item), 1);
        item.card.remove();
      } }, 'Leave out'),
    );
    item.card = el('div', { class: 'import-card' }, preview, body);
    return item.card;
  }

  async function addFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPng(bytes)) {
      status.textContent = `${file.name} is not a PNG, skipped.`;
      return;
    }
    const size = pngSize(bytes);
    const existing = readPngMeta(bytes);
    const meta = {
      id: '', name: title(file.name), settings: [app.map.setting], footprint: guessFootprint(size),
      roomTypes: ['*'], placement: 'free', wallSide: 'n', layer: 'object', blocksMovement: true, blocksVision: false,
      weight: 1, min: 0, max: 0, tags: [], ...existing,
    };
    meta.id = existing?.id && !assets.get(existing.id) ? existing.id : uniqueId(slug(file.name), null);
    const item = { bytes, size, meta, url: URL.createObjectURL(new Blob([bytes], { type: 'image/png' })) };
    items.push(item);
    list.append(card(item));
  }

  const picker = el('input', {
    type: 'file', accept: 'image/png', multiple: true,
    onchange: async () => {
      for (const f of picker.files) await addFile(f);
      picker.value = '';
    },
  });

  const save = el('button', { type: 'button', class: 'primary', onclick: async () => {
    if (!items.length) return (status.textContent = 'Nothing to save yet.');
    for (const it of items) {
      if (!it.meta.settings.length) return (status.textContent = `${it.meta.name}: pick at least one setting.`);
      if (!it.meta.roomTypes.length) return (status.textContent = `${it.meta.name}: pick room types or Any room.`);
    }
    save.disabled = true;
    try {
      for (const it of items) {
        const file = edit ? edit.path.split('/').pop() : `${it.meta.id.replace(/^user\./, '')}.png`;
        const out = writePngMeta(it.bytes, it.meta);
        const res = await fetch(`/api/assets/imported/${encodeURIComponent(file)}`, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: out });
        const body = await res.json();
        if (!res.ok) throw new Error(`${it.meta.name}: ${body.error}`);
      }
      await assets.load();
      for (const it of items) assets.forget(it.meta.id);
      onSaved?.(items.map((it) => it.meta.id));
      dialog.close();
    } catch (err) {
      status.textContent = `Could not save: ${err.message}`;
    } finally {
      save.disabled = false;
    }
  } }, edit ? 'Save tags' : 'Add to library');

  dialog.append(
    el('h2', {}, edit ? `Tags: ${edit.meta.name}` : 'Import your own art (PNG)'),
    !edit && el('p', { class: 'hint' }, 'Pick PNG files, then tag each one. The tags are stored inside the PNG, saved to assets/imported/. Imported art is drawn as it is, not recoloured to the palette.'),
    !edit && el('div', { class: 'row' },
      field('PNG files', picker),
      field('Your art\'s pixels per square', el('input', {
        type: 'number', min: 10, value: sourcePps,
        onchange: (e) => {
          sourcePps = Math.max(10, +e.target.value || 100);
          for (const it of items) it.meta.footprint = guessFootprint(it.size);
          list.replaceChildren(...items.map(card));
        },
      }), 'Used to guess each piece\'s size in squares.')),
    list,
    status,
    el('menu', {}, el('button', { type: 'button', onclick: () => dialog.close() }, 'Cancel'), save),
  );
  dialog.addEventListener('close', () => {
    for (const it of items) URL.revokeObjectURL(it.url);
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();

  if (edit) {
    fetch('/' + edit.path).then((r) => r.arrayBuffer()).then((buf) => {
      const bytes = new Uint8Array(buf);
      const item = { bytes, size: pngSize(bytes), meta: structuredClone(edit.meta), url: URL.createObjectURL(new Blob([bytes], { type: 'image/png' })) };
      items.push(item);
      list.append(card(item));
    });
  }
  return dialog;
}
