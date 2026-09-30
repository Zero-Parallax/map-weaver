// Room detection: sample the floor on a fine lattice, block links that cross a wall,
// then flood fill. Works for any wall geometry (diagonals, arcs, caves).
//
// The lattice is offset from the grid so no sample sits on a grid line, a half-grid line
// or a grid diagonal, which keeps snapped walls from ever passing exactly through a sample.

import { ringEdges } from './geom.js';

export const STEP = 0.25; // 4 x 4 samples per square
export const OX = 0.11;
export const OY = 0.13;
export const PER_CELL = Math.round(1 / STEP);

export function createGrid(size) {
  const nx = Math.max(1, Math.ceil((size.w - OX) / STEP));
  const ny = Math.max(1, Math.ceil((size.h - OY) / STEP));
  return { nx, ny, floor: new Uint8Array(nx * ny), hBlock: new Uint8Array(nx * ny), vBlock: new Uint8Array(nx * ny) };
}

export const sampleX = (i) => OX + i * STEP;
export const sampleY = (j) => OY + j * STEP;

function markFloor(grid, floorRings) {
  const { nx, ny, floor } = grid;
  const edges = floorRings.flatMap(ringEdges);
  for (let j = 0; j < ny; j++) {
    const y = sampleY(j);
    const xs = [];
    for (const [a, b] of edges) {
      if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - OX) / STEP));
      const i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - OX) / STEP));
      for (let i = i0; i <= i1; i++) floor[j * nx + i] = 1;
    }
  }
}

function markWalls(grid, segments) {
  const { nx, ny, hBlock, vBlock } = grid;
  for (const [a, b] of segments) {
    // Horizontal links (i,j)-(i+1,j) cross the wall where it passes row y_j.
    const jMin = Math.max(0, Math.ceil((Math.min(a[1], b[1]) - OY) / STEP));
    const jMax = Math.min(ny - 1, Math.floor((Math.max(a[1], b[1]) - OY) / STEP));
    for (let j = jMin; j <= jMax; j++) {
      const y = sampleY(j);
      if ((a[1] > y) === (b[1] > y)) continue;
      const x = a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
      const i = Math.floor((x - OX) / STEP);
      if (i >= 0 && i < nx - 1) hBlock[j * nx + i] = 1;
    }
    // Vertical links (i,j)-(i,j+1) cross the wall where it passes column x_i.
    const iMin = Math.max(0, Math.ceil((Math.min(a[0], b[0]) - OX) / STEP));
    const iMax = Math.min(nx - 1, Math.floor((Math.max(a[0], b[0]) - OX) / STEP));
    for (let i = iMin; i <= iMax; i++) {
      const x = sampleX(i);
      if ((a[0] > x) === (b[0] > x)) continue;
      const y = a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
      const j = Math.floor((y - OY) / STEP);
      if (j >= 0 && j < ny - 1) vBlock[j * nx + i] = 1;
    }
  }
}

function floodFill(grid) {
  const { nx, ny, floor, hBlock, vBlock } = grid;
  const labels = new Int32Array(nx * ny).fill(-1);
  const regions = [];
  const stack = [];
  for (let start = 0; start < nx * ny; start++) {
    if (!floor[start] || labels[start] >= 0) continue;
    const id = regions.length;
    const region = { index: id, count: 0, sumX: 0, sumY: 0, minI: nx, minJ: ny, maxI: 0, maxJ: 0 };
    regions.push(region);
    labels[start] = id;
    stack.push(start);
    while (stack.length) {
      const k = stack.pop();
      const i = k % nx;
      const j = (k - i) / nx;
      region.count++;
      region.sumX += i;
      region.sumY += j;
      if (i < region.minI) region.minI = i;
      if (i > region.maxI) region.maxI = i;
      if (j < region.minJ) region.minJ = j;
      if (j > region.maxJ) region.maxJ = j;
      const visit = (n) => {
        if (floor[n] && labels[n] < 0) {
          labels[n] = id;
          stack.push(n);
        }
      };
      if (i + 1 < nx && !hBlock[k]) visit(k + 1);
      if (i > 0 && !hBlock[k - 1]) visit(k - 1);
      if (j + 1 < ny && !vBlock[k]) visit(k + nx);
      if (j > 0 && !vBlock[k - nx]) visit(k - nx);
    }
  }
  return { labels, regions };
}

