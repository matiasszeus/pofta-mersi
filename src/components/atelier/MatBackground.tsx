import { theme } from "@/config/theme";
import { CuttingMat } from "./CuttingMat";

// "#BFDDBA" -> "191 221 186", for colors like rgb(191 221 186 / 0.5).
function rgbChannels(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// The green cutting mat behind every page after the landing.
//
// The grid and the rulers are the background of <html> itself, drawn with
// CSS gradients: the page's own background is the one thing iPhone Safari
// always paints under its status bar and toolbar (a fixed layer may be
// replaced there by a plain color). Arcs, protractor and stencils are a fixed
// SVG on top (CuttingMat).
//
// The lines fade in over the green: --mat-lines goes from 0 to 1 and scales
// the opacity of every line (@property makes a CSS variable animatable).
export function MatBackground() {
  const { background } = theme.atelier;
  const { lineColor, smallGrid: s, bigGrid: b, smallGridOpacity, bigGridOpacity, ruler, fadeIn } =
    theme.atelier.mat;
  const rgb = rgbChannels(lineColor);
  const color = (opacity: number) => `rgb(${rgb} / calc(${opacity} * var(--mat-lines)))`;
  // A 1px line at the start of every tile, across or down.
  const across = (opacity: number) => `linear-gradient(to right, ${color(opacity)} 1px, transparent 1px)`;
  const down = (opacity: number) => `linear-gradient(to bottom, ${color(opacity)} 1px, transparent 1px)`;

  // Layers, first = on top: [image, tile size, repeat, position].
  // The rulers start below / right of the iPhone's safe areas, so the
  // status bar and the notch do not hide them.
  const top = "env(safe-area-inset-top)";
  const left = "env(safe-area-inset-left)";
  const layers = [
    [across(ruler.opacity), `${b}px ${ruler.longTick}px`, "repeat-x", `0 ${top}`],
    [across(ruler.opacity), `${s}px ${ruler.shortTick}px`, "repeat-x", `0 ${top}`],
    [down(ruler.opacity), `${ruler.longTick}px ${b}px`, "repeat-y", `${left} 0`],
    [down(ruler.opacity), `${ruler.shortTick}px ${s}px`, "repeat-y", `${left} 0`],
    [across(bigGridOpacity), `${b}px ${b}px`, "repeat", "0 0"],
    [down(bigGridOpacity), `${b}px ${b}px`, "repeat", "0 0"],
    [across(smallGridOpacity), `${s}px ${s}px`, "repeat", "0 0"],
    [down(smallGridOpacity), `${s}px ${s}px`, "repeat", "0 0"],
  ];
  const list = (i: number) => layers.map((layer) => layer[i]).join(", ");

  const css = `
    @property --mat-lines { syntax: "<number>"; inherits: true; initial-value: 1; }
    @keyframes mat-lines-in { from { --mat-lines: 0; } }
    /* !important: the root layout sets a plain background on <html> inline,
       which would otherwise reset all of these. */
    html {
      background-color: ${background} !important;
      background-image: ${list(0)} !important;
      background-size: ${list(1)} !important;
      background-repeat: ${list(2)} !important;
      background-position: ${list(3)} !important;
      animation: mat-lines-in ${fadeIn}s ease-out;
      overscroll-behavior: none;
    }
    /* Transparent, so the html background (the grid) shows through. */
    body { background: transparent !important; }
  `;

  return (
    <>
      <style>{css}</style>
      <CuttingMat />
    </>
  );
}
