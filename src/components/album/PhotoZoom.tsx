"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { content } from "@/config/content";
import type { Produs } from "@/config/products";
import { theme } from "@/config/theme";
import { u, uCss } from "./albumUnits";
import { DymoLabel } from "./DymoLabel";
import { PlayButton } from "./PlayButton";
import { WashiTape } from "./WashiTape";
import { hideOnError } from "@/lib/mediaError";
import { BuyControls } from "@/components/cart/BuyControls";
import { CloseButton, closeCorner } from "@/components/site/CloseButton";

const { photos, zoom } = theme.album;
const buy = zoom.buy;
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
  // Its washi tape (as on the page): stuck on the big frame too, so it
  // grows and lands with it.
  tape: { color: string; rotation: number };
  // Called once it is back on the page (then this is taken away).
  onClosed: () => void;
};

// A photo of the album's page, big in the middle of the screen with its
// video (better, 720px). In <body>, outside the album's 3D (Safari).
//
// It grows from the photo on the page and shrinks back into it (FLIP:
// laid out at its big size in the middle, then started with a transform
// that puts it exactly over the small one; only transform and opacity
// move). Closes with a tap outside it, the X (the site's one close
// button, top right), Escape, or a swipe down.
// Under it, once it has grown, with no ground of its own: "o vreau" and
// the quantity (BuyControls, exactly as on the stickers' card); room is kept for that
// (zoom.buy.reserve: the photo moves up by half of it). Taps there are its
// own: they never close the view nor touch the video.
export function PhotoZoom({ product, from, fromRotation, labelRotation, tape, onClosed }: PhotoZoomProps) {
  const [screen] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const side = sideFor(screen.w, screen.h - buy.reserve);
  const lift = buy.reserve / 2; // the photo's middle, above the screen's
  const k = side / AREA; // px per u at this size
  const width = photos.width * k;
  const height = side + (photos.padding.side + photos.padding.bottom) * k;

  const backdrop = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const blurred = useRef<HTMLImageElement>(null);
  const play = useRef<HTMLSpanElement>(null);
  const closing = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  // Closing: the panel under it goes at once.
  const [shutting, setShutting] = useState(false);
  const swipeFrom = useRef<number | null>(null);

  // Over the small photo (see overPhoto).
  const onPage = () => overPhoto(from, fromRotation, width);
  const inMiddle = `translate(0px, ${-lift}px) rotate(${zoom.rotation}deg) scale(1)`;
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

  // Closing: the video stops (paused, not reloaded), back onto the page,
  // the backdrop out. On the way the blurred picture fades in over the
  // video, then the ▶ once it has landed: it looks exactly like the photo
  // on the page, which is shown again only then (onClosed), so the sharp
  // picture never shows on the page.
  const shut = () => {
    if (closing.current) return;
    closing.current = true;
    setShutting(true);
    video.current?.pause();
    const el = frame.current;
    // From where it is now (closed while still opening: no jump to the
    // middle first).
    const now = el ? getComputedStyle(el).transform : inMiddle;
    el?.getAnimations().forEach((a) => a.cancel());
    const back = el?.animate([{ transform: now === "none" ? inMiddle : now }, { transform: onPage() }], timing);
    const fromOpacity = backdrop.current ? Number(getComputedStyle(backdrop.current).opacity) : 1;
    backdrop.current?.getAnimations().forEach((a) => a.cancel());
    backdrop.current?.animate([{ opacity: fromOpacity }, { opacity: 0 }], timing);
    blurred.current?.animate([{ opacity: 0 }, { opacity: 1, offset: zoom.blurBy }, { opacity: 1 }], timing);
    const shown = play.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: zoom.playFade * 1000,
      delay: zoom.duration * 1000, // after the landing
      fill: "both",
    });
    const done = () => onClosed();
    const last = shown ?? back;
    if (last) last.finished.then(done, done);
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
        const t = e.target as Node;
        if (!frame.current?.contains(t) && !panel.current?.contains(t)) shut();
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
        <div className="relative overflow-hidden" style={{ width: side, height: side, background: photos.backing }}>
          {product.videoMare && (
            <video onError={hideOnError}
              ref={(el) => {
                video.current = el;
                if (!el) return;
                // Muted before it plays: browsers only autoplay silent videos.
                el.muted = true;
                el.play().catch(() => {}); // AbortError: closed before it started
              }}
              draggable={false}
              className="art zoom-video absolute inset-0 h-full w-full object-cover"
              src={product.videoMare}
              poster={product.poster ?? product.pozaBlur}
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
          {/* For the way back (see shut): hidden until then. */}
          {product.pozaBlur && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={blurred}
              src={product.pozaBlur}
              alt=""
              draggable={false}
              className="art absolute inset-0 h-full w-full object-cover"
              style={{ opacity: 0 }}
            />
          )}
          {product.videoMare && <PlayButton ref={play} opacity={0} />}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center"
          style={{ height: u(photos.padding.bottom) }}
        >
          <DymoLabel rotation={labelRotation}>{name}</DymoLabel>
        </div>
        <WashiTape color={tape.color} rotation={tape.rotation} />
      </div>
      <div className={closeCorner}>
        <CloseButton ref={close} onClick={shut} label={content.album.closeView} />
      </div>
      {/* "o vreau" and the quantity: right under the photo, centred. */}
      <div
        ref={panel}
        className="absolute left-1/2 flex flex-col items-center"
        style={{
          top: `calc(50% + ${height / 2 - lift + buy.gap}px)`,
          translate: "-50% 0",
          opacity: shutting ? 0 : 1,
          transition: `opacity ${buy.fade / 2}s`,
          animation: `fade-in ${buy.fade}s ease-out ${zoom.duration}s backwards`,
          touchAction: "manipulation",
        }}
        // Its own taps: no swipe-to-close starting here, no closing.
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <BuyControls id={product.id} label={content.album.video.vreau} tone="dark" />
      </div>
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
