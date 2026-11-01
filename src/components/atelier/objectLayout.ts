import { theme } from "@/config/theme";

// Where the things on the atelier's mat go (the objects, the note, and the
// letters around them), in CSS for the page and in pixels for the 3D letters.
// Both are worked out from the same settings in theme.ts, so they agree.

export type MatObjectConfig = (typeof theme.atelier.objects)[number];
type Place = MatObjectConfig["portrait"];
type Size = { widthVw: number; maxWidth: number; maxHeightVh: number };
export type Orientation = "portrait" | "landscape";
export type Rect = { left: number; top: number; width: number; height: number };

const note = theme.atelier.note;
const noteRatio = note.paper.height / note.paper.width;

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

function overlaps(a: Rect, b: Rect) {
  return a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
}

// Which letters lie on the mat on a screen of this size (see `keep` in
// theme.ts). The corners always; the others while the screen is tall
// enough and none of their group touches the album or the note.
export function chooseLetters(screenWidth: number, screenHeight: number): Set<string> {
  const { corners, dropOrder, minHeight } = letters.keep;
  const spots = letterSpots(screenWidth, screenHeight);
  const blockers = [...theme.atelier.objects.map((o) => objectRect(o, screenWidth, screenHeight)), noteRect(screenWidth, screenHeight)];
  const touches = (char: string) => {
    const spot = spots.find((s) => s.char === char);
    if (!spot) return false;
    const r = letterRect(spot, screenWidth, screenHeight);
    const inset = r.width * letters.boxInset;
    const core = { left: r.left + inset, top: r.top + inset, width: r.width - 2 * inset, height: r.height - 2 * inset };
    return blockers.some((b) => overlaps(core, b));
  };

  // Only the letters this screen has (phones leave some out).
  const groups = dropOrder
    .map((group) => group.filter((c) => spots.some((s) => s.char === c)))
    .filter((group) => group.length > 0);
  // Drop groups in order: every group up to the last one that cannot stay.
  let dropped = 0;
  groups.forEach((group, i) => {
    if (group.some((c) => screenHeight < (minHeight[c] ?? 0) || touches(c))) dropped = i + 1;
  });
  return new Set([...corners, ...groups.slice(dropped).flat()]);
}
