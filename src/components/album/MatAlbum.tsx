"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MatObjectConfig, Placed } from "@/components/atelier/objectLayout";
import { theme } from "@/config/theme";
import { AlbumBook, coverTransform, leafTransform } from "./AlbumBook";
import { AlbumControls } from "./AlbumControls";
import { albumLayout } from "./albumLayout";
import { albumViews, firstPageOf, sheets, tabsBottom, viewWithPage, type AlbumView } from "./albumPages";

const { opening, page, board, pages, thickness, tabs, ribbon, unitWidth } = theme.album;
const { flight, cover: coverTurn } = opening;
const ms = (seconds: number) => seconds * 1000;

// The album's settings for the mat: those of theme.ts, but with the
// proportions of the drawn book's page, and its real outline (the letters
// keep clear of it): the board with the pages' edge (right and bottom),
// the tabs on the right, the ribbon below. In fractions of the page's
// width (1u = 1 / unitWidth).
export function matAlbumObject(album: MatObjectConfig): MatObjectConfig {
  const u = 1 / unitWidth;
  const beyond = (board.beyond + thickness) * u;
  const ribbonLeft = ribbon.left * u;
  return {
    ...album,
    width: 340,
    height: 340 * page.ratio,
    outline: [
      { left: 0, top: -board.top * u, right: 1 + beyond, bottom: page.ratio + beyond },
      { left: 1, top: tabs.top * u, right: 1 + tabs.width * u, bottom: tabsBottom * u },
      { left: ribbonLeft, top: page.ratio, right: ribbonLeft + ribbon.width * u, bottom: page.ratio + ribbon.below * u },
    ],
  };
}

type MatAlbumProps = {
  // Where it lies on the mat, and its turn (see matLayout).
  place: Placed;
  // true = opened (tapped); false = lying on the mat.
  open: boolean;
  // Changes to play the opening again.
  run: number;
  reducedMotion: boolean;
  // Where it opens: "cuprins" (the contents) or a chapter's id
  // ("stickere"), see content.album.chapters. Later /album/stickere
  // passes it.
  initialPage?: string;
};

type Named = "book" | "slide" | "board";

