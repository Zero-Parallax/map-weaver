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

## Phones and tablets

The editor works by touch: one finger draws and selects, two fingers pan and pinch-zoom. On a
touch screen a bar along the bottom stands in for keys and right-click: undo, redo, Done
(finish a polygon or chain of walls), cancel, turn 90°, delete, snapping (whole squares, half
squares, off), fit, and ☰ for the options panel, which slides up from the bottom on small screens.

Hosted as plain files (no `node serve.js`), the app runs in browser-only mode: **Save**
downloads the map file, **Open** loads one, exports download, and importing your own PNG art is
switched off. The starter assets come from `assets/index.json`.

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
- **Rooms** (panel, for added floor): how a new shape joins what is already there.
  **Merge** opens it into the floor it touches, making one larger room. **On top** gives it its
  own walls, removing walls of earlier rooms inside it (also how you draw a room inside a room).
  **Overlap** gives it its own walls and keeps the earlier ones, so where two rooms cross
  becomes a third space. Change it later on any selected shape.
- **Walls**: the Map panel sets the default texture (solid, double line, stone blocks, brick,
  wooden planks, rough, dashed) and thickness. Select a room to give it its own; a wall shared
  by two rooms takes the thicker look.
- Pan with the middle mouse button or Space + drag. Wheel zooms. **F** fits the map.
- Selected asset: drag to move, drag its round handle to turn it (15° steps, Ctrl for free),
  `[` `]` turn 90°, Shift+`[` `]` turn 15°, Shift+D duplicates, Delete removes. The panel has an
  angle box and size fields for resizable pieces (tables, shelves, rugs...).
- Ctrl+Z / Ctrl+Y undo and redo. Ctrl+S saves, Ctrl+O opens.

## Exporting PNGs

**Export PNG** (Ctrl+E) renders the current level or every level at the pixels per square you
choose, with no editor overlays. Options: how open-to-below areas are filled (transparent for
stacking in Foundry, faded level below for printing, or solid) and whether everything outside
the building is kept or made transparent. Files go to the `exports/` folder
(`<map>-L<n>-<level>.png`) and/or download in the browser. Every level has the same size, so
they line up.

## Foundry VTT (v14, built-in Scene Levels)

**Foundry** in the top bar exports one scene for the whole map:

- a Level per map level (elevation band from the level heights, background image, lower
  levels visible from above);
- walls, doors (door, secret, locked, portcullis, window; archways stay open) and, optionally,
  walls round vision-blocking assets, each tagged with its level;
- railings as two walls on the same line: one blocks movement both ways, the other blocks
  sight and light only from the open side, so you can see down from a balcony but not up onto it.
  If Foundry blocks the wrong side, tick "Flip one-way railing sight" and export again;
- wall complexity (high / medium / low) sets how closely walls follow curves and caves.

Files land in `exports/`. Copy the PNGs into your Foundry Data folder at the path you entered,
create a scene, right-click it and choose **Import Data**, then pick the `.foundry-scene.json`.

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

The starter sets are generated: edit the drawings in `src/assets/starter/` (common, fantasy,
sci-fi; shared pieces in `src/assets/motifs.js`) and run

```
node tools/generate-assets.js
```

To add your own SVG, drop a file with that metadata block into `assets/` and reload.

**Your own PNG art:** in the Assets panel choose **Import PNG art…**, pick PNG files and tag
each one: settings, size in squares (guessed from your art's pixels per square), placement,
the side that faces the wall, layer, what it blocks, room types, weights and search tags. The
tags are written into the PNG itself (an `iTXt` chunk) and the file is saved to
`assets/imported/`. Imported pieces work with the decorator like any other asset; they are
drawn as they are rather than recoloured. Select one in the library to **Edit tags** or delete it.

## Tests

```
node --test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it is put together and the build plan.
