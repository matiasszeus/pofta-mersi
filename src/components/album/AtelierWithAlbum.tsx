"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import type { Placed } from "@/components/atelier/objectLayout";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { albumPathOf, chapterOfPath, chapterOfSlug } from "./albumPages";
import { MatAlbum, matAlbumObject } from "./MatAlbum";

const album = matAlbumObject(theme.atelier.objects[0]);
const overrides = { [album.key]: album };

const pill = "rounded-full bg-white/85 px-3 py-1.5 text-black shadow";

// The mat stepping back while the album is open (see dimFade in theme.ts),
// as CSS variables for .mat-dims and the vignette (globals.css).
const { dimFade, dimCenter, dimEdge, objectsOpacity, opening } = theme.album;
const dimVars = {
  "--dim-fade": `${dimFade}s`,
  "--dim-easing": opening.flight.easing,
  "--objects-opacity": objectsOpacity,
} as CSSProperties;

// The atelier's stage with the album drawn in code lying on the mat: a tap
// opens it right there (see MatAlbum), the X puts it back. Used by
// /atelier, /album, /album/<chapter> and /lab/album (see AtelierScreen);
// `lab` adds a button to replay the opening.
//
// initialChapter (/album: "inventar"; /album/<slug>: that slug): arriving
// from a link. The mat appears with the letters already lying still (no
// falling: it would be too much together with the album's opening); once
// the album's cover and the fonts have loaded, after linkOpenDelay, the
// album opens as after a tap, straight at that chapter (the contents if it
// does not exist or is not in the book yet). prefers-reduced-motion: it is
// simply there, open.
//
// The address follows the album (not on /lab/album), so the browser's back
// button closes it:
//   opened with a tap        a new history entry, /album
//   arriving from a link     the entry becomes /atelier, and a new one is
//                            added for the album: back = the atelier
//   leafing                  the entry's address follows the chapter
//                            (replaced, never added: back still closes)
//   X / Escape               back to our entry before (or, if there is
//                            none, the address simply becomes /atelier)
//   back / forward           to /atelier: it closes; to /album...: it
//                            opens there (as from a link)
// Pages the browser keeps and restores (back/forward cache) are left as
// they were.
const linkOpenDelay = theme.album.deepLink.delay; // ms
// Our history entries carry this, so X knows it can go back.
const OURS = "pmAlbum";
// A history entry's data: Next.js's own (it keeps the page in it: without
// it, back / forward would load the page again), with our mark or without.
function entry(ours: boolean) {
  const next = { ...((window.history.state ?? {}) as Record<string, unknown>) };
  delete next[OURS];
  return ours ? { ...next, [OURS]: true } : next;
}

