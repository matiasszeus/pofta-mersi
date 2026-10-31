"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { objectRect, type MatObjectConfig } from "@/components/atelier/objectLayout";
import { theme } from "@/config/theme";
import { AlbumBook } from "./AlbumBook";
import { albumLayout, bookSize } from "./albumLayout";

const { opening, cover: coverPicture } = theme.album;
const { flight, cover: coverTurn, dim: dimming } = opening;
const ms = (seconds: number) => seconds * 1000;

// The album's settings for the mat: those of theme.ts, but with the
// proportions of the drawn book (cover + thickness + board).
export function matAlbumObject(album: MatObjectConfig): MatObjectConfig {
  const size = bookSize(coverPicture.width);
  return { ...album, width: size.width, height: size.height };
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
// tapped, it rises off the mat, straightens and settles in the middle of
// the screen while its cover turns open. One movement, no swapped pictures.
//
// It sits inside the mat object's box (MatObject), which is turned by the
// object's rotation. The book is laid out at its open size and shrunk to
// that box while it lies on the mat, so open it is sharp (scale 1).
export function MatAlbum({ object, open, run, reducedMotion, dimRef }: MatAlbumProps) {
  const [screen, setScreen] = useState<{ w: number; h: number } | null>(null);
  // The opening (run) that has ended: from then on the book is drawn open
  // by React instead of by the animations. A replay or closing changes
  // `run` / `open`, so it is closed again right away.
  const [openedRun, setOpenedRun] = useState<number | null>(null);
  const opened = open && openedRun === run;
  const flyer = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const liftShadow = useRef<HTMLDivElement>(null);

  // The screen's size, known only in the browser; again on every resize.
  useEffect(() => {
    const measure = () => setScreen({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const layout = screen && albumLayout(screen.w, screen.h);
  const poses = screen && flightPoses(object, screen.w, screen.h);

  // The opening (or, when `open` turns false, back on the mat). Runs on a
  // tap and on every replay; not when the screen is resized.
  useEffect(() => {
    const p = open ? flightPoses(object, window.innerWidth, window.innerHeight) : null;
    const all: Animation[] = [];
    const animate = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return Promise.resolve();
      // "both": the first keyframe already holds during a delay, the last
      // one after the end.
      const a = el.animate(keyframes, { fill: "both", ...options });
      all.push(a);
      return a.finished;
    };
    const finish = () => {
      setOpenedRun(run);
      // The end poses are now drawn by React: drop them from the animations
      // (in the next frame, once the open book is rendered).
      requestAnimationFrame(() => {
        for (const el of [flyer.current, book.current, cover.current]) el?.getAnimations().forEach((a) => a.cancel());
      });
    };

    if (!p) return;

    async function play(p: Poses) {
      const dimTo = [{ opacity: 0 }, { opacity: dimming.opacity }];
      if (reducedMotion) {
        // Fade out on the mat, then fade in open in the middle.
        const half = { duration: ms(opening.reducedMotionFade) / 2 };
        await Promise.all([
          animate(flyer.current, [{ transform: p.rest, opacity: 1 }, { transform: p.rest, opacity: 0 }], half),
          animate(dimRef.current, dimTo, half),
        ]);
        await animate(flyer.current, [{ transform: p.end, opacity: 0 }, { transform: p.end, opacity: 1 }], half);
        finish();
        return;
      }

      const fly = { duration: ms(flight.duration), easing: flight.easing };
      const turn = { duration: ms(coverTurn.duration), delay: ms(coverTurn.delay), easing: coverTurn.easing };
      await Promise.all([
        animate(flyer.current, [{ transform: p.rest }, { transform: p.lifted, offset: flight.liftAt }, { transform: p.end }], fly),
        animate(liftShadow.current, [{ opacity: 0 }, { opacity: 1 }], fly),
        animate(dimRef.current, dimTo, fly),
        // The cover turns open around the spine (from flat to lying on the
        // left, face down), starting during the flight.
        animate(cover.current, [{ transform: "translateZ(1px) rotateY(0deg)" }, { transform: "translateZ(1px) rotateY(-180deg)" }], turn),
        // Wide screens: meanwhile the book slides half a cover to the right.
        p.spread
          ? animate(book.current, [{ transform: "translateX(0px)" }, { transform: `translateX(${p.coverWidth / 2}px)` }], turn)
          : undefined,
      ]);
      finish();
    }

    play(p).catch(() => {}); // cancelled (replay, closing): nothing more to do
    return () => all.forEach((a) => a.cancel());
    // Only on a tap / replay / closing (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, run]);

  return (
    // Fills the mat object's box (same proportions as the book).
    <div className="relative w-full" style={bookAspect}>
      {layout && poses && (
        <div
          ref={flyer}
          className="absolute top-1/2 left-1/2"
          style={{
            width: layout.width,
            height: layout.height,
            marginLeft: -layout.width / 2,
            marginTop: -layout.height / 2,
            transform: opened ? poses.end : poses.rest,
          }}
        >
          <AlbumBook
            coverWidth={layout.coverWidth}
            spread={layout.spread}
            skipOpening={opened}
            bookRef={book}
            coverRef={cover}
            liftShadowRef={liftShadow}
          />
        </div>
      )}
    </div>
  );
}

const bookAspect = (() => {
  const s = bookSize(1);
  return { aspectRatio: `${s.width} / ${s.height}` };
})();

type Poses = { rest: string; lifted: string; end: string; spread: boolean; coverWidth: number };

// The book's transforms, relative to the middle of its box on the mat.
//   rest    shrunk to its size on the mat
//   end     open size (scale 1), in the middle of the screen, straight
//   lifted  on the way, at flight.liftAt: a bit bigger (closer to you)
// The box on the mat is turned by `rotation` (on its parent), so getting
// straight means turning back by as much, and "towards the middle" has to
// be turned back the same way too.
function flightPoses(object: MatObjectConfig, screenWidth: number, screenHeight: number): Poses {
  const layout = albumLayout(screenWidth, screenHeight);
  const mat = objectRect(object, screenWidth, screenHeight);
  const k = mat.width / layout.width;
  const dx = layout.left + layout.width / 2 - (mat.left + mat.width / 2);
  const dy = layout.top + layout.height / 2 - (mat.top + mat.height / 2);
  const a = (-object.rotation * Math.PI) / 180;
  const tx = dx * Math.cos(a) - dy * Math.sin(a);
  const ty = dx * Math.sin(a) + dy * Math.cos(a);
  const pose = (f: number, scale: number) =>
    `translate(${tx * f}px, ${ty * f}px) rotate(${-object.rotation * f}deg) scale(${scale})`;
  const at = flight.liftAt;
  return {
    rest: pose(0, k),
    lifted: pose(at, (k + (1 - k) * at) * flight.liftScale),
    end: pose(1, 1),
    spread: layout.spread,
    coverWidth: layout.coverWidth,
  };
}
