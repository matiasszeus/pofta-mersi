import type { Metadata } from "next";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";

// Sandbox for the album: never linked from the site, kept out of search
// engines (noindex).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport = atelierViewport;

// The atelier as on /atelier, plus a button to replay the album's opening
// (see AtelierWithAlbum). For trying out the album before it goes there.
export default function LabAlbumPage() {
  return <AtelierScreen lab />;
}
