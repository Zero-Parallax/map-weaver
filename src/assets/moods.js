// Moods: how cared-for a place is. A map has one; any room can override it (the immaculate
// manor with the grim basement). Mood changes the small things, never what a room is for:
// how beds are made, what is left on tables, how tidy shelves are, which floor clutter shows,
// and whether furniture has been knocked over. Ruined is the far end of the scale and also
// brings the structural damage (see generator/ruin.js).

import { hash } from '../core/rng.js';

export const MOODS = [
  { id: 'pristine', name: 'Pristine', hint: 'Spotless: beds made, tables laid, nothing out of place.' },
  { id: 'lived-in', name: 'Lived-in', hint: 'In daily use: rumpled bedding, food and mugs left out, a chair pulled back.' },
  { id: 'neglected', name: 'Neglected', hint: 'Left alone for a while: dust, cobwebs, gaps on the shelves, cracks.' },
  { id: 'ransacked', name: 'Ransacked', hint: 'Turned over: chairs knocked down, books on the floor, papers everywhere.' },
  { id: 'ruined', name: 'Ruined', hint: 'Abandoned for years: breached walls, collapsed floor, rubble, lights out.' },
];

export const DEFAULT_MOOD = 'lived-in';

/** 0 pristine, 1 lived-in, 2 neglected, 3 ransacked, 4 ruined. */
export function moodIndex(mood) {
  const i = MOODS.findIndex((m) => m.id === mood);
  return i < 0 ? 1 : i;
}

/**
 * The mood a room actually has: ruined if it was ruined, else its own, else the map's. A
 * neglected place ages unevenly: about one room in five is still kept up (lived-in) and one in
 * five has been turned over (ransacked), fixed per room so it doesn't flicker between edits.
 */
export function roomMood(map, tag) {
  if (tag?.ruin > 0) return 'ruined';
  if (tag?.mood) return tag.mood;
  const mood = map?.mood || DEFAULT_MOOD;
  if (mood === 'neglected' && tag?.seed != null) {
    const r = (hash(tag.seed, 'age') % 1000) / 1000;
    if (r < 0.2) return 'lived-in';
    if (r > 0.8) return 'ransacked';
  }
  return mood;
}

/** Default clutter amount for a mood (a room's own clutter setting wins). */
export const MOOD_CLUTTER = { pristine: 0.05, 'lived-in': 0.4, neglected: 0.7, ransacked: 0.9, ruined: 1 };

/**
 * How well stocked a room's supplies are (ration crates, trays, toolboxes): a share of the
 * normal amount. Pristine and lived-in rooms are fully stocked (a spotless kitchen is still full
 * of food); neglected ones have been half used up; ransacked ones were rummaged and strewn.
 */
export const SUPPLY_AMOUNT = { pristine: 1, 'lived-in': 1, neglected: 0.5, ransacked: 0.75, ruined: 0.35 };

/** Rooms that are mostly storage get more supplies. */
export const STOCKED_ROOMS = new Set(['kitchen', 'storeroom', 'cellar', 'mess-hall', 'cargo-bay', 'armoury', 'workshop', 'med-bay', 'clinic', 'cantina', 'market', 'shop']);

/**
 * Which moods each kind of floor clutter belongs to, as [from, to] mood indexes. Anything not
 * listed (grass, leaves, pebbles: natural things) shows in every mood.
 */
export const CLUTTER_MOODS = {
  papers: [1, 4],
  'spilled-ale': [1, 3],
  puddle: [1, 4],
  scorch: [1, 4],
  'loose-straw': [1, 4],
  cables: [1, 4],
  'oil-stain': [1, 4],
  bloodstain: [2, 4],
  // Cracks belong to old, rough places (see the room types that have them), in any mood but
  // spotless.
  cracks: [1, 4],
  'cracked-floor': [1, 4],
  cobweb: [2, 4],
  bones: [2, 4],
  rubble: [2, 4],
  debris: [3, 4],
  scrap: [3, 4],
  'sparking-cables': [3, 4],
  'broken-furniture': [3, 4],
};

/**
 * Clutter that turns up in any indoor room once it is this far gone (mood index), whatever the
 * room is for: cobwebs in a neglected bedroom, debris in a ransacked study. Not cracks: a
 * ship's deck or a tavern floor doesn't crack from being left alone.
 */
export const MOOD_ANYWHERE = { cobweb: 2, papers: 3, debris: 3, scrap: 3, 'broken-furniture': 3 };

export function clutterSuitsMood(id, mood) {
  const range = CLUTTER_MOODS[id];
  if (!range) return true;
  const i = moodIndex(mood);
  return i >= range[0] && i <= range[1];
}
