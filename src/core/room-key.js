// Room numbers and the GM's room key. Rooms are numbered across the whole map, bottom level
// first, then top to bottom and left to right within a level (in bands of four squares, so
// rooms side by side read in order). Corridors are left out.

import { regionAt } from './rooms.js';

export const UNNUMBERED = ['corridor'];

/**
 * Numbered rooms of a map.
 *  geometry(level): derived geometry for a level
 *  typeName(id):    display name of a room type
 * Returns [{n, levelIndex, tag, at (label point), title, notes}].
 */
export function roomKey(map, { geometry, typeName = (id) => id, skip = UNNUMBERED }) {
  const out = [];
  let n = 0;
  map.levels.forEach((level, levelIndex) => {
    const geo = geometry(level);
    const rooms = [];
    for (const tag of level.rooms) {
      if (skip.includes(tag.type)) continue;
      const index = regionAt(geo.rooms, tag.at);
      const region = geo.rooms.regions[index];
      if (!region || region.tag !== tag) continue;
      rooms.push({ tag, at: region.labelAt });
    }
    rooms.sort((a, b) => Math.floor(a.at[1] / 4) - Math.floor(b.at[1] / 4) || a.at[0] - b.at[0]);
    for (const r of rooms) {
      out.push({ n: ++n, levelIndex, tag: r.tag, at: r.at, title: r.tag.name?.trim() || typeName(r.tag.type), notes: r.tag.notes?.trim() || '' });
    }
  });
  return out;
}
