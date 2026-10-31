"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";
import { preloadLanding, whenIdle } from "@/lib/preload";
import { AtelierLetters } from "./AtelierLetters";
import { AtelierNote } from "./AtelierNote";
import { MatObject, type Entrance } from "./MatObject";
import type { MatObjectConfig } from "./objectLayout";

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
  // (see MatObject). Used by /lab/album.
  onObjectActivate?: (key: string, link: HTMLAnchorElement) => void;
  // Optional, per object key: drawn instead of its picture (see MatObject),
  // and its own settings instead of the ones in theme.ts.
  objectArt?: Record<string, ReactNode>;
  objectOverrides?: Record<string, MatObjectConfig>;
};

function Stage({ onObjectActivate, objectArt, objectOverrides }: StageProps) {
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

  return (
    <>
      {/* The note is there from the start; its corner lifts when the first
          object (the album) hits the mat. */}
      <AtelierNote flutterDelay={animate && landed ? slamDelay(0) + slam.fall : null} />
      <AtelierLetters animate={animate} onLanded={onLanded} />
      {objects.map((o, i) => (
        <MatObject
          key={o.key}
          object={objectOverrides?.[o.key] ?? o}
          entrance={entrance}
          slamDelay={slamDelay(i)}
          onActivate={onObjectActivate && ((link) => onObjectActivate(o.key, link))}
          art={objectArt?.[o.key]}
        />
      ))}
    </>
  );
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
