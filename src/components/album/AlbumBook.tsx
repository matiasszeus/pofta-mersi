import type { CSSProperties, Ref } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content } from "@/config/content";
import { theme } from "@/config/theme";

const { colors, sectionColors, cover, contents, tabs, bookmark } = theme.album;
const text = content.album;

// "cuprins" (the contents) or a section's key ("stickere", "bratari"...).
export type AlbumPageKey = string;

// A fraction of the enclosing face's width, as CSS (see container-type below).
const cq = (fraction: number) => `${fraction * 100}cqw`;

type AlbumBookProps = {
  // The page it opens on. Later every page gets its own address
  // (/album/stickere...) and a direct link opens the book right there; for
  // now there is only the contents page.
  initialPage?: AlbumPageKey;
  // true = already open, without the opening (a direct link, or reduced
  // motion); false = closed, until the opening (AlbumOpening) turns the cover.
  skipOpening?: boolean;
  // Wide screen: open, the two pages lie side by side, centred.
  spread: boolean;
  // The parts the opening animates.
  bookRef?: Ref<HTMLDivElement>;
  coverRef?: Ref<HTMLDivElement>;
};

// The album, drawn in code. It fills its parent, which has the size of the
// closed book (see albumLayout) and sets --rim (px).
//
// The cover turns in real 3D (CSS 3D transforms):
//   stage  `perspective`: how far the eye is, so near things look bigger
//   book   preserve-3d: its children keep their own depth instead of being
//          flattened onto it; slides right on wide screens
//   cover  preserve-3d, turns around its left edge (the spine) with rotateY
//          front / lining: its two sides, back to back; backface hidden =
//          each one is invisible while it faces away from us
// Safari draws all of this flat if anything along that chain has overflow
// hidden, opacity below 1, or a filter: those go on other elements.
export function AlbumBook({
  initialPage = "cuprins",
  skipOpening = false,
  spread,
  bookRef,
  coverRef,
}: AlbumBookProps) {
  const open = skipOpening;
  // Only the contents page exists so far (initialPage is for later).
  void initialPage;

  return (
    <div
      className="absolute inset-0"
      style={{ perspective: `${theme.album.perspective}px` }}
    >
      <div
        ref={bookRef}
        className="album-3d absolute inset-0"
        style={{
          transform: open && spread ? "translateX(50%)" : "translateX(0%)",
        }}
      >
        {/* The back of the hard cover, under the pages (a little behind them). */}
        <div
          className="absolute inset-0 rounded-(--radius)"
          style={{
            background: colors.cover,
            boxShadow: theme.album.shadow,
            transform: "translateZ(-1px)",
          }}
        />
        <ContentsPage />
        <div
          ref={coverRef}
          className="album-3d absolute inset-0 origin-left"
          // translateZ(1px): just above the page, so the two never flicker
          // where they overlap.
          style={{
            transform: `translateZ(1px) rotateY(${open ? -180 : 0}deg)`,
          }}
        >
          <CoverFront />
          <CoverLining />
        </div>
      </div>
    </div>
  );
}

function CoverFront() {
  return (
    <div
      className="album-face absolute inset-0 rounded-(--radius) [container-type:inline-size]"
      style={{
        // A darker band along the spine, and a faint raised panel.
        background: `linear-gradient(to right, rgb(0 0 0 / 0.45), transparent 9%), ${colors.cover}`,
      }}
    >
      <div className="absolute inset-[6%_6%_5%_9%] rounded-[1cqw] border border-white/7" />
      <p
        className={`${crazeRetro.className} absolute inset-x-0 text-center leading-none`}
        style={{
          top: `${cover.titleTop * 100}%`,
          fontSize: cq(cover.titleSize),
          color: colors.title,
        }}
      >
        {text.coverTitle}
      </p>
      {cover.stickers.map((s) => (
        <Sticker
          key={s.src + s.left}
          sticker={s}
          style={{ left: `${s.left * 100}%`, top: `${s.top * 100}%` }}
        />
      ))}
    </div>
  );
}

