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

## Rendering (`src/render/`)

One Canvas 2D renderer draws paper, shading (solid, hatched band, cross-hatched band, line
hatching), grid, walls and doors. The editor and the PNG export share it.

## Build plan

1. Core model, shape/wall/door editor, room tagging, save/load **(done)**
2. Levels, links (stairs, ladders, lifts, trapdoors), balconies, faded level below **(done)**
3. Asset format (metadata in the SVG), library, parametric generators, starter sets **(done)**
4. Decorator: slots, keep-clear zones, seeded placement, reachability check
5. Manual asset editing: move, rotate, delete, add
6. PNG export at a chosen pixels-per-square

Phase 2: Foundry VTT export (walls, doors, one-way balcony walls, levels) and PNG asset import.
