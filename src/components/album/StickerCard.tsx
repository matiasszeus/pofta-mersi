"use client";

import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import type { Sticker } from "@/lib/catalog";
import { adauga, useInCos } from "@/lib/cart";

const card = theme.album.stickerBags.card;
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
  return { w: (r.vw / 100) * width, h: (r.vh / 100) * height };
}

type StickerCardProps = {
  sticker: Sticker;
  onClose: () => void;
};

// A sticker big over the album, as in docs/pungi-stickere-referinta.html,
// straight and still. The front: the sticker (popping in), its corner
// peeling; "vezi detalii" turns the card: its name, size and price, and
// "îl vreau" with the quantity: added to the cart (src/lib/cart.ts; at most
// card.quantityMax of one sticker), "ai 3 în coș" under it; sold out: said
// so, nothing can be added. Its name shows only there, on the back (never
// on the bags, the page or the front). Closed with "închide", a tap
// on the dark ground, or Escape. In <body>, outside the album's 3D (Safari),
// like the bracelets' big view.
export function StickerCard({ sticker, onClose }: StickerCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [quantity, setQuantity] = useState(1);
  // How many of it the cart holds (kept up to date), and "adăugat ✓" on.
  const inCart = useInCos(sticker.id);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);
  const soldOut = sticker.stoc === "epuizat";
  const want = () => {
    if (soldOut) return;
    adauga(sticker.id, quantity, card.quantityMax);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), card.added * 1000);
  };
  const [room, setRoom] = useState(() => roomFor(window.innerWidth, window.innerHeight));
  // The big picture shows once loaded (the small one, already there, until then).
  const [bigReady, setBigReady] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  // Its peeling corner: at the bottom-right point of the sticker's own edge
  // (where its white outline reaches furthest down and right), in % of the
  // picture from its right and bottom; at first the picture's corner.
  const [peelAt, setPeelAt] = useState({ right: 0, bottom: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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

  useEffect(() => {
    const img = new Image();
    img.src = sticker.imagine;
    let gone = false;
    img.decode().then(
      () => !gone && setPeelAt(edgeCorner(img)),
      () => {},
    );
    return () => void (gone = true);
  }, [sticker.imagine]);

  // The sticker as big as fits in the room (its proportions kept); the card
  // the same size.
  const k = Math.min(room.w / sticker.latime, room.h / sticker.inaltime) * card.sticker;
  const w = sticker.latime * k;
  const h = sticker.inaltime * k;

  const button = (look: "dark" | "light"): CSSProperties => ({
    padding: card.button.padding,
    borderRadius: 999,
    border: 0,
    background: card.button[look].background,
    color: card.button[look].color,
    fontFamily: "var(--font-hanken), sans-serif",
    fontWeight: 600,
    fontSize: card.button.size,
    cursor: "pointer",
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sticker.nume}
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        zIndex: 60,
        gap: card.gap,
        background: card.backdrop,
        animation: `sticker-card-in ${card.fadeIn}s ease`,
        touchAction: "none",
      }}
      onPointerDown={keep}
      // A tap on the dark ground (not on the card or the buttons) closes it.
      onClick={(e) => {
        keep(e);
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative"
        style={{ width: w, height: Math.max(h, card.back.minHeight), perspective: card.perspective }}
        onClick={keep}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "none",
            transition: `transform ${card.flip.duration}s ${card.flip.easing}`,
          }}
        >
          {/* The front: the sticker, its corner peeling (cut to its shape:
              the picture as a mask over all of it). */}
          <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
            <div
              className="sticker-big relative"
              style={
                {
                  width: w,
                  height: h,
                  "--pop-scale": card.popIn.scale,
                  "--pop-turn": `${card.popIn.turn}deg`,
                  animation: `sticker-pop ${card.popIn.duration}s ${card.popIn.easing}`,
                  WebkitMaskImage: `url(${sticker.imagine})`,
                  maskImage: `url(${sticker.imagine})`,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
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
              <div
                aria-hidden
                className="sticker-peel absolute"
                style={
                  {
                    right: `${peelAt.right}%`,
                    bottom: `${peelAt.bottom}%`,
                    "--peel": `${card.peel.size}px`,
                    "--peel-hover": `${card.peel.hover}px`,
                    "--peel-time": `${card.peel.duration}s`,
                    background: card.peel.background,
                    boxShadow: card.peel.shadow,
                    borderTopLeftRadius: card.peel.radius,
                  } as CSSProperties
                }
              />
            </div>
          </div>
          {/* The back: its kind, size and price; "îl vreau" and how many. */}
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
            <div
              className="flex items-center"
              style={{ gap: 8, opacity: soldOut ? card.soldOut.controlsOpacity : 1 }}
            >
              <button
                type="button"
                tabIndex={flipped ? 0 : -1}
                disabled={soldOut}
                aria-live="polite"
                style={{ ...button("dark"), cursor: soldOut ? "not-allowed" : "pointer" }}
                onClick={(e) => {
                  keep(e);
                  want();
                }}
              >
                {added ? texts.adaugat : texts.vreau}
              </button>
              {/* Native: on a phone it opens the system's own picker. */}
              <select
                aria-label={texts.cantitate}
                tabIndex={flipped ? 0 : -1}
                disabled={soldOut}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                onClick={keep}
                style={{
                  ...button("light"),
                  padding: "8px 10px",
                  border: `1px solid ${card.back.color}`,
                  background: "#FFFFFF",
                  cursor: soldOut ? "not-allowed" : "pointer",
                }}
              >
                {Array.from({ length: card.quantityMax }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {/* How many of it the cart holds (once there is any). */}
            <div
              aria-live="polite"
              style={{
                fontFamily: "var(--font-hanken), sans-serif",
                fontSize: card.inCart.size,
                opacity: inCart > 0 ? card.inCart.opacity : 0,
                marginTop: card.inCart.gap,
              }}
            >
              {inCart >= card.quantityMax ? texts.maxim(inCart) : texts.inCos(inCart)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex" style={{ gap: 10 }} onClick={keep}>
        <button type="button" style={button("light")} onClick={() => setFlipped((f) => !f)}>
          {flipped ? texts.sticker : texts.detalii}
        </button>
        <button ref={closeButton} type="button" style={button("light")} onClick={onClose}>
          {texts.inchide}
        </button>
      </div>
    </div>,
    document.body,
  );
}

// The sticker's bottom-right point: of its nearly opaque pixels (its white
// outline, not the soft shadow under it), the one furthest down and right
// (largest x + y), as % of the picture from its right and bottom edges.
// Read from a small copy of the picture (fast; same site, so allowed).
function edgeCorner(img: HTMLImageElement) {
  const W = 120;
  const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { right: 0, bottom: 0 };
  ctx.drawImage(img, 0, 0, W, H);
  const alpha = ctx.getImageData(0, 0, W, H).data;
  let best = -1;
  let bx = W;
  let by = H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha[(y * W + x) * 4 + 3] > 220 && x + y > best) {
        best = x + y;
        bx = x + 1;
        by = y + 1;
      }
    }
  }
  return { right: (100 * (W - bx)) / W, bottom: (100 * (H - by)) / H };
}
