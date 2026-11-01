import type { CSSProperties, MutableRefObject, Ref } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { bookTabs, contentsId, contentsRows, contentsTitle, drawnTitle, lastPage, sheets, type BookPage } from "./albumPages";
import { u, uMinusT } from "./albumUnits";
import { ChapterPage } from "./ChapterPage";
import { PartnerCredit } from "./PartnerCredit";
import { PriceTag } from "./PriceTag";

const { cover, board, coverParts, pageRadius, ribbon, tabs, contents, pageNumber, colors } = theme.album;
const { hint } = theme.album.pages;
const text = content.album;

// The hint's two lifts of the corner (see PageCurl): when each one is up
// and down again, as a fraction of the whole animation.
const curlTotal = 2 * hint.lift + hint.pause;
const curlAt = (seconds: number) => `${((seconds / curlTotal) * 100).toFixed(2)}%`;

// The parts' looks, from the prototype (docs/album-deschidere-referinta.html).
// Written as CSS once, for the pseudo-elements (::after) and the many
// u-sized lengths.
const css = `
/* The book's and the slide's boxes are empty 3D containers the size of a
   page: they let taps through (else they catch them before a page lying
   behind their plane, like a turned sheet); their parts take them. */
.ab-book, .ab-slide { pointer-events: none; }
.ab-slide > * { pointer-events: auto; }
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
/* The tabs themselves can be tapped (they stick out past the pages). */
.ab-tab { pointer-events: auto; border: 0; padding: 0; cursor: pointer; }
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
/* The hint (PageCurl): the page's bottom-right corner lifted, as a square
   of hint.size of the page's width in that corner. Grows from the corner
   (scale), twice, then lies flat (scale 0 = not there). Three triangles,
   cut with clip-path (a face's child: allowed in the 3D, see AlbumBook):
     under   where the corner was: the page beneath, darker near the fold
     shadow  the lifted flap's soft shadow on the page
     flap    the corner folded back over the page, its back showing, a
             little lighter towards its tip */
.ab-curl {
  position: absolute; right: 0; bottom: 0; width: ${hint.size * 100}%; aspect-ratio: 1;
  pointer-events: none; transform-origin: 100% 100%; transform: scale(0);
  animation: ab-curl ${curlTotal}s ease-in-out both;
}
.ab-curl > * { position: absolute; inset: 0; }
.ab-curl-under {
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
  background: linear-gradient(to bottom right, rgb(29 38 51 / 0.2) 50%, rgb(29 38 51 / 0.03) 85%), ${colors.paper};
}
/* Flap and shadow: rounded at the tip (a curl, not a sharp fold). */
.ab-curl-shadow {
  clip-path: polygon(104% -2%, -2% 104%, -6% 34%, 4% 4%, 34% -6%);
  background: radial-gradient(circle at 100% 100%, rgb(29 38 51 / 0.22) 62%, rgb(29 38 51 / 0) 100%);
}
.ab-curl-flap {
  clip-path: polygon(100% 0, 0 100%, 2% 36%, 9% 9%, 36% 2%);
  background: linear-gradient(to top left, ${colors.pageLine} 50%, #ebe5d8 60%, #fffdf8 82%, #f2ede2 100%);
}
@keyframes ab-curl {
  0% { transform: scale(0); }
  ${curlAt(hint.lift / 2)} { transform: scale(1); }
  ${curlAt(hint.lift)} { transform: scale(0); }
  ${curlAt(hint.lift + hint.pause)} { transform: scale(0); }
  ${curlAt(hint.lift * 1.5 + hint.pause)} { transform: scale(1); }
  100% { transform: scale(0); }
}
/* A sheet: turns around the spine when leafing (see leafTransform). */
.ab-leaf { position: absolute; inset: 0; transform-origin: left center; }
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
// Sheet s's (0 = the top one, page 1 on its front): lying on the right,
// or turned (its back on the left). Unturned, the top sheet is nearest to
// you (2px) and each next one a little deeper, all above the tabs (0.5px);
// turned, the order flips by itself (rotateY turns its depth around too),
// so the sheet turned last lies on top on the left.
const sheetDepth = (s: number) => 2 - s / Math.max(1, sheets.length);
export const leafTransform = (s: number, turned: boolean) =>
  `rotateY(${turned ? -180 : 0}deg) translateZ(${sheetDepth(s)}px)`;

type AlbumBookProps = {
  // px per u (see albumLayout).
  u: number;
  // true = drawn open, without the opening; false = closed, until the
  // opening (MatAlbum) turns the cover.
  skipOpening?: boolean;
  // Wide screen: open, the book slides half a page to the right.
  spread: boolean;
  // The book's own transform (its flight, see MatAlbum).
  bookTransform: string;
  // The parts the opening and the leafing animate.
  bookRef?: Ref<HTMLDivElement>;
  slideRef?: Ref<HTMLDivElement>;
  coverRef?: Ref<HTMLDivElement>;
  // The sheets, front to back (see sheets in albumPages).
  leavesRef?: MutableRefObject<(HTMLDivElement | null)[]>;
  // The page numbers lying still on the screen: their videos play.
  livePages?: number[];
  // A chapter tapped on the contents page: leaf there (see MatAlbum).
  onGoToChapter?: (chapterId: string) => void;
  boardRef?: Ref<HTMLDivElement>;
  // The page whose corner lifts once, as a hint that it can be turned
  // (see MatAlbum); onHintEnd: when it has lain down again.
  hintPage?: number | null;
  onHintEnd?: () => void;
};

// The album. It fills its parent, which has the size of the open book's
// page; the board, the stack's edges, the cover and the tabs reach past it.
//
// Layers, back to front (their depth, translateZ, keeps this order in 3D):
//   board (-1px), stack edges (-0.5px), the last page, lying under the
//   sheets (0), ribbon and tabs (0.5px), the sheets (1-2px; the top one
//   has the contents on its front), the cover (3px).
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
  skipOpening = false,
  spread,
  bookTransform,
  bookRef,
  slideRef,
  coverRef,
  leavesRef,
  boardRef,
  livePages = [],
  onGoToChapter,
  hintPage = null,
  onHintEnd,
}: AlbumBookProps) {
  const pageProps = (page: BookPage) => ({
    page,
    live: livePages.includes(page.number),
    onGoToChapter,
    hint: hintPage === page.number,
    onHintEnd,
  });
  const open = skipOpening;
  const vars = { "--u": unit, "--t": theme.album.thickness, perspective: `${theme.album.perspective}px` } as CSSProperties;

  return (
    <div className="absolute inset-0" style={vars}>
      <style>{css}</style>
      {/* will-change: each moving part keeps its own graphics layer the
          whole time (Safari would otherwise rebuild it when a move ends). */}
      <div ref={bookRef} className="ab-book album-3d absolute inset-0 will-change-transform" style={{ transform: bookTransform }}>
        <div
          ref={slideRef}
          className="ab-slide album-3d absolute inset-0 will-change-transform"
          style={{ transform: `translate3d(${open && spread ? 50 : 0}%, 0px, 0px)` }}
        >
          <div ref={boardRef} className="ab-board" />
          <div className="ab-edge-r" />
          <div className="ab-edge-b" />
          <div className="ab-ribbon" />
          <Page {...pageProps(lastPage)} side="under" />
          <div className="ab-tabs">
            {bookTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                // Only while open (else a tap opens the album, like anywhere
                // on it): leafs to the chapter.
                tabIndex={onGoToChapter ? 0 : -1}
                aria-label={content.album.goToChapter(t.name)}
                className={`ab-tab ${crazeRetro.className}`}
                style={{ top: u(t.top), background: t.color }}
                onPointerDown={(e) => onGoToChapter && e.stopPropagation()}
                onClick={(e) => {
                  if (!onGoToChapter) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onGoToChapter(t.id);
                }}
              >
                <span>{t.title}</span>
              </button>
            ))}
          </div>
          {sheets.map((sheet, s) => (
            <div
              key={sheet.front.number}
              ref={(el) => {
                if (leavesRef) leavesRef.current[s] = el;
              }}
              className="ab-leaf album-3d will-change-transform"
              style={{ transform: leafTransform(s, false) }}
            >
              <Page {...pageProps(sheet.front)} side="front" />
              <Page {...pageProps(sheet.back)} side="back" />
            </div>
          ))}
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
                className="art absolute inset-0 block h-full w-full object-cover"
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

// One page, from albumPages:
//   front  a sheet's front, a right-hand page
//   back   a sheet's back, a left-hand page (seen once the sheet is turned)
//   under  the last page, lying under the sheets (right-hand)
//   live   it lies still on the screen (its photos can be tapped)
type PageProps = {
  page: BookPage;
  side: "front" | "back" | "under";
  live: boolean;
  onGoToChapter?: (chapterId: string) => void;
  hint?: boolean;
  onHintEnd?: () => void;
};
function Page({ page, side, live, onGoToChapter, hint = false, onHintEnd }: PageProps) {
  const left = side === "back";
  const place = side === "under" ? "ab-right" : left ? "ab-face ab-back ab-left" : "ab-face ab-right";
  const look = page.kind === "divider" ? "ab-divider" : "ab-paper";
  const style: CSSProperties = side === "under" ? { transform: "translateZ(0)" } : {};
  if (page.kind === "divider") style.backgroundColor = page.color;
  return (
    <div className={`ab-page ${place} ${look}`} style={style}>
      <PageContent page={page} live={live} onGoToChapter={onGoToChapter} />
      {page.kind !== "blank" && (
        <div className="ab-pnum" style={left ? { left: u(pageNumber.side) } : { right: u(pageNumber.side) }}>
          {page.number}
        </div>
      )}
      {hint && <PageCurl onEnd={onHintEnd} />}
    </div>
  );
}

// The hint that a page can be turned: its bottom-right corner lifts a
// little, twice (see .ab-curl). Only drawn while it plays.
function PageCurl({ onEnd }: { onEnd?: () => void }) {
  return (
    <div className="ab-curl" aria-hidden onAnimationEnd={onEnd}>
      <div className="ab-curl-under" />
      <div className="ab-curl-shadow" />
      <div className="ab-curl-flap" />
    </div>
  );
}

// What lies on a page, by its kind.
function PageContent({ page, live, onGoToChapter }: Omit<PageProps, "side" | "hint" | "onHintEnd">) {
  return (
    <>
      {page.kind === "contents" && <ContentsList onGoToChapter={onGoToChapter} />}
      {page.kind === "divider" && (
        <DividerText
          chapterId={page.chapterId}
          title={page.title}
          blurb={page.blurb}
          accent={page.accent}
          oferta={page.oferta}
          credit={page.credit}
        />
      )}
      {page.kind === "page" && <ChapterPage title={page.title} content={page.content} live={live} />}
    </>
  );
}

// The contents: every chapter with the page it starts on. A chapter in the
// book is a button: the album leafs there (onGoToChapter).
function ContentsList({ onGoToChapter }: { onGoToChapter?: (chapterId: string) => void }) {
  const c = contents;
  const p = c.padding;
  return (
    <div
      className="absolute inset-0 box-border"
      style={{ padding: `${u(p.top)} ${u(p.right)} ${u(p.bottom)} ${u(p.left)}` }}
    >
      <h2
        tabIndex={-1}
        data-chapter-title={contentsId}
        className={`${crazeRetro.className} origin-left leading-none outline-none`}
        style={{ fontSize: u(c.titleSize), rotate: `${c.titleTurn}deg` }}
      >
        {contentsTitle}
      </h2>
      <ul className="flex flex-col" style={{ marginTop: u(c.listTop), gap: u(c.rowGap) }}>
        {contentsRows.map((r) => {
          const soon = r.page === null;
          const RowTag = soon ? "div" : "button";
          return (
            <li key={r.id} style={soon ? { opacity: c.soonOpacity } : undefined}>
              <RowTag
                className={`ab-row ${soon ? "" : "cursor-pointer"}`}
                // A plain row, also as a button.
                style={{ width: "100%", padding: 0, border: 0, background: "none", font: "inherit", color: "inherit", textAlign: "left" }}
                {...(soon
                  ? {}
                  : {
                      type: "button" as const,
                      "aria-label": text.goToChapter(r.name),
                      // Only this: never the page or the album around it.
                      onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
                      onClick: (e: React.MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onGoToChapter?.(r.id);
                      },
                    })}
              >
                <span
                  className="ab-dot"
                  style={soon ? { border: `${u(1.5)} solid rgb(29 38 51 / 0.6)` } : { background: r.color }}
                />
                <span className={`${crazeRetro.className} leading-none`} style={{ fontSize: u(c.itemSize) }}>
                  {r.title}
                </span>
                <span className="ab-lead" />
                <span style={{ fontSize: u(c.numberSize) }}>{soon ? text.soon : r.page}</span>
              </RowTag>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// A chapter's divider: its title big, and the blurb (its `accent` word in
// color).
type DividerTextProps = Pick<
  Extract<BookPage, { kind: "divider" }>,
  "chapterId" | "title" | "blurb" | "accent" | "oferta" | "credit"
>;
function DividerText({ chapterId, title, blurb, accent, oferta, credit }: DividerTextProps) {
  const at = blurb && accent ? blurb.indexOf(accent) : -1;
  // With an offer or a credit (the stickers): the title on the left, the
  // tag and the credit around it (see theme.album.stickereDivider).
  if (oferta || credit) {
    const d = theme.album.stickereDivider;
    return (
      <>
        <h2
          tabIndex={-1}
          data-chapter-title={chapterId}
          className={`${crazeRetro.className} absolute origin-left leading-none outline-none`}
          style={{ left: u(d.title.left), top: u(d.title.top), fontSize: u(d.title.size), rotate: `${d.title.rotation}deg` }}
        >
          {drawnTitle(title)}
        </h2>
        {oferta && <PriceTag big={oferta.mare} small={oferta.mic} look={d.offerTag} />}
        {credit && <PartnerCredit credit={credit} />}
      </>
    );
  }
  return (
    <>
      {/* The chapter's pictures, under the title (see dividerPictures). */}
      {(theme.album.dividerPictures[chapterId] ?? []).map((p) => (
        <Image
          key={p.src}
          src={p.src}
          width={p.width}
          height={p.height}
          alt=""
          aria-hidden
          unoptimized
          // Loaded with the album (not when first near the screen): a fast
          // leafing may show them any moment.
          loading="eager"
          draggable={false}
          className="art pointer-events-none absolute"
          style={{
            left: u(p.left),
            top: u(p.top),
            width: u(p.size),
            maxWidth: "none",
            height: "auto",
            rotate: `${p.rotation}deg`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: u(10) }}>
        <h2
          tabIndex={-1}
          data-chapter-title={chapterId}
          className={`${crazeRetro.className} leading-none outline-none`}
          style={{ fontSize: u(theme.album.dividerTitle.size), rotate: `${theme.album.dividerTitle.rotation}deg` }}
        >
          {drawnTitle(title)}
        </h2>
        {blurb && (
          <div className="opacity-75" style={{ fontSize: u(theme.album.dividerBlurbSize) }}>
            {at < 0 ? (
              blurb
            ) : (
              <>
                {blurb.slice(0, at)}
                <span style={{ color: colors.accent }}>{accent}</span>
                {blurb.slice(at + accent!.length)}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
