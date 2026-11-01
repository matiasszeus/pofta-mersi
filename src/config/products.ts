// The products that can be bought: the only place their prices are kept.
// The pages (the album's, later the shop's) and the cart take names and
// prices from here, never from a text on a page.
//   id         unique and stable (the cart keeps it; never changed)
//   nume       as shown
//   pret       in lei
//   categorie  which chapter of the album it belongs to
//   pozaBlur   optional: a blurred frame of its video, small (made by
//              scripts/prepare-videos.mjs --blur): on the album's page,
//              under a play button
//   videoMare  optional: its looping video (720px, same script): in the
//              big view, after a tap on the photo

export type Categorie = "bratari" | "stickere";
export type Produs = {
  id: string;
  nume: string;
  pret: number;
  categorie: Categorie;
  pozaBlur?: string;
  videoMare?: string;
};

export const produse: Produs[] = [
  {
    id: "bratara-basalt",
    nume: "Basalt",
    pret: 30,
    categorie: "bratari",
    pozaBlur: "/images/bratari/basalt-blur.webp",
    videoMare: "/videos/bratari/basalt-720.mp4",
  },
  {
    id: "bratara-synthesis",
    nume: "Synthesis",
    pret: 30,
    categorie: "bratari",
    pozaBlur: "/images/bratari/synthesis-blur.webp",
    videoMare: "/videos/bratari/synthesis-720.mp4",
  },
];

// The stickers' discount (the offer on their divider in the album): with
// at least `minim` stickers in the cart (their quantities added up),
// `procent` % off the stickers' subtotal only; everything else at full
// price. Never more than that (20 stickers: still 20 %). See cart.ts.
export const reducereStickere = { categorie: "stickere" as Categorie, minim: 10, procent: 20 };

// The product with this id (an unknown id is a mistake in content.ts:
// it stops the build rather than showing a product without a price).
export function produs(id: string): Produs {
  const found = produse.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown product "${id}" (see src/config/products.ts)`);
  return found;
}
