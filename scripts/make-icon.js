'use strict';
// Generates icon.png (128x128) — diff lines on a dark glass tile: red drops,
// green adds. Dependency-free (raw PNG via zlib). Run: node scripts/make-icon.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 128;
const R = 26; // corner radius for the rounded background

const BG = [22, 27, 34];
const RULE = [139, 148, 158];
const ADD = [63, 185, 80];
const DEL = [248, 81, 73];
const ADD_BG = [26, 61, 38];
const DEL_BG = [72, 33, 36];

function inRoundedRect(x, y, size, r) {
  const min = r;
  const max = size - 1 - r;
  const cx = x < min ? min : x > max ? max : x;
  const cy = y < min ? min : y > max ? max : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// [top, kind, text width]
const ROWS = [
  [22, 'ctx', 62],
  [40, 'del', 74],
  [58, 'del', 52],
  [76, 'add', 80],
  [94, 'add', 60],
];
const ROW_H = 13;

function pixel(x, y) {
  if (!inRoundedRect(x, y, S, R)) return null;
  for (const [top, kind, width] of ROWS) {
    if (y < top || y >= top + ROW_H) continue;
    if (kind === 'ctx') {
      return x >= 38 && x < 38 + width && y >= top + 4 && y < top + 9 ? RULE : BG;
    }
    const fg = kind === 'add' ? ADD : DEL;
    if (x < 14 || x >= 114) return BG;
    // gutter sign: "−" for del, "+" for add
    const gx = x - 20;
    const gy = y - top;
    const bar = gx >= 0 && gx < 9 && gy >= 5 && gy < 8;
    const stem = kind === 'add' && gx >= 3 && gx < 6 && gy >= 2 && gy < 11;
    if (bar || stem) return fg;
    if (x >= 38 && x < 38 + width && y >= top + 4 && y < top + 9) return fg;
    return kind === 'add' ? ADD_BG : DEL_BG;
  }
  return BG;
}

const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  const row = y * (S * 4 + 1);
  raw[row] = 0; // filter: none
  for (let x = 0; x < S; x++) {
    const c = pixel(x, y);
    const i = row + 1 + x * 4;
    if (c) {
      raw[i] = c[0];
      raw[i + 1] = c[1];
      raw[i + 2] = c[2];
      raw[i + 3] = 255;
    }
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'icon.png');
fs.writeFileSync(out, png);
console.log('wrote', out);
