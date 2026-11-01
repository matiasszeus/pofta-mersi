// Prepares the bracelets' videos and their blurred pictures for the web
// (needs ffmpeg in PATH, or its path in FFMPEG):
//
//   node scripts/prepare-videos.mjs                    the videos
//   node scripts/prepare-videos.mjs --blur basalt=3 synthesis=3
//       the chosen frame of each (seconds), blurred (BLUR) and darkened
//       (DARKEN), small (BLUR_SIZE px, it is stretched anyway):
//       <name>-blur.webp in public/images/bratari/ (the photo on the
//       album's page, under its play button: blurred here, never with a
//       CSS filter in the 3D album)
//   node scripts/prepare-videos.mjs --cadre 1,3,6,9    frames to choose the
//       blurred one from, at these seconds, as PNG in tmp/cadre/ (not kept
//       in git)
//
// The originals (VIDEOS, in media/: outside public/, so never served by
// the site; only read, never changed) are square, the bracelet in the
// middle, cut by hand. Each becomes <name>-720.mp4 in public/videos/
// bratari/ (the big view): SIZE x SIZE px, H.264, CRF, no sound, FPS frames
// per second, faststart (the index at the start, so it starts playing
// before it is all downloaded).
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";

// name: the product's (src/config/products.ts points at these files).
const VIDEOS = [
  { name: "basalt", from: "media/videos/Wh.mp4" },
  { name: "synthesis", from: "media/videos/WhatsAp1.mp4" },
];
const VIDEO_DIR = "public/videos/bratari";
const PICTURE_DIR = "public/images/bratari";
const FRAMES_DIR = "tmp/cadre";
const SIZE = 720;
const CRF = 23; // quality: lower = better and bigger
const FPS = 30;
const BLUR = 12; // gaussian sigma, px at FRAME_SIZE
const DARKEN = 0.85; // brightness kept
const FRAME_SIZE = 480; // the frame is blurred at this size...
const BLUR_SIZE = 240; // ...then made this small
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";

const scale = (size) => `scale=${size}:${size}:flags=lanczos`;

// One frame, `seconds` in, through `filters`, written to `file` (its
// extension picks the format).
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

// "basalt=3" -> its video and the seconds.
function chosen(arg) {
  const [name, t] = arg.split("=");
  const v = VIDEOS.find((x) => x.name === name);
  if (!v || !t) throw new Error(`"${arg}": expected name=seconds, name one of ${VIDEOS.map((x) => x.name)}`);
  return { v, seconds: Number(t) };
}

const [mode, ...args] = process.argv.slice(2);

if (mode === "--cadre") {
  const seconds = (args[0] ?? "1,3,6,9").split(",").map(Number);
  mkdirSync(FRAMES_DIR, { recursive: true });
  for (const v of VIDEOS) {
    for (const t of seconds) {
      const file = `${FRAMES_DIR}/${v.name}-${t}s.png`;
      frame(v.from, scale(FRAME_SIZE), t, file);
      console.log(file);
    }
  }
} else if (mode === "--blur") {
  mkdirSync(PICTURE_DIR, { recursive: true });
  for (const arg of args) {
    const { v, seconds } = chosen(arg);
    const filters = [
      scale(FRAME_SIZE),
      "format=rgb24",
      `gblur=sigma=${BLUR}`,
      `lutrgb=r=val*${DARKEN}:g=val*${DARKEN}:b=val*${DARKEN}`,
      scale(BLUR_SIZE),
    ].join(",");
    const file = `${PICTURE_DIR}/${v.name}-blur.webp`;
    frame(v.from, filters, seconds, file, ["-c:v", "libwebp", "-quality", "70"]);
    console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
} else {
  mkdirSync(VIDEO_DIR, { recursive: true });
  for (const v of VIDEOS) {
    const file = `${VIDEO_DIR}/${v.name}-720.mp4`;
    execFileSync(FFMPEG, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", v.from,
      "-vf", `${scale(SIZE)},fps=${FPS}`,
      "-an",
      "-c:v", "libx264", "-preset", "veryslow", "-crf", String(CRF),
      "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      file,
    ]);
    console.log(`${file}: ${Math.round(statSync(file).size / 1024)} KB`);
  }
}
