"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import type { Sticker } from "@/lib/catalog";
import { BuyControls, buttonLook } from "@/components/cart/BuyControls";
import { CloseButton, closeCorner } from "@/components/site/CloseButton";

const card = theme.album.stickerBags.card;
const { swipe } = card;
const texts = content.album.pungi.card;

// Nothing here reaches the album (React passes events up through portals
// too): no page turned, no bag tapped.
const keep = (e: SyntheticEvent) => e.stopPropagation();

// The room for the card on this screen, px (see card.size): on a phone
// 85% of the width and at most 60% of the height; wider screens 55% of the
// height (and at most 80% of the width). The card takes the sticker's
// shape, as big as fits in it.
function roomFor(width: number, height: number) {
  const s = card.size;
  const r = width < s.phoneBelow ? s.phone : s.desktop;
  return { w: (r.vw / 100) * width, h: (r.vh / 100) * height, wide: width >= s.phoneBelow, screen: width };
}
type Room = ReturnType<typeof roomFor>;

// The sticker as big as fits in the room (its proportions kept); the card
// the same size (at least the back's height).
function boxOf(sticker: Sticker, room: Room) {
  const k = Math.min(room.w / sticker.latime, room.h / sticker.inaltime) * card.sticker;
  const w = sticker.latime * k;
  const h = sticker.inaltime * k;
  return { w, h, height: Math.max(h, card.back.minHeight) };
}

type StickerCardProps = {
  // The stickers of the open bag, in their order on the page.
  stickers: Sticker[];
  // The one shown.
  index: number;
  // Swiped / arrowed to another one.
  onIndex: (index: number) => void;
  onClose: () => void;
};

// A swipe in progress: where it started, how far it went, whether it is a
// drag yet (past swipe.slop, more sideways than down).
type Drag = { id: number; x: number; y: number; dx: number; dragging: boolean };

