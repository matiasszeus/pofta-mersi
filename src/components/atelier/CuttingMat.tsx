import { theme } from "@/config/theme";

// Rounded to 2 decimals so the numbers in the SVG stay short and identical
// wherever they are computed.
const round = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

// The printed lines of the atelier's green cutting mat, seen from above: one
// static SVG over the green page. Every size is in CSS pixels, so the grid
// has the same scale on every screen; a bigger screen shows more mat.
//
// fixed + 100lvh (like the landing's flowers): it also reaches under Safari's
// bars on iPhone. It fades in over the green that is already there.
export function CuttingMat() {
  const { mat } = theme.atelier;
  const { smallGrid: s, bigGrid: b, ruler } = mat;
  const line = mat.lineColor;
  const accent = mat.accentColor;

  // Ruler ticks across one big-grid step: long at the big-grid line, short at
  // every small-grid line in between.
  const ticks = Array.from({ length: Math.round(b / s) }, (_, i) => ({
    at: i * s,
    length: i === 0 ? ruler.longTick : ruler.shortTick,
  }));

  // Protractor: a half disc lying on the bottom edge, a tick every 10 degrees
  // (longer every 90).
  const pr = mat.protractorRadius;
  const protractorTicks = Array.from({ length: 19 }, (_, i) => {
    const angle = Math.PI + (i * Math.PI) / 18;
    const inner = i % 9 === 0 ? pr * 0.72 : pr * 0.86;
    return {
      x1: round(Math.cos(angle) * inner),
      y1: round(Math.sin(angle) * inner),
      x2: round(Math.cos(angle) * pr),
      y2: round(Math.sin(angle) * pr),
    };
  });

  // The diagonal: from the bottom-left corner, rising at a fixed angle, long
  // enough to cross any screen.
  const diagonal = { x: round(Math.cos(rad(mat.diagonalAngle)) * 4000), y: round(-Math.sin(rad(mat.diagonalAngle)) * 4000) };

  return (
    <svg
      className="pointer-events-none fixed inset-0 h-lvh w-full"
      style={{ animation: `fade-in ${mat.fadeIn}s ease-out both` }}
      aria-hidden
    >
      <defs>
        {/* A "pattern" is a tile that SVG repeats to fill a shape. Each tile
            draws only its top and left edge; repeated, they form the grid. */}
        <pattern id="mat-small" width={s} height={s} patternUnits="userSpaceOnUse">
          <path d={`M ${s} 0.5 H 0.5 V ${s}`} fill="none" stroke={line} strokeOpacity={mat.smallGridOpacity} />
        </pattern>
        <pattern id="mat-big" width={b} height={b} patternUnits="userSpaceOnUse">
          <path d={`M ${b} 0.5 H 0.5 V ${b}`} fill="none" stroke={line} strokeOpacity={mat.bigGridOpacity} />
        </pattern>
        <pattern id="mat-ruler-top" width={b} height={ruler.longTick} patternUnits="userSpaceOnUse">
          {ticks.map((t) => (
            <line key={t.at} x1={t.at + 0.5} y1={0} x2={t.at + 0.5} y2={t.length} stroke={line} />
          ))}
        </pattern>
        <pattern id="mat-ruler-left" width={ruler.longTick} height={b} patternUnits="userSpaceOnUse">
          {ticks.map((t) => (
            <line key={t.at} x1={0} y1={t.at + 0.5} x2={t.length} y2={t.at + 0.5} stroke={line} />
          ))}
        </pattern>
      </defs>

      {/* The grids. The ".5" offsets above put 1px lines exactly on pixels. */}
      <rect width="100%" height="100%" fill="url(#mat-small)" />
      <rect width="100%" height="100%" fill="url(#mat-big)" />

      {/* Graduated rulers along the top and left edges. */}
      <g opacity={ruler.opacity}>
        <rect width="100%" height={ruler.longTick} fill="url(#mat-ruler-top)" />
        <rect width={ruler.longTick} height="100%" fill="url(#mat-ruler-left)" />
      </g>

      {/* Top-right corner: a nested <svg> placed at the corner lets us draw
          relative to it, whatever the screen size. One big arc. */}
      <svg x="100%" y="0" overflow="visible">
        <circle r={560} fill="none" stroke={line} strokeOpacity={mat.arcOpacity} strokeWidth={1.5} />
      </svg>

      {/* Bottom-left corner: two arcs around the corner, the diagonal and the
          protractor. */}
      <svg x="0" y="100%" overflow="visible">
        <g fill="none" stroke={line} strokeOpacity={mat.arcOpacity}>
          <circle r={250} strokeWidth={1.5} />
          <circle r={340} strokeDasharray="3 6" />
          <line x1={0} y1={0} x2={diagonal.x} y2={diagonal.y} />
        </g>
        <g transform={`translate(${pr + 20}, -14)`} stroke={accent} fill="none">
          <path d={`M ${-pr} 0 A ${pr} ${pr} 0 0 1 ${pr} 0 Z`} strokeOpacity={0.8} strokeWidth={1.5} />
          <path d={`M ${-pr * 0.5} 0 A ${pr * 0.5} ${pr * 0.5} 0 0 1 ${pr * 0.5} 0`} strokeOpacity={0.5} />
          {protractorTicks.map((t, i) => (
            <line key={i} {...t} strokeOpacity={0.8} />
          ))}
        </g>
      </svg>

      {/* Bottom-right corner: small stencils, circles of growing size and two
          triangles (lilac). */}
      <svg x="100%" y="100%" overflow="visible">
        <g transform="translate(-190, -22)" fill="none" strokeWidth={1.5} strokeOpacity={mat.stencilOpacity}>
          {[4, 6, 8, 10].map((radius, i) => (
            <circle key={radius} cx={i * 24} cy={-radius} r={radius} stroke={i === 3 ? accent : line} />
          ))}
          <path d="M 104 0 L 119 -26 L 134 0 Z" stroke={accent} />
          <path d="M 144 0 L 144 -24 L 168 0 Z" stroke={accent} />
        </g>
      </svg>
    </svg>
  );
}
