// prefers-reduced-motion is deliberately NOT taken into account anywhere on
// the site: everyone gets the same animations (the owner's decision). This
// always says "no"; nothing uses it any more, it is kept only so the choice
// is written down in one place.
export function useReducedMotion() {
  return false;
}