// Squares wholly inside one room with no wall running through them.
function fullCells(grid, labels, regions, size) {
  const { nx, hBlock, vBlock } = grid;
  for (const r of regions) r.cells = [];
  for (let cy = 0; cy < size.h; cy++) {
    for (let cx = 0; cx < size.w; cx++) {
      const i0 = cx * PER_CELL;
      const j0 = cy * PER_CELL;
      if (i0 + PER_CELL > grid.nx || j0 + PER_CELL > grid.ny) continue;
      const label = labels[j0 * nx + i0];
      if (label < 0) continue;
      let ok = true;
      for (let dj = 0; dj < PER_CELL && ok; dj++) {
        for (let di = 0; di < PER_CELL && ok; di++) {
          const k = (j0 + dj) * nx + i0 + di;
          if (labels[k] !== label) ok = false;
          else if (di < PER_CELL - 1 && hBlock[k]) ok = false;
          else if (dj < PER_CELL - 1 && vBlock[k]) ok = false;
        }
      }
      if (ok) regions[label].cells.push([cx, cy]);
    }
  }
}

function labelPoints(grid, labels, regions) {
  const { nx } = grid;
  for (const r of regions) {
    const ci = Math.round(r.sumX / r.count);
    const cj = Math.round(r.sumY / r.count);
    r.centroid = [sampleX(r.sumX / r.count), sampleY(r.sumY / r.count)];
    if (labels[cj * nx + ci] === r.index) {
      r.labelAt = [sampleX(ci), sampleY(cj)];
      continue;
    }
    let best = Infinity;
    for (let j = r.minJ; j <= r.maxJ; j++) {
      for (let i = r.minI; i <= r.maxI; i++) {
        if (labels[j * nx + i] !== r.index) continue;
        const d = (i - ci) ** 2 + (j - cj) ** 2;
        if (d < best) {
          best = d;
          r.labelAt = [sampleX(i), sampleY(j)];
        }
      }
    }
  }
}

/** Region index at a world point, or -1. Looks at nearby samples if the point sits on a wall. */
export function regionAt(rooms, p) {
  const { grid, labels } = rooms;
  const { nx, ny } = grid;
  const ci = Math.round((p[0] - OX) / STEP);
  const cj = Math.round((p[1] - OY) / STEP);
  for (let r = 0; r <= 1; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= nx || j >= ny) continue;
        const l = labels[j * nx + i];
        if (l >= 0) return l;
      }
    }
  }
  return -1;
}

/**
 * Detect rooms. floorRings: floor polygon rings. walls: [a, b] segments that divide rooms.
 * tags: level.rooms. Returns {grid, labels, regions, tagRegion: Map(tagId -> index)}.
 * Each region gets .tag (the tag object or null), .cells, .centroid, .labelAt, .area.
 */
export function detectRooms(floorRings, walls, size, tags = []) {
  const grid = createGrid(size);
  markFloor(grid, floorRings);
  markWalls(grid, walls);
  const { labels, regions } = floodFill(grid);
  fullCells(grid, labels, regions, size);
  labelPoints(grid, labels, regions);
  for (const r of regions) {
    r.area = r.count * STEP * STEP;
    r.tag = null;
  }
  const rooms = { grid, labels, regions, tagRegion: new Map() };
  for (const tag of tags) {
    const index = regionAt(rooms, tag.at);
    if (index < 0) continue;
    rooms.tagRegion.set(tag.id, index);
    if (!regions[index].tag) regions[index].tag = tag;
  }
  return rooms;
}
