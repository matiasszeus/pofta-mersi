import type { CSSProperties, Ref } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { coverRatio } from "./albumLayout";

const { cover, thickness, boardEdge, colors, sectionColors, contents, tabs, bookmark } = theme.album;
const text = content.album;

// "cuprins" (the contents) or a section's key ("stickere", "bratari"...).
export type AlbumPageKey = string;

// A fraction of the enclosing page's width, as CSS (see container-type below).
const cq = (fraction: number) => `${fraction * 100}cqw`;

type AlbumBookProps = {
  // The cover's width in px (see albumLayout); everything else follows it.
  coverWidth: number;
  // The page it opens on. Later every page gets its own address
  // (/album/stickere...) and a direct link opens the book right there; for
  // now there is only the contents page.
  initialPage?: AlbumPageKey;
  // true = drawn open (after the opening, a direct link, reduced motion);
  // false = closed, until the opening turns the cover.
  skipOpening?: boolean;
  // Wide screen: open, the two pages lie side by side, centred.
  spread: boolean;
  // The parts the opening animates.
  bookRef?: Ref<HTMLDivElement>;
  coverRef?: Ref<HTMLDivElement>;
  liftShadowRef?: Ref<HTMLDivElement>;
};

// The album. It fills its parent, which has the size of the closed book
// (see bookSize): the cover at the top left, the stack of pages showing
// right of and below it, the black board behind everything.
//
// The cover turns in real 3D (CSS 3D transforms):
//   stage  `perspective`: how far the eye is, so near things look bigger
//   book   preserve-3d: its children keep their own depth instead of being
//          flattened onto it; slides right on wide screens
//   cover  preserve-3d, turns around its left edge (the spine) with rotateY
//          front / lining: its two sides, back to back; backface hidden =
//          each one is invisible while it faces away from us
// Safari draws all of this flat if anything along that chain (or between
// the stage and the book) has overflow hidden, opacity below 1, or a
// filter: those go on other elements.
export function AlbumBook({
  coverWidth: w,
  initialPage = "cuprins",
  skipOpening = false,
  spread,
  bookRef,
  coverRef,
  liftShadowRef,
}: AlbumBookProps) {
  const open = skipOpening;
  // Only the contents page exists so far (initialPage is for later).
  void initialPage;
  const h = w * coverRatio;
  const t = w * thickness;
  const e = w * boardEdge;
  const coverBox: CSSProperties = { left: 0, top: 0, width: w, height: h };

  return (
    <div className="absolute inset-0" style={{ perspective: `${theme.album.perspective}px` }}>
      <div
        ref={bookRef}
        className="album-3d absolute inset-0"
        style={{ transform: `translateX(${open && spread ? w / 2 : 0}px)` }}
      >
        {/* The board: the back of the hard cover, around the stack. Its
            shadow on the mat, and the wide soft one while in the air (a
            second layer, only its opacity changes). */}
        <div
          ref={liftShadowRef}
          className="absolute inset-0 opacity-0"
          style={{ borderRadius: e * 1.5, boxShadow: theme.album.shadowLifted, transform: "translateZ(-3px)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            borderRadius: e * 1.5,
            background: colors.board,
            boxShadow: theme.album.shadowRest,
            transform: "translateZ(-2px)",
          }}
        />
        {/* The stack of pages: only its edges show, right of and below the
            cover (the sheets' edges as fine lines). */}
        <div className="absolute" style={{ left: 0, top: 0, width: w + t, height: h + t, transform: "translateZ(-1px)" }}>
          <div
            className="absolute"
            style={{
              left: w - 2,
              top: 2,
              width: t + 2,
              height: h,
              borderRadius: `0 ${t / 3}px 0 0`,
              background: `repeating-linear-gradient(to right, ${colors.pageEdges} 0 1px, transparent 1px 3px), ${colors.paper}`,
            }}
          />
          <div
            className="absolute"
            style={{
              left: 2,
              top: h - 2,
              width: w + t,
              height: t + 2,
              borderRadius: `0 0 ${t / 3}px ${t / 3}px`,
              background: `repeating-linear-gradient(to bottom, ${colors.pageEdges} 0 1px, transparent 1px 3px), ${colors.paper}`,
            }}
          />
        </div>
        <ContentsPage box={coverBox} />
        <div
          ref={coverRef}
          className="album-3d absolute origin-left"
          // translateZ(1px): just above the page, so the two never flicker
          // where they overlap.
          style={{ ...coverBox, transform: `translateZ(1px) rotateY(${open ? -180 : 0}deg)` }}
        >
          <div className="album-face absolute inset-0">
            <Image
              src={cover.src}
              width={cover.width}
              height={cover.height}
              alt="Albumul cu stickerele Pofta Mersi"
              sizes={`${Math.ceil(w)}px`}
              priority
              draggable={false}
              className="h-full w-full select-none"
            />
          </div>
          <CoverLining edge={e} />
        </div>
      </div>
    </div>
  );
}

