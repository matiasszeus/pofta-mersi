"use client";

import { useSyncExternalStore } from "react";

// The visible part of the screen, for laying things out, measured only
// while the page is NOT pinch-zoomed.
//
// Why: a pinch-zoom changes visualViewport.width / height (and, on
// Android Chrome, window.innerWidth / innerHeight too), and fires the same
// "resize" events as turning the phone. Laying the mat out again for those
// would shrink and move everything. So while zoomed (scale not 1) the last
// size measured at scale 1 is kept; the layout only changes for real
// changes: turning the phone, resizing the window, Safari's or Instagram's
// bars showing or hiding (all of which happen at scale 1).
//
// Changes are passed on ~100 ms after the last event (debounce): turning a
// phone fires several in a row, and the layout is worked out once.

export type StableViewport = {
  // The window's width and the visible height (between the browser's
  // bars), in CSS px.
  width: number;
  height: number;
  // The visual viewport itself: where the visible part starts and its
  // size (in-app browsers may show less than the window).
  box: { left: number; top: number; width: number; height: number };
  // Pinch-zoomed in right now (the sizes above are from before).
  zoomed: boolean;
};

const DEBOUNCE_MS = 100;
const isZoomed = () => {
  const vv = window.visualViewport;
  return !!vv && Math.abs(vv.scale - 1) > 0.01;
};

function measure(zoomed: boolean): StableViewport {
  const vv = window.visualViewport;
  const height = vv ? Math.min(window.innerHeight, vv.height) : window.innerHeight;
  const box = vv
    ? { left: vv.offsetLeft, top: vv.offsetTop, width: vv.width, height: vv.height }
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  return { width: window.innerWidth, height, box, zoomed };
}

let current: StableViewport | null = null;
const listeners = new Set<() => void>();
let timer: number | undefined;

function same(a: StableViewport, b: StableViewport) {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.zoomed === b.zoomed &&
    a.box.left === b.box.left &&
    a.box.top === b.box.top &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height
  );
}

function update() {
  const zoomed = isZoomed();
  // Zoomed: keep the sizes from scale 1, only note that it is zoomed.
  const next = zoomed && current ? { ...current, zoomed: true } : measure(zoomed);
  if (current && same(current, next)) return;
  current = next;
  listeners.forEach((l) => l());
}

function onEvent() {
  window.clearTimeout(timer);
  timer = window.setTimeout(update, DEBOUNCE_MS);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("resize", onEvent);
    window.visualViewport?.addEventListener("resize", onEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("resize", onEvent);
      window.visualViewport?.removeEventListener("resize", onEvent);
      window.clearTimeout(timer);
    }
  };
}

// The current value (measured the first time it is asked for: on page
// load the page is not zoomed).
export function stableViewport(): StableViewport {
  if (!current) current = measure(isZoomed());
  return current;
}

// Back to zoom 1 (e.g. closing the album while pinch-zoomed into it). A
// page cannot set the browser's zoom directly; briefly adding
// maximum-scale=1 to the viewport meta makes the browser zoom back out,
// and the original is put back right after, so zooming stays allowed.
export function resetZoom() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta || !isZoomed()) return;
  const original = meta.content;
  meta.content = `${original}, maximum-scale=1`;
  window.setTimeout(() => {
    meta.content = original;
  }, 300);
}

// The same, kept up to date in a component (null on the server).
export function useStableViewport(): StableViewport | null {
  return useSyncExternalStore(subscribe, stableViewport, () => null);
}
