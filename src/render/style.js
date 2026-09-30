// Resolve a map's style choices plus its setting into concrete drawing values.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Everything the renderer needs to know about how the map looks. */
export function resolveStyle(map, catalog) {
  const setting = catalog.settings.get(map.setting) || [...catalog.settings.values()][0];
  const palette = catalog.styles.palettes.find((p) => p.id === map.style.palette) || catalog.styles.palettes[0];
  const walls = setting?.walls || {};
  return {
    ink: palette.ink,
    paper: palette.paper,
    // Grid lines are a faint ink on the floor.
    grid: mix(palette.paper, palette.ink, 0.28),
    // Tokens that asset SVGs are recoloured with (step 3).
    tokens: {
      ink: palette.ink,
      paper: palette.paper,
      shade: mix(palette.paper, palette.ink, 0.25),
      mid: mix(palette.paper, palette.ink, 0.55),
    },
    shading: map.style.shading,
    gridMode: map.style.grid,
    wallWidth: walls.width ?? 0.14,
    wallStyle: walls.style ?? 'line',
    band: walls.band ?? 0.7,
    key: [palette.id, map.style.shading, map.style.grid, setting?.id].join('|'),
  };
}
