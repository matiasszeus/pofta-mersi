"use client";

import { useEffect } from "react";

// No zooming the page anywhere on the site (the owner's decision).
// Three layers, because browsers differ:
//   - the viewport meta (layout.tsx): user-scalable=no, maximum-scale=1;
//     Android and most browsers obey it, iPhone Safari ignores it
//   - touch-action in globals.css: no pinch-zoom or double-tap zoom on any
//     element (Safari obeys it after a full page load only)
//   - here, for the rest (iPhone Safari after the landing's dive, in-app
//     browsers): the two-finger gesture is stopped as it starts
//       gesturestart / gesturechange  Safari's pinch events: preventDefault
//                                     = no zoom
//       touchmove with two fingers    the same for the other browsers
//       wheel with Ctrl               a laptop trackpad's pinch (Ctrl + / -
//                                     on the keyboard stays the browser's)
// Renders nothing.
export function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const stopTwoFingers = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const stopTrackpadPinch = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };
    // passive: false = allowed to call preventDefault (touch and wheel
    // listeners are passive by default, for smooth scrolling).
    const opts = { passive: false } as const;
    document.addEventListener("gesturestart", stop, opts);
    document.addEventListener("gesturechange", stop, opts);
    document.addEventListener("touchmove", stopTwoFingers, opts);
    document.addEventListener("wheel", stopTrackpadPinch, opts);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", stopTwoFingers);
      document.removeEventListener("wheel", stopTrackpadPinch);
    };
  }, []);
  return null;
}
