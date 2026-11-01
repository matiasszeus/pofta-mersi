"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { content } from "@/config/content";
import type { Produs } from "@/config/products";
import { theme } from "@/config/theme";
import { u, uCss } from "./albumUnits";
import { DymoLabel } from "./DymoLabel";

const { photos, zoom } = theme.album;
// The photo's picture area on the page, in u: the big one's square is as
// many u wide, so the frame, the label and the shadow keep their
// proportions (--u on the big frame).
const AREA = photos.width - 2 * photos.padding.side;

// The big square's side on this screen, in px (see zoom.side).
function sideFor(width: number, height: number) {
  const s = zoom.side;
  return Math.min((s.vw / 100) * width, (s.vh / 100) * height, s.max);
}

type PhotoZoomProps = {
  product: Produs;
  // The photo on the page (its frame, not turned by its own rotation's
  // layout) and its turn: the big one grows from exactly there and goes
  // back there.
  from: HTMLElement;
  fromRotation: number;
  labelRotation: number;
  // Called once it is back on the page (then this is taken away).
  onClosed: () => void;
};

// A photo of the album's page, big in the middle of the screen with its
// video (better, 720px). In <body>, outside the album's 3D (Safari).
//
// It grows from the photo on the page and shrinks back into it (FLIP:
// laid out at its big size in the middle, then started with a transform
// that puts it exactly over the small one; only transform and opacity
// move). Closes with a tap outside it, "închide", Escape, or a swipe down.
export function PhotoZoom({ product, from, fromRotation, labelRotation, onClosed }: PhotoZoomProps) {
  const [screen] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const side = sideFor(screen.w, screen.h);
  const k = side / AREA; // px per u at this size
  const width = photos.width * k;
  const height = side + (photos.padding.side + photos.padding.bottom) * k;

  const backdrop = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);
  const swipeFrom = useRef<number | null>(null);

  // Over the small photo (see overPhoto).
  const onPage = () => overPhoto(from, fromRotation, width);
  const inMiddle = `translate(0px, 0px) rotate(${zoom.rotation}deg) scale(1)`;
  const timing = { duration: zoom.duration * 1000, easing: zoom.easing, fill: "both" as const };

  // Opening: from the page to the middle, the backdrop in.
  useLayoutEffect(() => {
    frame.current?.animate([{ transform: onPage() }, { transform: inMiddle }], timing);
    backdrop.current?.animate([{ opacity: 0 }, { opacity: 1 }], timing);
    close.current?.focus({ preventScroll: true });
    // The page cannot scroll meanwhile.
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => void (html.style.overflow = before);
    // Once, when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closing: the video stops, back onto the page, the backdrop out.
  const shut = () => {
    if (closing.current) return;
    closing.current = true;
    video.current?.pause();
    const back = frame.current?.animate([{ transform: inMiddle }, { transform: onPage() }], timing);
    backdrop.current?.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    const done = () => onClosed();
    if (back) back.finished.then(done, done);
    else done();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") shut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const frameVars = { "--u": k } as CSSProperties;
  const name = product.nume;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={content.album.video.dialog(name)}
      className="fixed inset-0"
      // Above the album and its buttons; no scrolling or zooming here.
      style={{ zIndex: 60, touchAction: "none" }}
      // A tap outside the photo closes it; so does a swipe down.
      onClick={(e) => {
        if (!frame.current?.contains(e.target as Node)) shut();
      }}
      onPointerDown={(e) => (swipeFrom.current = e.clientY)}
      onPointerUp={(e) => {
        if (swipeFrom.current !== null && e.clientY - swipeFrom.current > zoom.swipe) shut();
        swipeFrom.current = null;
      }}
    >
      <div ref={backdrop} className="absolute inset-0" style={{ background: zoom.backdrop, opacity: 0 }} />
      <div
        ref={frame}
        className="absolute top-1/2 left-1/2 box-border bg-white will-change-transform"
        style={{
          ...frameVars,
          width,
          height,
          marginLeft: -width / 2,
          marginTop: -height / 2,
          padding: `${u(photos.padding.side)} ${u(photos.padding.side)} ${u(photos.padding.bottom)}`,
          boxShadow: uCss(photos.shadow),
          // Already over the small photo in the first frame.
          transform: onPage(),
        }}
      >
        <div className="relative overflow-hidden bg-black" style={{ width: side, height: side }}>
          {product.videoMare && (
            <video
              ref={(el) => {
                video.current = el;
                if (!el) return;
                // Muted before it plays: browsers only autoplay silent videos.
                el.muted = true;
                el.play().catch(() => {}); // AbortError: closed before it started
              }}
              className="absolute inset-0 h-full w-full object-cover"
              src={product.videoMare}
              poster={product.pozaBlur ?? product.poza}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              aria-hidden
            />
          )}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center"
          style={{ height: u(photos.padding.bottom) }}
        >
          <DymoLabel rotation={labelRotation}>{name}</DymoLabel>
        </div>
      </div>
      <button
        ref={close}
        type="button"
        className="fixed top-[max(env(safe-area-inset-top),12px)] right-3 rounded-full bg-white/85 px-3 py-1.5 font-sans text-sm text-black shadow"
        onClick={(e) => {
          e.stopPropagation();
          shut();
        }}
      >
        {content.album.close}
      </button>
    </div>,
    document.body,
  );
}

// The transform that puts the big photo (laid out `width` px wide in the
// middle of the screen) exactly over the small one: its middle (a turned
// box keeps its middle), its turn, its size.
function overPhoto(from: HTMLElement, rotation: number, width: number) {
  const r = from.getBoundingClientRect();
  const dx = r.left + r.width / 2 - window.innerWidth / 2;
  const dy = r.top + r.height / 2 - window.innerHeight / 2;
  return `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(${from.offsetWidth / width})`;
}
