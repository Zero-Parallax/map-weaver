// Boot: load settings, build the UI around the canvas, wire panels to the app state.

import { App } from './editor/app.js';
import { el, field, select, segmented, checkbox } from './editor/dom.js';
import { loadCatalog, listMaps, loadMapFile, saveMapFile, saveExport, hasServer } from './io/api.js';
import { renderLevelPng, exportSize, exportFileName, slug, MAX_SIDE, VIEWS } from './render/export.js';
import { roomKey } from './core/room-key.js';
import { buildFoundryScene, COMPLEXITY } from './export/foundry.js';
import { OPEN_MODES } from './render/renderer.js';
import { WALL_TEXTURES, WALL_WIDTHS } from './render/walls.js';
import { loadMap, newSeed, DOOR_TYPES, insertLevel, removeLevel } from './core/model.js';
import { LINK_TYPES, DIRS, linkRange } from './core/links.js';
import { linkTool, edgeTool } from './editor/tools/level-tools.js';
import { assetTool, sizeFields } from './editor/tools/asset-tool.js';
import { AssetLibrary } from './assets/library.js';
import { ask, askText, notice } from './editor/ask.js';
import { regionAt } from './core/rooms.js';
import { DENSITY, DEFAULT_DENSITY, CLUTTER, DEFAULT_CLUTTER } from './decorator/decorate.js';
import { selectTool, doorTool, roomTool, eraseTool, tagRegion } from './editor/tools/item-tools.js';
import { rectTool, circleTool, polyTool, caveTool, brushTool, corridorTool, joinControl } from './editor/tools/shape-tools.js';
import { wallTool, arcTool } from './editor/tools/wall-tools.js';
import { terrainTool } from './editor/tools/terrain-tool.js';
import { GROUNDS } from './core/terrain.js';

const TOOL_GROUPS = [
  [selectTool],
  [rectTool, circleTool, polyTool, caveTool, brushTool, corridorTool, terrainTool],
  [wallTool, arcTool, doorTool],
  [linkTool, edgeTool],
  [roomTool, assetTool, eraseTool],
];
const $ = (id) => document.getElementById(id);

const catalog = await loadCatalog();
// Without serve.js (hosted as plain files, e.g. on a phone) maps and exports are files you
// download, and a map is opened by importing its file.
const server = await hasServer();
const assets = new AssetLibrary();
try {
  await assets.load(server);
} catch (err) {
  console.warn(err);
}
let ready = false;
// window.__app is a handle for debugging from the browser console.
const app = (window.__app = new App({ canvas: $('canvas'), catalog, assets, tools: TOOL_GROUPS.flat(), onChange: (reason) => ready && update(reason) }));
$('loading').remove();
app.server = server;
document.body.classList.toggle('no-server', !server);
app.setTool('select');

// ---- top bar ---------------------------------------------------------------

/**
 * Hand the viewer a file to save. On a hosted page (claude.ai) the platform's downloads
 * capability asks the viewer first; elsewhere a normal browser download.
 * Resolves false if the viewer declined.
 */
async function downloadBlob(blob, name) {
  const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
  if (downloads) {
    try {
      await downloads.save({ filename: name, data: blob });
      return true;
    } catch (err) {
      if (err?.code === 'declined') return false;
      throw new Error(err?.message || 'The download was refused.');
    }
  }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return true;
}

async function save(asNew = false) {
  if (!server) {
    try {
      if (!(await download())) return;
      app.dirty = false;
      app.status('Map file saved. Use Open to load it again.');
    } catch (err) {
      await notice(`Could not save: ${err.message}`);
    }
    return;
  }
  let name = app.fileName;
  if (!name || asNew) {
    name = await askText('Save map as:', app.fileName || app.map.name, { ok: 'Save' });
    if (!name) return;
  }
  try {
    const res = await saveMapFile(name, app.serialize());
    app.fileName = name;
    app.dirty = false;
    app.status(`Saved to ${res.path}`);
  } catch (err) {
    await notice(`Could not save: ${err.message}`);
  }
}

