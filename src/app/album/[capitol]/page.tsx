import type { Metadata } from "next";
import { bookSlugs, chapterOfSlug } from "@/components/album/albumPages";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";
import { content } from "@/config/content";

export const viewport = atelierViewport;

// The chapters in the book are made in advance (at build time); any other
// address (/album/tricouri: not in the book yet, or a typo) is made when
// asked for, and the atelier opens the contents instead and changes the
// address to /album (see AtelierWithAlbum).
export function generateStaticParams() {
  return bookSlugs.map((capitol) => ({ capitol }));
}

export async function generateMetadata({ params }: PageProps<"/album/[capitol]">): Promise<Metadata> {
  const { capitol } = await params;
  const chapter = content.album.chapters.find((c) => c.slug === capitol);
  const title = chapter && chapterOfSlug(capitol) ? `${chapter.title} · Album · POFTA MERSI` : "Album · POFTA MERSI";
  return { title };
}

// A direct link to a chapter of the album: the atelier (no landing
// first), the album opening by itself at the chapter's first page. See
// AtelierScreen.
export default async function AlbumChapterPage({ params }: PageProps<"/album/[capitol]">) {
  const { capitol } = await params;
  return <AtelierScreen initialChapter={capitol} />;
}
