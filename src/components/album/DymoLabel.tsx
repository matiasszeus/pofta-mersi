import type { ReactNode } from "react";
import { theme } from "@/config/theme";
import { u } from "./albumUnits";

const { dymo } = theme.album;

type DymoLabelProps = {
  children: ReactNode;
  // Degrees, clockwise: a little crooked, as if stuck on by hand.
  rotation?: number;
};

// A Dymo label: a strip of dark plastic tape with raised cream capitals,
// stuck on something in the album (a photo's frame; later the stickers).
// Sizes in u (see theme.album.dymo), so it scales with the page. Never
// wraps: as wide as its text.
export function DymoLabel({ children, rotation = 0 }: DymoLabelProps) {
  const p = dymo.padding;
  return (
    <span
      className="inline-block leading-none whitespace-nowrap"
      style={{
        background: dymo.background,
        color: dymo.color,
        borderRadius: u(dymo.radius),
        padding: `${u(p.top)} ${u(p.right)} ${u(p.bottom)} ${u(p.left)}`,
        boxShadow: dymo.shadow,
        fontFamily: "var(--font-hanken), sans-serif",
        fontWeight: 700,
        fontSize: u(dymo.size),
        letterSpacing: dymo.letterSpacing,
        textTransform: "uppercase",
        rotate: `${rotation}deg`,
      }}
    >
      {children}
    </span>
  );
}
