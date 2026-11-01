import type { Metadata, Viewport } from "next";
import { MatBackground } from "@/components/atelier/MatBackground";
import { theme } from "@/config/theme";
import { AtelierWithAlbum } from "@/components/album/AtelierWithAlbum";

// Sandbox for the album: never linked from the site, kept out of search
// engines (noindex).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// The atelier as on /atelier, plus a button to replay the album's opening
// (see AtelierWithAlbum). For trying out the album before it goes there.
export default function LabAlbumPage() {
  return (
    // While the album is open it is only cut off at the screen's edges:
    // see .atelier-main in globals.css.
    <main className="atelier-main relative h-dvh overflow-hidden">
      <MatBackground />
      <AtelierWithAlbum lab />
    </main>
  );
}
