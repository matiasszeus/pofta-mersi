import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { LandingHero } from "@/components/hero/LandingHero";
import { theme } from "@/config/theme";

// Sandbox for experiments: never linked from the site, and kept out of
// search engines (noindex).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.colors.background,
};

// For now: the landing, plus the debug switch (collider wireframes).
export default function LabPage() {
  // The 3D letters' font file, requested straight from the HTML (see the
  // landing, app/page.tsx).
  preload(theme.fonts[theme.font].typeface, { as: "fetch", crossOrigin: "anonymous" });
  return <LandingHero lab />;
}