export function AtelierWithAlbum({ lab = false, initialChapter }: { lab?: boolean; initialChapter?: string }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  // Where the next opening starts (a chapter id), and whether it is simply
  // there without moving (link + prefers-reduced-motion).
  const [openAt, setOpenAt] = useState(() =>
    initialChapter === undefined ? "inventar" : (chapterOfSlug(initialChapter) ?? "inventar"),
  );
  const [instant, setInstant] = useState(false);
  const history = !lab;
  // The latest `open`, for the history listener.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Arriving from a link: the entry becomes /atelier, a new one for the
  // album on top (the chapter's address as it really is: /album for a
  // chapter that is not there). Once, on arrival.
  const arrived = useRef(false);
  useEffect(() => {
    if (!history || initialChapter === undefined || arrived.current) return;
    arrived.current = true;
    window.history.replaceState(entry(false), "", "/atelier");
    window.history.pushState(entry(true), "", albumPathOf(openAt));
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens it as from a link: once the cover's picture and the fonts are
  // there, after linkOpenDelay (prefers-reduced-motion: open at once).
  const openFromLink = useCallback((chapter: string) => {
    let cancelled = false;
    const cover = document.querySelector<HTMLImageElement>("[data-object] .ab-cover-front img");
    const ready = Promise.all([document.fonts.ready, cover?.decode().catch(() => {})]);
    ready.then(() => {
      window.setTimeout(() => {
        if (cancelled) return;
        setOpenAt(chapter);
        setInstant(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        setOpen(true);
      }, linkOpenDelay);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A link (/album...): open it once it lies on the mat.
  const onAlbumDown = useCallback(() => {
    if (initialChapter !== undefined) openFromLink(openAt);
    // Only for the arrival's chapter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChapter, openFromLink]);

  // The vignette is in the page from the tap until it has faded out after
  // closing (then taken away, not left at opacity 0).
  const [vignette, setVignette] = useState(false);
  if (open && !vignette) setVignette(true);

  // Back on the mat (the same closing animation). A new run: opened again,
  // it starts from the contents.
  const shut = useCallback(() => {
    setOpen(false);
    setRun((n) => n + 1);
    setOpenAt("inventar");
    setInstant(false);
  }, []);
  // X / Escape: back to the entry before ours (its popstate shuts it),
  // or, without one, the address simply becomes /atelier.
  const close = useCallback(() => {
    if (history && window.history.state?.[OURS]) {
      window.history.back();
      return;
    }
    if (history) window.history.replaceState(entry(false), "", "/atelier");
    shut();
  }, [history, shut]);

  // The browser's back / forward buttons.
  useEffect(() => {
    if (!history) return;
    const onPop = () => {
      const chapter = chapterOfPath(window.location.pathname);
      if (chapter === null && openRef.current) shut();
      else if (chapter !== null && !openRef.current) openFromLink(chapter);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [history, shut, openFromLink]);

  // Leafing: the address follows the chapter on the screen (replaced).
  const onChapterChange = useCallback(
    (chapter: string) => {
      if (!history || !openRef.current) return;
      const path = albumPathOf(chapter);
      if (window.location.pathname !== path) window.history.replaceState(window.history.state, "", path);
    },
    [history],
  );

  // Escape closes it too (keyboard), unless a photo is open big over it:
  // Escape closes that first (the closed note's dialog stays in the page,
  // aria-hidden: not counted).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role='dialog']:not([aria-hidden='true'])")) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // A tap on the album: it opens at the contents, with a history entry.
  const onObjectActivate = useCallback(
    (key: string) => {
      if (key !== album.key || openRef.current) return;
      setOpenAt("inventar");
      setInstant(false);
      setOpen(true);
      if (history) window.history.pushState(entry(true), "", "/album");
    },
    [history],
  );

  const art = useMemo(
    () => ({
      // Given where the album lies on the mat (see matLayout).
      [album.key]: (_: typeof album, place: Placed) => (
        <MatAlbum
          place={place}
          open={open}
          run={run}
          reducedMotion={reducedMotion}
          initialPage={openAt}
          instant={instant}
          onChapterChange={onChapterChange}
        />
      ),
    }),
    [open, run, reducedMotion, openAt, instant, onChapterChange],
  );

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as without it.
    <div className={`contents ${open ? "album-open" : ""}`} style={dimVars}>
      <AtelierStage
        onObjectActivate={onObjectActivate}
        objectArt={art}
        objectOverrides={overrides}
        albumOpen={open}
        onAlbumDown={onAlbumDown}
        // From a link: the letters lie still from the start (see above).
        calm={initialChapter !== undefined}
      />
      {/* The vignette, between the mat (and what lies on it) and the album;
          while open it also takes the taps meant for the things on the mat. */}
      {vignette && (
        <div
          className={`fixed inset-0 z-15 h-lvh ${open ? "album-vignette-in" : "album-vignette-out pointer-events-none"}`}
          style={{ background: `radial-gradient(ellipse at center, ${dimCenter} 0%, ${dimEdge} 100%)` }}
          onAnimationEnd={() => {
            if (!open) setVignette(false);
          }}
        />
      )}
      {open && (
        <div className="fixed top-[max(env(safe-area-inset-top),12px)] right-3 z-50 flex gap-2 font-sans text-sm">
          {lab && (
            <button type="button" className={pill} onClick={() => setRun((n) => n + 1)}>
              {content.album.replay}
            </button>
          )}
          <CloseButton onClick={close} />
        </div>
      )}
    </div>
  );
}

// The open album's close button: a dark round button with a cream X (two
// lines, SVG). See theme.album.closeButton.
function CloseButton({ onClick }: { onClick: () => void }) {
  const { size, background, color, iconSize, lineWidth } = theme.album.closeButton;
  return (
    <button
      type="button"
      aria-label={content.album.closeAlbum}
      onClick={onClick}
      className="flex cursor-pointer items-center justify-center rounded-full border-0 p-0"
      style={{ width: size, height: size, background, color }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={lineWidth}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    </button>
  );
}
