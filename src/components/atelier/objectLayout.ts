import { theme } from "@/config/theme";

// Where the things on the atelier's mat go (the album, the note, the
// calculator, and the letters around them), in CSS px from the top-left
// corner of the visible part of the screen. The page and the 3D letters
// both place them from here, so they agree.

// A part of an object's outline, from the top-left corner of its box, as
// fractions of the box's width (also for top / bottom).
export type OutlineBox = { left: number; top: number; right: number; bottom: number };
// outline: what the object really covers, if not just its box (the album
// drawn in code: its pages' edge, tabs and ribbon stick out).
export type MatObjectConfig = (typeof theme.atelier.objects)[number] & { outline?: OutlineBox[] };
export type Orientation = "portrait" | "landscape";
export type Rect = { left: number; top: number; width: number; height: number };
// Something lying on the mat: its box before its turn, and the turn in
// degrees (clockwise, like CSS): around the box's middle, the note's around
// NOTE_PIVOT.
export type Placed = Rect & { rotation: number };
// What lies on the mat, placed for one screen size.
export type MatLayout = { album: MatObjectConfig; albumBox: Placed; note: Placed; calc: Placed };

const { layout, note, calc } = theme.atelier;
const letters = theme.atelier.letters;
const noteRatio = note.paper.height / note.paper.width;

// The point of the note on the mat it turns around (and lifts its corner
// from): near the tape, as fractions of its box. Used by AtelierNote too.
export const NOTE_PIVOT = { x: 0.35, y: 0.04 };

