// Boot: load settings, build the UI around the canvas, wire panels to the app state.

import { App } from './editor/app.js';
import { el, field, select, segmented, checkbox } from './editor/dom.js';
import { loadCatalog, listMaps, loadMapFile, saveMapFile } from './io/api.js';
import { loadMap, newSeed, DOOR_TYPES, insertLevel, removeLevel } from './core/model.js';
import { LINK_TYPES, DIRS, linkRange } from './core/links.js';
import { linkTool, edgeTool } from './editor/tools/level-tools.js';
import { regionAt } from './core/rooms.js';
import { selectTool, doorTool, roomTool, eraseTool, tagRegion } from './editor/tools/item-tools.js';
import { rectTool, circleTool, polyTool, caveTool, brushTool } from './editor/tools/shape-tools.js';
import { wallTool, arcTool } from './editor/tools/wall-tools.js';

const TOOL_GROUPS = [
  [selectTool],
  [rectTool, circleTool, polyTool, caveTool, brushTool],
  [wallTool, arcTool, doorTool],
  [linkTool, edgeTool],
  [roomTool, eraseTool],
];
const $ = (id) => document.getElementById(id);

const catalog = await loadCatalog();
let ready = false;
// window.__app is a handle for debugging from the browser console.
const app = (window.__app = new App({ canvas: $('canvas'), catalog, tools: TOOL_GROUPS.flat(), onChange: (reason) => ready && update(reason) }));
$('loading').remove();
app.setTool('select');

// ---- top bar ---------------------------------------------------------------

async function save(asNew = false) {
  let name = app.fileName;
  if (!name || asNew) {
    name = prompt('Save map as:', app.fileName || app.map.name);
    if (!name) return;
    name = name.trim();
  }
  try {
    const res = await saveMapFile(name, app.serialize());
    app.fileName = name;
    app.dirty = false;
    app.status(`Saved to ${res.path}`);
  } catch (err) {
    alert(`Could not save: ${err.message}`);
  }
}

function confirmDiscard() {
  return !app.dirty || confirm('Discard unsaved changes?');
}

async function openDialog() {
  if (!confirmDiscard()) return;
  const dialog = $('open-dialog');
  const list = $('map-list');
  list.replaceChildren(el('li', {}, 'Loading…'));
  dialog.showModal();
  try {
    const maps = await listMaps();
    list.replaceChildren(
      ...(maps.length
        ? maps.map((m) =>
            el('li', {}, el('button', {
              type: 'button',
              onclick: async () => {
                dialog.close();
                try {
                  app.setMap(loadMap(await loadMapFile(m.name)), m.name);
                  app.status(`Opened ${m.name}`);
                } catch (err) {
                  alert(`Could not open ${m.name}: ${err.message}`);
                }
              },
            }, m.name, el('small', {}, new Date(m.modified).toLocaleString()))),
          )
        : [el('li', {}, 'No saved maps yet.')]),
    );
  } catch (err) {
    list.replaceChildren(el('li', {}, `Could not list maps: ${err.message}`));
  }
}

