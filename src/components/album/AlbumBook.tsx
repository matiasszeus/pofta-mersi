import type { CSSProperties, Ref } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content } from "@/config/content";
import { theme } from "@/config/theme";

const { cover, board, coverParts, pageRadius, ribbon, tabs, contents, pageNumber, colors, sectionColors } = theme.album;
const text = content.album;

// "cuprins" (the contents) or a section's key ("stickere", "bratari"...).
export type AlbumPageKey = string;

// A length in u (see theme.album), as CSS: --u is set on the book.
const u = (n: number) => `calc(var(--u) * ${n}px)`;
// The same, minus / plus the stack's thickness (--t, in u).
const uMinusT = (n: number) => `calc(var(--u) * (${n}px - var(--t) * 1px))`;

// The parts' looks, from the prototype (docs/album-deschidere-referinta.html).
// Written as CSS once, for the pseudo-elements (::after) and the many
// u-sized lengths.
const css = `
.ab-face { position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; }
/* translateZ(1px): never exactly in the same plane as the front (Safari). */
.ab-back { transform: rotateY(180deg) translateZ(1px); }
.ab-board {
  position: absolute; top: ${u(-board.top)}; left: 0;
  right: calc(var(--u) * (-${board.beyond}px - var(--t) * 1px)); bottom: calc(var(--u) * (-${board.beyond}px - var(--t) * 1px));
  border-radius: 0 ${u(board.radius)} ${u(board.radius)} 0;
}
.ab-board { background: ${colors.board}; box-shadow: ${board.shadowRest}; transform: translateZ(-1px); }
/* The two edges meet on the diagonal in the bottom-right corner (clip-path). */
.ab-edge-r, .ab-edge-b { position: absolute; transform: translateZ(-0.5px); }
.ab-edge-r {
  top: ${u(6)}; bottom: ${uMinusT(0)}; right: ${uMinusT(2)}; width: calc(var(--u) * var(--t) * 1px);
  border-radius: 0 ${u(3)} ${u(3)} 0;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 calc(100% - var(--u) * var(--t) * 1px));
  background: repeating-linear-gradient(90deg, ${colors.paper} 0 ${u(1.6)}, ${colors.pageLine} ${u(1.6)} ${u(2.4)});
}
.ab-edge-b {
  left: ${u(8)}; right: ${uMinusT(2)}; bottom: ${uMinusT(0)}; height: calc(var(--u) * var(--t) * 1px);
  border-radius: 0 0 ${u(3)} ${u(3)};
  clip-path: polygon(0 0, calc(100% - var(--u) * var(--t) * 1px) 0, 100% 100%, 0 100%);
  background: repeating-linear-gradient(180deg, ${colors.paper} 0 ${u(1.6)}, ${colors.pageLine} ${u(1.6)} ${u(2.4)});
}
.ab-ribbon {
  position: absolute; bottom: ${u(-ribbon.below)}; left: ${u(ribbon.left)}; width: ${u(ribbon.width)}; height: ${u(ribbon.height)};
  background: ${colors.ribbon}; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%); transform: translateZ(0.5px);
}
.ab-page { position: absolute; inset: 0; box-sizing: border-box; overflow: hidden; color: ${colors.ink}; }
.ab-paper {
  background-color: ${colors.paper};
  background-image: radial-gradient(rgb(29 38 51 / 0.1) ${u(1)}, transparent ${u(1.4)});
  background-size: ${u(14)} ${u(14)};
}
.ab-divider {
  background-color: ${colors.divider};
  background-image: radial-gradient(rgb(29 38 51 / 0.1) ${u(1)}, transparent ${u(1.4)});
  background-size: ${u(14)} ${u(14)};
}
.ab-lining {
  background-color: ${colors.lining};
  background-image: radial-gradient(${colors.liningDots} ${u(2.4)}, transparent ${u(2.9)}), radial-gradient(${colors.liningDots} ${u(2.4)}, transparent ${u(2.9)});
  background-size: ${u(22)} ${u(22)};
  background-position: 0 0, ${u(11)} ${u(11)};
}
/* Right-hand page: shade towards the spine on its left; left-hand: on its right. */
.ab-right { border-radius: 0 ${u(pageRadius)} ${u(pageRadius)} 0; }
.ab-left { border-radius: ${u(pageRadius)} 0 0 ${u(pageRadius)}; }
.ab-right::after, .ab-left::after { content: ""; position: absolute; top: 0; bottom: 0; width: 16%; pointer-events: none; }
.ab-right::after { left: 0; background: linear-gradient(to right, rgb(29 38 51 / 0.2), rgb(29 38 51 / 0)); }
.ab-left::after { right: 0; background: linear-gradient(to left, rgb(29 38 51 / 0.22), rgb(29 38 51 / 0)); }
.ab-tabs { position: absolute; inset: 0; transform: translateZ(0.5px); pointer-events: none; }
.ab-tab {
  position: absolute; right: ${u(-tabs.width)}; width: ${u(tabs.width)}; height: ${u(tabs.height)};
  border-radius: 0 ${u(tabs.radius)} ${u(tabs.radius)} 0;
  display: flex; align-items: center; justify-content: center;
  font-size: ${u(tabs.textSize)}; color: ${colors.ink}; letter-spacing: 0.04em;
}
.ab-tab span { writing-mode: vertical-rl; }
.ab-row { display: flex; align-items: baseline; gap: ${u(8)}; }
.ab-dot { width: ${u(contents.dot)}; height: ${u(contents.dot)}; border-radius: 50%; flex: none; align-self: center; box-sizing: border-box; }
.ab-lead { flex: 1; border-bottom: ${u(2)} dotted rgb(29 38 51 / 0.35); transform: translateY(${u(-4)}); }
.ab-pnum { position: absolute; bottom: ${u(pageNumber.bottom)}; font-size: ${u(pageNumber.size)}; color: rgb(29 38 51 / 0.55); }
/* The sheet: turns around the spine (later, for leafing through). */
.ab-leaf { position: absolute; inset: 0; transform-origin: left center; transform: rotateY(0deg) translateZ(2px); }
.ab-cover {
  position: absolute; top: ${u(-coverParts.over)}; bottom: ${u(-coverParts.over)}; left: 0; right: ${u(-coverParts.over)};
  transform-origin: left center;
}
.ab-cover-front {
  background: radial-gradient(120% 80% at 70% 20%, #2a2a2d 0%, ${colors.board} 60%);
  border-radius: ${u(coverParts.radiusSpine)} ${u(coverParts.radiusEdge)} ${u(coverParts.radiusEdge)} ${u(coverParts.radiusSpine)};
  overflow: hidden;
}
.ab-cover-back {
  background: ${colors.board};
  border-radius: ${u(coverParts.radiusEdge)} ${u(coverParts.radiusSpine)} ${u(coverParts.radiusSpine)} ${u(coverParts.radiusEdge)};
}
`;

