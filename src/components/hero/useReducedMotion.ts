import { useSyncExternalStore } from "react";
import { theme } from "@/config/theme";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// true when the visitor asked their device for less animation (an
// accessibility setting in iOS, Android, Windows, macOS) and the site
// honours that (theme.motion.respectReducedMotion); otherwise false.
export function useReducedMotion() {
  const asked = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // on the server we cannot know; assume no
  );
  return theme.motion.respectReducedMotion && asked;
}