// The inside of the cover: black edge, lilac lining with sage dots.
function CoverLining() {
  return (
    <div
      className="album-face absolute inset-0 rounded-(--radius) p-(--rim)"
      style={{
        background: colors.cover,
        transform: "rotateY(180deg)",
        boxShadow: theme.album.shadow,
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

type StickerConfig = {
  src: string;
  w: number;
  h: number;
  width: number;
  rotation: number;
};

function Sticker({
  sticker,
  style,
}: {
  sticker: StickerConfig;
  style: CSSProperties;
}) {
  return (
    <Image
      src={sticker.src}
      width={sticker.w}
      height={sticker.h}
      alt=""
      // Small, already compressed files: served as they are (and so they
      // match the preload in the page).
      unoptimized
      className="absolute h-auto drop-shadow-[0_1px_1px_rgb(0_0_0/0.4)]"
      style={{
        ...style,
        width: `${sticker.width * 100}%`,
        rotate: `${sticker.rotation}deg`,
      }}
    />
  );
}

// Page 1: the contents.
function ContentsPage() {
  const ready = text.sections.filter((s) => s.page !== null);
  const s = contents.sticker;

  return (
    <div
      className="absolute inset-(--rim) rounded-[2px] [container-type:inline-size]"
      style={{
        backgroundColor: colors.paper,
        // Fine dots, like a dotted notebook; a shade towards the spine.
        backgroundImage: `linear-gradient(to right, rgb(0 0 0 / 0.14), transparent 7%), radial-gradient(circle, rgb(29 38 51 / 0.16) 1px, transparent 1.3px)`,
        backgroundSize: "100% 100%, 14px 14px",
        color: colors.ink,
      }}
    >
      {/* The padding is on this inner box: on the page itself, its cqw would
          be measured on the page's parent instead. */}
      <div
        style={{
          paddingTop: cq(contents.padding.top),
          paddingInline: cq(contents.padding.x),
        }}
      >
        <h2
          className={`${crazeRetro.className} leading-none`}
          style={{ fontSize: cq(contents.titleSize) }}
        >
          {text.contentsTitle}
        </h2>
        <ul style={{ marginTop: cq(contents.listTop) }}>
          {text.sections.map((section) => {
            const soon = section.page === null;
            const color = sectionColors[section.key];
            return (
              <li
                key={section.key}
                className="flex items-center"
                style={{
                  marginTop: cq(contents.itemGap),
                  gap: cq(0.025),
                  opacity: soon ? contents.soonOpacity : 1,
                }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: cq(contents.dot),
                    height: cq(contents.dot),
                    background: soon ? "transparent" : color,
                    border: soon
                      ? `${cq(0.004)} solid ${colors.ink}`
                      : undefined,
                  }}
                />
                <span
                  className={`${crazeRetro.className} shrink-0 leading-none`}
                  style={{ fontSize: cq(contents.itemSize) }}
                >
                  {section.title}
                </span>
                {/* Dotted line up to the page number. */}
                <span
                  className="min-w-[4cqw] flex-1 self-end border-b-2 border-dotted border-current opacity-30"
                  style={{ marginBottom: cq(0.012) }}
                />
                <span
                  className="shrink-0 leading-none"
                  style={{ fontSize: cq(contents.numberSize) }}
                >
                  {soon ? text.soon : section.page}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <Sticker
        sticker={s}
        style={{ right: cq(s.right), bottom: `${s.bottom * 100}%` }}
      />
      <span
        className="absolute leading-none opacity-50"
        style={{ right: cq(0.05), bottom: cq(0.04), fontSize: cq(0.045) }}
      >
        1
      </span>

      {/* The tabs sticking out on the right edge: one per section with pages. */}
      {ready.map((section, i) => (
        <span
          key={section.key}
          className={`${crazeRetro.className} absolute flex items-center justify-center rounded-r-[1.5cqw] leading-none`}
          style={{
            top: `${(tabs.top + i * (tabs.height / theme.album.book.ratio + tabs.gap)) * 100}%`,
            right: `calc(-${cq(tabs.out)} - var(--rim))`,
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
          height: `calc(${cq(bookmark.hang)} + var(--rim))`,
          background: colors.ribbon,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
        }}
      />
    </div>
  );
}
