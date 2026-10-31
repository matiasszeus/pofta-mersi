import type { Viewport } from "next";
import { preload } from "react-dom";
import { theme } from "@/config/theme";
import { LabHero } from "./LabHero";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.colors.background,
};

export default function LabPage() {
  // The 3D letters' font file: requested straight from the HTML, so it is
  // already downloading while the page's JavaScript arrives. ("fetch" +
  // anonymous: exactly how the 3D code requests it later, so the two match.)
  preload(theme.fonts[theme.font].typeface, { as: "fetch", crossOrigin: "anonymous" });
  return <LabHero />;
}
