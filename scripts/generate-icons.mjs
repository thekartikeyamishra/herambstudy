#!/usr/bin/env node
/**
 * Generates PWA icons, the Apple touch icon and favicon.ico from the original
 * SVG mark. Run after changing public/icons/icon.svg:  npm run icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/icons/icon.svg");

// Maskable icons need the artwork inside the central 80% "safe zone".
const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#0E1528"/>
  <g transform="translate(6 6) scale(0.7)">
    <rect x="9" y="21" width="5" height="10" rx="2.5" fill="#FFFFFF" fill-opacity="0.55"/>
    <rect x="17.5" y="15" width="5" height="16" rx="2.5" fill="#FFFFFF" fill-opacity="0.8"/>
    <rect x="26" y="17" width="5" height="14" rx="2.5" fill="#FFFFFF"/>
    <circle cx="28.5" cy="10.5" r="3" fill="#8F86F2"/>
  </g>
</svg>`);

// Apple touch icons should be full-bleed squares (iOS applies its own mask).
const appleSvg = Buffer.from(String(svg).replace('rx="11"', 'rx="0"'));

const render = (input, size) => sharp(input, { density: 512 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const outputs = [
  ["public/icons/icon-192.png", svg, 192],
  ["public/icons/icon-512.png", svg, 512],
  ["public/icons/maskable-512.png", maskableSvg, 512],
  ["public/icons/apple-touch-icon.png", appleSvg, 180],
];
for (const [file, input, size] of outputs) {
  writeFileSync(file, await render(input, size));
  console.log("wrote", file);
}

// favicon.ico containing 16, 32 and 48px PNG images.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => render(svg, s)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));
console.log("wrote public/favicon.ico");
