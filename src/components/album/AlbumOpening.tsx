"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { theme } from "@/config/theme";
import { AlbumBook } from "./AlbumBook";
import { albumLayout, type AlbumLayout } from "./albumLayout";

const { opening, photoCover } = theme.album;
const { lift, straighten } = opening;
const mat = theme.atelier.object;

export type AlbumPhoto = {
  // The album lying on the mat: its box on the screen (without its turn),
  // its picture and its turn in degrees.
  rect: { left: number; top: number; width: number; height: number };
  src: string;
  width: number;
  height: number;
  rotation: number;
  // The mat picture's `sizes`, so the copy uses the very same (already
  // downloaded) file.
  sizes: string;
};

type AlbumOpeningProps = {
  from: AlbumPhoto;
  reducedMotion: boolean;
  // Called when the album on the mat should disappear (the copy here has
  // taken its place).
  onCovering: () => void;
};

const fill: KeyframeAnimationOptions = { fill: "forwards" };
const ms = (seconds: number) => seconds * 1000;

// Runs an animation and waits for its end. An animation cancelled because
// the opening was taken off the screen (replay, leaving) rejects: then the
// rest of the sequence must not run, so that is passed on.
async function play(el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions, all: Animation[]) {
  if (!el) return;
  const a = el.animate(keyframes, { ...fill, ...options });
  all.push(a);
  await a.finished;
}

