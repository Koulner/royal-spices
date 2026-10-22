// Films: the client's bar film for the business block as AV1 and H.264 MP4 in two sizes (T-20261021-30).
// Sources live in .raw/video (not in git). Each film is cut before its fade to black, so playback stops
// on the last full frame; that frame is also written as the poster source for build-stills.mjs.
// Writes public/video and src/data/videos.json so templates never hard-code files or codecs.
// ffmpeg/ffprobe from PATH or FFMPEG/FFPROBE (needs libaom-av1, libx264).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'public', 'video');
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';

// name -> { src, end (s, cut before the fade), fps, poster (PNG for build-stills), variants }
// kbps is the two-pass video target; budget (bytes) is a hard limit for the whole file incl. sound.
// H.264 gets a fixed level: veryslow alone picks 5.x (16 reference frames), which older phone
// decoders refuse, and H.264 is the fallback exactly for those phones.
const FILMS = {
  bar: {
    src: '.raw/video/bar-0930.mp4', // 2160 x 3840, 60 fps, 28.5 s; fade to black from 25.37 s
    end: 25.35,
    fps: 30, // 60 fps needs about twice the size for the same VMAF (probe 21.10., user chose 30)
    poster: '.raw/video/bar-poster.png',
    variants: [
      { codec: 'av1', width: 1080, height: 1920, kbps: 2200, budget: 8e6 },
      { codec: 'av1', width: 720, height: 1280, kbps: 1110, budget: 4e6 }, // 1050 missed the 1 % low of VMAF 85
      { codec: 'h264', width: 1080, height: 1920, kbps: 4000, budget: 14e6, level: '4.0' },
      { codec: 'h264', width: 720, height: 1280, kbps: 2000, budget: 7e6, level: '3.1' },
    ],
  },
};
const AUDIO_KBPS = 128;
// sound is normalised for the "sound on" button: -16 LUFS, true peak -1.5 dBTP, short fade at the cut
const LOUDNESS = { I: -16, TP: -1.5, LRA: 11 };

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.error) throw new Error(`${cmd}: ${r.error.message} (set FFMPEG/FFPROBE)`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${r.stderr.slice(-2000)}`);
  return r;
}

function measureLoudness(src, end) {
  const { stderr } = run(FFMPEG, ['-hide_banner', '-t', `${end}`, '-i', src, '-vn',
    '-af', `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}:print_format=json`, '-f', 'null', '-']);
  // the JSON block is followed by ffmpeg's closing status lines
  const start = stderr.lastIndexOf('{');
  return JSON.parse(stderr.slice(start, stderr.indexOf('}', start) + 1));
}

// RFC 6381 codec strings for <source type> and MediaCapabilities, read from the encoded stream
function codecString(file) {
  const { stdout } = run(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_name,profile,level', '-of', 'json', file]);
  const v = JSON.parse(stdout).streams.find((s) => s.codec_name !== 'aac');
  if (v.codec_name === 'av1') return `av01.0.${String(v.level).padStart(2, '0')}M.08`;
  if (v.codec_name === 'h264') return `avc1.6400${v.level.toString(16).padStart(2, '0')}`;
  throw new Error(`unexpected codec ${v.codec_name}`);
}

// faststart: the moov box must come before mdat, or browsers fetch the end of the file first
async function moovFirst(file) {
  const head = (await readFile(file)).subarray(0, 1 << 16).toString('latin1');
  const moov = head.indexOf('moov');
  return moov >= 0 && (head.indexOf('mdat') < 0 || moov < head.indexOf('mdat'));
}

await mkdir(out, { recursive: true });
const data = {};
for (const [name, film] of Object.entries(FILMS)) {
  const src = join(root, film.src);
  const ln = measureLoudness(src, film.end);
  const af = [
    `loudnorm=I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}:measured_I=${ln.input_i}:measured_TP=${ln.input_tp}` +
      `:measured_LRA=${ln.input_lra}:measured_thresh=${ln.input_thresh}:offset=${ln.target_offset}:linear=true`,
    `afade=t=out:st=${(film.end - 0.3).toFixed(2)}:d=0.3`,
    'aresample=48000',
  ].join(',');

  // poster = the last frame that is played, so the still and the stopped film are the same picture
  const last = (film.end - 1 / film.fps).toFixed(3);
  run(FFMPEG, ['-v', 'error', '-y', '-ss', last, '-i', src, '-frames:v', '1', join(root, film.poster)]);

  const sources = [];
  for (const v of film.variants) {
    const tmp = join(out, `.${name}-${v.codec}-${v.height}.mp4`);
    const log = join(out, `.${name}-${v.codec}-${v.height}`);
    const vf = `scale=${v.width}:${v.height}:flags=lanczos,fps=${film.fps}`;
    const codec = v.codec === 'av1'
      ? ['-c:v', 'libaom-av1', '-cpu-used', '3', '-row-mt', '1', '-tiles', '2x2']
      : ['-c:v', 'libx264', '-preset', 'veryslow', '-profile:v', 'high', '-level:v', v.level];
    for (const pass of [1, 2]) {
      const base = ['-hide_banner', '-loglevel', 'error', '-y', '-t', `${film.end}`, '-i', src, '-vf', vf, ...codec,
        '-b:v', `${v.kbps}k`, '-pass', `${pass}`, '-passlogfile', log, '-g', `${film.fps * 4}`, '-pix_fmt', 'yuv420p'];
      run(FFMPEG, pass === 1
        ? [...base, '-an', '-f', 'null', '-']
        : [...base, '-af', af, '-c:a', 'aac', '-b:a', `${AUDIO_KBPS}k`, '-map_metadata', '-1', '-movflags', '+faststart', tmp]);
    }
    for (const f of await readdir(out)) if (f.startsWith(`.${name}-${v.codec}-${v.height}`) && f !== `.${name}-${v.codec}-${v.height}.mp4`) await rm(join(out, f));

    const hash = createHash('sha256').update(await readFile(tmp)).digest('hex').slice(0, 10);
    const file = `${name}-${v.codec}-${v.height}-${hash}.mp4`;
    await rename(tmp, join(out, file));
    const bytes = (await stat(join(out, file))).size;
    if (bytes > v.budget) throw new Error(`${file}: ${bytes} bytes over the budget of ${v.budget}`);
    if (!(await moovFirst(join(out, file)))) throw new Error(`${file}: moov not in front`);
    sources.push({ src: `/video/${file}`, type: `video/mp4; codecs="${codecString(join(out, file))}, mp4a.40.2"`, codec: v.codec, width: v.width, height: v.height, bytes });
    console.log(name, v.codec, `${v.width}x${v.height}`, `${(bytes / 1e6).toFixed(2)} MB`);
  }
  // drop files of earlier builds of this film
  const keep = new Set(sources.map((s) => s.src.slice('/video/'.length)));
  for (const f of await readdir(out)) if (f.startsWith(`${name}-`) && !keep.has(f)) await rm(join(out, f));

  const [w, h] = [film.variants[0].width, film.variants[0].height];
  data[name] = { width: w, height: h, duration: film.end, fps: film.fps, poster: `${name}-poster`, sources };
}

await writeFile(join(root, 'src', 'data', 'videos.json'), JSON.stringify(data, null, 2) + '\n');
console.log('videos.json written; next: node pipeline/images/build-stills.mjs bar-poster');
