# Map Weaver

A local, browser-based tool for drawing 2D top-down battle maps for tabletop RPGs.
Draw the rooms (or generate a whole level), tag each one with a room type, and let the decorator
add doors, furniture, clutter and cover.

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

## Using it

A new map opens on a start screen: **Generate** one (setting, style, rooms, levels), start a
**blank map** and draw your own, or **open** a saved one. The top bar has **File**, **Save**,
**Generate**, **Ruin** and **Export** (PNG or Foundry). After generating, rerolling a room or
ruining, a bar offers **↻ Try another** and **Undo**.

**Right-click** (or **press and hold** on a phone) with the Select tool for a quick menu: set the
room's type, reroll it, add doors, clear it, turn or duplicate furniture, change a door's type,
delete.

The panel has three tabs: **Edit** (the tool's options and whatever is selected), **Levels**
and **Map**. A selected room shows its type, how much furniture and **Reroll**; name, GM
notes, clutter, combat-ready, wall look and the rest are under **More…**.

## Drawing

| Tool | Key | What it does |
| --- | --- | --- |
| Select | V | Select a room, wall, door or asset; drag to move; Delete removes; right-click / hold for the quick menu |
| Room | R | Rect (R), Circle (C), Polygon (P), Cave (K), Paint squares (B), or Set type (T) of a room by clicking in it |
| Corridor | H | Click along a corridor 1–3 squares wide (straight or 45°); it stops behind the walls of the rooms it reaches. Double-click or Enter to finish |
| Wall | W | Straight (W): click grid points to chain walls, including diagonals. Arc (A): centre, start point, then sweep round |
| Door | D | Click a wall. Door, double, secret, locked, portcullis, sliding, archway, window, breach |
| Terrain | N | Paint water, deep water, lava, chasms, ice, mud, roads, paving, grass, sand: brush, freehand area, or a river / road along a path. Alt or right-click erases |
| Stairs & edges | S | Stairs & lifts (S): stairs (drag foot to top), spiral stairs, ladders, lifts, trapdoors. Balcony edges (G): railing, full wall or open drop round open-to-below areas |
| Assets | Q | Pick from the library and click to place. Right-click or `]` turns 90°, Shift+`[` `]` 15° |

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
  becomes a third space. **Behind** (corridors) gives it walls only outside floor drawn
  before it, so it stops at the rooms it reaches and they keep their walls for doors. Change
  it later on any selected shape.
- **Room type while drawing**: shape tools and the corridor tool have a Room type option. Pick
  one and every room you draw is tagged straight away (doors and decoration follow).
- **Walls**: the Map panel sets the default texture (solid, double line, stone blocks, brick,
  wooden planks, rough, dashed) and thickness. Select a room to give it its own; a wall shared
  by two rooms takes the thicker look.
- Pan with the middle mouse button or Space + drag. Wheel zooms. **F** fits the map.
- Selected asset: drag to move, drag its round handle to turn it (15° steps, Ctrl for free),
  `[` `]` turn 90°, Shift+`[` `]` turn 15°, Shift+D duplicates, Delete removes. The panel has an
  angle box and size fields for resizable pieces (tables, shelves, rugs...).
- Ctrl+Z / Ctrl+Y undo and redo. Ctrl+S saves, Ctrl+O opens.

## Outdoor maps and terrain

Set a level's **Outdoors** ground in the Levels tab (grass, dirt, sand, snow, bare rock,
deck plating): the whole map becomes walkable ground with a matching texture, its edge is no
longer a wall, and anything you draw becomes a building standing on it. Tag the open ground
with an outdoor room type (forest, clearing, campsite, graveyard, farmyard, garden; alien
jungle, wasteland, crash site, colony yard) and the decorator scatters trees, rocks, bushes,
tents, gravestones, wreckage and so on in natural clumps with clearings between.

Painted terrain works on any level. Water, mud and ice are difficult terrain, lava hurts,
nobody walks into a chasm, and roads and paving stay clear of furniture. Bridges (wood,
stone, metal gantry) and stepping stones are in the asset library to place by hand.

## Generating a level

**Generate** (top bar, or the start screen) replaces the current level with a new layout: pick
a setting, a style and how many rooms. **↻ Try another** gives a new layout (Undo goes back). Rooms are typed from the setting, joined with doors, decorated and given clutter; tick
**Combat-ready rooms** to spread cover too. The map grows if it is too small.

| Setting | Styles |
| --- | --- |
| Fantasy | Dungeon (rooms and corridors), Caves, Inn or house, Castle or keep, Tower |
| Sci-fi | Starship (spine, compartments, engines aft, bridge forward), Station, Colony building, Mine or ruins, Comms spire |

Outdoor styles too: Forest road, Village, Riverside camp, Graveyard, Chasm crossing (fantasy);
Crash site, Alien jungle, Colony outpost, Volcanic wastes (sci-fi). They lay down a river
(water, lava or a chasm), a road with a bridge where the two cross, ponds and pools, campsites
and small buildings, then decorate the ground.

There are two settings, **Fantasy** (dungeons, caves, taverns, keeps, towers and the wilds:
classic D&D and fantasy in one) and **Sci-fi**. Maps saved with the old Classic D&D setting open
as Fantasy.

**Levels** (1-5) generates a whole multi-level map: dungeons and caves go down from an
entrance level, buildings, towers and ships go up. Each pair of levels is joined by stairs
(spiral stairs in towers, ladders between ship decks, lifts in sci-fi) placed where there is
room on both floors.

