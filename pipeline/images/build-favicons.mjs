// Favicons: PNG set from public/favicon.svg – 48, 96 and 192 px for browsers and search results, plus a
// 180 px apple-touch-icon. Each size is rasterised from the SVG at its own density (no downscaling), so
// edges stay sharp. The touch icon is opaque, flattened onto the SVG's ground colour (iOS fills
// transparency with black). Run: node pipeline/images/build-favicons.mjs [--out <dir>] (default public/).
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flag = process.argv.indexOf('--out');
const out = flag > -1 && process.argv[flag + 1] ? resolve(process.argv[flag + 1]) : join(root, 'public');
await mkdir(out, { recursive: true });

const GROUND = '#e8e1cf'; // fill of the SVG's rounded square
const ICONS = [
  { file: 'favicon-48.png', size: 48 },
  { file: 'favicon-96.png', size: 96 },
  { file: 'favicon-192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180, opaque: true },
];

const svg = await readFile(join(root, 'public', 'favicon.svg'));
// librsvg renders the SVG at its intrinsic width (viewBox) at 72 dpi; scale the density to hit each size.
const { width } = await sharp(svg).metadata();

for (const { file, size, opaque } of ICONS) {
  let image = sharp(svg, { density: (72 * size) / width }).resize(size, size, { fit: 'fill' });
  if (opaque) image = image.flatten({ background: GROUND }).removeAlpha();
  const info = await image.png({ compressionLevel: 9 }).toFile(join(out, file));
  console.log(`${file}  ${info.width}×${info.height}  ${info.channels} channels  ${info.size} bytes`);
}
