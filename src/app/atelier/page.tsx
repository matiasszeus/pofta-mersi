import type { Viewport } from "next";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import { MatBackground } from "@/components/atelier/MatBackground";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// The atelier: the cutting mat, the letters that landed on it, the objects.
// No header with the logo here (it links to the atelier itself); the other
// pages after the landing have it.
// The green page background is there from the very first frame, in exactly
// the color the landing's dive ended on, so the switch cannot be seen.
export default function AtelierPage() {
  return (
    // Exactly one screen, never scrolling: anything reaching past an edge
    // (the album while it is slammed down, from bigger than its size) is
    // cut off instead of making the page longer.
    <main className="relative h-dvh overflow-hidden">
      <MatBackground />
      <AtelierStage />
    </main>
  );
}
