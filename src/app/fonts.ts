import localFont from "next/font/local";

// Craze Retro for HTML text (the 3D letters use the typeface JSON instead).
// next/font serves the file from the site itself and preloads it, so the
// logo does not first appear in a fallback font. Only A–Z: use it for the
// logo and titles without diacritics.
export const crazeRetro = localFont({
  src: "../../public/fonts/craze-retro/Craze Retro.ttf",
  display: "block",
});
