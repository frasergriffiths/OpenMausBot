// Renders build/icon.svg into every raster icon the app and its installers use, so the brand vector stays the
// single source of truth. Run by "pnpm build:icon", and before packaging.
import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("build/icon.svg", root));

function render(size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
}

async function write(path, data) {
  await writeFile(new URL(path, root), data);
  console.log("wrote " + path);
}

await write("build/icon-1024.png", render(1024));
await write("electron/resources/app-icon.png", render(1024));

// ICO: PNG-compressed entries, which every Windows version since Vista reads.
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoImages = icoSizes.map(render);
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoSizes.length, 4);
const icoEntries = [];
let offset = 6 + 16 * icoSizes.length;
icoSizes.forEach((size, index) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(icoImages[index].length, 8);
  entry.writeUInt32LE(offset, 12);
  offset += icoImages[index].length;
  icoEntries.push(entry);
});
await write("build/icon.ico", Buffer.concat([icoHeader, ...icoEntries, ...icoImages]));

// ICNS: the PNG chunk types Apple reads, from 16 px up to 1024 px.
const icnsTypes = [
  ["icp4", 16],
  ["icp5", 32],
  ["ic11", 32],
  ["ic12", 64],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic13", 256],
  ["ic09", 512],
  ["ic14", 512],
  ["ic10", 1024],
];
const chunks = icnsTypes.map(([type, size]) => {
  const png = render(size);
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32BE(png.length + 8, 4);
  return Buffer.concat([header, png]);
});
const icnsHeader = Buffer.alloc(8);
icnsHeader.write("icns", 0, "ascii");
icnsHeader.writeUInt32BE(8 + chunks.reduce((total, chunk) => total + chunk.length, 0), 4);
await write("build/icon.icns", Buffer.concat([icnsHeader, ...chunks]));