// The album as it lies on the atelier's mat, and the same element opening:
// tapped, it rises off the mat towards you, straightens and settles in the
// middle of the screen while its cover turns open. One movement. Then the
// buttons under it leaf through it (see albumViews).
//
// It sits inside the mat object's box (MatObject), which is turned by the
// object's rotation. The book is laid out at its open size and shrunk to
// that box while it lies on the mat, so open it is sharp (scale 1).
//
// Every movement is a Web Animation that stays on its element when over,
// holding the last frame ("fill"), for as long as the album is open:
// nothing is swapped or re-rendered when one ends (on iPhone that made the
// book flash for a frame).
export function MatAlbum({ place, open, run, reducedMotion, initialPage = "cuprins" }: MatAlbumProps) {
  const [screen, setScreen] = useState<{ w: number; h: number } | null>(null);
  // The opening (run) that has ended: the buttons show from then on.
  const [openedRun, setOpenedRun] = useState<number | null>(null);
  const opened = open && openedRun === run;
  // The page on the screen (the first one, on wide screens), for this
  // opening (run). Kept as a page, not a view: turning the phone changes
  // the views (two pages each, or one).
  const [nav, setNav] = useState({ run: -1, page: 1 });
  // The latest animation of the book, the slide and the board's shadow
  // (re-aimed on a resize), and every animation of this opening.
  const anims = useRef<Partial<Record<Named, Animation>>>({});
  const all = useRef<Animation[]>([]);
  // A sheet is turning: other presses wait for it. The same as state, for
  // the videos (they show their posters meanwhile).
  const turning = useRef(false);
  const [turningRun, setTurningRun] = useState<number | null>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  // The sheets, front to back (see sheets).
  const leaves = useRef<(HTMLDivElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  // The screen's size, known only in the browser; again on every resize.
  useEffect(() => {
    const measure = () => setScreen({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = screen && albumLayout(screen.w, screen.h);
  const views = albumViews(layout?.spread ?? false);
  const index = viewWithPage(nav.run === run ? nav.page : firstPageOf(initialPage), layout?.spread ?? false);

  // Runs an animation that stays when over (see above) and returns it.
  const animate = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions, name?: Named) => {
    if (!el) return null;
    // "both": the first keyframe already holds during a delay, the last
    // one after the end, until the album is closed or replayed.
    const a = el.animate(keyframes, { fill: "both", ...options });
    all.current.push(a);
    if (name) anims.current[name] = a;
    return a;
  };
  const done = (...list: (Animation | null)[]) => Promise.all(list.map((a) => a?.finished));

  // The opening (or, when `open` turns false, back on the mat). Runs on a
  // tap and on every replay; not when the screen is resized.
  useEffect(() => {
    const p = open ? flightPoses(place, window.innerWidth, window.innerHeight) : null;
    if (!p) return;
    const spread = p.spread;
    const start = albumViews(spread)[viewWithPage(firstPageOf(initialPage), spread)];
    const now = { duration: 0 };
    // The page it opens on: the sheets before it already turned.
    for (let s = 0; s < start.turned; s++) animate(leaves.current[s], [{ transform: leafTransform(s, true) }], now);

    async function play(p: Poses) {
      if (reducedMotion) {
        // Fade out on the mat, then fade in open in the middle.
        const half = { duration: ms(opening.reducedMotionFade) / 2 };
        await done(animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half));
        animate(book.current, [{ transform: p.settled }, { transform: p.settled }], now, "book");
        animate(cover.current, [{ transform: coverTransform(-180) }, { transform: coverTransform(-180) }], now);
        const s = slideFor(start, spread);
        animate(slide.current, [{ transform: s }, { transform: s }], now, "slide");
        await done(animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half));
        setOpenedRun(run);
        return;
      }

      const turn = { duration: ms(coverTurn.duration), delay: ms(coverTurn.delay), easing: coverTurn.easing };
      await done(
        // Off the mat, up towards you, down into the middle.
        animate(book.current, bookKeyframes(p), { duration: ms(flight.duration), easing: flight.easing }, "book"),
        // The board's shadow grows wide and soft (the shadow is drawn by
        // the board itself: no extra layer with an opacity in the 3D).
        animate(
          boardRef.current,
          [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }],
          { duration: ms(board.shadowDuration), easing: "ease" },
          "board",
        ),
        // Meanwhile the cover turns open around the spine (from flat to
        // lying on the left, face down).
        animate(cover.current, [{ transform: coverTransform(0) }, { transform: coverTransform(-180) }], turn),
        // Wide screens: the book slides half a page to the right too.
        animate(slide.current, [{ transform: SLIDE_NONE }, { transform: slideFor(start, spread) }], turn, "slide"),
      );
      // Open: the buttons appear (the book itself is not touched).
      setOpenedRun(run);
    }

    play(p).catch(() => {}); // cancelled (replay, closing): nothing more to do
    return () => {
      all.current.forEach((a) => a.cancel());
      all.current = [];
      anims.current = {};
      turning.current = false;
    };
    // Only on a tap / replay / closing (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

  // A resize (turning the phone) while open: the same animations, aimed at
  // the new places (only their keyframes change, no element is swapped).
  useEffect(() => {
    if (!screen || !open) return;
    const p = flightPoses(place, screen.w, screen.h);
    const set = (a: Animation | undefined, keyframes: Keyframe[]) => {
      if (a?.effect instanceof KeyframeEffect) a.effect.setKeyframes(keyframes);
    };
    const s = slideFor(albumViews(p.spread)[index], p.spread);
    set(anims.current.book, bookKeyframes(p));
    set(anims.current.slide, [{ transform: s }, { transform: s }]);
    // Two pages a view or one: the same page, maybe another sheet turned.
    const turned = albumViews(p.spread)[index].turned;
    leaves.current.forEach((el, s) => {
      const t = leafTransform(s, s < turned);
      animate(el, [{ transform: t }, { transform: t }], { duration: 0 });
    });
    set(anims.current.board, [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }]);
    // Only on a resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Leafing: from the view on the screen to the next / previous one.
  // Phones: turning a sheet also slides the book one page width, so the
  // page you go to is on the screen; between the two sides of an open
  // spread the book only slides. Wide screens: only the sheet turns.
  const go = (step: number) => {
    const to = index + step;
    if (!layout || !opened || turning.current || to < 0 || to >= views.length) return;
    const from = views[index];
    const target = views[to];
    const spread = layout.spread;
    turning.current = true;
    setTurningRun(run);
    setNav({ run, page: target.pages[0] });

    const sheet = (s: number, v: AlbumView) => ({ transform: leafTransform(s, s < v.turned) });
    // The sheets that turn (one, going to the next view).
    const moving = sheets.map((_, s) => s).filter((s) => s < from.turned !== s < target.turned);
    const pane = (v: AlbumView) => ({ transform: slideFor(v, spread) });
    async function turn() {
      if (reducedMotion) {
        // No turning: a crossfade (out, the new page, in).
        const half = { duration: ms(pages.reducedMotionFade) / 2 };
        await done(animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half));
        for (const s of moving) animate(leaves.current[s], [sheet(s, target), sheet(s, target)], { duration: 0 });
        animate(slide.current, [pane(target), pane(target)], { duration: 0 }, "slide");
        await done(animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half));
        return;
      }
      const t = { duration: ms(pages.turn.duration), easing: pages.turn.easing };
      await done(
        ...moving.map((s) => animate(leaves.current[s], [sheet(s, from), sheet(s, target)], t)),
        animate(slide.current, [pane(from), pane(target)], t, "slide"),
      );
    }
    turn()
      .catch(() => {})
      .finally(() => {
        turning.current = false;
        setTurningRun(null);
      });
  };

  const poses = screen && flightPoses(place, screen.w, screen.h);
  // The pages lying still on the screen: open, not turning. Their videos
  // play; prefers-reduced-motion (when honoured): only posters.
  const livePages = opened && turningRun !== run && !reducedMotion ? views[index].pages : [];

  return (
    // Fills the mat object's box (same proportions as the page).
    <div className="relative w-full" style={{ aspectRatio: `1 / ${page.ratio}` }}>
      {layout && poses && (
        <div
          ref={flyer}
          className="absolute top-1/2 left-1/2"
          style={{
            width: layout.width,
            height: layout.height,
            marginLeft: -layout.width / 2,
            marginTop: -layout.height / 2,
          }}
        >
          <AlbumBook
            u={layout.u}
            spread={layout.spread}
            bookTransform={poses.rest}
            bookRef={book}
            slideRef={slide}
            coverRef={cover}
            leavesRef={leaves}
            livePages={livePages}
            boardRef={boardRef}
          />
        </div>
      )}
      {/* The buttons live on the page itself, not in the turned box. */}
      {opened &&
        layout &&
        createPortal(
          <AlbumControls
            top={layout.controlsTop}
            label={views[index].label}
            onBack={index > 0 ? () => go(-1) : undefined}
            onForward={index < views.length - 1 ? () => go(1) : undefined}
          />,
          document.body,
        )}
    </div>
  );
}

type Poses = { rest: string; lifted: string; settled: string; spread: boolean; shadowLifted: string };

// 3D transforms everywhere (translate3d), so Safari never switches the book
// between 3D and 2D drawing.
const SLIDE_NONE = "translate3d(0%, 0px, 0px)";

// How far the book is slid for a view: wide screens half a page (cover and
// page centred together); phones one page to show a left-hand page.
function slideFor(view: AlbumView, spread: boolean) {
  if (spread) return "translate3d(50%, 0px, 0px)";
  return view.side === "left" ? "translate3d(100%, 0px, 0px)" : SLIDE_NONE;
}

const bookKeyframes = (p: Poses): Keyframe[] => [
  { transform: p.rest },
  { transform: p.lifted, offset: flight.liftAt },
  { transform: p.settled },
];

// The book's transforms, relative to the middle of its box on the mat.
//   rest     shrunk to its size on the mat
//   lifted   at flight.liftAt: bigger than open (closer to you), almost
//            straight, above the middle
//   settled  open size, straight, just above the middle
// Each is first worked out on the screen (move from the box on the mat,
// turn, scale); the box is turned by the object's rotation (on its parent),
// so the move and the turn are then turned back by as much.
function flightPoses(mat: Placed, screenWidth: number, screenHeight: number): Poses {
  const layout = albumLayout(screenWidth, screenHeight);
  // The flight's y values are for a page 340px wide.
  const scaleY = layout.width / 340;
  const toMiddle = {
    x: layout.left + layout.width / 2 - (mat.left + mat.width / 2),
    y: layout.top + layout.height / 2 - (mat.top + mat.height / 2),
  };
  const r = mat.rotation;
  const a = (-r * Math.PI) / 180;
  const pose = (dx: number, dy: number, rotation: number, scale: number) => {
    const x = dx * Math.cos(a) - dy * Math.sin(a);
    const y = dx * Math.sin(a) + dy * Math.cos(a);
    return `translate3d(${x}px, ${y}px, 0px) rotate(${rotation - r}deg) scale(${scale})`;
  };
  const { lifted, settled } = flight;
  return {
    rest: pose(0, 0, r, mat.width / layout.width),
    lifted: pose(toMiddle.x, toMiddle.y + lifted.y * scaleY, lifted.rotation, lifted.scale),
    settled: pose(toMiddle.x, toMiddle.y + settled.y * scaleY, 0, 1),
    spread: layout.spread,
    // "24u" -> px at this size.
    shadowLifted: board.shadowLifted.replace(/([\d.]+)u/g, (_, n) => `${Number(n) * layout.u}px`),
  };
}
