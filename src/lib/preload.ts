import { theme } from "@/config/theme";
import { titleSnapshot } from "@/config/titleSnapshot";

// Loading the next page's heavy parts ahead of time, while the visitor is
// still looking at this one. Only ever a head start: every failure is
// ignored (the page loads whatever it is missing itself).

// Runs `work` once the browser has nothing else to do (or after `timeout`
// ms at the latest).
export function whenIdle(work: () => void, timeout = 2000) {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(work, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(work, 200);
  return () => clearTimeout(id);
}

const quiet = (p: Promise<unknown>) => void p.catch(() => {});
const portrait = () => matchMedia("(orientation: portrait)").matches;

// A picture, downloaded and decoded, so it shows at once when needed.
function picture(src: string) {
  const img = new Image();
  img.src = src;
  quiet(img.decode());
}

let landingDone = false;
// For the landing (e.g. from the atelier): its 3D code, the letters' font
// (also parsed, ready for the 3D scene), and its pictures.
export function preloadLanding() {
  if (landingDone) return;
  landingDone = true;
  quiet(import("@/components/hero/HeroCanvas"));
  quiet(import("@react-three/drei").then((m) => m.useFont.preload(theme.fonts[theme.font].typeface)));
  quiet(fetch(theme.fonts[theme.font].file));
  picture(portrait() ? theme.landing.flowersPortrait : theme.landing.flowersLandscape);
  picture(portrait() ? titleSnapshot.portrait.src : titleSnapshot.landscape.src);
}

let atelierDone = false;
// For the atelier (e.g. from the landing): its 3D code and its pictures.
export function preloadAtelier() {
  if (atelierDone) return;
  atelierDone = true;
  quiet(import("@/components/atelier/MatLettersCanvas"));
  for (const o of theme.atelier.objects) picture(o.src);
  picture(theme.atelier.note.paper.src);
  picture(theme.atelier.note.scribbles.src);
}
