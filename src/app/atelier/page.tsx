import type { Viewport } from "next";
import { AtelierWithAlbum } from "@/components/album/AtelierWithAlbum";
import { MatBackground } from "@/components/atelier/MatBackground";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// The atelier: the cutting mat, the letters that landed on it, the album
// (a tap opens it right here), the note and the calculator (the cart).
// No header with the logo here (it links to the atelier itself); the other
// pages after the landing have it.
// The green page background is there from the very first frame, in exactly
// the color the landing's dive ended on, so the switch cannot be seen.
export default function AtelierPage() {
  return (
    // Exactly one screen, never scrolling: anything reaching past an edge
    // (the album while it is slammed down, from bigger than its size) is
    // cut off instead of making the page longer. While the album is open it
    // is only cut off at the screen's edges: see .atelier-main in
    // globals.css.
    <main className="atelier-main relative h-dvh overflow-hidden">
      <MatBackground />
      <AtelierWithAlbum />
    </main>
  );
}
