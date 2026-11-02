import { theme } from "@/config/theme";

// The open album's stacks of pages (docs/album-margini-referinta.html): on
// each side `leaves` sheets, each one the outline of a page pushed out from
// the one above it by stepX sideways and stepY at the top and bottom, so
// the stack shows in steps. At the top and bottom the step thins out
// towards the spine (k = 1 - taper * t^3, t from 0 at the outer edge to 1
// at the spine). Outer corners rounded (radius); the sheets alternate two
// paper colors, with a thin line. Around them the cover shows by `cover`
// on the outer sides, its outer corners rounded by coverRadius.
//
// Everything in u (see theme.album), worked out once, as SVG paths. The
// page is unitWidth wide and unitWidth * page.ratio tall; x = 0 is the
// spine: the right stack goes from 0 to the right, the left one mirrored.

const { openStack: s, unitWidth, page, colors } = theme.album;
const W = unitWidth;
const H = unitWidth * page.ratio;

// How far the stack (with the cover) reaches past the page: sideways, and
// at the top and bottom.
export const stackReachX = s.leaves * s.stepX + s.cover;
export const stackReachY = s.leaves * s.stepY + s.cover;

// The SVG's box, in u: from the spine to the cover's outer edge, from the
// cover's top to its bottom (the page's top is y = 0).
export const stackBox = { width: W + stackReachX, height: H + 2 * stackReachY, top: -stackReachY };

const n = (v: number) => v.toFixed(2);
const SAMPLES = 28; // points along the top and bottom edges (the taper curve)

// One sheet's outline (sheet `i`: 1 = just under the page, `leaves` = the
// lowest), on the right; mirror = the left one.
function sheetPath(i: number, mirror: boolean) {
  const sx = mirror ? -1 : 1;
  const outer = W + i * s.stepX; // its outer edge
  const r = s.radius;
  const lift = (x: number) => {
    // t: 0 at the outer edge, 1 at the spine
    const t = 1 - Math.min(1, x / outer);
    return i * s.stepY * (1 - s.taper * t * t * t);
  };
  const pts: string[] = [];
  // Along the top, from the spine to the outer corner.
  for (let k = 0; k <= SAMPLES; k++) {
    const x = ((outer - r) * k) / SAMPLES;
    pts.push(`${k === 0 ? "M" : "L"}${n(sx * x)} ${n(-lift(x))}`);
  }
  const top = -i * s.stepY;
  const bottom = H + i * s.stepY;
  // The rounded outer corners and the outer edge.
  pts.push(`Q${n(sx * outer)} ${n(top)} ${n(sx * outer)} ${n(top + r)}`);
  pts.push(`L${n(sx * outer)} ${n(bottom - r)}`);
  pts.push(`Q${n(sx * outer)} ${n(bottom)} ${n(sx * (outer - r))} ${n(bottom)}`);
  // Along the bottom, back to the spine.
  for (let k = SAMPLES; k >= 0; k--) {
    const x = ((outer - r) * k) / SAMPLES;
    pts.push(`L${n(sx * x)} ${n(H + lift(x))}`);
  }
  return pts.join(" ") + " Z";
}

// The cover around the stack: from the spine to `cover` past the lowest
// sheet, rounded on its outer corners.
function coverPath(mirror: boolean) {
  const sx = mirror ? -1 : 1;
  const outer = W + stackReachX;
  const top = -stackReachY;
  const bottom = H + stackReachY;
  const r = s.coverRadius;
  return [
    `M0 ${n(top)}`,
    `L${n(sx * (outer - r))} ${n(top)}`,
    `Q${n(sx * outer)} ${n(top)} ${n(sx * outer)} ${n(top + r)}`,
    `L${n(sx * outer)} ${n(bottom - r)}`,
    `Q${n(sx * outer)} ${n(bottom)} ${n(sx * (outer - r))} ${n(bottom)}`,
    `L0 ${n(bottom)} Z`,
  ].join(" ");
}

export type StackDrawing = { cover: string; sheets: { d: string; fill: string }[] };

// Lowest sheet first (drawn first, the others over it); the colors
// alternate, the one just under the page the lighter one.
function drawing(mirror: boolean): StackDrawing {
  const sheets = [];
  for (let i = s.leaves; i >= 1; i--) {
    sheets.push({ d: sheetPath(i, mirror), fill: i % 2 === 1 ? colors.stackSheet : colors.stackSheetAlt });
  }
  return { cover: coverPath(mirror), sheets };
}

export const rightStack = drawing(false);
export const leftStack = drawing(true);
