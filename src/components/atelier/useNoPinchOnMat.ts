"use client";

import { useEffect, useRef } from "react";

// No pinch-zoom on the atelier's mat (.atelier-main) while `active`.
//
// The CSS for it (touch-action in globals.css) is enough after a full page
// load, but iPhone Safari does not always apply it after arriving from the
// landing without one (the page is swapped in place there), so the
// two-finger gesture is also stopped here:
//   gesturestart / gesturechange  Safari's own pinch events (iPhone):
//                                 preventDefault = no zoom
//   touchmove with two fingers    the same for the other browsers
// Only for touches on the mat; the open album, the open note and the photo
// (outside .atelier-main or with active = false) keep their zoom.
export function useNoPinchOnMat(active: boolean) {
  const on = useRef(active);
  useEffect(() => {
    on.current = active;
  }, [active]);

  useEffect(() => {
    const onMat = (target: EventTarget | null) =>
      on.current && target instanceof Element && !!target.closest(".atelier-main");
    const stopGesture = (e: Event) => {
      if (onMat(e.target)) e.preventDefault();
    };
    const stopTwoFingers = (e: TouchEvent) => {
      if (e.touches.length > 1 && onMat(e.target)) e.preventDefault();
    };
    // passive: false = allowed to call preventDefault (touch listeners are
    // passive by default, for smooth scrolling).
    const opts = { passive: false } as const;
    document.addEventListener("gesturestart", stopGesture, opts);
    document.addEventListener("gesturechange", stopGesture, opts);
    document.addEventListener("touchmove", stopTwoFingers, opts);
    return () => {
      document.removeEventListener("gesturestart", stopGesture);
      document.removeEventListener("gesturechange", stopGesture);
      document.removeEventListener("touchmove", stopTwoFingers);
    };
  }, []);
}
