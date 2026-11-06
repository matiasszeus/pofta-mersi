// The products that can be bought: the only place their prices are kept.
// The pages (the album's, later the shop's) and the cart take names and
// prices from here, never from a text on a page.
//   id         unique and stable (the cart keeps it; never changed)
//   nume       as shown
//   pret       in lei
//   categorie  which chapter of the album it belongs to
//   pozaBlur   optional: a blurred frame of its video, small: on the
//              album's page, under a play button
//   videoMare  optional: its looping video (720px): in the big view,
//              after a tap on the photo
//   poster     optional: the video's first frame, sharp: shown in the big
//              view until the video plays (else pozaBlur)
// The bracelets' three files come from scripts/bratara-studio.py (their
// turntable on a grey-white studio background). A new name when they
// change: browsers keep pictures and videos for a week (next.config.ts).

export type Categorie = "bratari" | "stickere";
export type Produs = {
  id: string;
  nume: string;
  pret: number;
  categorie: Categorie;
  pozaBlur?: string;
  videoMare?: string;
  poster?: string;
};

export const produse: Produs[] = [
  {
    id: "bratara-basalt",
    nume: "Basalt",
    pret: 30,
    categorie: "bratari",
    pozaBlur: "/images/bratari/basalt-studio-blur.webp",
    videoMare: "/videos/bratari/basalt-studio-720.mp4",
    poster: "/images/bratari/basalt-studio-poster.webp",
  },
  {
    id: "bratara-synthesis",
    nume: "Synthesis",
    pret: 30,
    categorie: "bratari",
    pozaBlur: "/images/bratari/synthesis-studio-blur.webp",
    videoMare: "/videos/bratari/synthesis-studio-720.mp4",
    poster: "/images/bratari/synthesis-studio-poster.webp",
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
