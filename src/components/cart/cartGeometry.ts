"use client";

import { useEffect, useState } from "react";
import { theme } from "@/config/theme";

const c = theme.cos;

// Where things go while the cart is open, on a screen of this size (CSS px
// from its top-left): the calculator, moved down to the middle and
// straight (its box, partly below the screen), and the receipt above it:
// its bottom in the calculator's slot, its room up to `top`, its scale (on
// wider screens, between 1 and `maxScale`: as much as fits, see
// CartReceipt).
export type CartGeometry = {
  calc: { left: number; top: number; width: number; height: number };
  receiptBottom: number;
  room: number;
  scale: number;
  maxScale: number;
};

export function cartGeometry(width: number, height: number): CartGeometry {
  const phone = width < c.phoneBelow;
  const w = phone ? c.calc.width.phone : c.calc.width.desktop;
  const h = w * theme.atelier.calc.ratio;
  const top = height - h * (phone ? c.calc.visible.phone : c.calc.visible.desktop);
  const fit = (width - 2 * c.side) / c.width;
  const scale = Math.min(phone ? c.scale.phone : 1, fit);
  const receiptBottom = top + c.slotInto;
  return {
    calc: { left: (width - w) / 2, top, width: w, height: h },
    receiptBottom,
    room: Math.max(0, receiptBottom - (phone ? c.top.phone : c.top.desktop)),
    scale,
    maxScale: phone ? scale : Math.max(scale, Math.min(c.scale.desktop, fit)),
  };
}

// The same, following the window's size (turning the phone, resizing).
export function useCartGeometry(): CartGeometry | null {
  const [g, setG] = useState<CartGeometry | null>(null);
  useEffect(() => {
    const update = () => setG(cartGeometry(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return g;
}
