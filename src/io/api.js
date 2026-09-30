// Talks to serve.js, and loads settings from the settings folder.
// Without serve.js (the app hosted as plain files) there is no API: see hasServer().

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body;
}

let serverAvailable = null;

/** True when serve.js is behind the page; false when it is hosted as plain files. */
export async function hasServer() {
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
  return json(await fetch('api/maps'));
}

export async function loadMapFile(name) {
  return json(await fetch('api/maps/' + encodeURIComponent(name)));
}

export async function saveMapFile(name, text) {
  return json(
    await fetch('api/maps/' + encodeURIComponent(name), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    }),
  );
}

export async function saveExport(name, blob) {
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
