"use client";

import { useEffect, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { adauga, useInCos } from "@/lib/cart";

const card = theme.album.stickerBags.card;
const texts = content.album.pungi.card;
const keep = (e: SyntheticEvent) => e.stopPropagation();

// The two button looks of the stickers' card (also its "vezi detalii").
export const buttonLook = (look: "dark" | "light"): CSSProperties => ({
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

type BuyControlsProps = {
  // The product's id in its catalog (a sticker's, a bracelet's).
  id: string;
  soldOut?: boolean;
  // Not reachable with the keyboard (the card's back while its front shows).
  hidden?: boolean;
  // The button's text (default: the stickers' card's "il vreau").
  label?: string;
  // light: on a light ground (the card's back); dark: on a dark one (the
  // bracelets' big view). Colors in card.tones.
  tone?: "light" | "dark";
};

// "il vreau" and the quantity (a native <select>: on a phone the system's
// own picker): adds that many to the cart (src/lib/cart.ts; at most
// card.quantityMax of one product), "adaugat ✓" on the button for a moment
// and "ai 2 in cos" under it. Sold out: nothing can be added. The same on
// the stickers' card and the bracelets' big view.
export function BuyControls({ id, soldOut = false, hidden = false, label = texts.vreau, tone = "light" }: BuyControlsProps) {
  const colors = card.tones[tone];
  const [quantity, setQuantity] = useState(1);
  const inCart = useInCos(id);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(addedTimer.current), []);
  const want = () => {
    if (soldOut) return;
    adauga(id, quantity, card.quantityMax);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), card.added * 1000);
  };
  return (
    <>
      <div className="flex items-center" style={{ gap: 8, opacity: soldOut ? card.soldOut.controlsOpacity : 1 }}>
        <button
          type="button"
          tabIndex={hidden ? -1 : 0}
          disabled={soldOut}
          aria-live="polite"
          style={{
            ...buttonLook("dark"),
            background: colors.button.background,
            color: colors.button.color,
            whiteSpace: "nowrap",
            cursor: soldOut ? "not-allowed" : "pointer",
          }}
          onClick={(e) => {
            keep(e);
            want();
          }}
        >
          {added ? texts.adaugat : label}
        </button>
        <select
          aria-label={texts.cantitate}
          tabIndex={hidden ? -1 : 0}
          disabled={soldOut}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          onClick={keep}
          style={{
            ...buttonLook("light"),
            padding: "8px 10px",
            border: `1px solid ${colors.select.border}`,
            background: colors.select.background,
            color: colors.select.color,
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
          color: colors.line,
          opacity: inCart > 0 ? card.inCart.opacity : 0,
          marginTop: card.inCart.gap,
        }}
      >
        {inCart >= card.quantityMax ? texts.maxim(inCart) : texts.inCos(inCart)}
      </div>
    </>
  );
}