function download() {
  const blob = new Blob([app.serialize()], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `${app.fileName || app.map.name}.map.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importFile() {
  if (!confirmDiscard()) return;
  const input = el('input', { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      app.setMap(loadMap(JSON.parse(await file.text())), null);
      app.dirty = true;
      app.status(`Imported ${file.name}. Save to keep it in the maps folder.`);
    } catch (err) {
      alert(`Could not import: ${err.message}`);
    }
  };
  input.click();
}

$('file-buttons').append(
  el('button', { onclick: () => confirmDiscard() && app.newMap(app.map.setting), title: 'New map' }, 'New'),
  el('button', { onclick: openDialog, title: 'Open (Ctrl+O)' }, 'Open'),
  el('button', { onclick: () => save(), title: 'Save (Ctrl+S)' }, 'Save'),
  el('button', { onclick: () => save(true) }, 'Save as'),
  el('button', { onclick: download, title: 'Download the map file' }, 'Download'),
  el('button', { onclick: importFile, title: 'Load a map file from disk' }, 'Import'),
);
const undoBtn = el('button', { onclick: () => app.undo(), title: 'Undo (Ctrl+Z)' }, 'Undo');
const redoBtn = el('button', { onclick: () => app.redo(), title: 'Redo (Ctrl+Y)' }, 'Redo');
$('history-buttons').append(undoBtn, redoBtn);

// ---- toolbar ---------------------------------------------------------------

const toolButtons = new Map();
TOOL_GROUPS.forEach((group, i) => {
  if (i) $('toolbar').append(el('div', { class: 'sep' }));
  for (const tool of group) {
    const b = el('button', { type: 'button', title: tool.hint, onclick: () => app.setTool(tool) }, tool.label, el('kbd', {}, tool.key));
    toolButtons.set(tool.id, b);
    $('toolbar').append(b);
  }
});

// ---- side panel ------------------------------------------------------------

function section(title, ...children) {
  return el('section', {}, el('h3', {}, title), ...children);
}

function toolSection() {
  const t = app.tool;
  return section(t.label, el('p', { class: 'hint' }, t.hint), t.options?.(app));
}

function shapeSection(shape) {
  const edit = (label, fn) => app.commit(label, (map, level) => {
    const s = level.shapes.find((x) => x.id === shape.id);
    if (s) fn(s, level);
  });
  const kindName = { rect: 'Rectangle', circle: 'Circle', poly: 'Polygon', cave: 'Cave', cells: 'Painted floor' }[shape.kind];
  const radii = [0, 0.5, 1, 1.5, 2, 3, 4].map((r) => ({ id: String(r), name: r ? `${r} sq` : 'Square' }));
  return section(
    `Shape: ${kindName}`,
    field('Mode', segmented([{ id: 'add', name: 'Floor' }, { id: 'subtract', name: 'Cut away' }, { id: 'void', name: 'Open to below' }], shape.op, (v) => edit('Change mode', (s) => (s.op = v)))),
    shape.op === 'add' && shape.kind !== 'cells' &&
      checkbox('Separate room (own walls)', !!shape.walled, (v) => edit('Toggle walls', (s) => (s.walled = v))),
    (shape.kind === 'rect' || shape.kind === 'poly') &&
      field('Corner rounding', select(radii, String(shape.radius || 0), (v) => edit('Round corners', (s) => (s.radius = Number(v))))),
    shape.kind === 'cave' &&
      field('Roughness', el('input', {
        type: 'range', min: 0, max: 1, step: 0.05, value: shape.roughness ?? 0.5,
        onchange: (e) => edit('Cave roughness', (s) => (s.roughness = Number(e.target.value))),
      })),
    el('div', { class: 'actions' },
      shape.kind === 'cave' && el('button', { onclick: () => edit('Reshape cave', (s) => (s.seed = newSeed())) }, 'New cave shape'),
      el('button', { title: 'Later shapes win where they overlap', onclick: () => edit('Bring forward', (s, level) => {
        const i = level.shapes.indexOf(s);
        if (i < level.shapes.length - 1) level.shapes.splice(i, 2, level.shapes[i + 1], s);
      }) }, 'Forward'),
      el('button', { onclick: () => edit('Send back', (s, level) => {
        const i = level.shapes.indexOf(s);
        if (i > 0) level.shapes.splice(i - 1, 2, s, level.shapes[i - 1]);
      }) }, 'Back'),
      el('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete'),
    ),
  );
}

function doorSection(door) {
  return section(
    'Door',
    field('Type', select(DOOR_TYPES, door.type, (v) => app.commit('Change door', (map, level) => {
      const d = level.doors.find((x) => x.id === door.id);
      if (d) d.type = v;
    }))),
    el('div', { class: 'actions' }, el('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
  );
}

function linkSection(link) {
  const type = LINK_TYPES.find((t) => t.id === link.type);
  const edit = (label, fn) => app.commit(label, (map) => {
    const k = map.links.find((x) => x.id === link.id);
    if (k) fn(k, map);
  });
  const levels = app.map.levels.map((l, i) => ({ id: l.id, name: `${i + 1}. ${l.name}` }));
  const range = linkRange(app.map, link);
  const dirNames = { n: 'North', e: 'East', s: 'South', w: 'West' };
  return section(
    type.name,
    (link.type === 'stairs' || link.type === 'spiral') &&
      field(link.type === 'stairs' ? 'Climbs towards' : 'Top step faces',
        segmented(DIRS.map((d) => ({ id: d, name: dirNames[d] })), link.dir, (v) => edit('Turn stairs', (k) => (k.dir = v)))),
    type.span === 'multi'
      ? el('div', { class: 'row' },
          field('From', select(levels.slice(0, range[1]), link.from, (v) => edit('Change span', (k) => (k.from = v)))),
          field('To', select(levels.slice(range[0] + 1), link.to, (v) => edit('Change span', (k) => (k.to = v)))))
      : el('p', { class: 'hint' }, `Links ${levels[range[0]].name} and ${levels[range[1]].name}.`),
    el('p', { class: 'hint' }, `${link.w} × ${link.h} squares. Drag to move.`),
    el('div', { class: 'actions' }, el('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
  );
}

function wallSection(wall) {
  return section(
    wall.kind === 'arc' ? 'Arc wall' : 'Wall',
    el('div', { class: 'actions' }, el('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
  );
}

function roomSection() {
  const at = app.selection?.at;
  if (!at) return null;
  const rooms = app.geometry().rooms;
  const index = regionAt(rooms, at);
  if (index < 0) return null;
  const region = rooms.regions[index];
  const types = [{ id: '', name: '— untagged —' }, ...(app.setting?.roomTypes || [])];
  if (region.tag && !types.some((t) => t.id === region.tag.type)) types.push({ id: region.tag.type, name: app.roomTypeName(region.tag.type) });
  return section(
    'Room',
    field('Type', select(types, region.tag?.type || '', (v) => {
      if (!v) {
        app.commit('Clear room type', (map, level) => {
          level.rooms = level.rooms.filter((r) => rooms.tagRegion.get(r.id) !== index);
        });
      } else {
        app.commit('Tag room', (map, level) => tagRegion(level, rooms, index, v, at));
      }
    })),
    el('p', { class: 'hint' }, `${region.cells.length} full squares, about ${Math.round(region.area)} sq in all.`),
    el('div', { class: 'actions' },
      el('button', { disabled: true, title: 'Arrives with the decorator (build step 4)' }, 'Decorate'),
      el('button', { disabled: true, title: 'Arrives with the decorator (build step 4)' }, 'Reroll'),
    ),
  );
}

function selectionSections() {
  const sel = app.selection;
  if (!sel) return [];
  const item = app.findItem(app.level, sel);
  if (!item) return [];
  if (sel.kind === 'shape') return [roomSection(), shapeSection(item)];
  if (sel.kind === 'door') return [doorSection(item)];
  if (sel.kind === 'wall') return [wallSection(item)];
  if (sel.kind === 'link') return [linkSection(item)];
  return [];
}

function mapSection() {
  const m = app.map;
  const settings = [...catalog.settings.values()];
  const styleEdit = (label, key, value) => app.commit(label, (map) => (map.style[key] = value), { prune: false });
  const w = el('input', { type: 'number', min: 4, max: 400, value: m.size.w });
  const h = el('input', { type: 'number', min: 4, max: 400, value: m.size.h });
  return section(
    'Map',
    field('Name', el('input', {
      type: 'text', value: m.name,
      onchange: (e) => app.commit('Rename', (map) => (map.name = e.target.value.trim() || 'Untitled map'), { prune: false }),
    })),
    field('Setting', select(settings, m.setting, (v) => {
      const s = catalog.settings.get(v);
      app.commit('Change setting', (map) => {
        map.setting = v;
        if (s?.defaults && confirm(`Switch to the ${s.name} default look too?`)) Object.assign(map.style, s.defaults);
      }, { prune: false });
    })),
    field('Palette', select(catalog.styles.palettes, m.style.palette, (v) => styleEdit('Palette', 'palette', v))),
    field('Shading', select(catalog.styles.shadings, m.style.shading, (v) => styleEdit('Shading', 'shading', v))),
    field('Grid', select(catalog.styles.grids, m.style.grid, (v) => styleEdit('Grid', 'grid', v))),
    field('Size (squares)', el('div', { class: 'row' }, w, el('span', { style: { flex: 'none' } }, '×'), h,
      el('button', {
        style: { flex: 'none' },
        onclick: () => {
          const size = { w: Math.max(4, Math.min(400, Math.round(+w.value) || m.size.w)), h: Math.max(4, Math.min(400, Math.round(+h.value) || m.size.h)) };
          app.commit('Resize map', (map) => (map.size = size));
          app.fitView();
        },
      }, 'Apply'))),
    checkbox('Show room labels', app.showLabels, (v) => {
      app.showLabels = v;
      app.requestRender();
    }),
  );
}

function levelSection() {
  const levels = app.map.levels;
  const current = app.level;
  const list = el('div', { class: 'level-list' },
    [...levels].reverse().map((lv) => {
      const i = levels.indexOf(lv);
      return el('button', {
        type: 'button', class: 'level' + (i === app.levelIndex ? ' on' : ''),
        onclick: () => app.setLevel(i),
      }, el('span', {}, lv.name), el('small', {}, `${i + 1}`));
    }));
  const add = (offset) => {
    const index = app.levelIndex + offset;
    app.commit('Add level', (map) => insertLevel(map, index, `Level ${map.levels.length + 1}`), { prune: false });
    app.setLevel(index);
  };
  return section(
    'Levels',
    list,
    field('Name', el('input', {
      type: 'text', value: current.name,
      onchange: (e) => app.commit('Rename level', (map, level) => (level.name = e.target.value.trim() || level.name), { prune: false }),
    })),
    el('div', { class: 'actions' },
      el('button', { onclick: () => add(1), title: 'Add a level above this one' }, 'Add above'),
      el('button', { onclick: () => add(0), title: 'Add a level below this one' }, 'Add below'),
      el('button', {
        class: 'danger', disabled: levels.length < 2,
        onclick: () => {
          if (!confirm(`Delete level "${current.name}" and everything on it?`)) return;
          app.commit('Delete level', (map) => removeLevel(map, current.id), { prune: false });
          app.setLevel(Math.min(app.levelIndex, app.map.levels.length - 1));
        },
      }, 'Delete'),
    ),
    app.levelIndex > 0 && checkbox('Show level below as outlines', app.showBelow, (v) => {
      app.showBelow = v;
      app.requestRender();
    }),
    el('p', { class: 'hint' }, 'PageUp / PageDown switch levels.'),
  );
}

let panelTimer = null;
function renderPanel() {
  panelTimer = null;
  const panel = $('panel');
  const scroll = panel.scrollTop;
  panel.replaceChildren(toolSection(), ...selectionSections().filter(Boolean), levelSection(), mapSection());
  panel.scrollTop = scroll;
}

// ---- status ----------------------------------------------------------------

function update(reason) {
  if (reason === 'cursor' || reason === 'view') {
    const c = app.cursor;
    $('status-cursor').textContent = c ? `Square ${Math.floor(c[0])}, ${Math.floor(c[1])}` : '';
    $('status-zoom').textContent = `${Math.round(app.view.scale)} px/sq`;
    return;
  }
  if (reason === 'status') {
    $('status-message').textContent = app.statusMessage || '';
    return;
  }
  for (const [id, b] of toolButtons) b.classList.toggle('on', id === app.tool?.id);
  undoBtn.disabled = !app.undoStack.length;
  redoBtn.disabled = !app.redoStack.length;
  $('doc-title').textContent = `${app.fileName || app.map.name}${app.dirty ? ' •' : ''} — ${app.setting?.name || app.map.setting} — ${app.level.name}`;
  const regions = app.geometry().rooms.regions;
  $('status-rooms').textContent = `${regions.length} rooms, ${regions.filter((r) => r.tag).length} tagged`;
  // Panels are rebuilt in a batch; typing in them is never interrupted mid-keystroke.
  if (!panelTimer) panelTimer = setTimeout(renderPanel, 0);
}

// ---- keys ------------------------------------------------------------------

for (const type of ['keydown', 'keyup']) {
  window.addEventListener(type, (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (type === 'keydown' && ctrl && e.key.toLowerCase() === 's') {
      e.preventDefault();
      save(e.shiftKey);
      return;
    }
    if (type === 'keydown' && ctrl && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      openDialog();
      return;
    }
    if (app.handleKey(e)) e.preventDefault();
  });
}

window.addEventListener('beforeunload', (e) => {
  if (app.dirty) e.preventDefault();
});

ready = true;
if (app.recoverAutosave()) app.status('Restored your last session (autosave).');
requestAnimationFrame(() => app.fitView());
update('init');
