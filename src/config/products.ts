// The products that can be bought: the only place their prices are kept.
// The pages (the album's, later the shop's) and the cart take names and
// prices from here, never from a text on a page.
//   id         unique and stable (the cart keeps it; never changed)
//   nume       as shown
//   pret       in lei
//   categorie  which chapter of the album it belongs to
//   poza       its picture (square WebP); for a bracelet: a frame of its
//              video (see scripts/prepare-videos.mjs --poza)
//   pozaBlur   optional: the same, blurred and small (--blur): on the
//              album's page, under a play button
//   video      optional: a short looping video of it (480px)
//   videoMare  optional: the same, better (720px, --mare): in the big view

export type Categorie = "bratari" | "stickere";
export type Produs = {
  id: string;
  nume: string;
  pret: number;
  categorie: Categorie;
  poza: string;
  pozaBlur?: string;
  video?: string;
  videoMare?: string;
};

export const produse: Produs[] = [
  {
    id: "bratara-basalt",
    nume: "Basalt",
    pret: 30,
    categorie: "bratari",
    poza: "/images/bratari/basalt.webp",
    pozaBlur: "/images/bratari/basalt-blur.webp",
    video: "/videos/bratari/basalt.mp4",
    videoMare: "/videos/bratari/basalt-720.mp4",
  },
  {
    id: "bratara-synthesis",
    nume: "Synthesis",
    pret: 30,
    categorie: "bratari",
    poza: "/images/bratari/synthesis.webp",
    pozaBlur: "/images/bratari/synthesis-blur.webp",
    video: "/videos/bratari/synthesis.mp4",
    videoMare: "/videos/bratari/synthesis-720.mp4",
  },
];

// The product with this id (an unknown id is a mistake in content.ts:
// it stops the build rather than showing a product without a price).
export function produs(id: string): Produs {
  const found = produse.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown product "${id}" (see src/config/products.ts)`);
  return found;
}