// The album opening, over the atelier:
//   1. lift        the album's photo lifts off the mat, the mat darkens
//   2. straighten  the photo turns into the drawn book, straight and centred
//   3. cover       the cover turns open (wide screens: the book slides right)
// With reduced motion: the open book just fades in.
//
// The photo is a copy of the album on the mat, laid exactly over it; the mat
// one is hidden meanwhile (onCovering). Only transform and opacity change.
export function AlbumOpening({ from, reducedMotion, onCovering }: AlbumOpeningProps) {
  const [layout, setLayout] = useState<AlbumLayout>(() => albumLayout(window.innerWidth, window.innerHeight));
  const [photoGone, setPhotoGone] = useState(reducedMotion);
  const [opened, setOpened] = useState(reducedMotion);
  const dim = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const restShadow = useRef<HTMLImageElement>(null);
  const liftShadow = useRef<HTMLImageElement>(null);
  const fader = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);

  // The book follows the screen's size (turning the phone, resizing).
  useEffect(() => {
    const onResize = () => setLayout(albumLayout(window.innerWidth, window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // The sequence runs once, when the opening appears (the layout it starts
  // from is the one of that moment).
  const start = useRef(layout);
  useEffect(() => {
    const all: Animation[] = [];
    const L = start.current;
    const r = from.rect;

    async function run() {
      if (reducedMotion) {
        await Promise.all([
          play(dim.current, [{ opacity: 0 }, { opacity: lift.dim.opacity }], { duration: ms(opening.reducedMotionFade) }, all),
          play(fader.current, [{ opacity: 0 }, { opacity: 1 }], { duration: ms(opening.reducedMotionFade) }, all),
        ]);
        onCovering();
        return;
      }

      onCovering();

      // Poses of the photo (transform-origin: its middle).
      const rest = `translate(0px, 0px) rotate(${from.rotation}deg) scale(1, 1)`;
      const lifted = `translate(0px, ${lift.y}px) rotate(${from.rotation + lift.turn}deg) scale(${lift.scale}, ${lift.scale})`;

      // Where the photo's cover goes: onto the drawn book's cover. Its
      // middle, relative to the photo's middle (unturned, unscaled):
      const off = {
        x: (photoCover.left + photoCover.width / 2 - 0.5) * r.width,
        y: (photoCover.top + photoCover.height / 2 - 0.5) * r.height,
      };
      const bookMid = { x: L.left + L.width / 2, y: L.top + L.height / 2 };
      const photoMid = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const sx = L.width / (photoCover.width * r.width);
      const sy = L.height / (photoCover.height * r.height);
      const onBook = `translate(${bookMid.x - photoMid.x - off.x * sx}px, ${bookMid.y - photoMid.y - off.y * sy}px) rotate(0deg) scale(${sx}, ${sy})`;

      // The book starts exactly where the lifted photo's cover is: same
      // middle, turn and size.
      const a = ((from.rotation + lift.turn) * Math.PI) / 180;
      const k = lift.scale;
      const coverMid = {
        x: photoMid.x + k * (off.x * Math.cos(a) - off.y * Math.sin(a)),
        y: photoMid.y + lift.y + k * (off.x * Math.sin(a) + off.y * Math.cos(a)),
      };
      const bookStart = `translate(${coverMid.x - bookMid.x}px, ${coverMid.y - bookMid.y}px) rotate(${from.rotation + lift.turn}deg) scale(${(k * photoCover.width * r.width) / L.width}, ${(k * photoCover.height * r.height) / L.height})`;
      const bookEnd = "translate(0px, 0px) rotate(0deg) scale(1, 1)";

      // The book waits, invisible, in its start pose.
      fader.current?.animate([{ opacity: 0, transform: bookStart }], { ...fill, duration: 0 });

      // 1. Lift.
      const liftTiming = { duration: ms(lift.duration), easing: lift.easing };
      const sh = lift.shadow;
      await Promise.all([
        play(photo.current, [{ transform: rest }, { transform: lifted }], liftTiming, all),
        play(dim.current, [{ opacity: 0 }, { opacity: lift.dim.opacity }], liftTiming, all),
        // The tight shadow gives way to a wide, soft one, further away.
        play(restShadow.current, [{ opacity: mat.shadow.rest.opacity }, { opacity: 0 }], liftTiming, all),
        play(
          liftShadow.current,
          [
            { opacity: 0, translate: `${mat.shadow.rest.x}px ${mat.shadow.rest.y}px`, scale: "1" },
            { opacity: sh.opacity, translate: `${sh.x}px ${sh.y}px`, scale: `${sh.scale}` },
          ],
          liftTiming,
          all,
        ),
      ]);

      // 2. Straighten: photo and book travel together to the middle; the
      // book fades in over the photo, then the photo (its page edges and
      // ribbon) fades out.
      const t = { duration: ms(straighten.duration), easing: straighten.easing };
      await Promise.all([
        play(photo.current, [{ transform: lifted, opacity: 1 }, { opacity: 1, offset: 0.3 }, { transform: onBook, opacity: 0 }], t, all),
        play(fader.current, [{ transform: bookStart, opacity: 0 }, { opacity: 1, offset: 0.6 }, { transform: bookEnd, opacity: 1 }], t, all),
      ]);
      setPhotoGone(true);

      // 3. The cover turns open around the spine (from flat to lying on the
      // left, face down); on wide screens the book slides half its width
      // to the right at the same time.
      const c = { duration: ms(opening.cover.duration), easing: opening.cover.easing };
      await Promise.all([
        play(cover.current, [{ transform: "translateZ(1px) rotateY(0deg)" }, { transform: "translateZ(1px) rotateY(-180deg)" }], c, all),
        L.spread
          ? play(book.current, [{ transform: "translateX(0%)" }, { transform: "translateX(50%)" }], c, all)
          : undefined,
      ]);
      // Open: from now on the book is drawn open by itself (and so follows
      // the screen if it turns), the animations' end poses are dropped.
      flushSync(() => setOpened(true));
      for (const el of [cover.current, book.current]) el?.getAnimations().forEach((x) => x.cancel());
    }

    run().catch(() => {}); // cancelled: see play()
    return () => all.forEach((a) => a.cancel());
    // Once, on appearing (a replay mounts a new opening).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const r = from.rect;
  const photoStyle: CSSProperties = {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
    transform: `rotate(${from.rotation}deg)`,
  };
  const shadowBase = "absolute inset-0 h-auto w-full";

  return (
    // Over the whole atelier; taps no longer reach it.
    <div className="fixed inset-0 z-40 h-lvh overflow-hidden">
      <div ref={dim} className="absolute inset-0 opacity-0" style={{ background: lift.dim.color }} />

      {!photoGone && (
        <div ref={photo} className="absolute" style={photoStyle}>
          <Image
            ref={restShadow}
            src={from.src}
            width={from.width}
            height={from.height}
            sizes={from.sizes}
            alt=""
            className={shadowBase}
            style={{
              filter: `brightness(0) blur(${mat.shadow.blur}px)`,
              translate: `${mat.shadow.rest.x}px ${mat.shadow.rest.y}px`,
              opacity: mat.shadow.rest.opacity,
            }}
          />
          <Image
            ref={liftShadow}
            src={from.src}
            width={from.width}
            height={from.height}
            sizes={from.sizes}
            alt=""
            className={shadowBase}
            style={{ filter: `brightness(0) blur(${lift.shadow.blur}px)`, opacity: 0 }}
          />
          <Image
            src={from.src}
            width={from.width}
            height={from.height}
            sizes={from.sizes}
            alt=""
            className="relative h-auto w-full"
          />
        </div>
      )}

      {/* The drawn book, the size of the closed book, centred. The fade and
          the move from the photo happen on this wrapper, outside the 3D
          parts (see AlbumBook). */}
      <div
        ref={fader}
        className="absolute opacity-0"
        style={
          {
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
            "--rim": `${layout.rim}px`,
            "--radius": `${layout.rim * 1.5}px`,
          } as CSSProperties
        }
      >
        <AlbumBook spread={layout.spread} skipOpening={opened} bookRef={book} coverRef={cover} />
      </div>
    </div>
  );
}
