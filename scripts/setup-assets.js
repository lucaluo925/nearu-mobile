#!/usr/bin/env node
/**
 * Generates placeholder PNG assets for Expo build.
 * Run once before the first build: node scripts/setup-assets.js
 *
 * Produces:
 *   assets/images/icon.png        — 1024×1024 (App Store icon)
 *   assets/images/splash-icon.png — 200×200   (centered splash logo)
 *   assets/images/adaptive-icon.png — 1024×1024 (Android adaptive icon foreground)
 *   assets/images/favicon.png     — 48×48     (web favicon)
 */

const fs   = require('fs')
const path = require('path')

// ── Minimal PNG encoder ───────────────────────────────────────────────────────

const zlib = require('zlib')

function writePng(filePath, width, height, fillR, fillG, fillB) {
  // Build raw RGBA pixel data (unfiltered rows)
  const rowSize    = width * 4
  const filterByte = 0            // None filter per row
  const rawRows    = Buffer.alloc(height * (1 + rowSize))

  for (let y = 0; y < height; y++) {
    const base = y * (1 + rowSize)
    rawRows[base] = filterByte
    for (let x = 0; x < width; x++) {
      const off = base + 1 + x * 4
      rawRows[off]     = fillR
      rawRows[off + 1] = fillG
      rawRows[off + 2] = fillB
      rawRows[off + 3] = 255       // fully opaque
    }
  }

  const compressed = zlib.deflateSync(rawRows)

  function crc32(buf) {
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256)
      for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
        t[n] = c
      }
      return t
    })())
    let crc = 0xFFFFFFFF
    for (const byte of buf) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const lenBuf    = Buffer.alloc(4)
    lenBuf.writeUInt32BE(data.length)
    const crcInput  = Buffer.concat([typeBytes, data])
    const crcBuf    = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc32(crcInput))
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
  }

  // IHDR
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width,  0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8]  = 8  // bit depth
  ihdrData[9]  = 2  // color type: RGB (we'll use RGBA → type 6)
  ihdrData[9]  = 6  // RGBA
  ihdrData[10] = 0  // compression
  ihdrData[11] = 0  // filter
  ihdrData[12] = 0  // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr      = chunk('IHDR', ihdrData)
  const idat      = chunk('IDAT', compressed)
  const iend      = chunk('IEND', Buffer.alloc(0))

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Buffer.concat([signature, ihdr, idat, iend]))
  console.log(`✓ ${filePath}  (${width}×${height})`)
}

// ── Asset definitions ─────────────────────────────────────────────────────────

// NearU amber: #F59E0B → R=245 G=158 B=11
const AMBER = [245, 158, 11]
// Darker amber for adaptive icon: #D97706 → R=217 G=119 B=6
const AMBER_DARK = [217, 119, 6]

const root = path.join(__dirname, '..', 'assets', 'images')

writePng(path.join(root, 'icon.png'),          1024, 1024, ...AMBER)
writePng(path.join(root, 'splash-icon.png'),    200,  200, ...AMBER)
writePng(path.join(root, 'adaptive-icon.png'), 1024, 1024, ...AMBER_DARK)
writePng(path.join(root, 'favicon.png'),         48,   48, ...AMBER)

console.log('\nAssets generated. Replace with real artwork before App Store submission.')
