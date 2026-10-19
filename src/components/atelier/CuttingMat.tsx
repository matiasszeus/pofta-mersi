import { theme } from "@/config/theme";

// Rounded to 2 decimals so the numbers in the SVG stay short and identical
// wherever they are computed.
const round = (n: number) => Math.round(n * 100) / 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

// The drawings printed on the cutting mat, over its grid (the grid and the
// rulers are the page background, see MatBackground): big arcs, a diagonal,
// a protractor and small stencils, anchored to the corners of the screen.
// One static SVG; every size is in CSS pixels, so on a bigger screen they
// stay the same size and just sit further apart. It fades in with the grid.
export function CuttingMat() {
  const { mat } = theme.atelier;
  const line = mat.lineColor;
  const accent = mat.accentColor;

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
