"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";
import { preloadLanding, whenIdle } from "@/lib/preload";
import { AtelierLetters } from "./AtelierLetters";
import { AtelierNote } from "./AtelierNote";
import { MatObject, type Entrance } from "./MatObject";
import { matLayout, visibleSize, type MatObjectConfig, type Placed } from "./objectLayout";
import { PocketCalculator } from "./PocketCalculator";

const { objects, object } = theme.atelier;
const { slam } = object;

// When object `i` starts falling, counted from the objects' cue (the moment
// the letters' layer says "now": see slam.delay in theme.ts).
const slamDelay = (i: number) => i * slam.stagger;

// Everything lying on the atelier's mat, and the order it arrives in. The
// same every time the page appears (from the landing, a refresh, a link,
// going back): the letters land, then the objects are slammed down, and at
// each impact the letters near it jolt. With reduced motion: the letters
// lie still and the objects fade in.
//
// Never a flash of the finished scene: from the very first frame (also the
// HTML from the server) the objects start hidden, waiting for the letters,
// and the letters only exist in the browser, where they start in the air.
type StageProps = {
  // Optional: a tap on an object calls this instead of going to its page
  // (see MatObject). Used for the album (see AtelierWithAlbum).
  onObjectActivate?: (key: string, element: HTMLElement) => void;
  // Optional, per object key: drawn instead of its picture (see MatObject;
  // given the object's settings and its place on this mat), and its own
  // settings instead of the ones in theme.ts.
  objectArt?: Record<string, (object: MatObjectConfig, place: Placed) => ReactNode>;
  objectOverrides?: Record<string, MatObjectConfig>;
  // The album is open: the 3D letters stop drawing (see MatLettersCanvas).
  albumOpen?: boolean;
};

function Stage({ onObjectActivate, objectArt, objectOverrides, albumOpen = false }: StageProps) {
  const reducedMotion = useReducedMotion();
  const animate = !reducedMotion;
  const [landed, setLanded] = useState(false);
  const onLanded = useCallback(() => setLanded(true), []);

  // Once everything lies still (the last object's slam and its shadow's
  // pulse are over): get the landing ready in the background, for a visitor
  // who goes there next. Not earlier: parsing its code could make the
  // animations stutter on a phone.
  useEffect(() => {
    if (!landed) return;
    const lastSlamEnd = slamDelay(objects.length - 1) + slam.fall + slam.squashDuration;
    const settled = (lastSlamEnd + object.pulse.delay + object.pulse.duration) * 1000;
    let cancelIdle = () => {};
    const timer = setTimeout(() => (cancelIdle = whenIdle(preloadLanding, 4000)), settled);
    return () => {
      clearTimeout(timer);
      cancelIdle();
    };
  }, [landed]);

  // Safety net: show the objects even if the letters never report that
  // they landed (for example when the device has no WebGL).
  useEffect(() => {
    if (!animate || landed) return;
    const timer = setTimeout(onLanded, object.fallbackDelay * 1000);
    return () => clearTimeout(timer);
  }, [animate, landed, onLanded]);

  // (The letters jolt at each object's impact by themselves: the 3D scene
  // times it on its own clock, from the same cue that starts the objects.)

  const entrance: Entrance = !animate ? "fade" : landed ? "slam" : "waiting";
  // Where the album (or its override), the note and the calculator lie for
  // this screen (see layout in theme.ts). Again on every resize (Instagram's
  // browser changes its height after loading). Only in the browser: until
  // then (the HTML from the server) they wait, hidden.
  const screen = useScreenSize();
  const album = objectOverrides?.[objects[0].key] ?? objects[0];
  const mat = useMemo(() => (screen ? matLayout(screen.w, screen.h, album) : null), [screen, album]);

  return (
    <>
      {/* The note fades in with the mat; its corner lifts when the album
          hits the mat. */}
      <AtelierNote flutterDelay={animate && landed ? slamDelay(0) + slam.fall : null} place={mat?.note ?? null} />
      {/* The cart (it fades in with the note). */}
      {mat && <PocketCalculator place={mat.calc} />}
      {mat && <AtelierLetters animate={animate} onLanded={onLanded} mat={mat} paused={albumOpen} />}
      <MatObject
        object={album}
        place={mat?.albumBox ?? null}
        entrance={entrance}
        slamDelay={slamDelay(0)}
        onActivate={onObjectActivate && ((link) => onObjectActivate(album.key, link))}
        art={mat && objectArt?.[album.key]?.(album, mat.albumBox)}
      />
    </>
  );
}

// The visible part of the screen (see visibleSize), as "393x740"; also
// when only the visual viewport reports a change (in-app browsers, Safari's
// bars). null on the server.
function subscribeScreen(onChange: () => void) {
  window.addEventListener("resize", onChange);
  window.visualViewport?.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    window.visualViewport?.removeEventListener("resize", onChange);
  };
}
function useScreenSize() {
  const size = useSyncExternalStore(
    subscribeScreen,
    () => {
      const { width, height } = visibleSize();
      return `${width}x${height}`;
    },
    () => "",
  );
  return useMemo(() => {
    if (!size) return null;
    const [w, h] = size.split("x").map(Number);
    return { w, h };
  }, [size]);
}

// Going back to the atelier with the browser's back button normally rebuilds
// the page, so the stage starts from scratch by itself. Safari (and Chrome)
// may instead restore a frozen copy of the page from memory (the "back/
// forward cache"), which would show the finished scene and never animate.
// So: when the page is left (pagehide), the stage is removed right away, so
// the frozen copy is the empty mat; when such a copy comes back (pageshow
// with persisted = true), a fresh stage is mounted and the animation runs.
export function AtelierStage(props: StageProps) {
  const [run, setRun] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onHide = () => flushSync(() => setHidden(true));
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setHidden(false);
      setRun((n) => n + 1);
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return hidden ? null : <Stage key={run} {...props} />;
}
