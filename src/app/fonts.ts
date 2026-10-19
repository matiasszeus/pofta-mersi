import { Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";

// Craze Retro for HTML text (the 3D letters use the typeface JSON instead).
// next/font serves the file from the site itself and preloads it, so the
// logo does not first appear in a fallback font. Only A–Z: use it for the
// logo and titles without diacritics.
export const crazeRetro = localFont({
  src: "../../public/fonts/craze-retro/Craze Retro.ttf",
  display: "block",
});

// Whitenice (by Khurasan, free for personal and commercial use): the font of
// all text except the logo and titles. It lacks some characters, notably
// the Romanian ă, ș, ț (it has â, î), the dashes – — and arrows like →.
export const whitenice = localFont({
  src: "../../public/fonts/whitenice/Whitenice.otf",
  variable: "--font-whitenice",
  // No automatic stand-in font (Arial resized) right after it: that one has
  // ă, ș, ț too, so it would take those letters instead of Hanken Grotesk.
  adjustFontFallback: false,
});

// Hanken Grotesk: right after Whitenice in the font list, so the browser
// takes from it only the characters Whitenice does not have. Downloaded by
// Next.js at build time and served from the site itself (no request to
// Google from the visitor).
export const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"], // latin-ext has the Romanian ă, â, î, ș, ț
  variable: "--font-hanken",
});

// The same list by the fonts' real names, for loading them in advance.
export const textFonts = `${whitenice.style.fontFamily}, ${hankenGrotesk.style.fontFamily}`;