async function confirmDiscard() {
  return !app.dirty || ask('Discard unsaved changes?', { ok: 'Discard', danger: true });
}

async function openDialog() {
  if (!server) return importFile();
  if (!(await confirmDiscard())) return;
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
                  await notice(`Could not open ${m.name}: ${err.message}`);
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
  return downloadBlob(new Blob([app.serialize()], { type: 'application/json' }), `${app.fileName || app.map.name}.map.json`);
}

async function importFile() {
  if (!(await confirmDiscard())) return;
  const input = el('input', { type: 'file', accept: '.json,application/json' });
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      app.setMap(loadMap(JSON.parse(await file.text())), null);
      app.dirty = true;
      app.status(`Imported ${file.name}. Save to keep it in the maps folder.`);
    } catch (err) {
      await notice(`Could not import: ${err.message}`);
    }
  };
  input.click();
}

// ---- PNG export ------------------------------------------------------------

const exportOpts = { which: 'current', pps: 100, openMode: 'transparent', outsideMode: 'drawn', save: true, download: false, view: 'player', key: true };

function exportDialog() {
  const dialog = el('dialog', { class: 'export-dialog' });
  const sizeNote = el('p', { class: 'hint' });
  const status = el('p', { class: 'hint' });
  const refresh = () => {
    const { width, height } = exportSize(app.map, exportOpts.pps);
    const n = (exportOpts.which === 'all' ? app.map.levels.length : 1) * (exportOpts.view === 'both' ? 2 : 1);
    sizeNote.textContent = `${width} × ${height} px per level, ${n} file${n > 1 ? 's' : ''}.` + (width > MAX_SIDE || height > MAX_SIDE ? ' Too big for the browser: lower the pixels per square.' : '');
  };
  const pps = el('input', { type: 'number', min: 10, max: 400, value: exportOpts.pps, oninput: (e) => {
    exportOpts.pps = Math.max(10, Math.min(400, Math.round(+e.target.value) || 100));
    refresh();
  } });
  const go = el('button', { type: 'button', class: 'primary', onclick: async () => {
    go.disabled = true;
    const indexes = exportOpts.which === 'all' ? app.map.levels.map((_, i) => i) : [app.levelIndex];
    const views = exportOpts.view === 'both' ? ['player', 'gm'] : [exportOpts.view];
    const key = views.includes('gm') ? app.roomKey() : null;
    const saved = [];
    try {
      for (const i of indexes) {
        for (const view of views) {
          status.textContent = `Rendering ${app.map.levels[i].name} (${view === 'gm' ? 'GM' : 'player'})…`;
          const blob = await renderLevelPng({
            map: app.map, levelIndex: i, style: app.style, assets, geometry: (lv) => app.geometry(lv),
            pxPerSquare: exportOpts.pps, openMode: exportOpts.openMode, outsideMode: exportOpts.outsideMode,
            view, key: view === 'gm' ? key : null, keyColumn: exportOpts.key,
          });
          const name = exportFileName(app.map, i, views.length > 1 || view === 'gm' ? view : '');
          if (server && exportOpts.save) saved.push((await saveExport(name, blob)).path);
          if (!server || exportOpts.download) await downloadBlob(blob, name);
        }
      }
      status.textContent = saved.length ? `Saved: ${saved.join(', ')}` : 'Done.';
      app.status(saved.length ? `Exported to ${saved.length > 1 ? 'the exports folder' : saved[0]}` : 'Exported.');
    } catch (err) {
      status.textContent = `Export failed: ${err.message}`;
    } finally {
      go.disabled = false;
    }
  } }, 'Export');
  dialog.append(
    el('h2', {}, 'Export PNG'),
    field('Levels', segmented([{ id: 'current', name: 'This level' }, { id: 'all', name: 'All levels' }], exportOpts.which, (v) => {
      exportOpts.which = v;
      refresh();
    })),
    field('Pixels per square', el('div', { class: 'row' }, pps,
      ...[70, 100, 140, 200].map((n) => el('button', { type: 'button', style: { flex: 'none' }, onclick: () => {
        pps.value = n;
        exportOpts.pps = n;
        refresh();
      } }, String(n))))),
    field('Version', segmented(VIEWS, exportOpts.view, (v) => {
      exportOpts.view = v;
      refresh();
    }), 'Player hides secret doors and traps. GM shows everything and numbers the rooms.'),
    checkbox('GM: room key beside the map (names and notes from each room)', exportOpts.key, (v) => (exportOpts.key = v)),
    field('Open to below areas', select(OPEN_MODES, exportOpts.openMode, (v) => (exportOpts.openMode = v)),
      'Transparent suits stacked levels in Foundry; faded shows the level below for printing.'),
    field('Outside the building', select([{ id: 'drawn', name: 'As drawn (rock / hatching)' }, { id: 'transparent', name: 'Transparent' }], exportOpts.outsideMode, (v) => (exportOpts.outsideMode = v))),
    server && checkbox('Save to the exports folder', exportOpts.save, (v) => (exportOpts.save = v)),
    server && checkbox('Download in the browser', exportOpts.download, (v) => (exportOpts.download = v)),
    sizeNote,
    status,
    el('menu', {}, el('button', { type: 'button', onclick: () => dialog.close() }, 'Close'), go),
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  refresh();
  if (!dialog.open) dialog.showModal();
  return dialog;
}

// ---- Foundry export --------------------------------------------------------

const FOUNDRY_KEY = 'map-weaver.foundry';
const foundryOpts = { pps: 100, folder: 'worlds/my-world/map-weaver/', complexity: 'medium', assetWalls: true, flipOneWay: false, lights: true, terrain: true };
try {
  Object.assign(foundryOpts, JSON.parse(localStorage.getItem(FOUNDRY_KEY) || '{}'));
} catch {
  // Remembered options are a convenience only.
}

function foundryDialog() {
  const dialog = el('dialog', { class: 'export-dialog' });
  const status = el('div', { class: 'hint' });
  const remember = () => {
    try {
      localStorage.setItem(FOUNDRY_KEY, JSON.stringify(foundryOpts));
    } catch {
      // ignore
    }
  };
  const go = el('button', { type: 'button', class: 'primary', onclick: async () => {
    go.disabled = true;
    remember();
    const map = app.map;
    const folder = foundryOpts.folder.replace(/\\/g, '/').replace(/\/?$/, '/');
    const files = map.levels.map((_, i) => exportFileName(map, i));
    try {
      for (let i = 0; i < map.levels.length; i++) {
        status.textContent = `Rendering ${map.levels[i].name}…`;
        // Openings are transparent so Foundry shows the level below; upper levels are
        // transparent outside the building too.
        const blob = await renderLevelPng({
          map, levelIndex: i, style: app.style, assets, geometry: (lv) => app.geometry(lv), pxPerSquare: foundryOpts.pps,
          openMode: 'transparent', outsideMode: i === 0 ? 'drawn' : 'transparent', view: 'player',
        });
        if (server) await saveExport(files[i], blob);
        else await downloadBlob(blob, files[i]);
      }
      const scene = buildFoundryScene(map, {
        geometry: (lv) => app.geometry(lv), imagePath: (i) => folder + files[i], pps: foundryOpts.pps,
        complexity: foundryOpts.complexity, assetWalls: foundryOpts.assetWalls, resolve: (pl) => assets.resolve(pl), flipOneWay: foundryOpts.flipOneWay,
        lights: foundryOpts.lights, terrain: foundryOpts.terrain,
      });
      const jsonName = `${slug(map.name)}.foundry-scene.json`;
      const sceneBlob = new Blob([JSON.stringify(scene, null, 1)], { type: 'application/json' });
      if (server) await saveExport(jsonName, sceneBlob);
      else await downloadBlob(sceneBlob, jsonName);
      status.replaceChildren(
        el('p', {}, `Done: ${scene.levels.length} levels, ${scene.walls.length} walls. ${server ? 'Files are in the exports folder.' : 'The files were downloaded.'}`),
        el('ol', {},
          el('li', {}, 'Copy ', el('strong', {}, files.join(', ')), ' into your Foundry Data folder at ', el('code', {}, folder)),
          el('li', {}, 'In Foundry, create a scene, right-click it in the Scenes sidebar and choose Import Data.'),
          el('li', {}, 'Pick ', el('code', {}, server ? `exports/${jsonName}` : jsonName), '.')),
      );
    } catch (err) {
      status.textContent = `Export failed: ${err.message}`;
    } finally {
      go.disabled = false;
    }
  } }, 'Export for Foundry');
  const { width, height } = exportSize(app.map, foundryOpts.pps);
  dialog.append(
    el('h2', {}, 'Export to Foundry VTT v14'),
    el('p', { class: 'hint' }, `One scene with ${app.map.levels.length} level${app.map.levels.length > 1 ? 's' : ''}: a background image per level and walls, doors and railings tagged with their level.`),
    field('Pixels per square (Foundry grid size)', el('input', {
      type: 'number', min: 50, max: 400, value: foundryOpts.pps,
      onchange: (e) => (foundryOpts.pps = Math.max(50, Math.min(400, Math.round(+e.target.value) || 100))),
    }), `${width} × ${height} px at the current setting.`),
    field('Image folder inside Foundry Data', el('input', { type: 'text', value: foundryOpts.folder, onchange: (e) => (foundryOpts.folder = e.target.value.trim()) }),
      'Where you will copy the PNGs, e.g. worlds/my-world/maps/'),
    field('Wall complexity', select(Object.entries(COMPLEXITY).map(([id, c]) => ({ id, name: c.name })), foundryOpts.complexity, (v) => (foundryOpts.complexity = v)),
      'How closely walls follow curves and cave outlines.'),
    checkbox('Walls round pillars, statues and other vision-blocking assets', foundryOpts.assetWalls, (v) => (foundryOpts.assetWalls = v)),
    checkbox('Lights from torches, fires, braziers and glowing screens', foundryOpts.lights, (v) => (foundryOpts.lights = v)),
    checkbox('Difficult terrain regions over rubble and debris (double movement cost)', foundryOpts.terrain, (v) => (foundryOpts.terrain = v)),
    checkbox('Flip one-way railing sight (if Foundry blocks the wrong side)', foundryOpts.flipOneWay, (v) => (foundryOpts.flipOneWay = v)),
    status,
    el('menu', {}, el('button', { type: 'button', onclick: () => dialog.close() }, 'Close'), go),
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

$('file-buttons').append(
  ...[
    el('button', { onclick: async () => (await confirmDiscard()) && app.newMap(app.map.setting), title: 'New map' }, 'New'),
    el('button', { onclick: openDialog, title: 'Open (Ctrl+O)' }, 'Open'),
    el('button', { onclick: () => save(), title: server ? 'Save (Ctrl+S)' : 'Download the map file (Ctrl+S)' }, 'Save'),
    server && el('button', { onclick: () => save(true) }, 'Save as'),
    server && el('button', { onclick: download, title: 'Download the map file' }, 'Download'),
    server && el('button', { onclick: importFile, title: 'Load a map file from disk' }, 'Import'),
    el('button', { onclick: () => exportDialog(), title: 'Export levels as PNG images (Ctrl+E)' }, 'Export PNG'),
    el('button', { onclick: () => foundryDialog(), title: 'Export a Foundry VTT v14 scene with levels and walls' }, 'Foundry'),
  ].filter(Boolean),
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

// ---- touch action bar ------------------------------------------------------
// On phones and tablets there are no keys or right-click: these buttons stand in for them.

const SNAP_MODES = [
  { id: 'grid', name: '⌗1', title: 'Snapping: whole squares' },
  { id: 'half', name: '⌗½', title: 'Snapping: half squares' },
  { id: 'free', name: '⌗✕', title: 'Snapping: off' },
];
app.snapMode = 'grid';
const rotateBy = (deg) => (app.tool.id === 'asset' ? assetTool.rotate(app, deg) : app.rotateSelection(deg));
const actions = {
  undo: el('button', { type: 'button', onclick: () => app.undo(), title: 'Undo' }, '↶'),
  redo: el('button', { type: 'button', onclick: () => app.redo(), title: 'Redo' }, '↷'),
  done: el('button', { type: 'button', onclick: () => (app.tool.finish ? app.tool.finish(app) : app.tool.cancel?.(app)), title: 'Finish (polygon, chain of walls)' }, 'Done'),
  cancel: el('button', { type: 'button', onclick: () => {
    app.tool.cancel?.(app);
    app.select(null);
  }, title: 'Cancel / deselect' }, '✕'),
  left: el('button', { type: 'button', onclick: () => rotateBy(-90), title: 'Turn left 90°' }, '⟲'),
  right: el('button', { type: 'button', onclick: () => rotateBy(90), title: 'Turn right 90°' }, '⟳'),
  del: el('button', { type: 'button', onclick: () => app.deleteSelection(), title: 'Delete selection' }, '🗑'),
  snap: el('button', { type: 'button', onclick: () => {
    const i = SNAP_MODES.findIndex((m) => m.id === app.snapMode);
    app.snapMode = SNAP_MODES[(i + 1) % SNAP_MODES.length].id;
    update('snap');
  }, title: SNAP_MODES[0].title }, SNAP_MODES[0].name),
  fit: el('button', { type: 'button', onclick: () => app.fitView(), title: 'Fit map' }, '⤢'),
  panel: el('button', { type: 'button', onclick: () => document.body.classList.toggle('panel-open'), title: 'Tool options and properties' }, '☰'),
};
$('stage').append(el('div', { class: 'action-bar' }, Object.values(actions)));

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
  const kindName = { rect: 'Rectangle', circle: 'Circle', poly: 'Polygon', cave: 'Cave', cells: 'Painted floor', path: 'Corridor' }[shape.kind];
  const radii = [0, 0.5, 1, 1.5, 2, 3, 4].map((r) => ({ id: String(r), name: r ? `${r} sq` : 'Square' }));
  return section(
    `Shape: ${kindName}`,
    field('Mode', segmented([{ id: 'add', name: 'Floor' }, { id: 'subtract', name: 'Cut away' }, { id: 'void', name: 'Open to below' }], shape.op, (v) => edit('Change mode', (s) => (s.op = v)))),
    shape.op === 'add' && shape.kind !== 'cells' &&
      field('Rooms', joinControl(shape.walled ? (shape.overlap ? 'overlap' : shape.under ? 'under' : 'top') : 'merge', (v) => edit('Change room joining', (s) => {
        s.walled = v !== 'merge';
        delete s.overlap;
        delete s.under;
        if (v === 'overlap') s.overlap = true;
        if (v === 'under') s.under = true;
      }))),
    shape.kind === 'path' &&
      field('Width', segmented([1, 2, 3].map((n) => ({ id: n, name: `${n} sq` })), shape.width, (v) => edit('Corridor width', (s) => (s.width = v)))),
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

function placementSection(pl) {
  const meta = assets.get(pl.asset);
  if (!meta) return section('Asset', el('p', { class: 'hint' }, `Missing asset "${pl.asset}".`));
  return section(
    meta.name,
    el('p', { class: 'hint' }, `${pl.auto ? 'Placed by the decorator; moving or turning it keeps it on reroll. ' : 'Placed by hand; kept on reroll. '}[ ] turn 90°, Shift+[ ] turn 15°, Shift+D duplicates.`),
    field('Angle', el('div', { class: 'row' },
      el('button', { style: { flex: 'none' }, onclick: () => app.rotateSelection(-15) }, '−15°'),
      el('input', { type: 'number', step: 15, value: pl.rot, onchange: (e) => app.setRotation(pl.id, Number(e.target.value) || 0) }),
      el('button', { style: { flex: 'none' }, onclick: () => app.rotateSelection(15) }, '+15°'))),
    sizeFields(meta, pl.params || {}, (params) => app.resizePlacement(pl.id, params)),
    el('div', { class: 'actions' },
      el('button', { onclick: () => app.rotateSelection(-90) }, '⟲ 90°'),
      el('button', { onclick: () => app.rotateSelection(90) }, '90° ⟳'),
      el('button', { onclick: () => app.duplicateSelection() }, 'Duplicate'),
      el('button', { class: 'danger', onclick: () => app.deleteSelection() }, 'Delete')),
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
  const tag = region.tag;
  const density = tag?.density ?? DEFAULT_DENSITY;
  const setDensity = (d) => app.commit('Room density', (map, level) => {
    const t = level.rooms.find((r) => r.id === tag.id);
    if (!t) return;
    t.density = d;
    app.decorateIn(map, level, [t.id]);
  });
  const preset = Object.entries(DENSITY).find(([, v]) => Math.abs(v - density) < 0.01)?.[0] || '';
  const clutter = tag?.clutter ?? DEFAULT_CLUTTER;
  const clutterPreset = Object.entries(CLUTTER).find(([, v]) => Math.abs(v - clutter) < 0.01)?.[0] || '';
  const setClutter = (c) => app.commit('Room clutter', (map, level) => {
    const t = level.rooms.find((r) => r.id === tag.id);
    if (!t) return;
    t.clutter = c;
    app.decorateIn(map, level, [t.id]);
  });
  return section(
    'Room',
    field('Type', select(types, tag?.type || '', (v) => {
      if (!v) {
        app.commit('Clear room type', (map, level) => {
          level.placements = level.placements.filter((p) => !(p.auto && p.room === tag?.id));
          level.rooms = level.rooms.filter((r) => rooms.tagRegion.get(r.id) !== index);
        });
      } else {
        app.commit('Tag room', (map, level) => {
          const t = tagRegion(level, rooms, index, v, at);
          app.tagged(map, level, [t.id]);
        });
      }
    })),
    tag && field('Name', el('input', {
      type: 'text', value: tag.name || '', placeholder: app.roomTypeName(tag.type),
      onchange: (e) => app.commit('Name room', (map, level) => {
        const t = level.rooms.find((r) => r.id === tag.id);
        if (t) t.name = e.target.value.trim() || undefined;
      }, { prune: false }),
    })),
    tag && field('GM notes', el('textarea', {
      rows: 3, placeholder: 'Shown in the room key of the GM export',
      onchange: (e) => app.commit('Room notes', (map, level) => {
        const t = level.rooms.find((r) => r.id === tag.id);
        if (t) t.notes = e.target.value.trim() || undefined;
      }, { prune: false }),
    }, tag.notes || '')),
    el('p', { class: 'hint' }, `${region.cells.length} full squares, about ${Math.round(region.area)} sq in all.`),
    wallLookField(region, index, rooms, at),
    tag && field('Density',
      el('div', {},
        segmented([{ id: 'light', name: 'Light' }, { id: 'medium', name: 'Medium' }, { id: 'heavy', name: 'Heavy' }], preset, (v) => setDensity(DENSITY[v])),
        el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: density, onchange: (e) => setDensity(Number(e.target.value)) }))),
    tag && checkbox('Combat ready: spread cover over the floor, keep lanes open', !!tag.combat, (v) => app.commit('Combat ready', (map, level) => {
      const t = level.rooms.find((r) => r.id === tag.id);
      if (!t) return;
      t.combat = v || undefined;
      app.decorateIn(map, level, [t.id]);
    })),
    tag && field('Clutter',
      segmented([{ id: 'none', name: 'None' }, { id: 'light', name: 'Light' }, { id: 'heavy', name: 'Heavy' }], clutterPreset, (v) => setClutter(CLUTTER[v])),
      'Cracks, stains, papers, cobwebs: small floor details.'),
    tag && el('div', { class: 'actions' },
      el('button', { onclick: () => app.decorate([tag.id]), title: 'Replace this room\'s automatic pieces (same layout)' }, 'Decorate'),
      el('button', { onclick: () => app.decorate([tag.id], { reroll: true }), title: 'A new random layout' }, 'Reroll'),
      el('button', { onclick: () => app.clearDecoration([tag.id]), title: 'Remove automatic pieces; hand-placed ones stay' }, 'Clear'),
      el('button', { onclick: () => app.addDoors([tag.id]), title: 'Door into each neighbouring room that can\'t be reached yet' }, 'Add doors'),
    ),
    !tag && el('p', { class: 'hint' }, 'Give the room a type to decorate it.'),
  );
}

/** Thickness presets plus a fine slider. */
function widthControl(value, onChange) {
  const preset = WALL_WIDTHS.find((w) => Math.abs(w.id - value) < 1e-6)?.id ?? null;
  return el('div', {},
    segmented(WALL_WIDTHS, preset, onChange),
    el('input', { type: 'range', min: 0.04, max: 0.5, step: 0.01, value, onchange: (e) => onChange(Number(e.target.value)) }));
}

/** Per-room wall look: texture and thickness, or the map's default. */
function wallLookField(region, index, rooms, at) {
  const lv = app.level;
  const own = (lv.wallStyles || []).find((w) => regionAt(rooms, w.at) === index);
  const def = app.style.wall;
  const set = (patch) => app.commit('Room walls', (map, level) => {
    level.wallStyles ??= [];
    const list = level.wallStyles;
    let w = list.find((x) => regionAt(rooms, x.at) === index);
    if (patch === null) {
      level.wallStyles = list.filter((x) => x !== w);
      return;
    }
    if (!w) {
      w = { at: region.labelAt || at, texture: def.texture, width: def.width };
      list.push(w);
    }
    Object.assign(w, patch);
  });
  const textures = [{ id: '', name: `Map default (${WALL_TEXTURES.find((t) => t.id === def.texture)?.name})` }, ...WALL_TEXTURES];
  return field('Walls', el('div', { class: 'wall-look' },
    select(textures, own?.texture || '', (v) => (v ? set({ texture: v }) : set(null))),
    own && widthControl(own.width ?? def.width, (v) => set({ width: v })),
    el('small', {}, own ? 'A wall shared with another room takes the thicker look.' : 'Pick a texture to give this room its own walls.')));
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
  if (sel.kind === 'placement') return [placementSection(item)];
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
    field('Setting', select(settings, m.setting, async (v) => {
      const s = catalog.settings.get(v);
      const useLook = s?.defaults ? await ask(`Switch to the ${s.name} default look too?`, { ok: 'Switch look', cancel: 'Keep this look' }) : false;
      app.commit('Change setting', (map) => {
        map.setting = v;
        if (useLook) Object.assign(map.style, s.defaults);
      }, { prune: false });
    })),
    field('Palette', select(catalog.styles.palettes, m.style.palette, (v) => styleEdit('Palette', 'palette', v))),
    field('Shading', select(catalog.styles.shadings, m.style.shading, (v) => styleEdit('Shading', 'shading', v))),
    field('Grid', select(catalog.styles.grids, m.style.grid, (v) => styleEdit('Grid', 'grid', v))),
    field('Wall texture', select(WALL_TEXTURES, app.style.wall.texture, (v) => styleEdit('Wall texture', 'wallTexture', v)), 'Rooms can override this.'),
    field('Wall thickness', widthControl(app.style.wall.width, (v) => styleEdit('Wall thickness', 'wallWidth', v))),
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
    checkbox('Tactical overlay: cover and difficult terrain', app.showTactical, (v) => {
      app.showTactical = v;
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
        onclick: async () => {
          if (!(await ask(`Delete level "${current.name}" and everything on it?`, { ok: 'Delete level', danger: true }))) return;
          app.commit('Delete level', (map) => removeLevel(map, current.id), { prune: false });
          app.setLevel(Math.min(app.levelIndex, app.map.levels.length - 1));
        },
      }, 'Delete'),
    ),
    field('Outdoors', select([{ id: '', name: '— indoors —' }, ...GROUNDS], current.ground || '', (v) => app.commit('Outdoors', (map, level) => {
      if (v) level.ground = v;
      else delete level.ground;
    })), 'Outdoors the whole map is ground and its edge is no wall; drawn rooms become buildings.'),
    app.levelIndex > 0 && checkbox('Show level below as outlines', app.showBelow, (v) => {
      app.showBelow = v;
      app.requestRender();
    }),
    el('div', { class: 'actions' },
      el('button', { onclick: () => app.decorate(app.level.rooms.map((r) => r.id)), title: 'Decorate every tagged room on this level' }, 'Decorate all rooms'),
      el('button', { onclick: () => app.decorate(app.level.rooms.map((r) => r.id), { reroll: true }) }, 'Reroll all'),
      el('button', { onclick: () => app.addDoors(app.level.rooms.map((r) => r.id)), title: 'Join every tagged room to its neighbours' }, 'Add doors'),
    ),
    el('p', { class: 'hint' }, 'PageUp / PageDown switch levels.'),
  );
}

function generateSection() {
  const styles = app.setting?.generator || [];
  if (!styles.length) return null;
  if (!styles.some((g) => g.id === app.opts.genStyle)) app.opts.genStyle = styles[0].id;
  app.opts.genRooms ??= 8;
  const count = el('output', {}, String(app.opts.genRooms));
  return section(
    'Generate',
    field('Style', select(styles, app.opts.genStyle, (v) => app.setOpt('genStyle', v))),
    field('Rooms', el('div', { class: 'row' },
      el('input', {
        type: 'range', min: 3, max: 24, step: 1, value: app.opts.genRooms,
        oninput: (e) => {
          app.opts.genRooms = Number(e.target.value);
          count.textContent = e.target.value;
        },
      }),
      count)),
    checkbox('Combat-ready rooms (cover spread over the floor)', !!app.opts.genCombat, (v) => (app.opts.genCombat = v)),
    el('div', { class: 'actions' },
      el('button', {
        class: 'primary',
        title: 'Replace this level with a new layout: rooms, corridors, doors and decoration',
        onclick: async () => {
          const empty = !app.level.shapes.length;
          if (!empty && app.generatedRev !== app.rev && !(await ask('Replace everything on this level with a generated layout? (Undo brings it back.)', { ok: 'Generate', danger: true }))) return;
          app.generateLevel({ styleId: app.opts.genStyle, count: app.opts.genRooms, combat: app.opts.genCombat });
        },
      }, app.generatedRev === app.rev ? 'Generate another' : 'Generate level')),
    el('p', { class: 'hint' }, 'Every click gives a new layout. Edit it like any map afterwards.'),
  );
}

let panelTimer = null;
function renderPanel() {
  panelTimer = null;
  const panel = $('panel');
  const scroll = panel.scrollTop;
  panel.replaceChildren(
    el('div', { class: 'panel-close' }, el('button', { type: 'button', onclick: () => document.body.classList.remove('panel-open') }, 'Close ✕')),
    toolSection(), ...selectionSections().filter(Boolean), levelSection(), generateSection(), mapSection());
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
  if (reason === 'snap') {
    const mode = SNAP_MODES.find((m) => m.id === app.snapMode);
    actions.snap.textContent = mode.name;
    actions.snap.title = mode.title;
    return;
  }
  if (reason === 'status') {
    $('status-message').textContent = app.statusMessage || '';
    return;
  }
  for (const [id, b] of toolButtons) b.classList.toggle('on', id === app.tool?.id);
  const placementSelected = app.selection?.kind === 'placement';
  actions.undo.disabled = !app.undoStack.length;
  actions.redo.disabled = !app.redoStack.length;
  actions.del.disabled = !app.selection;
  actions.left.disabled = actions.right.disabled = !(placementSelected || app.tool?.id === 'asset');
  actions.done.hidden = !['poly', 'wall', 'arc'].includes(app.tool?.id);
  actions.snap.textContent = SNAP_MODES.find((m) => m.id === app.snapMode).name;
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
    if (type === 'keydown' && ctrl && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      exportDialog();
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