// A sticker big over the album, as in docs/pungi-stickere-referinta.html,
// straight and still. The front: the sticker (popping in), plain, big;
// "vezi detalii" turns the card: its name, size and price, and
// "il vreau" with the quantity (BuyControls); sold out: said so, nothing
// can be added. Its name shows only there, on the back (never on the
// bags, the page or the front).
//
// Its bag's other stickers, without closing it (only from its front: on the
// back nothing moves, the arrows are hidden, the keys do nothing; turn it
// back first): a swipe left / right (the
// card follows the finger; let go before swipe.threshold of its width and
// it goes back), the arrows beside it (wide screens) or the ← → keys. The
// card slides away with a little turn, the next one comes in from the
// other side, on its front. Past the first or the
// last: the card stretches a little and springs back. "3 / 10" under it.
// Closed with the X (the site's one close button, top right), a tap on the
// dark ground, or Escape. In <body>, outside the album's 3D (Safari), like
// the bracelets' big view.
export function StickerCard({ stickers, index, onIndex, onClose }: StickerCardProps) {
  const sticker = stickers[index];
  const [flipped, setFlipped] = useState(false);
  const [room, setRoom] = useState(() => roomFor(window.innerWidth, window.innerHeight));
  // The card on its way out (with where the swipe left it), while the next
  // one comes in; and whether any has come in yet (only the first pops).
  const [leaving, setLeaving] = useState<{ sticker: Sticker; dir: 1 | -1; from: number } | null>(null);
  const [moved, setMoved] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const leavingSlide = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  // A swipe just ended: its click is not a tap on the ground.
  const swiped = useRef(false);
  // A change under way (no other until it is over).
  const busy = useRef(false);

  const box = boxOf(sticker, room);
  // The stage: as big as any card can be, so nothing under it moves when
  // the stickers' shapes differ.
  const stage = { w: room.w * card.sticker, h: Math.max(room.h * card.sticker, card.back.minHeight) };
  // How far a card slides out: off the screen.
  const out = (room.screen + stage.w) / 2 + 20;

  // The card where a swipe has it: dx px sideways and a turn to match;
  // past the first / last, held back (resistance) and stretched a little.
  const pose = (dx: number) => {
    const dir = dx < 0 ? 1 : -1;
    const blocked = index + dir < 0 || index + dir >= stickers.length;
    if (!blocked) return { transform: `translateX(${dx}px) rotate(${(dx / box.w) * swipe.turn}deg)`, origin: "50% 50%" };
    const held = Math.sign(dx) * Math.min(swipe.edge.max, Math.abs(dx) * swipe.edge.resistance);
    const stretch = 1 + swipe.edge.stretch * Math.min(1, Math.abs(held) / swipe.edge.max);
    // Stretched away from the side it is held by.
    return { transform: `translateX(${held}px) scaleX(${stretch})`, origin: dx < 0 ? "100% 50%" : "0% 50%" };
  };
  const setPose = (dx: number) => {
    const el = slide.current;
    if (!el) return;
    const p = pose(dx);
    el.style.transform = p.transform;
    el.style.transformOrigin = p.origin;
  };
  // Back to its place from wherever the swipe left it.
  const settle = (duration: number, easing: string) => {
    const el = slide.current;
    if (!el || !el.style.transform) return;
    el.animate([{ transform: el.style.transform }, { transform: "none" }], { duration: duration * 1000, easing });
    el.style.transform = "";
  };
  // Past the first / last with an arrow or a key: the stretch, then back.
  const bump = (dir: 1 | -1) => {
    const el = slide.current;
    if (!el) return;
    el.style.transformOrigin = dir > 0 ? "100% 50%" : "0% 50%";
    el.animate(
      [
        { transform: "none" },
        { transform: `translateX(${-dir * swipe.edge.max * 0.6}px) scaleX(${1 + swipe.edge.stretch})`, offset: 0.35 },
        { transform: "none" },
      ],
      { duration: swipe.edge.duration * 1000, easing: "ease-out" },
    );
  };

  // To the next (dir 1) or the previous (-1) sticker; from = where a swipe
  // left the card (px).
  const go = (dir: 1 | -1, from = 0) => {
    if (busy.current || flipped) return;
    const next = index + dir;
    if (next < 0 || next >= stickers.length) {
      if (from) settle(swipe.edge.duration, swipe.edge.easing);
      else bump(dir);
      return;
    }
    busy.current = true;
    if (slide.current) slide.current.style.transform = "";
    setLeaving({ sticker, dir, from });
    setMoved(true);
    setFlipped(false);
    onIndex(next);
  };
  const goRef = useRef(go);
  useLayoutEffect(() => {
    goRef.current = go;
  });

  // The change itself: the old card out (from where it was), the new one
  // in from the other side; then the old one is gone.
  useLayoutEffect(() => {
    if (!leaving) return;
    const { dir, from } = leaving;
    const timing = { duration: swipe.duration * 1000, easing: swipe.easing };
    const away = leavingSlide.current?.animate(
      [
        { transform: `translateX(${from}px) rotate(${(from / box.w) * swipe.turn}deg)` },
        { transform: `translateX(${-dir * out}px) rotate(${-dir * swipe.turn}deg)` },
      ],
      { ...timing, fill: "forwards" },
    );
    slide.current?.animate(
      [{ transform: `translateX(${dir * out}px) rotate(${dir * swipe.turn}deg)` }, { transform: "none" }],
      timing,
    );
    const done = () => {
      busy.current = false;
      setLeaving(null);
    };
    if (away) away.onfinish = done;
    else done();
    // Only when a change starts (the sizes are those of that moment).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // The quantity's list takes its own arrows.
      if (e.target instanceof HTMLElement && e.target.closest("select")) return;
      e.preventDefault();
      goRef.current(e.key === "ArrowRight" ? 1 : -1);
    };
    const onResize = () => setRoom(roomFor(window.innerWidth, window.innerHeight));
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    closeButton.current?.focus({ preventScroll: true });
    // The page cannot scroll meanwhile.
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      html.style.overflow = before;
    };
  }, [onClose]);

  // The swipe (front only). A press on a button or the quantity's list is theirs; a
  // press anywhere else (card or ground) may become a swipe once it moves
  // past swipe.slop, more sideways than down. Only then is the pointer
  // captured (so a plain tap still reaches what is under it).
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    keep(e);
    swiped.current = false;
    // On the back: no swipe at all.
    if (busy.current || flipped || !e.isPrimary || e.button !== 0) return;
    if ((e.target as Element).closest("button, select, option")) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dragging: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.dragging) {
      if (Math.hypot(dx, dy) < swipe.slop) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag.current = null; // up / down: not a swipe
        return;
      }
      d.dragging = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    d.dx = dx;
    setPose(dx);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.dragging) return;
    swiped.current = true;
    const dir = d.dx < 0 ? 1 : -1;
    const blocked = index + dir < 0 || index + dir >= stickers.length;
    if (blocked) settle(swipe.edge.duration, swipe.edge.easing);
    else if (Math.abs(d.dx) >= swipe.threshold * box.w) go(dir, d.dx);
    else settle(swipe.back, swipe.easing);
  };
  const onCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    settle(swipe.back, swipe.easing);
  };

  const first = index === 0;
  const last = index === stickers.length - 1;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sticker.nume}
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        zIndex: 60,
        gap: card.gap,
        background: card.backdrop,
        animation: `sticker-card-in ${card.fadeIn}s ease`,
        touchAction: "none",
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      // A tap on the dark ground (not on the card or the buttons) closes
      // it; the end of a swipe does not.
      onClick={(e) => {
        keep(e);
        if (swiped.current) return;
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.ground !== undefined) onClose();
      }}
    >
      <div className="relative" data-ground="" style={{ width: stage.w, height: stage.h }}>
        {leaving && (
          <div ref={leavingSlide} data-ground="" aria-hidden inert className="absolute inset-0 flex items-center justify-center">
            <CardFace sticker={leaving.sticker} box={boxOf(leaving.sticker, room)} flipped={flipped} pop={false} />
          </div>
        )}
        <div key={sticker.id} ref={slide} data-ground="" className="absolute inset-0 flex items-center justify-center">
          <CardFace sticker={sticker} box={box} flipped={flipped} pop={!moved} />
        </div>
        {/* Wide screens: the arrows beside the card (not while it shows its back). */}
        {room.wide && !flipped && (
          <>
            <Arrow dir={-1} end={first} cardWidth={box.w} onGo={go} />
            <Arrow dir={1} end={last} cardWidth={box.w} onGo={go} />
          </>
        )}
      </div>
      {/* Which one of how many: "3 / 10". */}
      <div
        aria-live="polite"
        style={{
          fontFamily: "var(--font-hanken), sans-serif",
          fontSize: swipe.counter.size,
          color: swipe.counter.color,
          opacity: swipe.counter.opacity,
          marginTop: -card.gap + swipe.counter.gap,
          marginBottom: -card.gap + swipe.counter.gap,
        }}
      >
        {texts.pozitie(index + 1, stickers.length)}
      </div>
      <div className="flex" style={{ gap: 10 }} onClick={keep}>
        <button type="button" style={buttonLook("light")} onClick={() => setFlipped((f) => !f)}>
          {flipped ? texts.sticker : texts.detalii}
        </button>
      </div>
      <div className={closeCorner}>
        <CloseButton ref={closeButton} onClick={onClose} label={texts.inchide} />
      </div>
    </div>,
    document.body,
  );
}

