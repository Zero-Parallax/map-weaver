// PNG export: draws a level with the same renderer as the editor, without editor overlays.

import { drawLevel, drawDoor, levelPaths, levelWalls } from './renderer.js';
import { drawWallGroups } from './walls.js';
import { linksOnLevel } from '../core/links.js';

// Browsers refuse canvases much bigger than this.
export const MAX_SIDE = 16384;
export const MAX_AREA = 16384 * 16384;

export function exportSize(map, pxPerSquare) {
  return { width: Math.round(map.size.w * pxPerSquare), height: Math.round(map.size.h * pxPerSquare) };
}

export function slug(text) {
  return String(text).trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'map';
}

export function exportFileName(map, levelIndex) {
  const level = map.levels[levelIndex];
  return `${slug(map.name)}-L${levelIndex + 1}-${slug(level.name)}.png`;
}

/**
 * Render one level to a PNG blob.
 *  geometry(level): derived geometry for a level
 *  openMode:    'transparent' | 'faded' | 'solid' for open-to-below areas
 *  outsideMode: 'drawn' (rock / paper as styled) | 'transparent' (only the building)
 */
export async function renderLevelPng({ map, levelIndex, style, assets, geometry, pxPerSquare, openMode = 'transparent', outsideMode = 'drawn' }) {
  const level = map.levels[levelIndex];
  const below = map.levels[levelIndex - 1] || null;
  const { width, height } = exportSize(map, pxPerSquare);
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_AREA) {
    throw new Error(`${width} × ${height} px is too big for the browser. Lower the pixels per square.`);
  }
  await assets.ready([...level.placements, ...(below?.placements || [])], style.tokens);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pxPerSquare, 0, 0, pxPerSquare, 0, 0);
  const geo = geometry(level);
  drawLevel(ctx, {
    map,
    level,
    geo,
    style,
    links: linksOnLevel(map, level),
    below: below && { level: below, geo: geometry(below), links: linksOnLevel(map, below) },
    openMode,
    assets,
    pxPerSquare,
  });
  if (outsideMode === 'transparent') {
    // Erase everything outside the building, then redraw the walls the erase cut in half.
    const L = levelPaths(geo, style, map);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(L.rock, 'evenodd');
    ctx.restore();
    const walls = levelWalls(geo, level, style);
    drawWallGroups(ctx, walls, style, pxPerSquare);
    for (const door of level.doors) drawDoor(ctx, door, style, walls.doorWidth.get(door.id));
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
}
