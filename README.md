# Map Weaver

A local, browser-based tool for drawing 2D top-down battle maps for tabletop RPGs.
Draw the rooms, tag each one with a room type, and (from build step 4) let the decorator furnish them.

## Run it

Needs [Node.js](https://nodejs.org/) 18 or newer. Nothing to install.

```
node serve.js
```

Then open <http://127.0.0.1:5173/>. Maps are saved as JSON in the `maps/` folder.
Set `PORT` to use another port.

## Drawing

| Tool | Key | What it does |
| --- | --- | --- |
| Select | V | Select a room, wall or door; drag to move; Delete removes |
| Rectangle | R | Drag a room. Corner rounding in the panel |
| Circle | C | Drag from the centre |
| Polygon | P | Click corners at any angle; click the first corner or press Enter to close |
| Cave | K | Drag freehand; the outline is smoothed and roughened |
| Floor brush | B | Paint floor squares |
| Wall | W | Click grid points to chain walls, including diagonals |
| Arc wall | A | Centre, start point, then sweep round |
| Door | D | Click a wall. Door, double, secret, locked, portcullis, sliding, archway, window |
| Stairs & lifts | S | Stairs (drag foot to top), spiral stairs, ladders, lifts, trapdoors |
| Balcony edge | G | Click an edge of an open-to-below area: railing, full wall or open drop |
| Room type | T | Click inside a room to tag it; right-click clears |
| Assets | Q | Pick from the library and click to place. Right-click or `]` turns 90°, Shift+`[` `]` 15° |
| Erase | E | Click a door, wall or shape to delete it |

- **Alt** while drawing a shape: cut away floor instead of adding it.
- **Shift**: snap to half squares. **Ctrl**: no snapping.
- **Open to below** (shape mode): balconies, galleries and mezzanines. The edges get railings;
  the level below shows through, faded. Stairs cut their own opening in the level above.
- **Levels**: add, rename and delete in the panel; PageUp / PageDown switch. The level below
  shows as pink outlines for lining things up.
- **Separate room** (panel): the shape gets its own walls, even where it touches other floor.
  Turn it off to extend the floor it touches instead.
- Pan with the middle mouse button or Space + drag. Wheel zooms. **F** fits the map.
- Selected asset: drag to move, drag its round handle to turn it (15° steps, Ctrl for free),
  `[` `]` turn 90°, Shift+`[` `]` turn 15°, Shift+D duplicates, Delete removes. The panel has an
  angle box and size fields for resizable pieces (tables, shelves, rugs...).
- Ctrl+Z / Ctrl+Y undo and redo. Ctrl+S saves, Ctrl+O opens.

## Decorating

Tag a room (Room type tool) and it is furnished straight away; untick "Decorate rooms when
tagged" to do it by hand. Select a room to change its density (light by default), decorate
again, **Reroll** for a new layout, or **Clear**. The Levels panel decorates or rerolls every
room on the level. Pieces you place or move by hand are kept when a room is rerolled.

The decorator follows each asset's placement rule, never overlaps pieces, keeps two squares
clear in front of doors and a ring round stairs, ladders and lifts, leaves balcony edges to
balcony pieces, and only accepts a piece if every entrance can still reach every other.
Corridors (rooms 3 squares or narrower) only get pieces along their walls.

## Assets

SVG files under `assets/` (`common/` holds ones shared by several settings). Each file carries
its own metadata as JSON inside `<metadata id="map-weaver-asset">`: settings, footprint in
squares, room types, placement rule (wall, corner, centre, door, balcony, free), whether it
blocks movement or vision, and which side faces the wall. Shapes use the classes `o s m k p h l t d`
so they recolour to the map's palette. See `src/assets/meta.js` for every field.

The starter sets are generated: edit `src/assets/starter.js` and run

```
node tools/generate-assets.js
```

To add your own, drop an SVG with that metadata block into `assets/` and reload.

## Tests

```
node --test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it is put together and the build plan.
