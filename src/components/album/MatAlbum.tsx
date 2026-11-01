"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { objectRect, type MatObjectConfig } from "@/components/atelier/objectLayout";
import { theme } from "@/config/theme";
import { AlbumBook, coverTransform } from "./AlbumBook";
import { albumLayout } from "./albumLayout";

const { opening, page, board } = theme.album;
const { flight, cover: coverTurn, dim: dimming } = opening;
const ms = (seconds: number) => seconds * 1000;

// The album's settings for the mat: those of theme.ts, but with the
// proportions of the drawn book's page.
export function matAlbumObject(album: MatObjectConfig): MatObjectConfig {
  return { ...album, width: 340, height: 340 * page.ratio };
}

type MatAlbumProps = {
  // The album's settings for the mat (see matAlbumObject).
  object: MatObjectConfig;
  // true = opened (tapped); false = lying on the mat.
  open: boolean;
  // Changes to play the opening again.
  run: number;
  reducedMotion: boolean;
  // The layer that darkens the mat (it lies between the mat and the book).
  dimRef: RefObject<HTMLDivElement | null>;
};

// The album as it lies on the atelier's mat, and the same element opening:
// tapped, it rises off the mat towards you, straightens and settles in the
// middle of the screen while its cover turns open. One movement.
//
// It sits inside the mat object's box (MatObject), which is turned by the
// object's rotation. The book is laid out at its open size and shrunk to
// that box while it lies on the mat, so open it is sharp (scale 1).
export function MatAlbum({ object, open, run, reducedMotion, dimRef }: MatAlbumProps) {
  const [screen, setScreen] = useState<{ w: number; h: number } | null>(null);
  // The opening's animations. Once over they stay on their elements,
  // holding the last frame ("fill"), for as long as the album is open:
  // nothing is swapped or re-rendered when they end (on iPhone that made
  // the book flash for a frame).
  const anims = useRef<Partial<Record<"book" | "slide" | "board", Animation>>>({});
  const flyer = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // The screen's size, known only in the browser; again on every resize.
  useEffect(() => {
    const measure = () => setScreen({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The opening (or, when `open` turns false, back on the mat). Runs on a
  // tap and on every replay; not when the screen is resized.
  useEffect(() => {
    const p = open ? flightPoses(object, window.innerWidth, window.innerHeight) : null;
    if (!p) return;
    const all: Animation[] = [];
    const animate = (
      el: Element | null,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
      name?: keyof typeof anims.current,
    ) => {
      if (!el) return Promise.resolve();
      // "both": the first keyframe already holds during a delay, the last
      // one after the end, until the album is closed or replayed.
      const a = el.animate(keyframes, { fill: "both", ...options });
      all.push(a);
      if (name) anims.current[name] = a;
      return a.finished;
    };
    const dimIn = (duration: number) =>
      animate(dimRef.current, [{ opacity: 0 }, { opacity: dimming.opacity }], { duration, easing: "ease" });

    async function play(p: Poses) {
      if (reducedMotion) {
        // Fade out on the mat, then fade in open in the middle.
        const half = { duration: ms(opening.reducedMotionFade) / 2 };
        await Promise.all([animate(flyer.current, [{ opacity: 1 }, { opacity: 0 }], half), dimIn(half.duration)]);
        const now = { duration: 0 };
        animate(book.current, [{ transform: p.settled }, { transform: p.settled }], now, "book");
        animate(cover.current, [{ transform: coverTransform(-180) }, { transform: coverTransform(-180) }], now);
        animate(slide.current, [{ transform: p.slide }, { transform: p.slide }], now, "slide");
        await animate(flyer.current, [{ opacity: 0 }, { opacity: 1 }], half);
        return;
      }

      const turn = { duration: ms(coverTurn.duration), delay: ms(coverTurn.delay), easing: coverTurn.easing };
      await Promise.all([
        // Off the mat, up towards you, down into the middle.
        animate(
          book.current,
          bookKeyframes(p),
          { duration: ms(flight.duration), easing: flight.easing },
          "book",
        ),
        // The board's shadow grows wide and soft (the shadow is drawn by
        // the board itself: no extra layer with an opacity in the 3D).
        animate(
          boardRef.current,
          [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }],
          { duration: ms(board.shadowDuration), easing: "ease" },
          "board",
        ),
        dimIn(ms(dimming.duration)),
        // Meanwhile the cover turns open around the spine (from flat to
        // lying on the left, face down).
        animate(cover.current, [{ transform: coverTransform(0) }, { transform: coverTransform(-180) }], turn),
        // Wide screens: the book slides half a page to the right too.
        animate(slide.current, [{ transform: SLIDE_NONE }, { transform: p.slide }], turn, "slide"),
      ]);
      // The end: nothing to do, the last frames stay.
    }

    play(p).catch(() => {}); // cancelled (replay, closing): nothing more to do
    return () => {
      all.forEach((a) => a.cancel());
      anims.current = {};
    };
    // Only on a tap / replay / closing (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

  // A resize (turning the phone) while open: the same animations, aimed at
  // the new places (only their keyframes change, no element is swapped).
  useEffect(() => {
    if (!screen || !open) return;
    const p = flightPoses(object, screen.w, screen.h);
    const set = (a: Animation | undefined, keyframes: Keyframe[]) => {
      if (a?.effect instanceof KeyframeEffect) a.effect.setKeyframes(keyframes);
    };
    set(anims.current.book, bookKeyframes(p));
    set(anims.current.slide, [{ transform: SLIDE_NONE }, { transform: p.slide }]);
    set(anims.current.board, [{ boxShadow: board.shadowRest }, { boxShadow: p.shadowLifted }]);
    // Only on a resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const layout = screen && albumLayout(screen.w, screen.h);
  const poses = screen && flightPoses(object, screen.w, screen.h);

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
            boardRef={boardRef}
          />
        </div>
      )}
    </div>
  );
}

type Poses = { rest: string; lifted: string; settled: string; slide: string; shadowLifted: string };

// 3D transforms everywhere (translate3d), so Safari never switches the book
// between 3D and 2D drawing.
const SLIDE_NONE = "translate3d(0%, 0px, 0px)";

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
function flightPoses(object: MatObjectConfig, screenWidth: number, screenHeight: number): Poses {
  const layout = albumLayout(screenWidth, screenHeight);
  const mat = objectRect(object, screenWidth, screenHeight);
  // The flight's y values are for a page 340px wide.
  const scaleY = layout.width / 340;
  const toMiddle = {
    x: layout.left + layout.width / 2 - (mat.left + mat.width / 2),
    y: layout.top + layout.height / 2 - (mat.top + mat.height / 2),
  };
  const r = object.rotation;
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
    slide: layout.spread ? "translate3d(50%, 0px, 0px)" : SLIDE_NONE,
    // "24u" -> px at this size.
    shadowLifted: board.shadowLifted.replace(/([\d.]+)u/g, (_, n) => `${Number(n) * layout.u}px`),
  };
}