// The same rule as CSS's (orientation: landscape): wider than tall.
export function orientationOf(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

// The visible part of the screen, in CSS px: its width, and the height of
// the visual viewport (between Safari's or Instagram's bars). Times its
// zoom, so pinching the page does not move things around.
export function visibleSize() {
  const vv = window.visualViewport;
  const height = vv ? Math.min(window.innerHeight, vv.height * vv.scale) : window.innerHeight;
  return { width: window.innerWidth, height };
}

// Phones held upright get their own layout (layout.phone in theme.ts);
// tablets, desktops and phones held sideways the wide one.
const phoneLayout = (screenWidth: number, screenHeight: number) =>
  screenWidth < layout.phone.maxWidth && screenHeight >= screenWidth;
// Phones, for the letters (see letters.phone).
const isPhone = (screenWidth: number) => screenWidth < letters.phone.maxWidth;

export function rectMiddle(r: Rect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

// k times the size, around the middle.
function shrunk(p: Placed, k: number): Placed {
  const { x, y } = rectMiddle(p);
  const width = p.width * k;
  const height = p.height * k;
  return { ...p, left: x - width / 2, top: y - height / 2, width, height };
}

// One thing from its % (see layout in theme.ts): left, width of the
// screen's width; top of its height; height from its proportions.
type Spec = { left: number; top: number; width: number; rotation: number };
function fromSpec(spec: Spec, ratio: number, screenWidth: number, screenHeight: number): Placed {
  const width = (spec.width / 100) * screenWidth;
  return {
    left: (spec.left / 100) * screenWidth,
    top: (spec.top / 100) * screenHeight,
    width,
    height: width * ratio,
    rotation: spec.rotation,
  };
}

// The album, the note and the calculator on a screen of this size (see
// layout in theme.ts). `album`: the album's settings (its proportions and
// outline), from theme.ts or /lab/album's drawn one.
export function matLayout(screenWidth: number, screenHeight: number, album: MatObjectConfig): MatLayout {
  const albumRatio = album.height / album.width;

  if (!phoneLayout(screenWidth, screenHeight)) {
    const w = layout.wide;
    // Smaller on screens wider for their height than the reference.
    const k = Math.min(1, screenHeight / screenWidth / (w.reference.height / w.reference.width));
    const albumBox = shrunk(fromSpec(w.album, albumRatio, screenWidth, screenHeight), k);
    const c = shrunk(fromSpec(w.calc, calc.ratio, screenWidth, screenHeight), k);
    const n = shrunk(fromSpec(w.note, noteRatio, screenWidth, screenHeight), k);
    // Never closer than minGap to the album.
    c.left = Math.min(c.left, albumBox.left - w.minGap - c.width);
    n.left = Math.max(n.left, albumBox.left + albumBox.width + w.minGap);
    return { album, albumBox, note: n, calc: c };
  }

  const p = layout.phone;
  const n = fromSpec(p.note, noteRatio, screenWidth, screenHeight);
  const noteShape = [noteOutline(n, 0)];
  // The album: smaller (around its middle) while it comes too close to the
  // note, down to albumMinScale.
  const full = fromSpec(p.album, albumRatio, screenWidth, screenHeight);
  let albumBox = full;
  for (let k = 1; k >= p.albumMinScale; k -= 0.01) {
    albumBox = shrunk(full, k);
    if (distance(albumOutline(album, albumBox, 0), noteShape) >= p.gap) break;
  }
  // The calculator: bottom-left, its bottom `bottom` px above the screen's;
  // smaller (bottom and left staying) while it comes too close to the album
  // or the note, down to minWidth.
  const others = [...albumOutline(album, albumBox, 0), ...noteShape];
  const calcAt = (width: number): Placed => {
    const height = width * calc.ratio;
    return {
      left: (p.calc.left / 100) * screenWidth,
      top: screenHeight - p.calc.bottom - height,
      width,
      height,
      rotation: p.calc.rotation,
    };
  };
  let width = Math.max(p.calc.minWidth, (p.calc.width / 100) * screenWidth);
  while (width > p.calc.minWidth && distance([calcOutline(calcAt(width), 0)], others) < p.gap) {
    width = Math.max(p.calc.minWidth, width - 1);
  }
  return { album, albumBox, note: n, calc: calcAt(width) };
}

// What the album, the note and the calculator really cover: a few turned
// rectangles (corners in CSS px), each grown by `margin` px on every side.
type Point = { x: number; y: number };

// The corners of a box grown by `margin`, turned by `degrees` (clockwise,
// like CSS) around the point (cx, cy).
function turnedBox(
  left: number,
  top: number,
  right: number,
  bottom: number,
  margin: number,
  degrees: number,
  cx: number,
  cy: number,
): Point[] {
  const a = (degrees * Math.PI) / 180;
  const corners = [
    [left - margin, top - margin],
    [right + margin, top - margin],
    [right + margin, bottom + margin],
    [left - margin, bottom + margin],
  ];
  return corners.map(([x, y]) => ({
    x: cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    y: cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
  }));
}

// The album: its box (or its `outline` parts), turned around the middle of
// its box like .obj-art.
function albumOutline(album: MatObjectConfig, r: Placed, margin: number): Point[][] {
  const { x: cx, y: cy } = rectMiddle(r);
  const w = r.width;
  const boxes = album.outline ?? [{ left: 0, top: 0, right: 1, bottom: r.height / w }];
  return boxes.map((b) =>
    turnedBox(r.left + b.left * w, r.top + b.top * w, r.left + b.right * w, r.top + b.bottom * w, margin, r.rotation, cx, cy),
  );
}

// The note, turned around its pivot (like .note-mat).
function noteOutline(n: Placed, margin: number): Point[] {
  const px = n.left + NOTE_PIVOT.x * n.width;
  const py = n.top + NOTE_PIVOT.y * n.height;
  return turnedBox(n.left, n.top, n.left + n.width, n.top + n.height, margin, n.rotation, px, py);
}

// The calculator, turned around its middle.
function calcOutline(c: Placed, margin: number): Point[] {
  const { x, y } = rectMiddle(c);
  return turnedBox(c.left, c.top, c.left + c.width, c.top + c.height, margin, c.rotation, x, y);
}

export function blockerOutlines(mat: MatLayout, margin: number): Point[][] {
  return [...albumOutline(mat.album, mat.albumBox, margin), noteOutline(mat.note, margin), calcOutline(mat.calc, margin)];
}

// Do two convex shapes overlap? Separating axis test: they do not if, along
// the direction across one of their edges, their shadows do not meet.
function shapesOverlap(a: Point[], b: Point[]) {
  for (const shape of [a, b]) {
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      const q = shape[(i + 1) % shape.length];
      const axis = { x: q.y - p.y, y: p.x - q.x };
      const project = (s: Point[]) => s.map((v) => v.x * axis.x + v.y * axis.y);
      const pa = project(a);
      const pb = project(b);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  }
  return true;
}

// The shortest distance between two convex shapes (0 if they overlap):
// from a corner of one to an edge of the other.
function shapeDistance(a: Point[], b: Point[]) {
  if (shapesOverlap(a, b)) return 0;
  const toEdge = (p: Point, q: Point, r: Point) => {
    const dx = r.x - q.x;
    const dy = r.y - q.y;
    const t = Math.max(0, Math.min(1, ((p.x - q.x) * dx + (p.y - q.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (q.x + t * dx), p.y - (q.y + t * dy));
  };
  let best = Infinity;
  for (const [s, t] of [[a, b], [b, a]]) {
    for (const p of s) {
      for (let i = 0; i < t.length; i++) best = Math.min(best, toEdge(p, t[i], t[(i + 1) % t.length]));
    }
  }
  return best;
}

// The shortest distance between two groups of shapes.
function distance(a: Point[][], b: Point[][]) {
  return Math.min(...a.flatMap((s) => b.map((t) => shapeDistance(s, t))));
}

export type LetterSpot = (typeof letters.portrait)[number];

// How much smaller the letters are drawn on upright screens (see
// phoneScale in theme.ts), and on short phones (letters.short): 1 on wide
// screens.
export function letterScale(screenWidth: number, screenHeight: number) {
  if (orientationOf(screenWidth, screenHeight) !== "portrait") return 1;
  const short = isPhone(screenWidth) && screenHeight < letters.short.height ? letters.short.scale : 1;
  return letters.phoneScale * short;
}

// A letter's box on a screen of this size, in CSS px (see `letters` in
// theme.ts): a square `size` wide, the letter centred in it.
export function letterRect(spot: LetterSpot, screenWidth: number, screenHeight: number): Rect {
  const size = spot.size * Math.min(screenWidth, screenHeight);
  return { left: spot.x * screenWidth, top: spot.y * screenHeight, width: size, height: size };
}

// Would this letter touch one of these shapes? The letter counts as the
// middle part of its box (boxInset), at its drawn size (scale).
export function letterBlocked(spot: LetterSpot, screenWidth: number, screenHeight: number, shapes: Point[][], scale = 1) {
  const r = letterRect(spot, screenWidth, screenHeight);
  const { x, y } = rectMiddle(r);
  const half = (r.width * scale) / 2 - r.width * letters.boxInset;
  const core = [
    { x: x - half, y: y - half },
    { x: x + half, y: y - half },
    { x: x + half, y: y + half },
    { x: x - half, y: y + half },
  ];
  return shapes.some((s) => shapesOverlap(core, s));
}

// The letters' places on a screen of this size: those for its orientation,
// on phones without the left-out letters and with the moved ones moved
// (see `phone` in theme.ts). Given what lies on the mat: a letter that
// would touch it (`clearance` px around the real outlines) is moved to the
// nearest place where it touches nothing (see clearOf).
export function letterSpots(screenWidth: number, screenHeight: number, mat?: MatLayout): LetterSpot[] {
  let spots: LetterSpot[] = letters[orientationOf(screenWidth, screenHeight)];
  const { without, moved } = letters.phone;
  if (isPhone(screenWidth)) {
    spots = spots.filter((s) => !without.includes(s.char)).map((s) => ({ ...s, ...moved[s.char] }));
  }
  if (!mat) return spots;
  const scale = letterScale(screenWidth, screenHeight);
  const shapes = blockerOutlines(mat, letters.clearance);
  return spots.map((s) =>
    letterBlocked(s, screenWidth, screenHeight, shapes, scale) ? clearOf(s, screenWidth, screenHeight, shapes, scale) : s,
  );
}

// The nearest place to `spot` where the letter touches none of the shapes,
// its middle still on the screen: tried at growing distances (4px steps,
// up to 1.5 times the letter's size), in 24 directions, those pointing away
// from the nearest shape's middle first. None: where it was.
function clearOf(spot: LetterSpot, screenWidth: number, screenHeight: number, shapes: Point[][], scale: number): LetterSpot {
  const box = letterRect(spot, screenWidth, screenHeight);
  const from = rectMiddle(box);
  const middles = shapes.map((s) => ({
    x: s.reduce((m, p) => m + p.x, 0) / s.length,
    y: s.reduce((m, p) => m + p.y, 0) / s.length,
  }));
  const near = middles.reduce((a, b) =>
    Math.hypot(a.x - from.x, a.y - from.y) < Math.hypot(b.x - from.x, b.y - from.y) ? a : b,
  );
  const away = Math.atan2(from.y - near.y, from.x - near.x);
  const directions = Array.from({ length: 24 }, (_, i) => away + (Math.PI / 12) * (i % 2 ? -1 : 1) * Math.ceil(i / 2));
  for (let d = 4; d <= 1.5 * box.width; d += 4) {
    for (const a of directions) {
      const moved = { ...spot, x: spot.x + (d * Math.cos(a)) / screenWidth, y: spot.y + (d * Math.sin(a)) / screenHeight };
      const m = rectMiddle(letterRect(moved, screenWidth, screenHeight));
      if (m.x < 0 || m.x > screenWidth || m.y < 0 || m.y > screenHeight) continue;
      if (!letterBlocked(moved, screenWidth, screenHeight, shapes, scale)) return moved;
    }
  }
  return spot;
}

// Which letters lie on the mat on a screen of this size (see `keep` in
// theme.ts). The corners this screen has, always; the others while none of
// their group still touches something after being moved (see letterSpots).
export function chooseLetters(screenWidth: number, screenHeight: number, mat: MatLayout): Set<string> {
  const { corners, dropOrder } = letters.keep;
  const spots = letterSpots(screenWidth, screenHeight, mat);
  const shapes = blockerOutlines(mat, letters.clearance);
  const scale = letterScale(screenWidth, screenHeight);
  const touches = (char: string) => {
    const spot = spots.find((s) => s.char === char);
    return !!spot && letterBlocked(spot, screenWidth, screenHeight, shapes, scale);
  };

  // Only the letters this screen has (phones leave some out).
  const has = (c: string) => spots.some((s) => s.char === c);
  const groups = dropOrder.map((group) => group.filter(has)).filter((group) => group.length > 0);
  // Drop groups in order: every group up to the last one that cannot stay.
  let dropped = 0;
  groups.forEach((group, i) => {
    if (group.some(touches)) dropped = i + 1;
  });
  return new Set([...corners.filter(has), ...groups.slice(dropped).flat()]);
}
