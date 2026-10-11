// How furniture relates to other furniture and to the room: the "house rules" the decorator
// follows so a room reads as lived in rather than filled at random.
//
// RELATIONS: a piece that belongs with another (its anchor). Keyed by the piece's asset id.
//   to:     anchor asset ids, in order of preference
//   how:    beside  touching the anchor, backs against the same wall (nightstand by a bed head)
//           front   in the space in front of the anchor (stools at a bar, a seat at a console)
//           near    within `dist` squares of it (anvil by the forge)
//           flank   one each side of it, mirrored (candelabras either side of an altar)
//   count:  how many to add with each anchor ([min, max], or a number); flank defaults to 2
//   chance: how often the companions come with the anchor (default 0.8)
//   soft:   only a preference when placing normally; never added as a companion
//   faces:  the piece turns its wall side (its "front-facing" side) towards the anchor
//
// ROWS: pieces that line up with others of their kind along a wall or in a grid, with this
// many free squares between them (beds in a barracks, server racks, grow towers).
//
// PRIVATE pieces keep away from doors (beds, wardrobes); STORAGE goes to the far corners;
// ENTRANCE pieces want to be near a door (coat racks, suit lockers, security desks).

export const RELATIONS = {
  // Bedrooms and homes
  nightstand: { to: ['bed', 'double-bed', 'bunk-bed'], how: 'beside', count: 1, chance: 0.85 },
  armchair: { to: ['fireplace', 'bookshelf'], how: 'near', dist: 2 },
  wardrobe: { to: ['bed', 'double-bed'], how: 'near', dist: 3, soft: true },
  // Taverns, kitchens and cantinas
  stool: { to: ['bar-counter'], how: 'front', count: [2, 4], chance: 0.9 },
  'bar-stool': { to: ['cantina-bar'], how: 'front', count: [2, 4], chance: 0.9 },
  'keg-rack': { to: ['bar-counter'], how: 'near', dist: 3 },
  'wine-rack': { to: ['keg-rack', 'bar-counter'], how: 'near', dist: 3, soft: true },
  barrel: { to: ['keg-rack', 'bar-counter', 'stove', 'barrel'], how: 'near', dist: 2, soft: true },
  sacks: { to: ['stove', 'kitchen-counter', 'barrel', 'crate'], how: 'near', dist: 2, soft: true },
  crate: { to: ['crate', 'barrel', 'sacks'], how: 'near', dist: 1, soft: true },
  'kitchen-counter': { to: ['stove'], how: 'beside', count: 1, chance: 0.7 },
  cauldron: { to: ['stove', 'fireplace'], how: 'near', dist: 3, soft: true },
  // Smithy and workshop
  anvil: { to: ['forge'], how: 'near', dist: 2, count: 1, chance: 1 },
  grindstone: { to: ['forge', 'anvil'], how: 'near', dist: 3 },
  workbench: { to: ['forge', 'anvil'], how: 'near', dist: 4, soft: true },
  'tool-cart': { to: ['fabricator', 'workbench', 'welding-station', 'power-loader'], how: 'near', dist: 2 },
  'robot-arm': { to: ['fabricator'], how: 'near', dist: 2 },
  'fuel-drum': { to: ['generator', 'fuel-pump', 'drill-rig', 'fuel-drum'], how: 'near', dist: 2, soft: true },
  'cargo-crate': { to: ['cargo-crate', 'container', 'fuel-drum'], how: 'near', dist: 1, soft: true },
  // Temples, crypts, throne rooms
  candelabra: { to: ['altar', 'throne', 'idol', 'sarcophagus'], how: 'flank', chance: 0.9 },
  brazier: { to: ['altar', 'idol', 'throne'], how: 'flank', chance: 0.7 },
  statue: { to: ['throne', 'idol'], how: 'flank', soft: true },
  lectern: { to: ['altar', 'bookshelf'], how: 'near', dist: 2 },
  urn: { to: ['sarcophagus', 'altar'], how: 'near', dist: 2, soft: true },
  // Ships, stations and labs
  'pilot-seat': { to: ['console'], how: 'front', count: 1, chance: 0.85, faces: true },
  'med-cabinet': { to: ['med-bed', 'med-scanner'], how: 'near', dist: 3, soft: true },
  'specimen-tank': { to: ['lab-bench', 'specimen-tank'], how: 'near', dist: 2, soft: true },
  'water-tank': { to: ['hydroponics', 'plant-bed', 'grow-tower'], how: 'near', dist: 3, soft: true },
  'holding-bench': { to: ['security-desk'], how: 'near', dist: 4, soft: true },
  'charging-pad': { to: ['power-loader', 'fabricator'], how: 'near', dist: 3, soft: true },
};

export const ROWS = {
  bed: 1,
  'bunk-bed': 1,
  bunk: 1,
  'med-bed': 1,
  'server-rack': 0,
  locker: 0,
  'weapon-locker': 1,
  'grow-tower': 1,
  'cloning-vat': 1,
  'plant-bed': 1,
  hydroponics: 1,
  'specimen-tank': 0,
  sarcophagus: 1,
  gravestone: 1,
  pillar: 2,
};

export const PRIVATE = new Set(['bed', 'double-bed', 'bunk-bed', 'bunk', 'sleep-pod', 'med-bed', 'wardrobe', 'sarcophagus', 'cell-toilet']);
export const STORAGE = new Set(['barrel', 'crate', 'sacks', 'cargo-crate', 'fuel-drum', 'goods-bin', 'chest', 'container', 'ore-pile', 'straw', 'keg-rack', 'wine-rack']);
export const ENTRANCE = new Set(['coat-rack', 'armour-rack', 'weapon-locker', 'security-desk', 'holding-bench', 'scanner-arch', 'doormat']);

/**
 * What a room type is for: it gets at least one piece from each group (a bedroom always has a
 * bed of some kind, a tavern somewhere to sit and eat). Pieces not in the setting are ignored.
 */
export const ROOM_NEEDS = {
  bedroom: [['bed', 'double-bed', 'bunk-bed']],
  barracks: [['bunk-bed', 'bed']],
  'crew-quarters': [['bunk', 'sleep-pod']],
  apartment: [['sleep-pod']],
  tavern: [['round-table', 'table-chairs', 'long-table']],
  'great-hall': [['long-table', 'table-chairs']],
  'mess-hall': [['mess-table']],
  cantina: [['cantina-table', 'mess-table']],
  library: [['bookshelf']],
};

/** Relations whose anchors include this asset: the pieces to add with it. */
export function companionsOf(anchorId) {
  return Object.entries(RELATIONS).filter(([, r]) => !r.soft && r.to.includes(anchorId)).map(([id, r]) => ({ id, rel: r }));
}
