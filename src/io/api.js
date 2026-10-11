// Talks to serve.js, and loads settings from the settings folder.
// Without serve.js (the app hosted as plain files) there is no API: see hasServer().

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body;
}

let serverAvailable = null;

/**
 * Map Weaver opened inside Foundry by the companion module: its API on the parent page (same
 * origin), or null. Maps and exports are then kept in the Foundry world's files.
 */
export const foundryHost = (() => {
  try {
    return window.parent !== window ? window.parent.MapWeaverFoundry || null : null;
  } catch {
    return null;
  }
})();

/** True when serve.js is behind the page; false when it is hosted as plain files. */
export async function hasServer() {
  // serve.js runs on your own machine or network; anywhere else (itch.io, a claude.ai artifact)
  // the page is plain files, so don't even ask (it only leaves an error in the console).
  const host = location.hostname;
  const local = location.protocol.startsWith('http') && (host === 'localhost' || host === '[::1]' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.endsWith('.local'));
  if (!local || foundryHost) serverAvailable = false;
  if (serverAvailable === null) {
    try {
      const res = await fetch('api/maps');
      serverAvailable = res.ok && (res.headers.get('content-type') || '').includes('json');
    } catch {
      serverAvailable = false;
    }
  }
  return serverAvailable;
}

export async function listMaps() {
  if (foundryHost) return foundryHost.listMaps();
  return json(await fetch('api/maps'));
}

export async function loadMapFile(name) {
  if (foundryHost) return foundryHost.loadMap(name);
  return json(await fetch('api/maps/' + encodeURIComponent(name)));
}

export async function saveMapFile(name, text) {
  if (foundryHost) return foundryHost.saveMap(name, text);
  return json(
    await fetch('api/maps/' + encodeURIComponent(name), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    }),
  );
}

export async function saveExport(name, blob) {
  if (foundryHost) return foundryHost.saveExport(name, blob);
  const type = name.endsWith('.json') ? 'application/json' : 'image/png';
  return json(await fetch('api/exports/' + encodeURIComponent(name), { method: 'PUT', headers: { 'Content-Type': type }, body: blob }));
}

/** Settings catalog: {styles, settings: Map(id -> setting)}. */
export async function loadCatalog() {
  const [index, styles] = await Promise.all([
    fetch('settings/index.json').then(json),
    fetch('settings/styles.json').then(json),
  ]);
  const settings = new Map();
  for (const id of index.settings) {
    try {
      const s = await fetch(`settings/${id}/setting.json`).then(json);
      settings.set(s.id, s);
    } catch (err) {
      console.warn(`Setting "${id}" failed to load:`, err);
    }
  }
  return { styles, settings };
}
