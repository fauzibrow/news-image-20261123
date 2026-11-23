// news-image-20261123 — "Sum up 23 November's world news in one image".
//
// The poster is a 1024x1024 broadsheet drawn with Pillow (build_poster23.py):
// "MONDAY 23 NOVEMBER 2026 · 40 STORIES · 7 REGIONS · 12 FIELDS" — 3 drawn
// lead panels (NATO meets on Poland; Bahrain takes Iran to the UN; Trump
// wants a permanent deal), a real world map with numbered pins and
// per-region counts, a UTC timeline strip, ~10 drawn picture stories,
// region-grouped briefs with per-story verification badges (C/R/K), a
// HOW TO READ box and a DATE CHECK box that throws out stale news
// (the COP31 collapse, the Iran-Bahrain strike and the Dymer drone were
// 22 Nov leads — only their Monday fallout belongs here). No AI faces
// or photos; every fact comes from news23-research-brief.md.
//
// This program ships the poster: it reads entry.png next to this file,
// validates it thoroughly (PNG signature, IHDR dimensions, every chunk
// CRC, IDAT inflate size, exact sha256), then writes it to
// $MAKEFUN_OUTPUT_DIR (default /output) as entry.png.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//   MAKEFUN_OUTPUT_DIR=out node main.ts --verify
//
// Exit codes: 0 ok; 1 source missing or fails validation; 2 (verify)
// output missing; 3 (verify) sha mismatch; 4 (verify) dimensions or
// byte size wrong; 5 (verify) signature or chunk CRC broken;
// 6 (verify) IDAT inflate size wrong.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const POSTER_SHA =
  "e3da4ca0637ad13b5a72ac2a0052632ef127f9b230a768de2b5f6532643359b9";
const POSTER_BYTES = 196021;
const POSTER_WIDTH = 1024;
const POSTER_HEIGHT = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "entry.png");

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

// CRC-32 (IEEE) over type + data, as the PNG spec requires.
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type Chunk = { type: string; data: Buffer; crc: number };

function splitChunks(buf: Buffer): Chunk[] {
  const chunks: Chunk[] = [];
  let offset = 8;
  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const crc = buf.readUInt32BE(offset + 8 + length);
    chunks.push({ type, data, crc });
    offset += 12 + length;
    if (type === "IEND") break;
  }
  return chunks;
}

// Returns a human-readable problem plus the --verify exit code for its
// class, or null when the buffer is a valid copy of the expected poster.
function posterProblem(buf: Buffer): { code: number; message: string } | null {
  if (buf.length !== POSTER_BYTES)
    return {
      code: 4,
      message: `byte size ${buf.length}, expected ${POSTER_BYTES}`,
    };
  if (!buf.subarray(0, 8).equals(PNG_MAGIC))
    return { code: 5, message: "bad PNG signature" };
  const chunks = splitChunks(buf);
  const ihdr = chunks.find((c) => c.type === "IHDR");
  if (!ihdr) return { code: 5, message: "missing IHDR chunk" };
  if (ihdr.data.length !== 13)
    return { code: 5, message: "IHDR chunk has wrong length" };
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  if (width !== POSTER_WIDTH || height !== POSTER_HEIGHT)
    return {
      code: 4,
      message: `dimensions ${width}x${height}, expected ${POSTER_WIDTH}x${POSTER_HEIGHT}`,
    };
  if (ihdr.data[8] !== 8 || ihdr.data[9] !== 2)
    return {
      code: 4,
      message: `bit depth ${ihdr.data[8]} / color type ${ihdr.data[9]}, expected 8 / 2 (RGB)`,
    };
  for (const chunk of chunks) {
    const expect = crc32(Buffer.concat([Buffer.from(chunk.type, "latin1"), chunk.data]));
    if (expect !== chunk.crc)
      return {
        code: 5,
        message: `${chunk.type} chunk CRC mismatch (stored ${chunk.crc.toString(16)}, computed ${expect.toString(16)})`,
      };
  }
  const idat = Buffer.concat(
    chunks.filter((c) => c.type === "IDAT").map((c) => c.data),
  );
  let raw: Buffer;
  try {
    raw = inflateSync(idat);
  } catch (err) {
    return { code: 6, message: `IDAT inflate failed: ${(err as Error).message}` };
  }
  const expectRaw = (POSTER_WIDTH * 3 + 1) * POSTER_HEIGHT;
  if (raw.length !== expectRaw)
    return {
      code: 6,
      message: `IDAT inflates to ${raw.length} bytes, expected ${expectRaw}`,
    };
  const digest = sha256Hex(buf);
  if (digest !== POSTER_SHA)
    return { code: 3, message: `sha256 ${digest}, expected ${POSTER_SHA}` };
  return null;
}

function fail(code: number, message: string): never {
  console.error(`error: ${message}`);
  process.exit(code);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outPath = join(outDir, "entry.png");

// --verify never rewrites: it reads the existing output and checks it
// against the expected poster, with a distinct exit code per failure.
if (process.argv.includes("--verify")) {
  if (!existsSync(outPath)) fail(2, `output missing: ${outPath}`);
  const candidate = readFileSync(outPath);
  const found = posterProblem(candidate);
  if (found) fail(found.code, `output invalid: ${found.message}`);
  console.log(
    `verify OK: ${outPath} (${candidate.length} bytes, sha256 ${sha256Hex(candidate)})`,
  );
  process.exit(0);
}

if (!existsSync(SOURCE)) fail(1, `source poster missing: ${SOURCE}`);
const poster = readFileSync(SOURCE);
const problem = posterProblem(poster);
if (problem) fail(1, `source poster invalid: ${problem.message}`);
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, poster);
const again = readFileSync(outPath);
if (!again.equals(poster)) fail(1, "re-read after write differs from source");
console.log(
  `wrote ${outPath} (${poster.length} bytes, sha256 ${sha256Hex(poster)})`,
);
