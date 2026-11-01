import { theme } from "@/config/theme";

// Where the things on the atelier's mat go (the objects, the note, and the
// letters around them), in CSS for the page and in pixels for the 3D letters.
// Both are worked out from the same settings in theme.ts, so they agree.

// A part of an object's outline, from the top-left corner of its box, as
// fractions of the box's width (also for top / bottom).
export type OutlineBox = { left: number; top: number; right: number; bottom: number };
// outline: what the object really covers, if not just its box (the album
// drawn in code: its pages' edge, tabs and ribbon stick out).
export type MatObjectConfig = (typeof theme.atelier.objects)[number] & { outline?: OutlineBox[] };
type Place = MatObjectConfig["portrait"];
type Size = { widthVw: number; maxWidth: number; maxHeightVh: number };
export type Orientation = "portrait" | "landscape";
export type Rect = { left: number; top: number; width: number; height: number };

const note = theme.atelier.note;
const noteRatio = note.paper.height / note.paper.width;

// The point of the note on the mat it turns around (and lifts its corner
// from): near the tape, as fractions of its box. Used by AtelierNote too.
export const NOTE_PIVOT = { x: 0.35, y: 0.04 };

// The same rule as CSS's (orientation: landscape), i.e. Tailwind's
// `landscape:` variant: wider than tall.
export function orientationOf(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

// Width: widthVw % of the screen width, never more than maxWidth px, nor
// taller (at this height / width ratio) than maxHeightVh % of the height.
function widthCss(size: Size, ratio: number) {
  return `min(${size.widthVw}vw, ${size.maxWidth}px, ${size.maxHeightVh / ratio}vh)`;
}
function widthPx(size: Size, ratio: number, screenWidth: number, screenHeight: number) {
  return Math.min((size.widthVw / 100) * screenWidth, size.maxWidth, ((size.maxHeightVh / 100) * screenHeight) / ratio);
}

// CSS for an object's box (see `objects` in theme.ts): width, and where its
// top-left corner goes. Used as CSS variables by MatObject.
export function placeCss(object: MatObjectConfig, place: Place) {
  const ratio = object.height / object.width;
  const width = widthCss(place, ratio);
  // Below the iPhone's status bar when anchored to the top.
  const safeTop = place.anchorY === 0 ? " + env(safe-area-inset-top)" : "";
  return {
    width,
    left: `calc(${place.anchorX * 100}% + ${place.x}px - ${place.alignX} * ${width})`,
    top: `calc(${place.anchorY * 100}% + ${place.y}px${safeTop} - ${place.alignY} * ${width} * ${ratio})`,
  };
}

// An object's box on a screen of this size, in CSS px from the top-left
// corner (the safe area and the small rotation are ignored).
export function objectRect(object: MatObjectConfig, screenWidth: number, screenHeight: number): Rect {
  const place = object[orientationOf(screenWidth, screenHeight)];
  const ratio = object.height / object.width;
  const width = widthPx(place, ratio, screenWidth, screenHeight);
  const height = width * ratio;
  return {
    left: place.anchorX * screenWidth + place.x - place.alignX * width,
    top: place.anchorY * screenHeight + place.y - place.alignY * height,
    width,
    height,
  };
}

// The album: the note keeps clear of it.
const album = theme.atelier.objects[0];

// CSS for the note on the mat: its width, and where its top-left corner goes
// (pushed clear of the album when the screen is too short or narrow).
export function noteCss(orientation: Orientation) {
  const p = note.place[orientation];
  const a = placeCss(album, album[orientation]);
  const width = widthCss(p, noteRatio);
  let left = `${p.left * 100}%`;
  let top = `${p.top * 100}%`;
  if (p.clearOf === "below") {
    top = `max(${top}, ${a.top} + ${a.width} * ${album.height / album.width} + ${p.gap}px)`;
  } else {
    left = `max(${left}, ${a.left} + ${a.width} + ${p.gap}px)`;
  }
  return { width, height: `calc(${width} * ${noteRatio})`, left, top };
}

// The note's box on a screen of this size, in CSS px (its turn ignored).
export function noteRect(screenWidth: number, screenHeight: number): Rect {
  const p = note.place[orientationOf(screenWidth, screenHeight)];
  const a = objectRect(album, screenWidth, screenHeight);
  const width = widthPx(p, noteRatio, screenWidth, screenHeight);
  let left = p.left * screenWidth;
  let top = p.top * screenHeight;
  if (p.clearOf === "below") top = Math.max(top, a.top + a.height + p.gap);
  else left = Math.max(left, a.left + a.width + p.gap);
  return { left, top, width, height: width * noteRatio };
}

export function rectMiddle(r: Rect) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const letters = theme.atelier.letters;
export type LetterSpot = (typeof letters.portrait)[number];

// The letters' places on a screen of this size: those for its orientation,
// on phones without the left-out letters and with the moved ones moved
// (see `phone` in theme.ts).
export function letterSpots(screenWidth: number, screenHeight: number): LetterSpot[] {
  const spots = letters[orientationOf(screenWidth, screenHeight)];
  const { maxWidth, without, moved } = letters.phone;
  if (screenWidth >= maxWidth) return spots;
  return spots.filter((s) => !without.includes(s.char)).map((s) => ({ ...s, ...moved[s.char] }));
}

// A letter's box on a screen of this size, in CSS px (see `letters` in
// theme.ts): a square `size` wide, the letter centred in it.
export function letterRect(spot: LetterSpot, screenWidth: number, screenHeight: number): Rect {
  const size = spot.size * Math.min(screenWidth, screenHeight);
  return { left: spot.x * screenWidth, top: spot.y * screenHeight, width: size, height: size };
}

// How much smaller the letters are drawn when this many lie on the mat
// (see phoneScale in theme.ts): 1 on wide screens.
export function letterScale(count: number, orientation: Orientation) {
  if (orientation !== "portrait") return 1;
  const { few, many, factor } = letters.phoneScale;
  const t = Math.min(1, Math.max(0, (count - few) / (many - few)));
  return 1 + (factor - 1) * t;
}

// What the objects and the note really cover on a screen of this size: a
// few turned rectangles (corners in CSS px), each grown by `margin` px on
// every side.
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

export function blockerOutlines(
  objects: MatObjectConfig[],
  screenWidth: number,
  screenHeight: number,
  margin: number,
): Point[][] {
  const shapes: Point[][] = [];
  for (const o of objects) {
    // Turned around the middle of its box (like .obj-art).
    const r = objectRect(o, screenWidth, screenHeight);
    const { x: cx, y: cy } = rectMiddle(r);
    const w = r.width;
    const boxes = o.outline ?? [{ left: 0, top: 0, right: 1, bottom: r.height / w }];
    for (const b of boxes) {
      shapes.push(
        turnedBox(r.left + b.left * w, r.top + b.top * w, r.left + b.right * w, r.top + b.bottom * w, margin, o.rotation, cx, cy),
      );
    }
  }
  // The note, turned around its pivot (like .note-mat).
  const n = noteRect(screenWidth, screenHeight);
  const px = n.left + NOTE_PIVOT.x * n.width;
  const py = n.top + NOTE_PIVOT.y * n.height;
  shapes.push(turnedBox(n.left, n.top, n.left + n.width, n.top + n.height, margin, note.rotation, px, py));
  return shapes;
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

// Which letters lie on the mat on a screen of this size (see `keep` in
// theme.ts). The corners always; the others while none of their group
// touches the album or the note (their real outline, see blockerOutlines),
// and (phones only) the screen is tall enough.
export function chooseLetters(
  screenWidth: number,
  screenHeight: number,
  objects: MatObjectConfig[] = theme.atelier.objects,
): Set<string> {
  const { corners, dropOrder, minHeight } = letters.keep;
  const spots = letterSpots(screenWidth, screenHeight);
  const phone = screenWidth < letters.phone.maxWidth;
  const tooShort = (char: string) => phone && screenHeight < (minHeight[char] ?? 0);
  const shapes = blockerOutlines(objects, screenWidth, screenHeight, letters.clearance);
  const touches = (char: string) => {
    const spot = spots.find((s) => s.char === char);
    return !!spot && letterBlocked(spot, screenWidth, screenHeight, shapes);
  };

  // Only the letters this screen has (phones leave some out).
  const groups = dropOrder
    .map((group) => group.filter((c) => spots.some((s) => s.char === c)))
    .filter((group) => group.length > 0);
  // Drop groups in order: every group up to the last one that cannot stay.
  let dropped = 0;
  groups.forEach((group, i) => {
    if (group.some((c) => tooShort(c) || touches(c))) dropped = i + 1;
  });
  return new Set([...corners, ...groups.slice(dropped).flat()]);
}
