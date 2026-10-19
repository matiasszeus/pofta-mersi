// Generates the landing's flower background images:
//   public/images/landing/flowers-portrait.webp   (phones)
//   public/images/landing/flowers-landscape.webp  (tablets / desktop)
//
// Run from the project root:  node scripts/generate-flowers.mjs
//
// Each image is drawn as an SVG, rasterized with sharp (installed together
// with Next.js), then given a fine grain and saved as WebP. Edit the colors,
// the flower recipe or the layouts below and run it again.

import sharp from "sharp";

const SAGE = "#BFDDBA"; // background and flower fill
const LILAC = "#C58BEA"; // the glow around the petals
const OUT_DIR = "public/images/landing";

// One flower: 7 oval petals around the center. In SVG units, at scale 1 a
// flower is about 240 across.
const PETAL = { rx: 40, ry: 62, cy: -58, count: 7 };
const STROKE_WIDTH = 16; // the lilac outline, before blurring
const BLUR = 9; // feGaussianBlur stdDeviation, for both layers
// Grain: a layer of fine gray noise laid over everything in "soft light"
// mode (darkens the darker specks, lightens the lighter ones, keeps the
// average color) at this opacity. 0 = no grain.
const GRAIN_OPACITY = 0.25;
const QUALITY = 82; // WebP quality
// Extra area drawn around the image and then cut off, in SVG units. The blur
// only sees what is drawn, so without it the edges of the image would show
// strips where a flower's glow or fill is cut by the border.
const MARGIN = 64;

// Layouts: SVG size in CSS pixels (the screen it is designed for), output
// size in real pixels (everything, blur included, scales up with it), and
// the flowers back to front as [x, y, scale]. Big flowers, overlapping and
// cut by the edges; the middle stays free for the letters.
const LAYOUTS = [
  {
    file: "flowers-portrait.webp",
    view: [390, 844],
    output: [1170, 2532], // 3x
    flowers: [
      [110, 150, 1.55],
      [345, 330, 1.05],
      [70, 560, 1.4],
      [330, 640, 0.75],
      [290, 840, 1.5],
      [-20, 860, 1.1],
    ],
  },
  {
    // Same flower sizes, more of them, along the edges. The letters use at
    // most the middle 45% of the width and 30% of the height.
    file: "flowers-landscape.webp",
    view: [1440, 810],
    output: [2880, 1620], // 2x
    flowers: [
      [120, 140, 1.55],
      [430, 20, 1.05],
      [720, -70, 0.9],
      [1030, 30, 0.85],
      [1320, 140, 1.5],
      [70, 560, 1.4],
      [1390, 560, 1.3],
      [330, 800, 1.1],
      [720, 890, 1.0],
      [1100, 810, 1.2],
    ],
  },
];

function petals() {
  const step = 360 / PETAL.count;
  return Array.from(
    { length: PETAL.count },
    (_, i) =>
      `<ellipse cx="0" cy="${PETAL.cy}" rx="${PETAL.rx}" ry="${PETAL.ry}" transform="rotate(${i * step})"/>`,
  ).join("");
}

function svg({ view: [w, h], output: [ow], flowers }) {
  // Output pixels per SVG unit, and the full drawn size including the margin.
  const k = ow / w;
  const [fw, fh] = [Math.round((w + 2 * MARGIN) * k), Math.round((h + 2 * MARGIN) * k)];

  // Per flower: first the lilac outline, then the sage fill on top. Both are
  // blurred, so no edge is sharp: what is left is a soft lilac glow that fades
  // both inwards and outwards.
  const body = flowers
    .map(
      ([x, y, s]) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <use href="#petals" fill="none" stroke="${LILAC}" stroke-width="${STROKE_WIDTH}" filter="url(#soft)"/>
      <use href="#petals" fill="${SAGE}" filter="url(#soft)"/>
    </g>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fw}" height="${fh}" viewBox="${-MARGIN} ${-MARGIN} ${w + 2 * MARGIN} ${h + 2 * MARGIN}">
  <defs>
    <g id="petals">${petals()}</g>
    <!-- Generous filter region so the blur is not cut off at the shape's box. -->
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${BLUR}"/>
    </filter>
  </defs>
  <rect x="${-MARGIN}" y="${-MARGIN}" width="${w + 2 * MARGIN}" height="${h + 2 * MARGIN}" fill="${SAGE}"/>${body}
</svg>`;
}

// Small seeded random generator, so every run gives exactly the same grain.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function render(layout, seed) {
  const [ow, oh] = layout.output;
  const pad = Math.round((MARGIN * ow) / layout.view[0]);
  // Render with the margin, then cut it off (extract = crop).
  const drawn = await sharp(Buffer.from(svg(layout))).png().toBuffer();
  const { data, info } = await sharp(drawn)
    .extract({ left: pad, top: pad, width: ow, height: oh })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Fine grain: one random gray value per pixel, blended in soft light at
  // GRAIN_OPACITY (the same noise value for R, G and B, so it has no color).
  const rand = random(seed);
  for (let i = 0; i < data.length; i += info.channels) {
    const n = rand();
    for (let c = 0; c < 3; c++) {
      const b = data[i + c] / 255;
      // Soft light (W3C formula): n < 0.5 darkens, n > 0.5 lightens.
      const d = b <= 0.25 ? ((16 * b - 12) * b + 4) * b : Math.sqrt(b);
      const soft = n <= 0.5 ? b - (1 - 2 * n) * b * (1 - b) : b + (2 * n - 1) * (d - b);
      data[i + c] = Math.round(255 * (b + (soft - b) * GRAIN_OPACITY));
    }
  }

  const path = `${OUT_DIR}/${layout.file}`;
  await sharp(data, { raw: info }).webp({ quality: QUALITY }).toFile(path);
  console.log(path);
}

for (const [i, layout] of LAYOUTS.entries()) await render(layout, i + 1);
