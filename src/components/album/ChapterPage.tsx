import { useState } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import { content, type AlbumModel, type AlbumPageContent } from "@/config/content";
import { produs } from "@/config/products";
import { theme } from "@/config/theme";
import { drawnTitle } from "./albumPages";
import { u, uCss } from "./albumUnits";
import { DymoLabel } from "./DymoLabel";

const { chapterPage: cp, photos, priceTag: tag } = theme.album;

type ChapterPageProps = {
  title: string;
  content: AlbumPageContent;
  // The page lies still on the screen: its videos play. Otherwise (hidden,
  // turning, the album opening or closed) they show their posters.
  live: boolean;
};

// One of a chapter's pages (after its divider): its title and subtitle
// top left (or the subtitle alone), the photos stuck on it, a price tag,
// a handwritten note. Laid out as in docs/album-bratari-referinta.html.
export function ChapterPage({ title, content: page, live }: ChapterPageProps) {
  // The product whose video plays: one at a time. None as soon as the page
  // is no longer still on the screen (turning, hidden, the album closed).
  const [playing, setPlaying] = useState<string | null>(null);
  const [wasLive, setWasLive] = useState(live);
  if (wasLive !== live) {
    // React's way to reset state when a prop changes: during the render.
    setWasLive(live);
    if (!live) setPlaying(null);
  }
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
          place={photos.places[i % photos.places.length]}
          playing={live && playing === m.product}
          onToggle={() => setPlaying((now) => (now === m.product ? null : m.product))}
        />
      ))}
      {page.priceTag && <PriceTag {...page.priceTag} />}
      {page.note && <Note text={page.note} />}
    </>
  );
}

type Place = (typeof photos.places)[number];

// A photo stuck on the page: a white frame, the product's picture in it
// (its video on a tap), its name on a Dymo label on the frame under it, a
// strip of washi tape on top.
//
// The picture is a button: a tap plays the video right there (fading in
// over the picture, which stays under it as its poster, so never a black
// frame), another tap stops it. The video element exists only while it
// plays, so nothing of it is downloaded before the first tap, and taking it
// away stops it and frees its decoder.
type PhotoProps = {
  model: AlbumModel;
  place: Place;
  // This photo's video plays.
  playing: boolean;
  onToggle: () => void;
};
function Photo({ model, place, playing, onToggle }: PhotoProps) {
  const p = produs(model.product);
  // The video has its first frame on the screen: fade it in.
  const [shown, setShown] = useState(false);
  const { padding, tape } = photos;
  const pb = theme.album.playButton;
  const label = playing ? content.album.video.stop(p.nume) : content.album.video.play(p.nume);
  return (
    <div
      className="absolute box-border bg-white"
      style={{
        left: u(place.left),
        top: u(place.top),
        width: u(photos.width),
        height: u(photos.height),
        padding: `${u(padding.side)} ${u(padding.side)} ${u(padding.bottom)}`,
        boxShadow: uCss(photos.shadow),
        rotate: `${place.rotation}deg`,
      }}
    >
      {/* Black like the videos' own background. */}
      <button
        type="button"
        aria-label={p.video ? label : undefined}
        aria-pressed={p.video ? playing : undefined}
        disabled={!p.video}
        className="relative block h-full w-full cursor-pointer overflow-hidden bg-black p-0"
        // Only this photo: never the page or the album around it.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShown(false);
          onToggle();
        }}
      >
        <Image
          src={p.poza}
          alt={model.alt}
          fill
          unoptimized
          loading="eager"
          draggable={false}
          className="object-cover select-none"
        />
        {playing && p.video && (
          <video
            className="ab-video absolute inset-0 h-full w-full object-cover"
            style={{ opacity: shown ? 1 : 0, transition: `opacity ${pb.fade}s ease` }}
            src={p.video}
            poster={p.poza}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden
            onPlaying={() => setShown(true)}
            ref={(el) => {
              if (!el) return;
              // Muted before it plays: browsers only autoplay silent videos.
              el.muted = true;
              el.play().catch(() => {}); // AbortError: stopped again before it started
            }}
          />
        )}
        {p.video && !playing && (
          <span
            aria-hidden
            className="absolute flex items-center justify-center rounded-full"
            style={{
              right: u(pb.inset),
              bottom: u(pb.inset),
              width: u(pb.size),
              height: u(pb.size),
              background: pb.background,
            }}
          >
            <svg viewBox="0 0 10 10" style={{ width: "42%", height: "42%", marginLeft: "8%" }}>
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
