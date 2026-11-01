import { useState } from "react";
import Image from "next/image";
import { crazeRetro } from "@/app/fonts";
import type { AlbumModel, AlbumPageContent } from "@/config/content";
import { theme } from "@/config/theme";
import { drawnTitle } from "./albumPages";
import { u, uCss } from "./albumUnits";

const { chapterPage: cp, photos } = theme.album;

type ChapterPageProps = {
  title: string;
  content: AlbumPageContent;
  // The page lies still on the screen: its videos play. Otherwise (hidden,
  // turning, the album opening or closed) they show their posters.
  live: boolean;
};

// One of a chapter's pages (after its divider): its title and subtitle
// top left, the photos stuck on it, a handwritten note. Laid out as in
// docs/album-bratari-referinta.html.
export function ChapterPage({ title, content, live }: ChapterPageProps) {
  return (
    <>
      <div
        className={`absolute leading-none ${crazeRetro.className}`}
        style={{ left: u(cp.left), top: u(cp.top), fontSize: u(cp.titleSize) }}
      >
        {drawnTitle(title)}
      </div>
      {content.subtitle && (
        <div
          className="absolute"
          style={{ left: u(cp.left), top: u(cp.subtitleTop), fontSize: u(cp.subtitleSize), opacity: cp.subtitleOpacity }}
        >
          {content.subtitle}
        </div>
      )}
      {content.models?.map((m, i) => (
        <Photo key={m.video} model={m} place={photos.places[i % photos.places.length]} live={live} />
      ))}
      {content.note && <Note text={content.note} />}
    </>
  );
}

type Place = (typeof photos.places)[number];

// A photo stuck on the page: a white frame, the model's video in it and
// its name and price under it, a strip of washi tape on top.
//
// The video element exists only while the page is live: until then (and
// while the page turns in 3D, where Safari can make a video flicker or
// vanish) the poster, a still picture of its first frame, stands in for
// it. Taking the video away also stops it and frees its decoder.
function Photo({ model, place, live }: { model: AlbumModel; place: Place; live: boolean }) {
  // The browser refused to play it (iPhone in Low Power Mode): the poster
  // stays, rather than a native play button.
  const [refused, setRefused] = useState(false);
  const { padding, tape } = photos;
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
      <div className="relative h-full w-full overflow-hidden bg-black">
        <Image
          src={model.poster}
          alt={model.alt}
          fill
          unoptimized
          loading="eager"
          draggable={false}
          className="object-cover select-none"
        />
        {live && !refused && (
          <video
            className="ab-video absolute inset-0 h-full w-full object-cover"
            src={model.video}
            poster={model.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden
            ref={(el) => {
              if (!el) return;
              // Muted before it plays: browsers only autoplay silent videos.
              el.muted = true;
              el.play().catch((e: DOMException) => {
                // AbortError: taken away again before it started; fine.
                if (e.name === "NotAllowedError") setRefused(true);
              });
            }}
          />
        )}
      </div>
      <div
        className="absolute inset-x-0 text-center"
        style={{ bottom: u(photos.captionBottom), fontSize: u(photos.captionSize) }}
      >
        {model.name} · {model.price}
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

// The handwritten note under the photos, with a small drawn arrow.
function Note({ text }: { text: string }) {
  const { note, arrow } = photos;
  return (
    <>
      <div
        className="absolute"
        style={{
          left: u(note.left),
          top: u(note.top),
          width: u(note.width),
          fontSize: u(note.size),
          lineHeight: 1.25,
          rotate: `${note.rotation}deg`,
        }}
      >
        {text}
      </div>
      <svg
        aria-hidden
        viewBox="0 0 60 40"
        className="absolute"
        style={{ left: u(arrow.left), top: u(arrow.top), width: u(arrow.width), height: u((arrow.width * 40) / 60) }}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4,30 C20,34 38,26 52,10" />
        <path d="M44,10 L52,10 L52,18" />
      </svg>
    </>
  );
}
