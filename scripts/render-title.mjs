// Renders the landing's 3D title once as still pictures, for StaticTitle
// (shown from the very first frame, until the 3D scene is ready):
//   public/images/landing/title-portrait.webp   (phones, tablets upright)
//   public/images/landing/title-landscape.webp  (wider screens)
//   src/config/titleSnapshot.ts                 (where to place them)
//
// It photographs the real 3D scene, so the pictures always match the letters.
// Run again whenever the letters, their material, the lights or the layout
// change in theme.ts:
//
//   1. npm run dev                      (leave it running)
//   2. node scripts/render-title.mjs    (from the project root)
//
// Uses the Chrome installed on this computer (no extra packages). Set CHROME
// to its path if it is not in the usual place, and URL if the dev server is
// not on http://localhost:3000.

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = `${process.env.URL ?? "http://localhost:3000"}/?snapshot`;
const PORT = 9399;

// The picture for each orientation, and the screen shapes (width / height)
// to measure the layout on. The title's share of the screen width changes a
// little with the screen's shape (perspective: on wider screens the letters
// are bigger and their front comes closer to the camera), so it is measured
// across the whole range and looked up by StaticTitle.
const ORIENTATIONS = {
  portrait: {
    picture: { width: 390, height: 844, scale: 3 },
    height: 844,
    aspects: [0.4, 0.44, 0.48, 0.52, 0.56, 0.62, 0.68, 0.75, 0.82, 0.9, 0.99],
  },
  landscape: {
    picture: { width: 1440, height: 900, scale: 2 },
    height: 900,
    aspects: [1, 1.1, 1.2, 1.33, 1.45, 1.55, 1.65, 1.75, 1.9, 2.1, 2.4],
  },
};
const LETTER_ALPHA = 200; // pixels this opaque are letters (not the soft shadow)
const KEEP_ALPHA = 2; // pixels this opaque are kept in the picture (shadow too)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  "--use-angle=d3d11",
  "--ignore-gpu-blocklist",
  "--hide-scrollbars",
  `--user-data-dir=${process.env.TEMP ?? "/tmp"}/render-title-${Date.now()}`,
  `--remote-debugging-port=${PORT}`,
  "about:blank",
]);
let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) pending.get(d.id)(d.result), pending.delete(d.id);
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;

// A see-through page background, so only the title (and its shadow) remain.
await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });

// Photographs the title on a screen of this size; returns the PNG as raw
// RGBA pixels.
async function photograph(width, height, scale) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: false });
  await send("Page.navigate", { url: URL });
  for (let i = 0; i < 300; i++) {
    if (await evaluate(`performance.getEntriesByName("pm:ready").length > 0`).catch(() => false)) break;
    await sleep(100);
  }
  await sleep(400);
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  return sharp(Buffer.from(data, "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

// Bounding box of the pixels at least this opaque, in the middle band of the
// screen (leaves out anything in the corners, like the dev server's badge).
function bounds({ data, info }, minAlpha) {
  const { width, height, channels } = info;
  let [left, top, right, bottom] = [width, height, -1, -1];
  for (let y = Math.floor(height * 0.1); y < Math.ceil(height * 0.9); y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] < minAlpha) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
  }
  if (right < 0) throw new Error("No title found in the picture: is the dev server running?");
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

const result = {};
for (const [name, { picture, height, aspects }] of Object.entries(ORIENTATIONS)) {
  // Layout: for each screen shape, the letters' width as a share of the
  // screen width, and where their middle is.
  const widths = [];
  const middles = [];
  for (const aspect of aspects) {
    const [w, h] = [Math.round(height * aspect), height];
    const b = bounds(await photograph(w, h, 1), LETTER_ALPHA);
    widths.push([aspect, +(b.width / w).toFixed(4)]);
    middles.push([(b.left + b.right) / 2 / w, (b.top + b.bottom) / 2 / h]);
    console.log(`${name} ${w}x${h}: letters ${b.width}x${b.height} px`);
  }

  // The picture: the title with its shadow, cut out of a sharp photograph.
  const shot = await photograph(picture.width, picture.height, picture.scale);
  const letters = bounds(shot, LETTER_ALPHA);
  const all = bounds(shot, KEEP_ALPHA);
  const pad = Math.round(4 * picture.scale);
  const crop = {
    left: Math.max(0, all.left - pad),
    top: Math.max(0, all.top - pad),
    width: Math.min(shot.info.width, all.right + pad) - Math.max(0, all.left - pad),
    height: Math.min(shot.info.height, all.bottom + pad) - Math.max(0, all.top - pad),
  };
  const file = `title-${name}.webp`;
  await sharp(shot.data, { raw: shot.info })
    .extract(crop)
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(`public/images/landing/${file}`);
  console.log(`public/images/landing/${file}: ${crop.width}x${crop.height}`);

  // Everything in "letter widths" (the letters' width on screen = 1), so the
  // picture can be placed at any size.
  const lw = letters.width;
  result[name] = {
    src: `/images/landing/${file}`,
    pixelWidth: crop.width,
    pixelHeight: crop.height,
    // [screen width / height, letters' width / screen width]
    widths,
    middleX: +(middles.reduce((s, m) => s + m[0], 0) / middles.length).toFixed(4),
    middleY: +(middles.reduce((s, m) => s + m[1], 0) / middles.length).toFixed(4),
    // The picture's box, from the letters' middle, in letter widths.
    left: +((crop.left - (letters.left + letters.right) / 2) / lw).toFixed(4),
    top: +((crop.top - (letters.top + letters.bottom) / 2) / lw).toFixed(4),
    width: +(crop.width / lw).toFixed(4),
    height: +(crop.height / lw).toFixed(4),
  };
}

writeFileSync(
  "src/config/titleSnapshot.ts",
  `// GENERATED by scripts/render-title.mjs: do not edit by hand, run the script.
//
// The still pictures of the landing's 3D title and where to put them (see
// StaticTitle). widths: [screen width / height, the letters' width as a share
// of the screen width], measured across screen shapes. middleX / middleY:
// the letters' middle, as a share of the screen. left / top / width /
// height: the picture's box, from the letters' middle, in letter widths.

export const titleSnapshot = ${JSON.stringify(result, null, 2)} as const;
`,
);
console.log("src/config/titleSnapshot.ts");
ws.close();
chrome.kill();
