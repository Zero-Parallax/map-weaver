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
| Assets | Q | Pick from the library and click to place. Right-click or `]` rotates |
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
- Ctrl+Z / Ctrl+Y undo and redo. Ctrl+S saves, Ctrl+O opens.

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
