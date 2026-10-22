// Stills: posters, chapter images and editorial crops as AVIF + WebP in responsive widths.
// Sources are Blender stills in .raw/stills and the client's own photographs in assets-src/photos.
// Writes src/data/stills.json so templates never hard-code dimensions.
import sharp from 'sharp';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIVE = 'assets-src/photos/live-royalspices';
const out = join(root, 'public', 'img');
await mkdir(out, { recursive: true });

// name -> { src, widths, crop?: {left, top, width, height} as fractions of the source, prepare? }
// prepare: 'cutout' turns the logo's cream ground into transparency, 'cutout-light' also turns its
// dark green lettering light for the slate footer. Gold stays as drawn.
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
  // images of the former self-built royalspices.de (notes and licence: assets-src/photos/old-site/README.md)
  // wakhan: CC BY 2.0, credit beside the picture; the band shows the lower-middle strip (ridges and valley)
  'wakhan': { src: 'assets-src/photos/old-site/wakhan-ninara-43149066365.jpg', widths: [960, 1440, 1920, 2560], crop: { left: 0, top: 0.22, width: 1, height: 0.6 } },
  'display-photo': { src: 'assets-src/photos/old-site/safran-display.jpg', widths: [480, 768, 1152] },
  // images taken over from royalspices.de (originals and notes: assets-src/photos/live-royalspices/README.md)
  'logo-wide': { src: `${LIVE}/royal-spices-atelier-logo-wide.png`, widths: [220, 330, 440, 660], prepare: 'cutout' },
  'logo-wide-light': { src: `${LIVE}/royal-spices-atelier-logo-wide.png`, widths: [220, 330, 440, 660], prepare: 'cutout-light' },
  'brand-mark': { src: `${LIVE}/royal-spices-atelier-favicon.png`, widths: [112, 168, 224] },
  'live-threads': { src: `${LIVE}/saffron_threads_0084332b-c9de-435e-867e-5d01121b876c.jpg`, widths: [640, 960, 1440, 1920] },
  'live-jar-1g': { src: `${LIVE}/royal-spices-herat-negin-1g-premium_6c44d347-07dd-4963-a59a-680f23466abf.png`, widths: [480, 768, 1080, 1254] },
  // poster of the bar film in the business block: its last frame, written by pipeline/video/build-video.mjs
  'bar-poster': { src: '.raw/video/bar-poster.png', widths: [540, 720, 1080] },
};

// Colour to alpha against the logo's ground (#faf7f0): each pixel becomes the ink that, laid over the
// ground with some opacity, gives the original colour. Anti-aliased edges keep their softness.
const GROUND = [250, 247, 240];
const LIGHT_INK = [247, 244, 236]; // --paper-soft
async function prepare(src, mode) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const outBuf = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      const g = GROUND[c];
      a = Math.max(a, v < g ? (g - v) / g : (v - g) / (255 - g));
    }
    if (a < 0.03) a = 0;
    const rgb = [0, 1, 2].map((c) => (a ? Math.round((data[i + c] - GROUND[c]) / a + GROUND[c]) : 0));
    // the gold drawing ends at 26 % of the width and keeps its dark shading; the lettering starts at
    // 33 %, and right of 29 % only its dark green changes, the gold rule and star stay
    const x = (o / 4) % info.width;
    const lum = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    if (mode === 'cutout-light' && a && x > info.width * 0.29 && lum < 90) rgb.splice(0, 3, ...LIGHT_INK);
    for (let c = 0; c < 3; c++) outBuf[o + c] = Math.min(255, Math.max(0, rgb[c]));
    outBuf[o + 3] = Math.round(a * 255);
  }
  // trim the transparent margin so the logo's box is the drawing itself
  return sharp(outBuf, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer().then((b) => sharp(b).trim({ threshold: 1 }).png().toBuffer());
}

// "node build-stills.mjs logo-wide brand-mark" rebuilds only those stills and keeps the rest of
// stills.json and og.jpg as they are.
const only = process.argv.slice(2);
const manifest = join(root, 'src', 'data', 'stills.json');
const data = only.length ? JSON.parse(await readFile(manifest, 'utf8')) : {};
for (const [name, def] of Object.entries(STILLS)) {
  if (only.length && !only.includes(name)) continue;
  const file0 = [def.src].flat().map((p) => join(root, p)).find((p) => existsSync(p));
  const src = file0 && def.prepare ? await prepare(file0, def.prepare) : file0;
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
if (!only.length && existsSync(ogSource)) {
  await sharp(ogSource).resize(1200, 630, { fit: 'cover', position: 'right' }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(root, 'public', 'og.jpg'));
  console.log('og.jpg written');
}

await mkdir(join(root, 'src', 'data'), { recursive: true });
await writeFile(join(root, 'src', 'data', 'stills.json'), JSON.stringify(data, null, 2) + '\n');
console.log('stills.json written');
