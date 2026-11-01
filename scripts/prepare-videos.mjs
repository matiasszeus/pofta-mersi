// Prepares the album's videos and their pictures for the web (needs ffmpeg
// in PATH, or its path in FFMPEG):
//
//   node scripts/prepare-videos.mjs                  the videos
//   node scripts/prepare-videos.mjs --cadre 1,3,6,9  frames to choose from,
//       at these seconds, as PNG in tmp/cadre/ (not kept in git)
//   node scripts/prepare-videos.mjs --poza basalt=6 synthesis=3
//       the chosen frame of each (seconds) as its picture: WebP in
//       public/images/bratari/ (shown before the video plays)
//   node scripts/prepare-videos.mjs --blur basalt=3 synthesis=3
//       the chosen frame of each, blurred (BLUR) and darkened (DARKEN),
//       small (BLUR_SIZE px, it is stretched anyway): <name>-blur.webp in
//       public/images/bratari/ (the photo on the album's page, under its
//       play button: blurred here, never with a CSS filter in the 3D
//       album)
//   node scripts/prepare-videos.mjs --mare
//       a better version of each video for the big view: BIG x BIG px,
//       CRF BIG_CRF: <name>-720.mp4
//
// Videos, frames and pictures are all cut the same way (below), so the
// picture is exactly the video's frame.
//
// For each video in VIDEOS (the originals, in media/: outside public/, so
// never served by the site; only read, never changed):
//   - a square around the object, wherever it goes in any frame: ffmpeg's
//     cropdetect finds, frame by frame, the box that is not background
//     (black); the square holds all of them plus `margin` px, centred on
//     them. Where the frame is too small for it, the square is filled up
//     with black (the background).
//   - SIZE x SIZE px, H.264, no sound, FPS frames per second, faststart
//     (the index at the start, so it starts playing before it is all
//     downloaded); the smallest quality step under MAX_BYTES (CRF: higher =
//     smaller file, less detail)
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

// name: the product's (src/config/products.ts points at these files).
// cropped: already a square around the bracelet (cut by hand): only scaled,
// never cut again.
const VIDEOS = [
  { name: "basalt", from: "media/videos/Wh.mp4", cropped: true },
  { name: "synthesis", from: "media/videos/WhatsAp1.mp4", cropped: true },
];
const VIDEO_DIR = "public/videos/bratari";
const PICTURE_DIR = "public/images/bratari";
const FRAMES_DIR = "tmp/cadre";
const SIZE = 480;
const BIG = 720;
const BIG_CRF = 23;
const BLUR = 12; // gaussian sigma, px at SIZE
const DARKEN = 0.85; // brightness kept
const BLUR_SIZE = 240;
const FPS = 30;
const MAX_BYTES = 200 * 1024;
const margin = 28; // px of black kept around the object (original's px)
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";

const ffmpeg = (args) => spawnSync(FFMPEG, ["-hide_banner", "-y", ...args], { encoding: "utf8" });

// The frame's size, and the box (x0, y0, x1, y1) holding every frame's
// non-black part: ffmpeg hands over SAMPLE_FPS frames a second as plain
// grey pixels (one byte each), and every pixel brighter than BLACK counts.
const SAMPLE_FPS = 10;
const BLACK = 12; // of 255
function measure(file) {
  const probe = ffmpeg(["-i", file]).stderr;
  const [, width, height] = probe.match(/Video:.*?(\d{2,5})x(\d{2,5})/).map(Number);
  const raw = spawnSync(
    FFMPEG,
    ["-loglevel", "error", "-i", file, "-vf", `fps=${SAMPLE_FPS},format=gray`, "-f", "rawvideo", "-"],
    { maxBuffer: 1 << 30 },
  ).stdout;
  const frame = width * height;
  const box = [width, height, 0, 0];
  for (let f = 0; f + frame <= raw.length; f += frame) {
    for (let y = 0; y < height; y++) {
      const row = f + y * width;
      for (let x = 0; x < width; x++) {
        if (raw[row + x] <= BLACK) continue;
        if (x < box[0]) box[0] = x;
        if (y < box[1]) box[1] = y;
        if (x >= box[2]) box[2] = x + 1;
        if (y >= box[3]) box[3] = y + 1;
      }
    }
  }
  if (box[2] === 0) throw new Error(`${file}: only black`);
  return { width, height, box };
}

