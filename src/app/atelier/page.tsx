import type { Viewport } from "next";
import { CuttingMat } from "@/components/atelier/CuttingMat";
import { PageBackground } from "@/components/PageBackground";
import { SiteHeader } from "@/components/site/SiteHeader";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// Only the header and the background for now. The green is there from the very first frame,
// in exactly the color the landing's dive ended on, so the switch between
// pages cannot be seen; the mat's lines then fade in over it.
export default function AtelierPage() {
  return (
    <main className="min-h-dvh" style={{ background: theme.atelier.background }}>
      <PageBackground color={theme.atelier.background} />
      <CuttingMat />
      <SiteHeader />
    </main>
  );
}