// The cover's turn: closed (0) or open, lying left of the pages (-180).
export const coverTransform = (angle: number) => `rotateY(${angle}deg) translateZ(3px)`;

type AlbumBookProps = {
  // px per u (see albumLayout).
  u: number;
  // The page it opens on. Later every page gets its own address
  // (/album/stickere...) and a direct link opens the book right there; for
  // now there is only the contents page.
  initialPage?: AlbumPageKey;
  // true = drawn open (after the opening, a direct link, reduced motion);
  // false = closed, until the opening turns the cover.
  skipOpening?: boolean;
  // Wide screen: open, the book slides half a page to the right.
  spread: boolean;
  // The book's own transform (its flight, see MatAlbum).
  bookTransform: string;
  // The parts the opening animates.
  bookRef?: Ref<HTMLDivElement>;
  slideRef?: Ref<HTMLDivElement>;
  coverRef?: Ref<HTMLDivElement>;
  boardRef?: Ref<HTMLDivElement>;
};

// The album. It fills its parent, which has the size of the open book's
// page; the board, the stack's edges, the cover and the tabs reach past it.
//
// Layers, back to front (their depth, translateZ, keeps this order in 3D):
//   board (-1px), stack edges (-0.5px), the page underneath (0), ribbon and
//   tabs (0.5px), the sheet with the contents (2px), the cover (3px).
//
// The cover turns in real 3D (CSS 3D transforms):
//   stage  `perspective`: how far the eye is, so near things look bigger
//   book   preserve-3d: its children keep their own depth instead of being
//          flattened onto it; it carries the flight
//   slide  preserve-3d; slides right on wide screens
//   cover  preserve-3d, turns around its left edge (the spine) with rotateY
//          front / back: its two sides, back to back; backface hidden =
//          each one is invisible while it faces away from us
// Safari draws all of this flat (and the cover's back never shows) if
// anything along that chain has overflow hidden, opacity below 1, a filter,
// a clip-path or a mask: none of them does. The faces themselves may.
export function AlbumBook({
  u: unit,
  initialPage = "cuprins",
  skipOpening = false,
  spread,
  bookTransform,
  bookRef,
  slideRef,
  coverRef,
  boardRef,
}: AlbumBookProps) {
  const open = skipOpening;
  // Only the contents page exists so far (initialPage is for later).
  void initialPage;
  const vars = { "--u": unit, "--t": theme.album.thickness, perspective: `${theme.album.perspective}px` } as CSSProperties;

  return (
    <div className="absolute inset-0" style={vars}>
      <style>{css}</style>
      {/* will-change: each moving part keeps its own graphics layer the
          whole time (Safari would otherwise rebuild it when a move ends). */}
      <div ref={bookRef} className="album-3d absolute inset-0 will-change-transform" style={{ transform: bookTransform }}>
        <div
          ref={slideRef}
          className="album-3d absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(${open && spread ? 50 : 0}%, 0px, 0px)` }}
        >
          <div ref={boardRef} className="ab-board" />
          <div className="ab-edge-r" />
          <div className="ab-edge-b" />
          <div className="ab-ribbon" />
          <StickersPage />
          <div className="ab-tabs">
            {text.sections
              .filter((s) => s.page !== null)
              .map((s, i) => (
                <div
                  key={s.key}
                  className={`ab-tab ${crazeRetro.className}`}
                  style={{ top: u(tabs.tops[i] ?? 0), background: sectionColors[s.key] }}
                >
                  <span>{s.title}</span>
                </div>
              ))}
          </div>
          <div className="ab-leaf album-3d">
            <ContentsPage />
            <DividerPage />
          </div>
          <div
            ref={coverRef}
            className="ab-cover album-3d will-change-transform"
            style={{ transform: coverTransform(open ? -180 : 0) }}
          >
            <div className="ab-face ab-cover-front">
              <Image
                src={cover.src}
                width={cover.width}
                height={cover.height}
                alt="Coperta albumului Pofta Mersi"
                // As wide as the cover on a large screen.
                sizes="420px"
                priority
                draggable={false}
                className="absolute inset-0 block h-full w-full object-cover select-none"
              />
            </div>
            <div className="ab-face ab-back ab-cover-back">
              <div className="ab-page ab-left ab-lining" style={{ top: u(6), bottom: u(6), left: u(6), right: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The page under the sheet: the stickers section's first page (3).
function StickersPage() {
  return (
    <div className="ab-page ab-right ab-paper" style={{ transform: "translateZ(0)" }}>
      <div
        className={`absolute leading-none ${crazeRetro.className}`}
        style={{ left: u(26), top: u(24), fontSize: u(28) }}
      >
        {text.stickers.title}
      </div>
      <div className="ab-pnum" style={{ right: u(pageNumber.side) }}>
        3
      </div>
    </div>
  );
}

// The front of the sheet: page 1, the contents.
function ContentsPage() {
  const c = contents;
  const p = c.padding;
  return (
    <div className="ab-face ab-page ab-right ab-paper">
      <div
        className="absolute inset-0 box-border"
        style={{ padding: `${u(p.top)} ${u(p.right)} ${u(p.bottom)} ${u(p.left)}` }}
      >
        <h2
          className={`${crazeRetro.className} origin-left leading-none`}
          style={{ fontSize: u(c.titleSize), rotate: `${c.titleTurn}deg` }}
        >
          {text.contentsTitle}
        </h2>
        <ul className="flex flex-col" style={{ marginTop: u(c.listTop), gap: u(c.rowGap) }}>
          {text.sections.map((s) => {
            const soon = s.page === null;
            return (
              <li key={s.key} className="ab-row" style={soon ? { opacity: c.soonOpacity } : undefined}>
                <span
                  className="ab-dot"
                  style={
                    soon
                      ? { border: `${u(1.5)} solid rgb(29 38 51 / 0.6)` }
                      : { background: sectionColors[s.key] }
                  }
                />
                <span className={`${crazeRetro.className} leading-none`} style={{ fontSize: u(c.itemSize) }}>
                  {s.title}
                </span>
                <span className="ab-lead" />
                <span style={{ fontSize: u(c.numberSize) }}>{soon ? text.soon : s.page}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="ab-pnum" style={{ right: u(pageNumber.side) }}>
        1
      </div>
    </div>
  );
}

// The back of the sheet: page 2, the stickers section's divider.
function DividerPage() {
  return (
    <div className="ab-face ab-back ab-page ab-left ab-divider">
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: u(10) }}>
        <div className={`${crazeRetro.className} leading-none`} style={{ fontSize: u(50), rotate: "-4deg" }}>
          {text.stickers.title}
        </div>
        <div className="opacity-75" style={{ fontSize: u(15) }}>
          {text.stickers.blurb}
        </div>
      </div>
      <div className="ab-pnum" style={{ left: u(pageNumber.side) }}>
        2
      </div>
    </div>
  );
}
