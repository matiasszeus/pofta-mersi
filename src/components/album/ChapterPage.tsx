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
import { PlayButton } from "./PlayButton";
import { WashiTape } from "./WashiTape";
import { PriceTag } from "./PriceTag";
import { hideIfBroken, hideOnError } from "@/lib/mediaError";

const { chapterPage: cp, photos } = theme.album;

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
      {page.priceTag && <PriceTag big={page.priceTag.title} small={page.priceTag.unit} />}
      {page.note && <Note text={page.note} />}
      {zoomed && page.models && (
        <PhotoZoom
          product={produs(page.models[zoomed.index].product)}
          from={zoomed.frame}
          fromRotation={placeOf(zoomed.index).rotation}
          labelRotation={placeOf(zoomed.index).labelRotation}
          tape={placeOf(zoomed.index).tape}
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
  const { padding } = photos;
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
        className="relative block h-full w-full cursor-pointer overflow-hidden p-0"
        style={{ background: photos.backing }}
        // Only this photo: never the page or the album around it.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (frame.current) onOpen(frame.current, e.currentTarget);
        }}
      >
        {p.pozaBlur && (
          <Image onError={hideOnError} ref={hideIfBroken}
            src={p.pozaBlur}
            alt={model.alt}
            fill
            unoptimized
            loading="eager"
            draggable={false}
            className="art object-cover"
          />
        )}
        {p.videoMare && <PlayButton />}
      </button>
      {/* In the middle of the frame's white under the picture. */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center"
        style={{ height: u(padding.bottom) }}
      >
        <DymoLabel rotation={place.labelRotation}>{produs(model.product).nume}</DymoLabel>
      </div>
      <WashiTape color={place.tape.color} rotation={place.tape.rotation} />
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
