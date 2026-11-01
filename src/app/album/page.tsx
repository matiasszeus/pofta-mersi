import type { Metadata } from "next";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";

export const viewport = atelierViewport;
export const metadata: Metadata = { title: "Album · POFTA MERSI" };

// A direct link to the album: the atelier (no landing first), the album
// opening by itself at the contents (INVENTAR). See AtelierScreen.
export default function AlbumPage() {
  return <AtelierScreen initialChapter="inventar" />;
}
