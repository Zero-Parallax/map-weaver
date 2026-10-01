// PNG export: draws a level with the same renderer as the editor, without editor overlays.

import { drawLevel, drawDoor, levelPaths, levelWalls, visibleTo } from './renderer.js';
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

export function exportFileName(map, levelIndex, suffix = '') {
  const level = map.levels[levelIndex];
  return `${slug(map.name)}-L${levelIndex + 1}-${slug(level.name)}${suffix ? `-${suffix}` : ''}.png`;
}

export const VIEWS = [
  { id: 'player', name: 'Player', title: 'No secret doors, traps or room numbers' },
  { id: 'gm', name: 'GM', title: 'Everything, with numbered rooms and a room key' },
  { id: 'both', name: 'Both' },
];

/**
 * Render one level to a PNG blob.
 *  geometry(level): derived geometry for a level
 *  openMode:    'transparent' | 'faded' | 'solid' for open-to-below areas
 *  outsideMode: 'drawn' (rock / paper as styled) | 'transparent' (only the building)
 *  view:        'gm' | 'player' (no secret doors or traps)
 *  key:         roomKey() entries: this level's rooms get numbers; with keyColumn, the whole
 *               key is listed in a column to the right of the map
 */
export async function renderLevelPng({ map, levelIndex, style, assets, geometry, pxPerSquare, openMode = 'transparent', outsideMode = 'drawn', view = 'gm', key = null, keyColumn = true }) {
  const level = map.levels[levelIndex];
  const below = map.levels[levelIndex - 1] || null;
  const size = exportSize(map, pxPerSquare);
  // GM key: numbers on this level's rooms, and the map's key in a column on the right.
  const numbered = key ? key.filter((e) => e.levelIndex === levelIndex) : [];
  const column = keyColumn && key?.length ? keyLayout(key, pxPerSquare, size.height, map, levelIndex) : null;
  const width = size.width + (column?.width || 0);
  const height = Math.max(size.height, column?.height || 0);
  if (width > MAX_SIDE || height > MAX_SIDE || width * height > MAX_AREA) {
    throw new Error(`${width} × ${height} px is too big for the browser. Lower the pixels per square.`);
  }
  await assets.ready([...level.placements, ...(below?.placements || [])], style.tokens);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (column) {
    ctx.fillStyle = style.paper;
    ctx.fillRect(0, 0, width, height);
  }
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
    view,
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
    for (const door of visibleTo(level, assets, view).doors) drawDoor(ctx, door, style, walls.doorWidth.get(door.id));
  }
  for (const e of numbered) drawBadge(ctx, e.at, e.n, style);
  if (column) {
    ctx.setTransform(1, 0, 0, 1, size.width, 0);
    drawKey(ctx, column, style);
  }
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

/** A room number: an ink disc with the number in paper, sized in squares. */
function drawBadge(ctx, at, n, style) {
  const r = String(n).length > 1 ? 0.36 : 0.3;
  ctx.save();
  ctx.fillStyle = style.ink;
  ctx.strokeStyle = style.paper;
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.arc(at[0], at[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.translate(at[0], at[1]);
  ctx.scale(1 / 100, 1 / 100);
  ctx.fillStyle = style.paper;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 0, 2);
  ctx.restore();
}

const KEY_FONT = 'Georgia, serif';

/** Wrap text to lines no wider than width with ctx's current font. */
function wrap(ctx, text, width) {
  const lines = [];
  for (const para of String(text).split(/\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Lines of the key column and its size in pixels. Every level's rooms are listed, by level. */
function keyLayout(key, pps, mapHeight, map, levelIndex) {
  const font = Math.max(13, Math.round(pps * 0.2));
  const pad = Math.round(font * 1.4);
  const width = Math.max(320, Math.round(font * 22));
  const measure = document.createElement('canvas').getContext('2d');
  const rows = [];
  const text = width - pad * 2;
  rows.push({ kind: 'title', text: map.name, size: font * 1.5 });
  rows.push({ kind: 'sub', text: `Room key · ${map.levels[levelIndex].name}`, size: font });
  let lastLevel = -1;
  for (const e of key) {
    if (map.levels.length > 1 && e.levelIndex !== lastLevel) {
      lastLevel = e.levelIndex;
      rows.push({ kind: 'level', text: map.levels[e.levelIndex].name, size: font * 1.05 });
    }
    measure.font = `bold ${font}px ${KEY_FONT}`;
    rows.push({ kind: 'room', n: e.n, text: e.title, size: font, current: e.levelIndex === levelIndex });
    if (e.notes) {
      measure.font = `${font * 0.9}px ${KEY_FONT}`;
      for (const line of wrap(measure, e.notes, text - font * 2)) rows.push({ kind: 'note', text: line, size: font * 0.9 });
    }
  }
  let y = pad;
  for (const r of rows) {
    r.y = y + r.size;
    y += r.size * (r.kind === 'title' ? 1.7 : r.kind === 'level' ? 1.9 : 1.45);
  }
  return { rows, width, height: Math.max(mapHeight, Math.round(y + pad)), pad, font };
}

function drawKey(ctx, column, style) {
  const { rows, width, height, pad, font } = column;
  ctx.fillStyle = style.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = style.ink;
  ctx.fillRect(0, 0, Math.max(2, Math.round(font * 0.15)), height);
  ctx.textBaseline = 'alphabetic';
  for (const r of rows) {
    ctx.fillStyle = style.ink;
    if (r.kind === 'title') {
      ctx.font = `bold ${r.size}px ${KEY_FONT}`;
      ctx.fillText(r.text, pad, r.y);
    } else if (r.kind === 'sub') {
      ctx.font = `italic ${r.size}px ${KEY_FONT}`;
      ctx.fillText(r.text, pad, r.y);
    } else if (r.kind === 'level') {
      ctx.font = `bold ${r.size}px ${KEY_FONT}`;
      ctx.fillText(r.text.toUpperCase(), pad, r.y);
      ctx.fillRect(pad, r.y + r.size * 0.3, width - pad * 2, Math.max(1, r.size * 0.06));
    } else if (r.kind === 'room') {
      ctx.font = `${r.current ? 'bold ' : ''}${r.size}px ${KEY_FONT}`;
      ctx.fillText(`${r.n}.`, pad, r.y);
      ctx.fillText(r.text, pad + r.size * 2, r.y);
    } else {
      ctx.font = `${r.size}px ${KEY_FONT}`;
      ctx.fillText(r.text, pad + font * 2, r.y);
    }
  }
}
