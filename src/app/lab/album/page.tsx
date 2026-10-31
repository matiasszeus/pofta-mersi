import type { Metadata, Viewport } from "next";
import { MatBackground } from "@/components/atelier/MatBackground";
import { theme } from "@/config/theme";
import { LabAlbum } from "./LabAlbum";

// Sandbox for the album: never linked from the site, kept out of search
// engines (noindex).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// The atelier as on /atelier, except that the album on the mat is the one
// drawn in code, and a tap opens it right here (see LabAlbum).
export default function LabAlbumPage() {
  return (
    <main className="relative h-dvh overflow-hidden">
      <MatBackground />
      <LabAlbum />
    </main>
  );
}
