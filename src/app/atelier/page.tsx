import type { Metadata } from "next";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";
import { content } from "@/config/content";
import { pageMetadata } from "@/lib/pageMetadata";

export const viewport = atelierViewport;
export const metadata: Metadata = pageMetadata({
  title: `${content.meta.siteName} · atelier`,
  description: content.meta.atelier,
  path: "/atelier",
  image: "/og/atelier.jpg",
});

// The atelier, the album lying closed on the mat (see AtelierScreen).
export default function AtelierPage() {
  return <AtelierScreen />;
}
