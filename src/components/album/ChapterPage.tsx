import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content, type AlbumModel, type AlbumPageContent } from "@/config/content";
import { produs } from "@/config/products";
import { theme } from "@/config/theme";
import { drawnTitle } from "./albumPages";
import { u, uCss } from "./albumUnits";
import { DymoLabel } from "./DymoLabel";
import { PhotoZoom } from "./PhotoZoom";

const { chapterPage: cp, photos, priceTag: tag } = theme.album;

type ChapterPageProps = {
  title: string;
  content: AlbumPageContent;
  // The page lies still on the screen: its photos can be tapped.
  live: boolean;
};

// One of a chapter's pages (after its divider): its title and subtitle
// top left (or the subtitle alone), the photos stuck on it, a price tag,
// a handwritten note. Laid out as in docs/album-bratari-referinta.html.
export function ChapterPage({ title, content: page, live }: ChapterPageProps) {
  // The photo shown big (see PhotoZoom): its product, its frame on the page
  // and its place; its button gets the focus back when it closes.
  const [zoomed, setZoomed] = useState<{ index: number; frame: HTMLElement; button: HTMLElement } | null>(null);
  const withTitle = page.title !== false;
  const subtitle = withTitle
    ? { top: cp.subtitleTop, size: cp.subtitleSize }
    : { top: cp.subtitleAlone.top, size: cp.subtitleAlone.size };
  return (
    <>
      {withTitle && (
        <div
          className={`absolute leading-none ${crazeRetro.className}`}
          style={{ left: u(cp.left), top: u(cp.top), fontSize: u(cp.titleSize) }}
        >
          {drawnTitle(title)}
        </div>
      )}
      {page.subtitle && (
        <div
          className="absolute"
          style={{ left: u(cp.left), top: u(subtitle.top), fontSize: u(subtitle.size), opacity: cp.subtitleOpacity }}
        >
          {page.subtitle}
        </div>
      )}
      {page.models?.map((m, i) => (
        <Photo
          key={m.product}
          model={m}
          place={placeOf(i)}
          live={live}
          hidden={zoomed?.index === i}
          onOpen={(frame, button) => setZoomed({ index: i, frame, button })}
        />
      ))}
      {page.priceTag && <PriceTag {...page.priceTag} />}
      {page.note && <Note text={page.note} />}
      {zoomed && page.models && (
        <PhotoZoom
          product={produs(page.models[zoomed.index].product)}
          from={zoomed.frame}
          fromRotation={placeOf(zoomed.index).rotation}
          labelRotation={placeOf(zoomed.index).labelRotation}
          onClosed={() => {
            // Shown again first (a hidden button cannot take the focus).
            flushSync(() => setZoomed(null));
            zoomed.button.focus({ preventScroll: true });
          }}
        />
      )}
    </>
  );
}

type Place = (typeof photos.places)[number];
const placeOf = (i: number): Place => photos.places[i % photos.places.length];

// A photo stuck on the page: a white frame, the product's blurred picture
// in it under a play button, its name on a Dymo label on the frame under
// it, a strip of washi tape on top. A tap shows it big with its video (see
// PhotoZoom); meanwhile it is hidden here (it seems to have been lifted).
// The blur is in the picture itself: a CSS filter in the 3D album would
// trouble Safari.
type PhotoProps = {
  model: AlbumModel;
  place: Place;
  // The page lies still on the screen: it can be tapped.
  live: boolean;
  hidden: boolean;
  onOpen: (frame: HTMLElement, button: HTMLElement) => void;
};
function Photo({ model, place, live, hidden, onOpen }: PhotoProps) {
  const p = produs(model.product);
  const frame = useRef<HTMLDivElement>(null);
  const { padding, tape } = photos;
  const pb = theme.album.playButton;
  const canOpen = live && !!p.videoMare;
  return (
    <div
      ref={frame}
      className="absolute box-border bg-white"
      style={{
        left: u(place.left),
        top: u(place.top),
        width: u(photos.width),
        height: u(photos.height),
        padding: `${u(padding.side)} ${u(padding.side)} ${u(padding.bottom)}`,
        boxShadow: uCss(photos.shadow),
        rotate: `${place.rotation}deg`,
        visibility: hidden ? "hidden" : undefined,
      }}
    >
      <button
        type="button"
        aria-label={content.album.video.open(p.nume)}
        disabled={!canOpen}
        className="relative block h-full w-full cursor-pointer overflow-hidden bg-black p-0"
        // Only this photo: never the page or the album around it.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (frame.current) onOpen(frame.current, e.currentTarget);
        }}
      >
        {p.pozaBlur && (
          <Image
            src={p.pozaBlur}
            alt={model.alt}
            fill
            unoptimized
            loading="eager"
            draggable={false}
            className="object-cover select-none"
          />
        )}
        {p.videoMare && (
          <span
            aria-hidden
            className="absolute top-1/2 left-1/2 flex items-center justify-center rounded-full"
            style={{
              width: u(pb.size),
              height: u(pb.size),
              marginLeft: u(-pb.size / 2),
              marginTop: u(-pb.size / 2),
              background: pb.background,
              boxShadow: pb.shadow,
            }}
          >
            <svg viewBox="0 0 10 10" style={{ width: "40%", height: "40%", marginLeft: "8%" }}>
              <path d="M1.5 0.8 L9 5 L1.5 9.2 Z" fill={pb.color} />
            </svg>
          </span>
        )}
      </button>
      {/* In the middle of the frame's white under the picture. */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center"
        style={{ height: u(padding.bottom) }}
      >
        <DymoLabel rotation={place.labelRotation}>{produs(model.product).nume}</DymoLabel>
      </div>
      <div
        className="absolute"
        style={{
          left: u(tape.left),
          top: u(tape.top),
          width: u(tape.width),
          height: u(tape.height),
          opacity: tape.opacity,
          background: place.tape.color,
          rotate: `${place.tape.rotation}deg`,
        }}
      />
    </div>
  );
}

