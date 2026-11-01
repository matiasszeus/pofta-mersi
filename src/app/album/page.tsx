import type { Metadata } from "next";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";
import { content } from "@/config/content";
import { pageMetadata } from "@/lib/pageMetadata";

export const viewport = atelierViewport;
export const metadata: Metadata = pageMetadata({
  title: `${content.meta.siteName} · album`,
  description: content.meta.album,
  path: "/album",
  image: "/og/album.jpg",
});

// A direct link to the album: the atelier (no landing first), the album
// opening by itself at the contents (INVENTAR). See AtelierScreen.
export default function AlbumPage() {
  return <AtelierScreen initialChapter="inventar" />;
}
