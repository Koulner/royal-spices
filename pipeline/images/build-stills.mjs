// Stills: posters, chapter images and editorial crops as AVIF + WebP in responsive widths.
// Sources are Blender stills in .raw/stills and the client's own photographs in assets-src/photos.
// Writes src/data/stills.json so templates never hard-code dimensions.
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'public', 'img');
await mkdir(out, { recursive: true });

// name -> { src, widths, crop?: {left, top, width, height} as fractions of the source }
// src may be a list: the first file that exists is used. Chapter stills are frames of the landscape
// sequence itself (frame = round(progress * 89)), so essay and motion show the same pictures.
const STILLS = {
  // hero posters: first paint in motion mode / the whole hero in static mode
  'origin-desktop': { src: '.raw/stills/desktop_p0000.png', widths: [960, 1440, 1920] },
  'arrival-desktop': { src: '.raw/stills/desktop_p1000.png', widths: [960, 1440, 1920, 2560] },
  'origin-mobile': { src: '.raw/stills/mobile_p0000.png', widths: [540, 810, 1080] },
  'arrival-mobile': { src: '.raw/stills/mobile_p1000.png', widths: [540, 810, 1080] },
  // chapter stills (static essay + content sections)
  'crocus': { src: ['.raw/desktop/0012.png', '.raw/stills/desktop_p0130.png'], widths: [640, 960, 1440], crop: { left: 0.26, top: 0, width: 0.74, height: 1 } },
  'stigma': { src: ['.raw/desktop/0036.png', '.raw/stills/desktop_p0400.png'], widths: [640, 960, 1440], crop: { left: 0.22, top: 0, width: 0.78, height: 1 } },
  'saffron': { src: ['.raw/desktop/0050.png', '.raw/stills/desktop_p0560.png'], widths: [640, 960, 1440], crop: { left: 0.14, top: 0, width: 0.86, height: 1 } },
  'jar': { src: ['.raw/desktop/0062.png', '.raw/stills/desktop_p0700.png'], widths: [640, 960, 1440], crop: { left: 0.2, top: 0, width: 0.8, height: 1 } },
  // botanical figure (flower centre, annotated in the page)
  'anatomy': { src: '.raw/stills/anatomy.png', widths: [640, 960, 1440, 1920] },
  // client photographs
  'jars-photo': { src: 'assets-src/photos/safran-glaeser-real.jpg', widths: [480, 768, 1152] },
  'catering-photo': { src: 'assets-src/photos/catering-event.jpg', widths: [480, 768, 1200] },
};

const data = {};
for (const [name, def] of Object.entries(STILLS)) {
  const src = [def.src].flat().map((p) => join(root, p)).find((p) => existsSync(p));
  if (!src) {
    console.warn(`missing source for ${name}: ${def.src}`);
    continue;
  }
  const meta = await sharp(src).metadata();
  let region = null;
  let w = meta.width;
  let h = meta.height;
  if (def.crop) {
    region = {
      left: Math.round(def.crop.left * meta.width),
      top: Math.round(def.crop.top * meta.height),
      width: Math.round(def.crop.width * meta.width),
      height: Math.round(def.crop.height * meta.height),
    };
    w = region.width;
    h = region.height;
  }
  const entry = { width: w, height: h, avif: [], webp: [] };
  // never upscale; a source smaller than every requested width is delivered once at its own size
  const widths = def.widths.filter((x) => x <= w * 1.01);
  for (const width of widths.length ? widths : [w]) {
    for (const fmt of ['avif', 'webp']) {
      let img = sharp(src);
      if (region) img = img.extract(region);
      img = img.resize({ width, withoutEnlargement: true });
      const file = `${name}-${width}.${fmt}`;
      if (fmt === 'avif') await img.avif({ quality: 58, effort: 6 }).toFile(join(out, file));
      else await img.webp({ quality: 82, effort: 5 }).toFile(join(out, file));
      entry[fmt].push({ src: `/img/${file}`, width, bytes: (await stat(join(out, file))).size });
    }
  }
  data[name] = entry;
  console.log(name, `${w}x${h}`, entry.avif.map((a) => `${a.width}:${(a.bytes / 1024).toFixed(0)}k`).join(' '));
}

// Open Graph image: the arrival composition, cropped to 1200 x 630.
const ogSource = join(root, STILLS['arrival-desktop'].src);
if (existsSync(ogSource)) {
  await sharp(ogSource).resize(1200, 630, { fit: 'cover', position: 'right' }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(root, 'public', 'og.jpg'));
  console.log('og.jpg written');
}

await mkdir(join(root, 'src', 'data'), { recursive: true });
await writeFile(join(root, 'src', 'data', 'stills.json'), JSON.stringify(data, null, 2) + '\n');
console.log('stills.json written');
