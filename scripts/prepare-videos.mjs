// Prepares the album's videos for the web (needs ffmpeg in PATH, or its
// path in FFMPEG):
//
//   node scripts/prepare-videos.mjs
//
// For each video in VIDEOS (the originals are only read, never changed):
//   - a square around the object, wherever it goes in any frame: ffmpeg's
//     cropdetect finds, frame by frame, the box that is not background
//     (black); the square holds all of them plus `margin` px, centred on
//     them. Where the frame is too small for it, the square is filled up
//     with black (the background).
//   - SIZE x SIZE px, H.264, no sound, FPS frames per second, faststart
//     (the index at the start, so it starts playing before it is all
//     downloaded); the smallest quality step under MAX_BYTES (CRF: higher =
//     smaller file, less detail)
//   - a poster: its first frame as WebP, shown until the video plays (and
//     while the page turns)
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

const VIDEOS = [
  { from: "public/videos/bratara1.mp4", to: "public/videos/bratari/model-1" },
  { from: "public/videos/bratara2.mp4", to: "public/videos/bratari/model-2" },
];
const SIZE = 480;
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
// fill it up with black, scale it.
function squareFilters({ width, height, box }) {
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
      `scale=${SIZE}:${SIZE}:flags=lanczos`,
    ].join(","),
  };
}

for (const v of VIDEOS) {
  mkdirSync(dirname(v.to), { recursive: true });
  const m = measure(v.from);
  const { side, filters } = squareFilters(m);
  console.log(`${v.from}: ${m.width}x${m.height}, object in ${m.box.join(",")}, square ${side}px`);

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
      `${v.to}.mp4`,
    ]);
    bytes = statSync(`${v.to}.mp4`).size;
    console.log(`  crf ${crf}: ${Math.round(bytes / 1024)} KB`);
  }

  execFileSync(FFMPEG, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", v.from,
    "-vf", filters,
    "-frames:v", "1",
    "-c:v", "libwebp", "-quality", "80",
    `${v.to}.webp`,
  ]);
  console.log(`  poster: ${Math.round(statSync(`${v.to}.webp`).size / 1024)} KB`);
}