// The inside of the cover: black edge, lilac lining with sage dots.
function CoverLining({ edge }: { edge: number }) {
  return (
    <div
      className="album-face absolute inset-0"
      style={{
        padding: edge,
        borderRadius: edge * 1.5,
        background: colors.board,
        transform: "rotateY(180deg)",
        boxShadow: theme.album.shadowRest,
      }}
    >
      <div
        className="h-full w-full rounded-[2px]"
        style={{
          backgroundColor: colors.lining,
          backgroundImage: `radial-gradient(circle, ${colors.liningDots} 0 2px, transparent 2.5px)`,
          backgroundSize: "14px 14px",
          // Shade towards the spine (on the right once open).
          boxShadow: "inset -14px 0 18px -10px rgb(0 0 0 / 0.35)",
        }}
      />
    </div>
  );
}

// Page 1: the contents, the size of the cover, under it.
function ContentsPage({ box }: { box: CSSProperties }) {
  const ready = text.sections.filter((s) => s.page !== null);

  return (
    <div
      className="absolute rounded-[2px] [container-type:inline-size]"
      style={{
        ...box,
        backgroundColor: colors.paper,
        // Fine dots, like a dotted notebook; a shade towards the spine.
        backgroundImage: `linear-gradient(to right, rgb(0 0 0 / 0.14), transparent 7%), radial-gradient(circle, rgb(29 38 51 / 0.16) 1px, transparent 1.3px)`,
        backgroundSize: "100% 100%, 14px 14px",
        color: colors.ink,
      }}
    >
      {/* The padding is on this inner box: on the page itself, its cqw would
          be measured on the page's parent instead. */}
      <div style={{ paddingTop: cq(contents.padding.top), paddingInline: cq(contents.padding.x) }}>
        <h2 className={`${crazeRetro.className} leading-none`} style={{ fontSize: cq(contents.titleSize) }}>
          {text.contentsTitle}
        </h2>
        <ul style={{ marginTop: cq(contents.listTop) }}>
          {text.sections.map((section) => {
            const soon = section.page === null;
            return (
              <li
                key={section.key}
                className="flex items-center"
                style={{ marginTop: cq(contents.itemGap), gap: cq(0.025), opacity: soon ? contents.soonOpacity : 1 }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: cq(contents.dot),
                    height: cq(contents.dot),
                    background: soon ? "transparent" : sectionColors[section.key],
                    border: soon ? `${cq(0.004)} solid ${colors.ink}` : undefined,
                  }}
                />
                <span className={`${crazeRetro.className} shrink-0 leading-none`} style={{ fontSize: cq(contents.itemSize) }}>
                  {section.title}
                </span>
                {/* Dotted line up to the page number. */}
                <span
                  className="min-w-[4cqw] flex-1 self-end border-b-2 border-dotted border-current opacity-30"
                  style={{ marginBottom: cq(0.012) }}
                />
                <span className="shrink-0 leading-none" style={{ fontSize: cq(contents.numberSize) }}>
                  {soon ? text.soon : section.page}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <span className="absolute leading-none opacity-50" style={{ right: cq(0.05), bottom: cq(0.04), fontSize: cq(0.045) }}>
        1
      </span>

      {/* The tabs sticking out on the right edge, past the stack and the
          board: one per section with pages. */}
      {ready.map((section, i) => (
        <span
          key={section.key}
          className={`${crazeRetro.className} absolute flex items-center justify-center rounded-r-[1.5cqw] leading-none`}
          style={{
            top: `${(tabs.top + i * (tabs.height / coverRatio + tabs.gap)) * 100}%`,
            left: "100%",
            width: cq(tabs.out),
            height: cq(tabs.height),
            background: sectionColors[section.key],
            fontSize: cq(tabs.textSize),
            writingMode: "vertical-rl",
          }}
        >
          {section.title}
        </span>
      ))}

      {/* The ribbon (bookmark) hanging out at the bottom, with a notch. */}
      <span
        className="absolute"
        style={{
          left: `${bookmark.left * 100}%`,
          top: "100%",
          width: cq(bookmark.width),
          height: cq(bookmark.hang),
          background: colors.ribbon,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
        }}
      />
    </div>
  );
}
