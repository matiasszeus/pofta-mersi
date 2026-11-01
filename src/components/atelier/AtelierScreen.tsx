import type { Viewport } from "next";
import { AtelierWithAlbum } from "@/components/album/AtelierWithAlbum";
import { MatBackground } from "@/components/atelier/MatBackground";
import { SiteFooter } from "@/components/site/SiteFooter";
import { theme } from "@/config/theme";

// The atelier's page, the same for every address that shows it:
//   /atelier            the album lies closed on the mat
//   /album              ...and opens by itself at the contents (INVENTAR)
//   /album/<chapter>    ...at that chapter's first page
//   /lab/album          as /atelier, plus a button to replay the opening
// (see AtelierWithAlbum for initialChapter.)
//
// The cutting mat, the letters that landed on it, the album, the note and
// the calculator (the cart). No header with the logo here (it links to the
// atelier itself). The green page background is there from the very first
// frame, in exactly the color the landing's dive ended on, so the switch
// cannot be seen.
export function AtelierScreen({ lab = false, initialChapter }: { lab?: boolean; initialChapter?: string }) {
  return (
    // Exactly one screen, never scrolling: anything reaching past an edge
    // (the album while it is slammed down, from bigger than its size) is
    // cut off instead of making the page longer. While the album is open it
    // is only cut off at the screen's edges: see .atelier-main in
    // globals.css.
    <main className="atelier-main relative h-dvh overflow-hidden">
      <MatBackground />
      {!lab && <SiteFooter />}
      <AtelierWithAlbum lab={lab} initialChapter={initialChapter} />
    </main>
  );
}

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
// Each page that shows the atelier exports it as its `viewport`.
export const atelierViewport: Viewport = {
  themeColor: theme.atelier.background,
};
