import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { LandingHero } from "@/components/hero/LandingHero";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { pageMetadata } from "@/lib/pageMetadata";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.colors.background,
};

export const metadata: Metadata = pageMetadata({
  title: content.meta.siteName,
  description: content.meta.description,
  path: "/",
  image: "/og/atelier.jpg",
});

// The landing: the 3D title; a tap dives into the atelier.
export default function Home() {
  // The 3D letters' font file: requested straight from the HTML, so it is
  // already downloading while the page's JavaScript arrives. ("fetch" +
  // anonymous: exactly how the 3D code requests it later, so the two match.)
  preload(theme.fonts[theme.font].typeface, { as: "fetch", crossOrigin: "anonymous" });
  return <LandingHero />;
}
