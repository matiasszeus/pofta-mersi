"use client";

import { useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";

// For things on the mat that answer taps only from a moment on (the
// calculator and the note: once the album has landed). Returns a check for
// their click handler: true = act on this click. A tap whose finger (or
// mouse button) went down before that moment is ignored even if its click
// arrives just after: nothing is kept for later. Keyboard clicks
// (detail 0) only need it to be active.
export function useTapGate(active: boolean) {
  // When it became active (performance.now() clock); null = not yet.
  const activeAt = useRef<number | null>(active ? 0 : null);
  // The last press anywhere on the page (an event's timeStamp: same clock).
  const lastDown = useRef(0);

  useLayoutEffect(() => {
    if (active && activeAt.current === null) activeAt.current = performance.now();
  }, [active]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => void (lastDown.current = e.timeStamp);
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  return (e: MouseEvent) => {
    const since = activeAt.current;
    if (!active || since === null) return false;
    return e.detail === 0 || lastDown.current >= since;
  };
}
