// Map Weaver for Foundry VTT: the Map Weaver editor in a Foundry window, and importing its maps
// as scenes.
//
//   Scenes sidebar → Map Weaver   opens the editor (the same app as the web version, bundled in
//                                 this module's app/ folder and shown in an iframe)
//   Scenes sidebar → Import       creates a scene from a .mapweaver.json file exported anywhere
//   In the editor: Send to scene  builds the scene straight away
//
// A scene gets its background images (uploaded into worlds/<world>/map-weaver/scenes/), walls,
// doors, lights and terrain regions, a journal entry with a page per room (the GM's room key),
// and GM-only map pins on every numbered room and on every secret and trap. Secrets and traps are
// pins rather than part of the image, so the players never see them.
//
// Maps saved from the editor are kept as files in worlds/<world>/map-weaver/maps/ and image
// exports in .../exports/, so they travel with the world.
//
// The editor talks to this module through window.MapWeaverFoundry (same origin, so the iframe
// can call it directly): listMaps, loadMap, saveMap, saveExport, importBundle.

const MODULE = 'map-weaver';
const BUNDLE_FORMAT = 'map-weaver-foundry';

const FP = () => foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
const baseDir = () => `worlds/${game.world.id}/map-weaver`;
const route = (path) => (foundry.utils?.getRoute ? foundry.utils.getRoute(path) : `/${path}`);
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** A name that is safe as a file name on every system. */
const fileSafe = (name) => String(name).trim().replace(/[\\/:*?"<>|#%]+/g, '-').replace(/\s+/g, ' ').slice(0, 80) || 'map';

// ---- files -------------------------------------------------------------------------

/** Make sure a folder (and its parents below worlds/<world>) exists. Returns the path. */
async function ensureDir(path) {
  const parts = path.split('/');
  let current = parts.slice(0, 2).join('/'); // worlds/<world> always exists
  for (const part of parts.slice(2)) {
    const listing = await FP().browse('data', current).catch(() => null);
    const next = `${current}/${part}`;
    const exists = listing?.dirs?.some((d) => decodeURIComponent(d).replace(/\/$/, '').split('/').pop() === part);
    if (!exists) await FP().createDirectory('data', next, {}).catch(() => {});
    current = next;
  }
  return path;
}

async function upload(dir, name, data, type) {
  await ensureDir(dir);
  const file = new File([data], name, { type });
  const res = await FP().upload('data', dir, file, {}, { notify: false });
  if (res === false || res?.status === 'error') throw new Error(res?.message || `could not upload ${name}`);
  return { path: res?.path || `${dir}/${name}` };
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ---- maps and exports (the editor's storage) -------------------------------------

async function listMaps() {
  const dir = `${baseDir()}/maps`;
  const listing = await FP().browse('data', dir).catch(() => null);
  return (listing?.files || [])
    .map((f) => decodeURIComponent(f.split('/').pop()))
    .filter((f) => f.endsWith('.map.json'))
    .map((f) => ({ name: f.slice(0, -'.map.json'.length), modified: null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function loadMap(name) {
  const res = await fetch(`${route(`${baseDir()}/maps/${encodeURIComponent(fileSafe(name))}.map.json`)}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function saveMap(name, text) {
  return upload(`${baseDir()}/maps`, `${fileSafe(name)}.map.json`, text, 'application/json');
}

async function saveExport(name, blob) {
  const type = name.endsWith('.json') ? 'application/json' : 'image/png';
  return upload(`${baseDir()}/exports`, fileSafe(name), blob, type);
}

// ---- importing a bundle ----------------------------------------------------------

/**
 * Create a scene from a Map Weaver bundle: upload its images, import the scene data, then add
 * the room key journal and the GM pins. Returns the new Scene.
 */
async function importBundle(bundle) {
  if (!game.user.isGM) throw new Error('only a GM can create scenes');
  if (bundle?.format !== BUNDLE_FORMAT) throw new Error("this isn't a Map Weaver Foundry export");
  const name = bundle.scene?.name || 'Map Weaver map';
  ui.notifications.info(`Map Weaver: creating ${name}…`);

  // Images: a folder of their own per import, so re-importing never changes an older scene.
  const dir = `${baseDir()}/scenes/${fileSafe(bundle.slug || name).toLowerCase()}-${Date.now().toString(36)}`;
  const paths = {};
  for (const img of bundle.images || []) {
    paths[img.name] = (await upload(dir, img.name, base64ToBytes(img.data), 'image/png')).path;
  }
  const json = JSON.stringify(bundle.scene).replace(/"@image\/([^"]+)"/g, (_, n) => JSON.stringify(paths[n] ?? n));
  const scene = await Scene.create({ name });
  await scene.importFromJSON(json);

  if (bundle.journal) {
    try {
      await addJournal(scene, bundle.journal, bundle.scene.levels || []);
    } catch (err) {
      console.error(`${MODULE} | room key`, err);
      ui.notifications.warn(`Map Weaver: the scene is in, but the room key failed: ${err.message}`);
    }
  }
  try {
    const t = await scene.createThumbnail();
    if (t?.thumb) await scene.update({ thumb: t.thumb });
  } catch {
    // The thumbnail is a nicety.
  }
  await scene.view();
  ui.notifications.info(`Map Weaver: ${name} is ready.`);
  return scene;
}

/** Journal entry with the room key (GM only), linked to the scene, plus a pin per room and secret. */
async function addJournal(scene, journal, levelData) {
  const rooms = journal.rooms || [];
  const secrets = journal.secrets || [];
  const secretsIn = (n) => secrets.filter((s) => s.room === n);
  const loose = secrets.filter((s) => s.room == null || !rooms.some((r) => r.n === s.room));
  const pages = rooms.map((r, i) => {
    const parts = [];
    if (r.hidden) parts.push('<p><strong>Hidden room.</strong> Reached by a secret door; not on the players\' map.</p>');
    for (const line of String(r.notes || '').split(/\n+/).filter(Boolean)) {
      if (r.hidden && line.startsWith('Hidden room:')) continue;
      parts.push(`<p>${esc(line)}</p>`);
    }
    const here = secretsIn(r.n);
    if (here.length) parts.push(`<h3>Secrets</h3><ul>${here.map((s) => `<li>${esc(s.name)}${s.kind === 'trap' ? ' (trap)' : ''}</li>`).join('')}</ul>`);
    if (!parts.length) parts.push('<p></p>');
    return { name: `${r.n}. ${r.title}`, type: 'text', sort: (i + 1) * 100, text: { content: parts.join('') } };
  });
  if (loose.length) {
    pages.push({
      name: 'Secrets and traps', type: 'text', sort: (pages.length + 1) * 100,
      text: { content: `<ul>${loose.map((s) => `<li>${esc(s.name)}${s.kind === 'trap' ? ' (trap)' : ''}</li>`).join('')}</ul>` },
    });
  }
  const entry = await JournalEntry.create({
    name: `${scene.name}: room key`,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    pages,
    flags: { [MODULE]: { scene: scene.id } },
  });
  const pageByName = new Map(entry.pages.contents.map((p) => [p.name, p.id]));
  // Pins go on the level their room is on (scene levels keep the ids the export gave them).
  const levelInfo = (i) => ({ id: levelData[i]?._id, bottom: levelData[i]?.elevation?.bottom ?? 0 });
  const anchor = CONST.TEXT_ANCHOR_POINTS?.BOTTOM ?? 1;
  const pin = ({ x, y, level, pageName, text, icon, size }) => {
    const info = levelInfo(level);
    return {
      entryId: entry.id, pageId: pageByName.get(pageName) || null, x, y,
      elevation: info.bottom,
      levels: info.id ? [info.id] : undefined,
      texture: { src: icon },
      iconSize: size, text, fontSize: 28, textAnchor: anchor, global: false,
      flags: { [MODULE]: { level } },
    };
  };
  const notes = [
    ...rooms.map((r) => pin({ x: r.x, y: r.y, level: r.level, pageName: `${r.n}. ${r.title}`, text: String(r.n), icon: 'icons/svg/book.svg', size: 40 })),
    ...secrets.map((s) => {
      const room = rooms.find((r) => r.n === s.room);
      return pin({ x: s.x, y: s.y, level: s.level, pageName: room ? `${room.n}. ${room.title}` : 'Secrets and traps', text: s.name, icon: s.kind === 'trap' ? 'icons/svg/trap.svg' : 'icons/svg/eye.svg', size: 32 });
    }),
  ];
  if (notes.length) await scene.createEmbeddedDocuments('Note', notes);
  await scene.update({ journal: entry.id });
  return entry;
}

/** Ask for a .mapweaver.json file and import it. */
function importFromFile() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      await importBundle(JSON.parse(await file.text()));
    } catch (err) {
      console.error(`${MODULE} | import`, err);
      ui.notifications.error(`Map Weaver: import failed: ${err.message}`);
    }
  });
  input.click();
}

// ---- the editor window -------------------------------------------------------------

const { ApplicationV2 } = foundry.applications.api;

class MapWeaverEditor extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'map-weaver-editor',
    classes: ['map-weaver-editor'],
    tag: 'section',
    window: { title: 'Map Weaver', icon: 'fa-solid fa-map', resizable: true },
    position: { width: 1400, height: 880 },
  };

  get frame() {
    return this.element?.querySelector('iframe.map-weaver-frame') || null;
  }

  async _renderHTML() {
    const frame = document.createElement('iframe');
    frame.className = 'map-weaver-frame';
    frame.src = route(`modules/${MODULE}/app/index.html`);
    frame.setAttribute('allow', 'clipboard-write');
    return frame;
  }

  _replaceHTML(result, content) {
    // Keep the running editor when Foundry re-renders the window.
    if (!content.querySelector('iframe.map-weaver-frame')) content.replaceChildren(result);
  }

  setPosition(position) {
    // Fit the screen on first open.
    if (!this._mwSized) {
      this._mwSized = true;
      position = { ...position, width: Math.min(1500, window.innerWidth - 60), height: Math.min(960, window.innerHeight - 60) };
    }
    return super.setPosition(position);
  }

  async close(options = {}) {
    let dirty = false;
    try {
      dirty = !!this.frame?.contentWindow?.__mapWeaver?.app?.dirty;
    } catch {
      dirty = false;
    }
    if (dirty && !options.force) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'Map Weaver' },
        content: '<p>Close the editor? Unsaved changes to this map will be lost.</p>',
      });
      if (!ok) return this;
    }
    return super.close(options);
  }
}

let editor = null;
function openEditor() {
  if (!game.user.isGM) return ui.notifications.warn('Map Weaver is for the GM.');
  editor ??= new MapWeaverEditor();
  editor.render({ force: true });
  return editor;
}

// ---- wiring --------------------------------------------------------------------

const api = { importBundle, importFromFile, openEditor, listMaps, loadMap, saveMap, saveExport };

Hooks.once('init', () => {
  globalThis.MapWeaverFoundry = api;
});

Hooks.once('ready', () => {
  const mod = game.modules.get(MODULE);
  if (mod) mod.api = api;
});

// Buttons in the Scenes sidebar.
Hooks.on('renderSceneDirectory', (app, html) => {
  if (!game.user.isGM) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector('.map-weaver-actions')) return;
  const bar = document.createElement('div');
  bar.className = 'map-weaver-actions';
  const button = (icon, label, title, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = title;
    b.innerHTML = `<i class="${icon}"></i> ${label}`;
    b.addEventListener('click', (e) => {
      e.preventDefault();
      onClick();
    });
    return b;
  };
  bar.append(
    button('fa-solid fa-map', 'Map Weaver', 'Open the Map Weaver editor', openEditor),
    button('fa-solid fa-file-import', 'Import', 'Create a scene from a .mapweaver.json file', importFromFile),
  );
  const header = root.querySelector('.directory-header') || root.querySelector('header') || root;
  header.append(bar);
});
