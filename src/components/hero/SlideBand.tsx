import type { CSSProperties } from "react";
import { theme } from "@/config/theme";

// The dive's change of color without the 3D scene (when it could not start):
// a soft band of the atelier's color rises from the bottom of the hero until
// it covers it, in the same time as the dive. Measured on the hero (a size
// container: cqh = 1% of its height).
export function SlideBand() {
  const { color, bandSoftness, duration } = theme.dive;
  const soft = bandSoftness * 100; // the band's soft edge, in cqh

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="slide-band absolute inset-x-0 top-full"
        style={
          {
            height: `calc(100cqh + ${soft}cqh)`,
            background: `linear-gradient(to bottom, transparent, ${color} ${soft}cqh)`,
            "--slide-to": `calc(-100cqh - ${soft}cqh)`,
            animation: `slide-band ${duration}s linear forwards`,
          } as CSSProperties
        }
      />
    </div>
  );
}
