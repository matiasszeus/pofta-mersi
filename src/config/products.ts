// The products that can be bought: the only place their prices are kept.
// The pages (the album's, later the shop's) and the cart take names and
// prices from here, never from a text on a page.
//   id         unique and stable (the cart keeps it; never changed)
//   nume       as shown
//   pret       in lei
//   categorie  which chapter of the album it belongs to
//   poza       its picture (square WebP); for a bracelet: a frame of its
//              video (see scripts/prepare-videos.mjs --poza)
//   video      optional: a short looping video of it, played on a tap

export type Categorie = "bratari" | "stickere";
export type Produs = { id: string; nume: string; pret: number; categorie: Categorie; poza: string; video?: string };

export const produse: Produs[] = [
  {
    id: "bratara-basalt",
    nume: "Basalt",
    pret: 30,
    categorie: "bratari",
    poza: "/images/bratari/basalt.webp",
    video: "/videos/bratari/basalt.mp4",
  },
  {
    id: "bratara-synthesis",
    nume: "Synthesis",
    pret: 30,
    categorie: "bratari",
    poza: "/images/bratari/synthesis.webp",
    video: "/videos/bratari/synthesis.mp4",
  },
];

// The product with this id (an unknown id is a mistake in content.ts:
// it stops the build rather than showing a product without a price).
export function produs(id: string): Produs {
  const found = produse.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown product "${id}" (see src/config/products.ts)`);
  return found;
}