// The ffmpeg filters: crop the square (as much of it as lies in the frame),
// fill it up with black, scale it to size x size.
function squareFilters({ width, height, box }, size = SIZE) {
  const side = Math.ceil(Math.max(box[2] - box[0], box[3] - box[1]) + 2 * margin);
  const left = Math.round((box[0] + box[2]) / 2 - side / 2);
  const top = Math.round((box[1] + box[3]) / 2 - side / 2);
  // The part of the square inside the frame.
  const cx = Math.max(0, left);
  const cy = Math.max(0, top);
  const cw = Math.min(width, left + side) - cx;
  const ch = Math.min(height, top + side) - cy;
  return {
    side,
    filters: [
      `crop=${cw}:${ch}:${cx}:${cy}`,
      `pad=${side}:${side}:${cx - left}:${cy - top}:black`,
      `scale=${size}:${size}:flags=lanczos`,
    ].join(","),
  };
}

// The filters for one video at size x size: its square found and cut (see
// squareFilters), or, already cut by hand, only scaled.
function filtersFor(v, size = SIZE) {
  if (v.cropped) return { side: null, filters: `scale=${size}:${size}:flags=lanczos` };
  return squareFilters(measure(v.from), size);
}

// One frame, `seconds` in, cut like the video, written to `file`
// (its extension picks the format).
function frame(from, filters, seconds, file, extra = []) {
  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", String(seconds),
    "-i", from,
    "-vf", filters,
    "-frames:v", "1",
    ...extra,
    file,
  ]);
}

const [mode, ...args] = process.argv.slice(2);

if (mode === "--cadre") {
  const seconds = (args[0] ?? "1,3,6,9").split(",").map(Number);
  mkdirSync(FRAMES_DIR, { recursive: true });
  for (const v of VIDEOS) {
    const { filters } = filtersFor(v);
    for (const t of seconds) {
      const file = `${FRAMES_DIR}/${v.name}-${t}s.png`;
      frame(v.from, filters, t, file);
      console.log(file);
    }
  }
  process.exit(0);
}

if (mode === "--poza") {
  mkdirSync(PICTURE_DIR, { recursive: true });
  for (const arg of args) {
    const [name, t] = arg.split("=");
    const v = VIDEOS.find((x) => x.name === name);
    if (!v || !t) throw new Error(`"${arg}": expected name=seconds, name one of ${VIDEOS.map((x) => x.name)}`);
    const { filters } = filtersFor(v);
    const file = `${PICTURE_DIR}/${name}.webp`;
    frame(v.from, filters, Number(t), file, ["-c:v", "libwebp", "-quality", "85"]);
    console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
  process.exit(0);
}

if (mode === "--blur") {
  mkdirSync(PICTURE_DIR, { recursive: true });
  for (const arg of args) {
    const [name, t] = arg.split("=");
    const v = VIDEOS.find((x) => x.name === name);
    if (!v || !t) throw new Error(`"${arg}": expected name=seconds, name one of ${VIDEOS.map((x) => x.name)}`);
    const { filters } = filtersFor(v);
    const blur = [
      filters,
      "format=rgb24",
      `gblur=sigma=${BLUR}`,
      `lutrgb=r=val*${DARKEN}:g=val*${DARKEN}:b=val*${DARKEN}`,
      `scale=${BLUR_SIZE}:${BLUR_SIZE}:flags=lanczos`,
    ].join(",");
    const file = `${PICTURE_DIR}/${name}-blur.webp`;
    frame(v.from, blur, Number(t), file, ["-c:v", "libwebp", "-quality", "70"]);
    console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
  process.exit(0);
}

if (mode === "--mare") {
  for (const v of VIDEOS) {
    const { filters } = filtersFor(v, BIG);
    const file = `${VIDEO_DIR}/${v.name}-${BIG}.mp4`;
    execFileSync(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", v.from,
      "-vf", `${filters},fps=${FPS}`,
      "-an",
      "-c:v", "libx264", "-preset", "veryslow", "-crf", String(BIG_CRF),
      "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      file,
    ]);
    console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
  process.exit(0);
}

for (const v of VIDEOS) {
  mkdirSync(VIDEO_DIR, { recursive: true });
  const to = `${VIDEO_DIR}/${v.name}`;
  const { side, filters } = filtersFor(v);
  console.log(`${v.from}: ${side ? `square ${side}px around the object` : "already square"}`);

  let bytes = Infinity;
  for (let crf = 28; crf <= 40 && bytes > MAX_BYTES; crf += 2) {
    execFileSync(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", v.from,
      "-vf", `${filters},fps=${FPS}`,
      "-an",
      "-c:v", "libx264", "-preset", "veryslow", "-crf", String(crf),
      "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      `${to}.mp4`,
    ]);
    bytes = statSync(`${to}.mp4`).size;
    console.log(`  crf ${crf}: ${Math.round(bytes / 1024)} KB`);
  }
}
