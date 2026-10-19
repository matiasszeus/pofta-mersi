import { theme } from "@/config/theme";

export type MatObjectConfig = (typeof theme.atelier.objects)[number];
type Place = MatObjectConfig["phone"];

// Tailwind's "md" breakpoint: from here on, objects use their `large` place.
export const LARGE_FROM = 768;

// CSS for an object's box (see `objects` in theme.ts): width, and where its
// top-left corner goes. Used as CSS variables by MatObject.
export function placeCss(object: MatObjectConfig, place: Place) {
  const ratio = object.height / object.width;
  const width = `min(${place.widthVw}vw, ${place.maxWidth}px)`;
  // Below the iPhone's status bar when anchored to the top.
  const safeTop = place.anchorY === 0 ? " + env(safe-area-inset-top)" : "";
  return {
    width,
    left: `calc(${place.anchorX * 100}% + ${place.x}px - ${place.align} * ${width})`,
    top: `calc(${place.anchorY * 100}% + ${place.y}px${safeTop} - ${place.align} * ${width} * ${ratio})`,
  };
}

// The middle of an object on a screen of this size, in CSS px from the
// top-left corner (the safe area and the small rotation are ignored).
export function objectMiddle(object: MatObjectConfig, screenWidth: number, screenHeight: number) {
  const place = screenWidth >= LARGE_FROM ? object.large : object.phone;
  const w = Math.min((place.widthVw / 100) * screenWidth, place.maxWidth);
  const h = (w * object.height) / object.width;
  const left = place.anchorX * screenWidth + place.x - place.align * w;
  const top = place.anchorY * screenHeight + place.y - place.align * h;
  return { x: left + w / 2, y: top + h / 2 };
}
