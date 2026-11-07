import type { Metadata } from "next";
import { AtelierScreen, atelierViewport } from "@/components/atelier/AtelierScreen";
import { content } from "@/config/content";
import { pageMetadata } from "@/lib/pageMetadata";

export const viewport = atelierViewport;
export const metadata: Metadata = pageMetadata({
  title: `${content.meta.siteName} · coș`,
  description: content.meta.cos,
  path: "/cos",
  image: "/og/atelier.jpg",
});

// A direct link to the cart: the atelier, the receipt coming out of the
// calculator by itself (see AtelierWithAlbum). The same cart as from a tap
// on the calculator.
export default function CartPage() {
  return <AtelierScreen initialCart />;
}