Buildings are laid out like real ones: wings, a hallway that branches into them, rooms of
mixed sizes and L-shapes, bay windows on houses and round corner towers on castles; dungeon
rooms come in many shapes, some with alcoves or an apse. Buildings get a front door; caves
get open archways. Styles and their room pools live in each
setting's `setting.json` (`generator`), so new ones need no code.

## Ruins

**Ruin** (top bar) turns a finished map into its abandoned version: walls breached, doors
broken in or gone, a sinkhole and creeping grass on the ground floor, floors fallen through
upstairs, most lights out, furniture lost or knocked askew, rubble heaps, fallen beams and
more clutter. **Ruin this level** or **Ruin all levels** (Undo restores), or **Save a ruined
copy…** to keep the original and get both maps from one design. Rooms remember the ruin, so
rerolling keeps it.

## Exporting PNGs

**Export PNG** (Ctrl+E) renders the current level or every level at the pixels per square you
choose, with no editor overlays. Options: how open-to-below areas are filled (transparent for
stacking in Foundry, faded level below for printing, or solid) and whether everything outside
the building is kept or made transparent. Files go to the `exports/` folder
(`<map>-L<n>-<level>.png`) and/or download in the browser. Every level has the same size, so
they line up.

**Version**: **Player** leaves out secret doors (the wall shows solid) and traps; **GM** shows
everything, puts a number on each room and adds a room key down the right-hand side with each
room's name and GM notes (set them under More… when a room is selected); **Both** writes both files (`-player`,
`-gm`). Corridors aren't numbered. The editor's room labels show the same numbers.

## Foundry VTT (v14, built-in Scene Levels)

**Foundry** in the top bar exports one scene for the whole map:

- a Level per map level (elevation band from the level heights, background image, lower
  levels visible from above);
- walls, doors (door, secret, locked, portcullis, window; archways stay open) and, optionally,
  walls round vision-blocking assets, each tagged with its level;
- railings as two walls on the same line: one blocks movement both ways, the other blocks
  sight and light only from the open side, so you can see down from a balcony but not up onto it.
  If Foundry blocks the wrong side, tick "Flip one-way railing sight" and export again;
- wall complexity (high / medium / low) sets how closely walls follow curves and caves;
- ambient lights for torches, fires, braziers, candelabra and glowing sci-fi screens, with
  colour and flicker (optional);
- a difficult terrain Region per level over rubble, debris, ore piles and mushrooms, doubling
  movement cost, plus Regions for painted water, deep water, mud, ice and lava (optional);
- chasms walled for movement only (you can see across), left open where a bridge crosses;
  outdoor levels have no walls along the map's edge;
- background images use the player version (no secret doors or traps).

Files land in `exports/`. Copy the PNGs into your Foundry Data folder at the path you entered,
create a scene, right-click it and choose **Import Data**, then pick the `.foundry-scene.json`.

## Decorating

Tag a room (Room tool, Set type, or the quick menu) and it is furnished straight away; untick "Decorate rooms when
tagged" to do it by hand. Select a room to change its density (light by default), decorate
again, **Reroll** for a new layout, or **Clear**. The Levels tab decorates or rerolls every
room on the level. Pieces you place or move by hand are kept when a room is rerolled.

The decorator follows each asset's placement rule, never overlaps pieces, keeps two squares
clear in front of doors and a ring round stairs, ladders and lifts, leaves balcony edges to
balcony pieces, and only accepts a piece if every entrance can still reach every other.
Corridors (rooms 3 squares or narrower) only get pieces along their walls.

Select a room to name it, add GM notes (for the GM export's room key), and set its
**Clutter** (none / light / heavy): cracks, puddles, stains, papers, cobwebs, cables and the
like, scattered after the furniture without moving it.

### Combat-ready rooms

Tick **Combat ready** on a room (or when generating) and the decorator adds free-standing
cover until nearly all open floor is within two squares of something to hide behind. Each
added piece keeps a clear square all round it, so there are lanes to move through, and the
room stays fully walkable. Every asset has a cover level: full if it blocks sight, half if it
blocks movement (or as set in its metadata). The Map tab's **Tactical overlay** shows
cover and difficult terrain square by square.

### Automatic doors

Tagging or decorating a room also gives it doors into its neighbours (untick "Add doors to
neighbouring rooms" in the Room tool's Set type mode to stop this). Rooms are joined like a tree: each
pair of rooms that can't already reach each other gets one door, so there are no needless
extra doors. Corridors and halls (and any long, narrow space, tagged or not) are joined
first, so rooms open onto them rather than into each other. A door goes where the shared wall
has the most room either side, away from other doors and furniture. Each room gets its doors
once: delete one you don't want and it stays deleted. **Add doors** (quick menu, a room's More…, or the
Levels tab for every room) runs it again on demand. The door type comes from the setting
(sliding doors in sci-fi; portcullises for prisons, locked doors for detention and armouries).

## Assets

SVG files under `assets/` (`common/` holds ones shared by several settings). Each file carries
its own metadata as JSON inside `<metadata id="map-weaver-asset">`: settings, footprint in
squares, room types, placement rule (wall, corner, centre, door, balcony, free), whether it
blocks movement or vision, which side faces the wall, and optionally cover level, light
(bright / dim range, colour, animation), clutter and GM-only (traps). Tag a piece
`difficult terrain` for the Foundry terrain regions. Shapes use the classes `o s m k p h l t d`
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