// A tag hanging on the page: big `title` at the top, `unit` small in the
// bottom-right corner. The label's shape is a clip-path (which would cut a
// box-shadow off), so its shadow is a drop-shadow on the box around it.
function PriceTag({ title, unit }: NonNullable<AlbumPageContent["priceTag"]>) {
  const tipX = tag.tip * tag.width;
  const hole = { x: tipX * 0.62, y: tag.height / 2 };
  // The thread: from the hole, curving up and to the left, `reach` u (in
  // the tag's own units, before its turn).
  const r = tag.thread.reach;
  const thread = `M ${hole.x} ${hole.y} C ${hole.x - r * 0.3} ${hole.y - r * 0.12}, ${hole.x - r * 0.65} ${hole.y - r * 0.6}, ${hole.x - r} ${hole.y - r}`;
  return (
    <div
      className="absolute"
      style={{
        left: u(tag.left),
        top: u(tag.top),
        width: u(tag.width),
        height: u(tag.height),
        rotate: `${tag.rotation}deg`,
        filter: `drop-shadow(${uCss(tag.shadow)})`,
      }}
    >
      <div
        className="absolute inset-0 leading-none"
        style={{
          background: tag.color,
          clipPath: `polygon(${tag.tip * 100}% 0, 100% 0, 100% 100%, ${tag.tip * 100}% 100%, 0 50%)`,
        }}
      >
        <span
          className="absolute text-center"
          style={{ left: u(tipX), right: 0, top: u(tag.titleTop), fontSize: u(tag.titleSize) }}
        >
          {title}
        </span>
        <span
          className="absolute"
          style={{ right: u(tag.unitRight), bottom: u(tag.unitBottom), fontSize: u(tag.unitSize), opacity: tag.unitOpacity }}
        >
          {unit}
        </span>
      </div>
      <div
        className="absolute rounded-full"
        style={{
          left: u(hole.x - tag.hole.size / 2),
          top: u(hole.y - tag.hole.size / 2),
          width: u(tag.hole.size),
          height: u(tag.hole.size),
          background: tag.hole.color,
        }}
      />
      <svg
        aria-hidden
        className="absolute overflow-visible"
        style={{ left: 0, top: 0, width: u(tag.width), height: u(tag.height) }}
        viewBox={`0 0 ${tag.width} ${tag.height}`}
        fill="none"
      >
        <path
          d={thread}
          stroke={tag.thread.color}
          strokeOpacity={tag.thread.opacity}
          strokeWidth={tag.thread.width}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// The handwritten note under the photos, with a small drawn arrow right
// under its last line, however many lines it takes.
function Note({ text }: { text: string }) {
  const { note, arrow } = photos;
  return (
    <div className="absolute" style={{ left: u(note.left), top: u(note.top), width: u(note.width) }}>
      <div style={{ fontSize: u(note.size), lineHeight: note.lineHeight, rotate: `${note.rotation}deg` }}>{text}</div>
      <svg
        aria-hidden
        viewBox="0 0 60 40"
        className="block"
        style={{
          marginLeft: u(arrow.left - note.left),
          marginTop: u(arrow.gap),
          width: u(arrow.width),
          height: u((arrow.width * 40) / 60),
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4,30 C20,34 38,26 52,10" />
        <path d="M44,10 L52,10 L52,18" />
      </svg>
    </div>
  );
}
