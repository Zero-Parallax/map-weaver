// Starter asset sets. Each entry becomes one SVG file (see tools/generate-assets.js).
// The drawings live in starter/common.js (classic and shared), starter/fantasy.js and
// starter/scifi.js. Two-tone, bold silhouettes; backs face the top edge (wallSide n).
// Units: 100 per square.

import { Drawing } from './svg.js';
import { runGenerator } from './generators.js';
import defineCommon from './starter/common.js';
import defineFantasy from './starter/fantasy.js';
import defineScifi from './starter/scifi.js';

const defs = [];

/** Fixed asset drawn by hand. */
function A(id, name, settings, [w, h], opts, draw) {
  defs.push({ id, name, settings, footprint: { w, h }, ...opts, draw });
}

/** Asset made by a parametric generator; `sizes` lets the decorator pick other sizes. */
function G(id, name, settings, generator, params, opts, sizes) {
  defs.push({ id, name, settings, ...opts, generator: { id: generator, params }, sizes });
}

for (const define of [defineCommon, defineFantasy, defineScifi]) define({ A, G });

// ---- build ---------------------------------------------------------------

/** Metadata plus drawing for every starter asset. */
export function buildStarterAssets() {
  return defs.map((d) => {
    let drawing;
    let footprint = d.footprint;
    if (d.generator) {
      const out = runGenerator(d.generator.id, d.generator.params);
      drawing = out.drawing;
      footprint = out.footprint;
    } else {
      drawing = new Drawing();
      d.draw(drawing);
    }
    const settings = d.settings;
    const meta = {
      id: d.id,
      name: d.name,
      settings,
      footprint,
      roomTypes: d.roomTypes || ['*'],
      placement: d.placement || 'free',
      wallSide: d.wallSide || 'n',
      layer: d.layer || 'object',
      blocksMovement: d.blocksMovement ?? (d.layer || 'object') === 'object',
      blocksVision: d.blocksVision ?? false,
      weight: d.weight ?? 1,
      min: d.min ?? 0,
      max: d.max ?? 0,
      tags: d.tags || [],
    };
    if (d.facing) meta.facing = d.facing;
    if (d.generator) meta.generator = { ...d.generator, sizes: d.sizes || null };
    const folder = settings.length > 1 ? 'common' : settings[0];
    return { meta, drawing, folder };
  });
}
