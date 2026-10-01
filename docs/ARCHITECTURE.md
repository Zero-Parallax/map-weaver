# Architecture

Plain JavaScript modules, no build step, no npm dependencies. `serve.js` serves the app and
saves maps. The only third-party code is Clipper (polygon booleans), vendored in `src/vendor/`.

## Decisions so far

- Walls are vector geometry snapped to grid points: straight, diagonal, arcs, freehand caves.
- Every setting uses the same two-tone look, with palette, shading and grid options per map.
  Asset SVGs will use colour tokens (ink, paper, shade, mid) so they recolour with the palette.
- PNG export will offer transparent / faded level below / solid fill for open-to-below areas.
- Foundry export (Phase 2) will have a wall-complexity setting (arc segments, cave simplification).

## Data model (`src/core/model.js`)

A map is plain JSON: setting, style, size, seed, `levels[]`, `links[]`.
Each level holds:

- `shapes[]` floor shapes applied in order: rect (with corner rounding), circle, poly, cave, cells.
  Each is `add`, `subtract` or `void` (open to the level below); an `add` shape can be `walled`.
- `walls[]` hand-drawn lines and arcs.
- `doors[]` segments on walls, with a semantic type (door, secret, window, archway, ...).
- `edges[]` overrides for edges of open areas: a point plus `railing`, `wall` or `drop`.
- `rooms[]` room tags: a point inside the room plus type, seed and reroll count.
- `placements[]` decorated assets (step 3 onward).

All levels share the map's size. `map.links[]` holds stairs, spiral stairs, ladders, lifts and
trapdoors: a footprint, a direction and the lowest and highest level they reach (`src/core/links.js`).

## Derived geometry (`src/core/level-geometry.js`)

Recomputed from the level when it changes:

1. **Areas**: floor, open (void shapes plus stair openings from links) and structure = floor + open.
2. **Edges**: floor edges facing an open area, grouped into runs split at corners. Each run is a
   railing unless an override makes it a wall or drop; stair arrivals leave a gap.
   Phase 2 maps railings to one-way / see-through Foundry walls.
3. **Walls**: the structure boundary, plus outlines of walled shapes (later shapes erase earlier
   outlines they cover), plus hand-drawn walls, keeping only parts strictly inside the floor.
4. **Rooms** (`rooms.js`): floor sampled at 4x4 points per square, links crossing a wall blocked,
   then flood-filled. Each room knows its full squares, which the decorator will use.
   Tags attach to whichever room contains their point, so they survive edits.
   Corridors are `path` shapes (centre lines drawn N squares wide) joined **Behind**: walls
   only outside the floor drawn before them, earlier walls kept.
5. **Automatic doors** (`auto-doors.js`): every wall stretch two rooms share is sampled for
   door spans and how much wall carries on past each end. Rooms are joined by a spanning tree
   over the whole level (existing doors count, windows don't; hubs from the setting's
   `doors.hubs` and corridor-shaped spaces first), emitting only the doors that touch the
   target rooms, so tagging order doesn't change the result. Tags remember `autoDoors` so
   each room is done once. Settings give `doors: {type, hubs, byRoom}`.

## Assets (`src/assets/`)

- `meta.js`: the metadata format, stored as JSON inside each SVG, and its defaults.
- `svg.js`: drawing helpers and the shared style block. Colours come from CSS variables
  (`--ink`, `--paper`, `--shade`, `--mid`), which the app sets to the map's palette.
- `generators.js`: parametric generators (table with chairs, bench/pew, shelf, counter,
  console, rug, dais, cargo, railing). A generator asset records `{id, params, sizes}` so the
  decorator and the editor can remake it at another size.
- `starter.js`: the starter sets, baked to files by `tools/generate-assets.js`.
- `library.js`: browser side. Lists assets from `GET /api/assets`, caches recoloured images.

A placement is `{id, asset, x, y (centre, squares), rot (degrees), params?, auto, room?}`.
Placed assets draw by layer: floor (rugs) under links and furniture, overhead over walls.

## Decorator (`src/decorator/decorate.js`)

Pure function, no DOM: `decorateRoom({geo, region, tag, assets, doors, links, existing, mapSeed})`.

1. **Analyse** the room's full squares: each side is inside, wall, door, balcony or open
   (walls within half a square count, so curved and diagonal walls work). Keep-clear squares:
   two deep inside each door, a ring round each link. Entrances = door and link squares.
2. **Budget** of furniture squares from the room's density (light 0.25 by default).
3. **Place** required pieces (min >= 1) first, then rugs and decals, then weighted picks.
   Candidates per rule: wall/corner/balcony need the back (and a side) against that edge;
   centre prefers the middle; door sits beside the clear zone; showpieces (throne, altar) go
   far from the entrances, centred on their wall; `facing: "focal"` seats turn to face them.
4. **Check** each blocking piece: entrances still connected and no square cut off.
5. **Combat ready** (`tag.combat`): add free-standing cover (the room's own cover pieces, else
   crates, barrels, drums) where it covers the most open squares not yet within two squares of
   cover, each with a clear one-square ring, until 88% of open floor is covered.
6. **Clutter** (`meta.clutter`, `tag.clutter` 0..1): decals scattered from a separate seeded
   stream, mostly along walls, jittered and at any angle, one per square; corner/wall clutter
   (cobwebs) uses the normal candidates. Changing clutter never moves furniture.

