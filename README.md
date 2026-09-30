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
| Room type | T | Click inside a room to tag it; right-click clears |
| Erase | E | Click a door, wall or shape to delete it |

- **Alt** while drawing a shape: cut away floor instead of adding it.
- **Shift**: snap to half squares. **Ctrl**: no snapping.
- **Separate room** (panel): the shape gets its own walls, even where it touches other floor.
  Turn it off to extend the floor it touches instead.
- Pan with the middle mouse button or Space + drag. Wheel zooms. **F** fits the map.
- Ctrl+Z / Ctrl+Y undo and redo. Ctrl+S saves, Ctrl+O opens.

## Tests

```
node --test
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it is put together and the build plan.
