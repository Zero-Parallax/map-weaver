// The Help dialog: how to use Map Weaver, keyboard keys, and credits.

import { el } from './dom.js';

const h = (text) => el('h3', {}, text);
const p = (...parts) => el('p', {}, ...parts);
const b = (text) => el('strong', {}, text);
const list = (...items) => el('ul', {}, ...items.map((i) => el('li', {}, ...[].concat(i))));

export function helpDialog() {
  const dialog = el('dialog', { class: 'export-dialog help-dialog' });
  dialog.append(
    el('h2', {}, 'How to use Map Weaver'),
    el('div', { class: 'help-body' },
      p('Map Weaver makes old-school battle maps that furnish themselves. Draw or generate the rooms, say what each room is for, and it fills them with furniture that makes sense: beds away from the door, stools at the bar, a walkway kept clear through the middle.'),

      h('Quick start'),
      list(
        [b('Generate'), ': pick a setting (fantasy or sci-fi), a style (dungeon, inn, station, ship…), how many rooms and levels.'],
        ['Click a room to see its panel on the right. ', b('Reroll'), ' gives it a new layout; change its type, mood or how full it is.'],
        [b('Export'), ': a PNG for printing or any VTT, or a ready-made Foundry VTT scene.'],
      ),

      h('Drawing your own'),
      list(
        [b('Room (R)'), ': drag out rooms (rectangles, circles, polygons, caves, or paint squares). Give a room a type to furnish it.'],
        [b('Corridor (H)'), ', ', b('Wall (W)'), ', ', b('Door (D)'), ': join rooms up. Doors are added for you when you tag a room.'],
        [b('Terrain (N)'), ': water, lava, chasms, roads, mud and more.'],
        [b('Stairs & edges (S)'), ': stairs, ladders and lifts between levels; balconies and drops.'],
        [b('Assets (Q)'), ': place any piece by hand. Hand-placed pieces stay when a room is rerolled.'],
        [b('Select (V)'), ': click to select; drag to move; right-click for more.'],
      ),

      h('Moods'),
      p('How cared-for a place is: Pristine, Lived-in, Neglected, Ransacked or Ruined. Set it for the map (Map tab), override it per room (a spotless manor with a grim basement), or set a single bed, table or console by hand with ', b('State'), ' and ', b('Shuffle'), '. Moods change the details (made beds or slashed mattresses, stocked shelves or books on the floor), never where the furniture stands.'),

      h('Hidden rooms and secrets'),
      p('Generated maps usually hide a room behind a secret door; you can add one behind any room with ', b('More… → Add hidden room'), ', or tick ', b('Hidden room'), ' on a room you drew. Secrets (a stash under a loose flagstone, a hidden panel) appear now and then. All of these show on the GM map only.'),

      h('Levels and ruins'),
      p('The ', b('Levels'), ' tab adds floors above and below; PageUp and PageDown move between them. ', b('Ruin'), ' turns the map into its abandoned version: breached walls, rubble, lights out. Undo brings it back.'),

      h('Saving'),
      p(b('Save'), ' downloads your map as a ', el('code', {}, '.map.json'), ' file; ', b('File → Open'), ' loads it again. Keep those files: the browser does not keep your maps for you.'),

      h('Exporting'),
      list(
        [b('PNG'), ': the ', b('Player'), ' version leaves out secret doors, hidden rooms, traps and secrets; the ', b('GM'), ' version shows everything, with numbered rooms and a room key.'],
        [b('Foundry VTT'), ': one file with the scene, walls, doors, lights and images. Set up the importer macro once (the export dialog shows how), then run it and pick the file.'],
      ),

      h('Keys'),
      list(
        'Ctrl+Z / Ctrl+Y: undo / redo. Ctrl+S: save.',
        '[ and ]: turn the selected piece 90°; Shift+[ and Shift+]: 15°. Shift+D: duplicate. Delete: remove.',
        'Mouse wheel or + and −: zoom. Space-drag or middle-drag: pan. F: fit the map.',
        'PageUp / PageDown: change level. Escape: cancel.',
      ),

      h('Credits'),
      p('All the artwork is drawn in code for Map Weaver and recolours with the map\'s palette. Maps and images you make are yours to use however you like.'),
      p('Shape maths: Clipper by Angus Johnson, under the Boost Software License 1.0.'),
    ),
    el('menu', {}, el('button', { type: 'button', class: 'primary', onclick: () => dialog.close() }, 'Close')),
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
