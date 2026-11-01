import { theme } from "@/config/theme";
import { titleSnapshot } from "@/config/titleSnapshot";

// The landing's title as a still picture of the 3D letters (made by
// scripts/render-title.mjs), in exactly the place the 3D letters will be. It
// shows from the very first frame (it is in the HTML from the server), and
// fades out once the 3D scene has drawn its first frame underneath. If the 3D
// scene never starts (no WebGL, a file that does not load), it simply stays.
//
// Placement is pure CSS, so it is right before any JavaScript runs. It is
// measured on the hero (the parent, a "size container" named hero): cqw / cqh
// = 1% of its width / height. The letters' width as a share of the hero's
// width depends a little on the hero's shape, so it is looked up in narrow
// bands of width / height (container queries).

type Snapshot = (typeof titleSnapshot)[keyof typeof titleSnapshot];

const BAND = 0.02; // width of one band of screen shapes (width / height)

// The letters' share of the width for a screen shape, between the measured ones.
function shareAt(widths: Snapshot["widths"], aspect: number) {
  if (aspect <= widths[0][0]) return widths[0][1];
  for (let i = 1; i < widths.length; i++) {
    const [a1, s1] = widths[i];
    if (aspect <= a1) {
      const [a0, s0] = widths[i - 1];
      return s0 + ((s1 - s0) * (aspect - a0)) / (a1 - a0);
    }
  }
  return widths[widths.length - 1][1];
}

// Where the picture goes, in letter widths (--lw), and one rule per band of
// screen shapes from `from` to `to` setting --lw.
function placeCss(t: Snapshot, from: number, to: number) {
  const lw = (aspect: number) => `--lw: ${(shareAt(t.widths, aspect) * 100).toFixed(3)}cqw;`;
  const rules = [
    `.static-title {
      ${lw(from)}
      left: calc(${t.middleX * 100}cqw + ${t.left} * var(--lw));
      top: calc(${t.middleY * 100}cqh + ${t.top} * var(--lw));
      width: calc(${t.width} * var(--lw));
    }`,
  ];
  for (let a = from; a < to - 1e-9; a += BAND) {
    rules.push(`@container hero (aspect-ratio >= ${Math.round(a * 1000)} / 1000) { .static-title { ${lw(a + BAND / 2)} } }`);
  }
  return rules.join("\n");
}

// Portrait first; landscape (width >= height, where the 3D scene switches its
// camera too) overrides it.
const css = `
  ${placeCss(titleSnapshot.portrait, 0.3, 1)}
  @container hero (aspect-ratio >= 1) {
    ${placeCss(titleSnapshot.landscape, 1, 3)}
  }
`;

// leaving: on a tap without 3D, it fades out sinking a little (see
// theme.landing.titleLeave).
export function StaticTitle({ hidden, leaving = false }: { hidden: boolean; leaving?: boolean }) {
  const { portrait, landscape } = titleSnapshot;

  return (
    <>
      <style>{css}</style>
      {/* <picture>: the browser downloads only the version for its
          orientation. Plain <img>: it must be in the HTML from the server and
          load straight away (next/image would add a step). */}
      <picture>
        <source
          media="(orientation: landscape)"
          srcSet={landscape.src}
          width={landscape.pixelWidth}
          height={landscape.pixelHeight}
        />
        <img
          src={portrait.src}
          alt=""
          width={portrait.pixelWidth}
          height={portrait.pixelHeight}
          fetchPriority="high"
          draggable={false}
          className="art static-title pointer-events-none absolute h-auto max-w-none"
          style={{
            opacity: hidden || leaving ? 0 : 1,
            translate: leaving ? `0 ${theme.landing.titleLeave.drop}px` : undefined,
            transition: leaving
              ? `opacity ${theme.landing.titleLeave.duration}s ease-in, translate ${theme.landing.titleLeave.duration}s ease-in`
              : `opacity ${theme.landing.titleSwap}s linear`,
          }}
        />
      </picture>
    </>
  );
}
