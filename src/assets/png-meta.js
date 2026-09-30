// Asset metadata inside PNG files, as an iTXt chunk with keyword "map-weaver-asset".
// Works on Uint8Array in both the browser and Node.

const KEYWORD = 'map-weaver-asset';
const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function isPng(bytes) {
  return bytes.length > 8 && SIGNATURE.every((b, i) => bytes[i] === b);
}

const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));

/** Chunks as {type, start, length, dataStart}. */
function chunks(bytes) {
  const out = [];
  let o = 8;
  while (o + 12 <= bytes.length) {
    const length = u32(bytes, o);
    const type = ascii(bytes, o + 4, 4);
    out.push({ type, start: o, length, dataStart: o + 8, end: o + 12 + length });
    o += 12 + length;
    if (type === 'IEND') break;
  }
  return out;
}

function keywordOf(bytes, c) {
  const data = bytes.subarray(c.dataStart, c.dataStart + c.length);
  const zero = data.indexOf(0);
  return zero < 0 ? null : { data, zero, keyword: ascii(data, 0, zero) };
}

/** Image size from the IHDR chunk. */
export function pngSize(bytes) {
  if (!isPng(bytes)) return null;
  return { width: u32(bytes, 16), height: u32(bytes, 20) };
}

/** Metadata object, or null if the PNG has none. */
export function readPngMeta(bytes) {
  if (!isPng(bytes)) return null;
  for (const c of chunks(bytes)) {
    if (c.type !== 'iTXt' && c.type !== 'tEXt') continue;
    const k = keywordOf(bytes, c);
    if (!k || k.keyword !== KEYWORD) continue;
    let text;
    if (c.type === 'tEXt') {
      text = ascii(k.data, k.zero + 1, k.data.length - k.zero - 1);
    } else {
      // keyword \0 compressionFlag compressionMethod languageTag \0 translatedKeyword \0 text
      if (k.data[k.zero + 1] !== 0) return null; // compressed: not written by us
      let p = k.zero + 3;
      p = k.data.indexOf(0, p) + 1;
      p = k.data.indexOf(0, p) + 1;
      text = new TextDecoder().decode(k.data.subarray(p));
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  return null;
}

/** A copy of the PNG with the metadata chunk replaced (inserted before IEND). */
export function writePngMeta(bytes, meta) {
  if (!isPng(bytes)) throw new Error('Not a PNG file');
  const enc = new TextEncoder();
  const text = enc.encode(JSON.stringify(meta));
  const key = enc.encode(KEYWORD);
  const data = new Uint8Array(key.length + 5 + text.length);
  data.set(key, 0);
  // \0, compression flag 0, method 0, empty language tag \0, empty translated keyword \0
  data.set(text, key.length + 5);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(enc.encode('iTXt'), 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));

  const parts = [bytes.subarray(0, 8)];
  let iend = null;
  for (const c of chunks(bytes)) {
    if (c.type === 'IEND') {
      iend = bytes.subarray(c.start, c.end);
      continue;
    }
    if ((c.type === 'iTXt' || c.type === 'tEXt') && keywordOf(bytes, c)?.keyword === KEYWORD) continue;
    parts.push(bytes.subarray(c.start, c.end));
  }
  if (!iend) throw new Error('PNG has no IEND chunk');
  parts.push(chunk, iend);
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
