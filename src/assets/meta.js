// Asset metadata, stored inside each SVG as JSON in <metadata id="map-weaver-asset">.
//
// {
//   id:            unique, e.g. "classic.chest"
//   name:          shown in the library
//   settings:      settings it belongs to, e.g. ["classic", "fantasy"]
//   footprint:     {w, h} in squares, in the asset's own orientation
//   roomTypes:     room type ids it suits; ["*"] = any room
//   placement:     wall | corner | centre | door | balcony | free
//   wallSide:      side facing the wall in the asset's own orientation: n | e | s | w (default n)
//                  For corner assets the top-left corner goes into the room corner.
//   blocksMovement / blocksVision: for tokens and for Foundry export
//   layer:         floor (rugs, decals) | object | overhead
//   weight:        how often the decorator picks it relative to others (default 1)
//   min / max:     how many per room the decorator aims for (max 0 = no limit)
//   facing:        optional; "focal" = seats that turn to face the room's showpiece (pews)
//   clutter:       small decal (cracks, stains, papers) scattered after the furniture by the
//                  room's clutter amount, not part of the furnishing
//   tags:          free-form words for search
//   generator:     {id, params} if made by a parametric generator (the app can remake it at
//                  other sizes); sizes: allowed ranges the decorator may pick from
// }

export const PLACEMENTS = ['wall', 'corner', 'centre', 'door', 'balcony', 'free'];

/** Starter assets that were merged into another, so older maps still show something. */
export const ASSET_ALIASES = {
  'nav-station': 'console',
  'comms-station': 'console',
  'wall-display': 'console',
  terminal: 'console',
  'food-dispenser': 'kitchenette',
  'crew-locker': 'locker',
  'seed-rack': 'locker',
  'tool-wall': 'locker',
  'eva-suit': 'armour-rack',
  'restraint-chair': 'pilot-seat',
  'parts-bin': 'goods-bin',
  'growth-pod': 'med-bed',
  'cooling-unit': 'turbine',
  beacon: 'landing-lights',
  'waiting-bench': 'sofa',
  'side-plant': 'grow-tower',
  'scroll-shelf': 'bookshelf',
  bust: 'statue',
  bucket: 'barrel',
};
export const LAYERS = ['floor', 'object', 'overhead'];
export const SIDES = ['n', 'e', 's', 'w'];

const META_RE = /<metadata[^>]*id="map-weaver-asset"[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/metadata>/;

export function writeMeta(meta) {
  return `<metadata id="map-weaver-asset"><![CDATA[${JSON.stringify(meta)}]]></metadata>`;
}

/** Read metadata from SVG text. Returns null if the file has none. */
export function readMeta(svgText) {
  const m = META_RE.exec(svgText);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Fill defaults and check values. Returns {meta, errors}. */
export function normalizeMeta(raw) {
  const errors = [];
  const meta = { ...raw };
  if (!meta.id || typeof meta.id !== 'string') errors.push('missing id');
  meta.name ||= meta.id;
  meta.settings = Array.isArray(meta.settings) ? meta.settings : meta.setting ? [meta.setting] : [];
  if (!meta.settings.length) errors.push('no settings');
  const fp = meta.footprint || {};
  if (!(fp.w > 0 && fp.h > 0)) errors.push('footprint needs w and h');
  meta.footprint = { w: fp.w || 1, h: fp.h || 1 };
  meta.roomTypes = Array.isArray(meta.roomTypes) && meta.roomTypes.length ? meta.roomTypes : ['*'];
  if (!PLACEMENTS.includes(meta.placement)) meta.placement = 'free';
  if (!SIDES.includes(meta.wallSide)) meta.wallSide = 'n';
  if (!LAYERS.includes(meta.layer)) meta.layer = 'object';
  meta.blocksMovement ??= meta.layer === 'object';
  meta.blocksVision ??= false;
  meta.weight ??= 1;
  meta.min ??= 0;
  meta.max ??= 0;
  meta.tags ??= [];
  meta.clutter = !!meta.clutter;
  return { meta, errors };
}

export function suitsRoom(meta, roomType) {
  return meta.roomTypes.includes('*') || meta.roomTypes.includes(roomType);
}