Seed = hash(map seed, room id, room seed, reroll count), so results repeat until rerolled.

## Ground and terrain (`src/core/terrain.js`, `src/render/terrain-render.js`)

`level.ground` makes a level outdoors: computeAreas starts the floor as the whole map, the
map-edge segments are dropped from the outline, and `geo.ground` (map minus drawn shapes) gets
a ground texture. `level.terrain` is an ordered list of painted shapes per kind; later paint
replaces other kinds, `erase` clears. `geo.terrain` is Map(kind -> rings). Each kind has
`move` (normal / difficult / hazard / blocked) and `decor` (may furniture stand on it): the
decorator blocks squares of water, lava and chasm and keeps roads clear. Textures are seeded
Path2D patterns, memoised.

Reachability in the decorator is checked locally: a blocking piece is fine if the walkable
squares around it can still reach each other, which also works when water already splits a
room.

## Layout generator (`src/generator/layout.js`)

`generateLayout({style, map, count, seed, doorType})` returns `{shapes, rooms, doors}` for an
empty level. Styles come from each setting's `generator` list: `{id, name, layout, corridor:
{type, width}, shapes, loops, rooms: [{type, weight, max, size, place}]}`. Layouts:
- `rooms`: rooms placed in a cluster (each near one already placed), joined by a minimum
  spanning tree plus a few loops; corridors are straight where rooms line up, else one bend,
  and all go in one `path` shape (joined Behind) so they form a network.
- `building`: a footprint split by a hallway into two strips of rooms (one about twice as big
  for the hall / tavern / throne room), or by binary space partition; sometimes L-shaped;
  a front door.
- `ship`: spine corridor, compartments of varying depth either side, chamfered engine room
  aft, pointed bridge forward (`place: back / front`).
- `caves`: rough blob chambers and roughened tunnels.
- `tower`: a round tower with a central hub and slice rooms (hand walls), identical slices
  on every floor so stairs line up.
- `outdoor`: level.ground plus terrain: a wandering river (water, deep water, lava or chasm),
  a road with a bridge placement where they cross, ponds and pools, an optional campsite
  (trodden clearing, fire, tents, bedrolls) and small buildings; the open ground is one room
  tagged with the style's outdoor type and density.
Types are assigned by size (one-off large types to the largest rooms). Every leftover space
is tagged with the corridor type. Doors and decoration are added by the app afterwards.

`generateLevels` (`src/generator/levels.js`) builds several levels bottom first. For
dungeons and caves it plans the stairs on the level below and starts the next level with a
room exactly over that room (an anchor); for same-outline layouts it searches for a spot
where the link's footprint and landings lie in one room's full squares on both levels; a
walled stairwell through both is the fallback. Pieces of a room split by a stair opening keep
the room's type.

## Ruins (`src/generator/ruin.js`)

`ruinLevel(map, level, {amount, seed})`: doors become breaches or archways, breaches open in
shared walls (spots from `doorOptions`), the ground floor gets grass patches and a chasm
sinkhole, upper floors void holes with drop edges; every room tag gets `ruin`. The decorator's
ruin pass (from `tag.ruin`) removes most lights and some pieces, turns small ones askew,
places `ruin` pieces (collapsed masonry, fallen beams / girders) and raises clutter, adding
ruin-only decals.

## Room key (`src/core/room-key.js`)

Rooms numbered across the map: bottom level first, then in bands of four squares top to
bottom, left to right. Corridors are skipped. Used by the GM PNG export (badges and a key
column with names and notes) and the editor's labels.

## Rendering (`src/render/`)

One Canvas 2D renderer draws paper, shading (solid, hatched band, cross-hatched band, line
hatching), grid, walls and doors. The editor and the PNG export share it. `view: 'player'`
leaves out secret doors and `gmOnly` pieces.

## Build plan

1. Core model, shape/wall/door editor, room tagging, save/load **(done)**
2. Levels, links (stairs, ladders, lifts, trapdoors), balconies, faded level below **(done)**
3. Asset format (metadata in the SVG), library, parametric generators, starter sets **(done)**
4. Decorator: slots, keep-clear zones, seeded placement, reachability check **(done)**
5. Manual asset editing: move, rotate (90° and 15° steps), resize, duplicate, delete, add **(done)**
6. PNG export at a chosen pixels-per-square **(done)** (`src/render/export.js`, saved via
   `PUT /api/exports/<file>.png`)

Phase 2:
- Foundry VTT v14 export **(done)**: `src/export/foundry.js` builds Scene data (Levels with
  `elevation`, `background`, `visibility.levels`; walls with `c`, `levels`, `move/sight/light/sound`,
  `dir`, `door`, `ds`). Schema checked against the v14 type definitions
  (`@league-of-foundry-developers/foundry-vtt-types` 14.366). Also AmbientLights from asset
  `light` data (`x`, `y`, `elevation`, `levels`, `config.bright/dim` in scene units, colour,
  animation) and one Region per level for difficult terrain (rectangle `shapes`, `levels`,
  `elevation`, a `modifyMovementCost` behaviour with `system.difficulties` set to 2). The
  behaviour's system fields aren't in the type package, so check them in Foundry.
- PNG asset import with a tagging screen **(done)**: `src/assets/png-meta.js` reads and writes
  the same metadata JSON in an `iTXt` chunk (keyword `map-weaver-asset`);
  `src/editor/import-dialog.js` is the tagging screen; `PUT/DELETE /api/assets/imported/<file>.png`.
