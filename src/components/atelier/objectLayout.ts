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

// What lies on the mat: the objects (the first is the album) and the note's
// place. Normally as in theme.ts; on short phones the album and the note
// are made smaller (see fitMat), and /lab/album has its own album.
type NotePlaces = typeof note.place;
export type Mat = { objects: MatObjectConfig[]; notePlace: NotePlaces };
export const baseMat: Mat = { objects: theme.atelier.objects, notePlace: note.place };

// The point of the note on the mat it turns around (and lifts its corner
// from): near the tape, as fractions of its box. Used by AtelierNote too.
export const NOTE_PIVOT = { x: 0.35, y: 0.04 };
// How far the tape reaches above the note's box, as a fraction of its
// height (AtelierNote draws it at -top-[3%]).
const NOTE_TAPE_TOP = 0.03;

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

// CSS for the note on the mat: its width, and where its top-left corner goes
// (pushed clear of the album, the mat's first object, when the screen is
// too short or narrow).
export function noteCss(orientation: Orientation, mat: Mat = baseMat) {
  const p = mat.notePlace[orientation];
  const album = mat.objects[0];
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
export function noteRect(screenWidth: number, screenHeight: number, mat: Mat = baseMat): Rect {
  const p = mat.notePlace[orientationOf(screenWidth, screenHeight)];
  const a = objectRect(mat.objects[0], screenWidth, screenHeight);
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
// (see phoneScale in theme.ts), and on short phones (fit.shortScale): 1 on
// wide screens.
export function letterScale(count: number, screenWidth: number, screenHeight: number) {
  if (orientationOf(screenWidth, screenHeight) !== "portrait") return 1;
  const { few, many, factor } = letters.phoneScale;
  const t = Math.min(1, Math.max(0, (count - few) / (many - few)));
  const short = isPhone(screenWidth) && screenHeight < letters.fit.shortHeight ? letters.fit.shortScale : 1;
  return (1 + (factor - 1) * t) * short;
}

const isPhone = (screenWidth: number) => screenWidth < letters.phone.maxWidth;

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

// One object's outline: its box (or its `outline` parts), turned around
// the middle of its box like .obj-art.
function objectOutline(o: MatObjectConfig, screenWidth: number, screenHeight: number, margin: number): Point[][] {
  const r = objectRect(o, screenWidth, screenHeight);
  const { x: cx, y: cy } = rectMiddle(r);
  const w = r.width;
  const boxes = o.outline ?? [{ left: 0, top: 0, right: 1, bottom: r.height / w }];
  return boxes.map((b) =>
    turnedBox(r.left + b.left * w, r.top + b.top * w, r.left + b.right * w, r.top + b.bottom * w, margin, o.rotation, cx, cy),
  );
}

export function blockerOutlines(
  mat: Mat,
  screenWidth: number,
  screenHeight: number,
  margin: number,
): Point[][] {
  const shapes = mat.objects.flatMap((o) => objectOutline(o, screenWidth, screenHeight, margin));
  // The note, turned around its pivot (like .note-mat).
  const n = noteRect(screenWidth, screenHeight, mat);
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
export function chooseLetters(screenWidth: number, screenHeight: number, mat: Mat = baseMat): Set<string> {
  const { corners, dropOrder, minHeight } = letters.keep;
  const spots = letterSpots(screenWidth, screenHeight);
  const tooShort = (char: string) => isPhone(screenWidth) && screenHeight < (minHeight[char] ?? 0);
  const shapes = blockerOutlines(mat, screenWidth, screenHeight, letters.clearance);
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

type SizeParams = { widthVw: number; maxWidth: number; maxHeightVh: number };
// The same size limits, times k.
const sizeTimes = (p: SizeParams, k: number) => ({
  widthVw: p.widthVw * k,
  maxWidth: p.maxWidth * k,
  maxHeightVh: p.maxHeightVh * k,
});

// The mat fitted to its screen (see fit in theme.ts): the album lying on it
// a little smaller than in `objects` (albumScale). On a phone held upright
// also: the note `noteGap` px under the album's lowest point; if that does
// not fit, both move up together, keeping as much free mat above the album
// as under the note; if that still does not fit, the biggest album (never
// below minAlbumWidthVw; smaller around its middle) at which P, F, M, S
// keep `clearance` px from the album and the note, and the note ends above
// the bottom of the screen. The note shrinks with the album.
//
// forLetters: the mat as it was before albumScale and noteGap existed (the
// album at its full size, the note at its usual distance, not moved up).
// Which letters lie on the mat is decided on that one, so these two
// settings never change it.
export function fitMat(base: Mat, screenWidth: number, screenHeight: number, forLetters = false): Mat {
  const fit = letters.fit;
  const phone = isPhone(screenWidth);
  const [first, ...others] = base.objects;
  const scale = forLetters ? 1 : phone ? fit.albumScale.phone : fit.albumScale.wide;
  const album = {
    ...first,
    portrait: { ...first.portrait, ...sizeTimes(first.portrait, scale) },
    landscape: { ...first.landscape, ...sizeTimes(first.landscape, scale) },
  };
  const start: Mat = { ...base, objects: [album, ...others] };
  if (!phone || orientationOf(screenWidth, screenHeight) !== "portrait") return start;

  const normal = objectRect(album, screenWidth, screenHeight);
  // forLetters: the note keeps its usual distance from the album's box.
  const usualGap = noteRect(screenWidth, screenHeight, start).top - (normal.top + normal.height);
  const corners = letterSpots(screenWidth, screenHeight).filter((s) => letters.keep.corners.includes(s.char));
  const ys = (o: MatObjectConfig) => objectOutline(o, screenWidth, screenHeight, 0).flat().map((pt) => pt.y);

  // The album k times its size (around its middle) and moved up by `lift`
  // px; the note k times its size, noteGap under the album's lowest point.
  const arrange = (k: number, lift: number): Mat => {
    const a = {
      ...album,
      portrait: {
        ...album.portrait,
        ...sizeTimes(album.portrait, k),
        y: album.portrait.y + ((1 - k) * normal.height) / 2 - lift,
      },
    };
    const p = start.notePlace.portrait;
    // top 0 + gap: always exactly `gap` under the album's box.
    const notePlace = (gap: number) => ({
      ...start.notePlace,
      portrait: { ...p, ...sizeTimes(p, k), top: 0, clearOf: "below" as const, gap },
    });
    if (forLetters) return { objects: [a, ...others], notePlace: notePlace(usualGap) };
    const box = objectRect(a, screenWidth, screenHeight);
    const n = noteRect(screenWidth, screenHeight, { objects: [a, ...others], notePlace: notePlace(0) });
    const gap = Math.max(...ys(a)) - (box.top + box.height) + fit.noteGap + NOTE_TAPE_TOP * n.height;
    return { objects: [a, ...others], notePlace: notePlace(gap) };
  };
  const noteBottom = (m: Mat) => {
    const n = noteRect(screenWidth, screenHeight, m);
    return n.top + n.height;
  };
  const fits = (m: Mat, letterSize: number) => {
    const shapes = blockerOutlines(m, screenWidth, screenHeight, letters.clearance);
    return (
      noteBottom(m) <= screenHeight - letters.clearance &&
      corners.every((spot) => !letterBlocked(spot, screenWidth, screenHeight, shapes, letterSize))
    );
  };
  // At size k: where it is, or else moved up so that the free mat above
  // the album and under the note are equal. null = neither fits.
  const balanced = (k: number) => {
    const m = arrange(k, 0);
    const above = Math.min(...ys(m.objects[0]));
    const below = screenHeight - noteBottom(m);
    return arrange(k, Math.max(0, (above - below) / 2));
  };
  const place = (k: number, letterSize: number) => {
    const m = arrange(k, 0);
    if (fits(m, letterSize) || forLetters) return fits(m, letterSize) ? m : null;
    const b = balanced(k);
    return fits(b, letterSize) ? b : null;
  };
  const smallest = Math.min(1, ((fit.minAlbumWidthVw / 100) * screenWidth) / normal.width);
  // The biggest size that fits (halving the range each time), for letters
  // drawn `letterSize` times their size.
  const best = (letterSize: number) => {
    const whole = place(1, letterSize);
    if (whole) return whole;
    let lo = smallest;
    let hi = 1;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      if (place(mid, letterSize)) lo = mid;
      else hi = mid;
    }
    return place(lo, letterSize) ?? (forLetters ? arrange(lo, 0) : balanced(lo));
  };
  // How big the letters are depends on how many lie on the mat (decided
  // on the mat forLetters, which depends on its album): first with all of
  // them, then with those chosen.
  const all = letterSpots(screenWidth, screenHeight).length;
  const firstTry = best(letterScale(all, screenWidth, screenHeight));
  const chosenOn = forLetters ? firstTry : fitMat(base, screenWidth, screenHeight, true);
  const count = chooseLetters(screenWidth, screenHeight, chosenOn).size;
  return count === all ? firstTry : best(letterScale(count, screenWidth, screenHeight));
}