// An arrow beside the card (wide screens): to the previous (dir -1) or
// the next (1) sticker; faded at the first / last (a tap there: the stretch).
function Arrow({ dir, end, cardWidth, onGo }: { dir: 1 | -1; end: boolean; cardWidth: number; onGo: (dir: 1 | -1) => void }) {
  const { size, gap, iconSize, lineWidth, faded } = swipe.arrows;
  const { background, color } = theme.album.closeButton;
  return (
    <button
      type="button"
      aria-label={dir < 0 ? texts.anterior : texts.urmator}
      aria-disabled={end}
      onClick={(e) => {
        keep(e);
        onGo(dir);
      }}
      className="absolute top-1/2 flex cursor-pointer items-center justify-center rounded-full border-0 p-0"
      style={{
        width: size,
        height: size,
        background,
        color,
        opacity: end ? faded : 1,
        left: `calc(50% ${dir < 0 ? "-" : "+"} ${cardWidth / 2 + gap + (dir < 0 ? size : 0)}px)`,
        transform: "translateY(-50%)",
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={lineWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

// One card: the sticker on the front (plain, big), its name, size,
// price and "il vreau" on the back. pop: the sticker pops in (only the
// first card shown; the others slide in).
function CardFace({ sticker, box, flipped, pop }: { sticker: Sticker; box: ReturnType<typeof boxOf>; flipped: boolean; pop: boolean }) {
  const soldOut = sticker.stoc === "epuizat";
  // The big picture shows once loaded (the small one, already there, until then).
  const [bigReady, setBigReady] = useState(false);

  const { w, h } = box;
  return (
    <div className="relative" style={{ width: w, height: box.height, perspective: card.perspective }} onClick={keep}>
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "none",
          transition: `transform ${card.flip.duration}s ${card.flip.easing}`,
        }}
      >
        {/* The front: the sticker, nothing else. */}
        <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
          <div
            className="sticker-big relative"
            style={
              {
                width: w,
                height: h,
                "--pop-scale": card.popIn.scale,
                "--pop-turn": `${card.popIn.turn}deg`,
                animation: pop ? `sticker-pop ${card.popIn.duration}s ${card.popIn.easing}` : undefined,
              } as CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sticker.imagine} alt="" draggable={false} className="art absolute inset-0 block h-full w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sticker.imagineMare}
              alt={sticker.nume}
              draggable={false}
              onLoad={() => setBigReady(true)}
              className="art absolute inset-0 block h-full w-full"
              style={{ opacity: bigReady ? 1 : 0 }}
            />
          </div>
        </div>
        {/* The back: its name, size and price; "il vreau" and how many. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center [backface-visibility:hidden]"
          style={{
            transform: "rotateY(180deg)",
            background: card.back.background,
            color: card.back.color,
            borderRadius: card.back.radius,
            boxShadow: card.back.shadow,
            gap: card.back.gap,
            padding: `0 ${card.back.padding}px`,
          }}
        >
          {/* Its name, handwritten: the site's own font (Whitenice, Hanken
              for ă ș ț and the like, see globals.css). */}
          <div
            className="text-center"
            style={{ fontSize: card.back.nameSize, lineHeight: card.back.nameLineHeight, fontWeight: card.back.nameWeight }}
          >
            {texts.nume(sticker.nume)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-hanken), sans-serif",
              fontSize: card.back.sizeSize,
              opacity: card.back.sizeOpacity,
            }}
          >
            {sticker.dimensiune}
          </div>
          <div
            style={{
              fontFamily: "var(--font-hanken), sans-serif",
              fontWeight: 700,
              fontSize: card.back.priceSize,
              margin: soldOut ? "4px 0 0" : "4px 0 12px",
            }}
          >
            {texts.pret(sticker.pret)}
          </div>
          {soldOut && (
            <div style={{ fontSize: card.soldOut.size, color: card.soldOut.color, marginBottom: 8 }}>{texts.epuizat}</div>
          )}
          <BuyControls id={sticker.id} soldOut={soldOut} hidden={!flipped} />
        </div>
      </div>
    </div>
  );
}
