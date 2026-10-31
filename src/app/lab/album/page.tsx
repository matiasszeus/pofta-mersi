import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
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

// The atelier exactly as on /atelier, except that a tap on the album opens
// it right here (see LabAlbum).
export default function LabAlbumPage() {
  // The drawn book's stickers: downloaded while the atelier plays, so the
  // book is complete the moment it appears.
  const stickers = new Set([...theme.album.cover.stickers.map((s) => s.src), theme.album.contents.sticker.src]);
  stickers.forEach((src) => preload(src, { as: "image" }));

  return (
    <main className="relative h-dvh overflow-hidden">
      <MatBackground />
      <LabAlbum />
    </main>
  );
}
