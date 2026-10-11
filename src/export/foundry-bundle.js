// One-file Foundry export: the scene and its background images in a single .mapweaver.json,
// plus the Script macro that imports it. The GM sets the macro up once; after that every map
// is: run the macro, pick the file. The macro uploads the images into the world's folder
// (worlds/<world>/map-weaver/<map>/), points the scene at them and creates the scene with
// Foundry's own Import Data, so it gets exactly what a manual import would.

export const BUNDLE_FORMAT = 'map-weaver-foundry';

/** Placeholder the scene uses for an image path until the macro knows where it uploaded it. */
export const imageRef = (name) => `@image/${name}`;

/** Base64 of a blob (chunked, so big PNGs don't overflow the call stack). */
export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * The bundle: {format, version, slug, scene, images: [{name, data (base64 PNG)}], journal}.
 * journal (read by the Foundry module, ignored by the macro): the GM's room key and secrets,
 * {name, rooms: [{n, title, notes, hidden, level, x, y}], secrets: [{name, kind, level, x, y, room}]}
 * with x, y in scene pixels and level the index of the scene level.
 */
export function makeBundle({ slug, scene, images, journal = null }) {
  return { format: BUNDLE_FORMAT, version: 2, slug, exported: new Date().toISOString(), scene, images, journal };
}

/**
 * The room key and the secrets of a map, for Foundry journal pages and GM-only map pins.
 *  key:       roomKey() entries
 *  resolve:   placement -> {meta} (to find secrets and traps)
 */
export function journalData(map, { key, resolve, pps }) {
  const rooms = key.map((e) => ({
    n: e.n, title: e.title, notes: e.notes || '', hidden: !!e.tag.hidden, level: e.levelIndex,
    x: Math.round(e.at[0] * pps), y: Math.round(e.at[1] * pps),
  }));
  const numberOf = new Map(key.map((e) => [e.tag.id, e.n]));
  const secrets = [];
  map.levels.forEach((lv, level) => {
    for (const p of lv.placements) {
      const meta = resolve(p)?.meta;
      if (!meta?.gmOnly) continue;
      secrets.push({
        name: meta.name, kind: meta.tags?.includes('trap') ? 'trap' : 'secret', level,
        x: Math.round(p.x * pps), y: Math.round(p.y * pps), room: numberOf.get(p.room) ?? null,
      });
    }
  });
  return { name: map.name, rooms, secrets };
}

/** The importer macro (a Foundry Script macro, run by the GM). */
export const IMPORTER_MACRO = `// Map Weaver importer: pick a .mapweaver.json file exported from Map Weaver. Its images are
// uploaded to worlds/<this world>/map-weaver/<map>/ and the scene is created and opened.
const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
if (!game.user.isGM) return ui.notifications.warn("Map Weaver: only a GM can import scenes.");
const ensureDir = async (parent, name) => {
  const path = \`\${parent}/\${name}\`;
  const listing = await FP.browse("data", parent).catch(() => null);
  const exists = listing?.dirs?.some((d) => d.replace(/\\/$/, "").split("/").pop() === name);
  if (!exists) await FP.createDirectory("data", path, {});
  return path;
};
const input = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
input.addEventListener("change", async () => {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const bundle = JSON.parse(await file.text());
    if (bundle.format !== "${BUNDLE_FORMAT}") throw new Error("this isn't a Map Weaver Foundry export");
    ui.notifications.info(\`Map Weaver: importing \${bundle.scene.name}…\`);
    const base = await ensureDir(\`worlds/\${game.world.id}\`, "map-weaver");
    const dir = await ensureDir(base, bundle.slug || "map");
    const paths = {};
    for (const img of bundle.images) {
      const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
      const res = await FP.upload("data", dir, new File([bytes], img.name, { type: "image/png" }), {}, { notify: false });
      paths[img.name] = res?.path || \`\${dir}/\${img.name}\`;
    }
    const json = JSON.stringify(bundle.scene).replace(/"@image\\/([^"]+)"/g, (_, n) => JSON.stringify(paths[n] ?? n));
    const scene = await Scene.create({ name: bundle.scene.name });
    await scene.importFromJSON(json);
    try {
      const t = await scene.createThumbnail();
      if (t?.thumb) await scene.update({ thumb: t.thumb });
    } catch (e) { /* the thumbnail is a nicety */ }
    await scene.view();
    ui.notifications.info(\`Map Weaver: \${bundle.scene.name} imported.\`);
  } catch (err) {
    console.error(err);
    ui.notifications.error(\`Map Weaver: import failed: \${err.message}\`);
  }
});
input.click();
`;
