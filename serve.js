// Map Weaver local server. No dependencies: serves the app and saves maps to ./maps.
// Usage: node serve.js   (PORT and HOST env vars override the defaults)

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMeta, normalizeMeta } from './src/assets/meta.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.join(ROOT, 'maps');
const ASSETS_DIR = path.join(ROOT, 'assets');
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = 200 * 1024 * 1024;
const EXPORTS_DIR = path.join(ROOT, 'exports');
const MAP_EXT = '.map.json';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), TYPES['.json']);
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Map names become file names, so keep them to a safe character set.
function mapFile(name) {
  const clean = decodeURIComponent(name);
  if (!/^[\w\- .()]{1,80}$/.test(clean) || clean.startsWith('.')) return null;
  return path.join(MAPS_DIR, clean + MAP_EXT);
}

// Every SVG under assets/, with the metadata read from inside the file.
async function listAssets() {
  const out = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.name.toLowerCase().endsWith('.svg')) {
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        const raw = readMeta(await fs.readFile(full, 'utf8'));
        if (!raw) {
          out.push({ path: rel, errors: ['no Map Weaver metadata'] });
          continue;
        }
        const { meta, errors } = normalizeMeta(raw);
        out.push({ path: rel, meta, errors });
      }
    }
  }
  await walk(ASSETS_DIR);
  return out;
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', 'maps', name?]
  if (parts[1] === 'assets' && parts.length === 2 && req.method === 'GET') return sendJson(res, 200, await listAssets());
  if (parts[1] === 'exports' && parts.length === 3 && req.method === 'PUT') {
    const name = decodeURIComponent(parts[2]);
    if (!/^[\w\- .()]{1,120}\.(png|json)$/.test(name) || name.startsWith('.')) return sendJson(res, 400, { error: 'Bad file name' });
    const data = await readRaw(req);
    if (name.endsWith('.png') && data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return sendJson(res, 400, { error: 'Not a PNG' });
    if (name.endsWith('.json')) {
      try {
        JSON.parse(data.toString('utf8'));
      } catch {
        return sendJson(res, 400, { error: 'Not valid JSON' });
      }
    }
    await fs.mkdir(EXPORTS_DIR, { recursive: true });
    const file = path.join(EXPORTS_DIR, name);
    await fs.writeFile(file, data);
    return sendJson(res, 200, { ok: true, path: path.relative(ROOT, file) });
  }
  if (parts[1] !== 'maps') return sendJson(res, 404, { error: 'Unknown endpoint' });

  if (parts.length === 2 && req.method === 'GET') {
    await fs.mkdir(MAPS_DIR, { recursive: true });
    const files = await fs.readdir(MAPS_DIR);
    const maps = [];
    for (const f of files) {
      if (!f.endsWith(MAP_EXT)) continue;
      const stat = await fs.stat(path.join(MAPS_DIR, f));
      maps.push({ name: f.slice(0, -MAP_EXT.length), modified: stat.mtime.toISOString() });
    }
    maps.sort((a, b) => b.modified.localeCompare(a.modified));
    return sendJson(res, 200, maps);
  }

  if (parts.length !== 3) return sendJson(res, 404, { error: 'Unknown endpoint' });
  const file = mapFile(parts[2]);
  if (!file) return sendJson(res, 400, { error: 'Map names may use letters, numbers, spaces, - _ . ( ) only.' });

  if (req.method === 'GET') {
    try {
      return send(res, 200, await fs.readFile(file, 'utf8'), TYPES['.json']);
    } catch {
      return sendJson(res, 404, { error: 'Map not found' });
    }
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    try {
      JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: 'Body is not valid JSON' });
    }
    await fs.mkdir(MAPS_DIR, { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, body, 'utf8');
    await fs.rename(tmp, file);
    return sendJson(res, 200, { ok: true, path: path.relative(ROOT, file) });
  }
  if (req.method === 'DELETE') {
    await fs.rm(file, { force: true });
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 405, { error: 'Method not allowed' });
}

async function handleStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, '.' + rel);
  // Stay inside the project and never serve dotfiles such as .git.
  if (!file.startsWith(ROOT + path.sep) || rel.split('/').some((p) => p.startsWith('.'))) {
    return send(res, 403, 'Forbidden');
  }
  try {
    const data = await fs.readFile(file);
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    send(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await handleStatic(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Map Weaver running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
  console.log(`Maps are saved in ${MAPS_DIR}`);
});
