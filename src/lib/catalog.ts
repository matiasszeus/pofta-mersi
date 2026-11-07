import stickere from "@/data/stickere.json";

// The stickers' catalog: src/data/stickere.json, made and added to by
// `npm run stickere` (see scripts/stickere.mjs), then edited by hand
// (names, stock, prices).

export type CategorieSticker = "normale" | "holografice";
export type StocSticker = "da" | "epuizat" | "ascuns";

// One entry of the JSON, as written there.
type StickerJson = {
  id: string;
  fisier: string; // the original's file name, in assets-src/stickere/<categorie>/
  nume: string;
  categorie: CategorieSticker;
  // false: off the site (its PNG removed, or by hand); the entry stays, so
  // the cart still knows its id
  activ: boolean;
  lipsaFisier?: boolean; // set by npm run stickere: off because its PNG is gone
  pret?: number; // lei; without it, the category's price
  dimensiune?: string; // like "7×7 cm"; without it, the category's
  stoc: StocSticker; // ascuns: not on the site
  imagine: string; // its picture on the site (white outline, shadow)
  imagineMare?: string; // the same, big: its card (npm run stickere)
  latime: number; // the (small) picture's size, px
  inaltime: number;
};

// As the site gets it: always with its price, size and big picture.
export type Sticker = StickerJson & { pret: number; dimensiune: string; imagineMare: string };

// A category's price per sticker, in lei: the only place it is written
// (the bags' labels take it from here; a sticker with its own `pret` in
// the JSON costs that instead).
export const pretCategorie: Record<CategorieSticker, number> = { normale: 5, holografice: 5 };

// A category's sticker size, as shown on the card's back (a sticker with
// its own `dimensiune` in the JSON shows that instead).
export const dimensiuneCategorie: Record<CategorieSticker, string> = { normale: "7×7 cm", holografice: "7×7 cm" };

// One entry as the site gets it (its price, size and big picture filled in).
const complete = (s: StickerJson): Sticker => ({
  ...s,
  pret: s.pret ?? pretCategorie[s.categorie],
  dimensiune: s.dimensiune ?? dimensiuneCategorie[s.categorie],
  imagineMare: s.imagineMare ?? s.imagine,
});

// Whether a sticker can be bought now: on the site (active, not hidden)
// and not sold out.
export const deVanzare = (s: Sticker) => s.activ !== false && s.stoc === "da";

// A sticker by its id, even one taken off the site (the cart keeps ids):
// undefined only for an id the catalog has never had.
export function getSticker(id: string): Sticker | undefined {
  const s = (stickere as StickerJson[]).find((x) => x.id === id);
  return s && complete(s);
}

// The stickers of a category on the site, in the catalog's order: only the
// active ones, without the hidden ones; each with its price and size (its
// own, or the category's), and its big picture (the small one if missing).
export function getStickere(categorie: CategorieSticker): Sticker[] {
  return (stickere as StickerJson[])
    .filter((s) => s.categorie === categorie && s.activ !== false && s.stoc !== "ascuns")
    .map(complete);
}
