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
  stoc: StocSticker; // ascuns: not on the site
  imagine: string; // its picture on the site (white outline, shadow)
  latime: number; // the picture's size, px
  inaltime: number;
};

// As the site gets it: always with its price.
export type Sticker = StickerJson & { pret: number };

// A category's price per sticker, in lei: the only place it is written
// (the bags' labels take it from here; a sticker with its own `pret` in
// the JSON costs that instead).
export const pretCategorie: Record<CategorieSticker, number> = { normale: 5, holografice: 5 };

// The stickers of a category on the site, in the catalog's order: only the
// active ones, without the hidden ones; each with its price (its own, or
// the category's).
export function getStickere(categorie: CategorieSticker): Sticker[] {
  return (stickere as StickerJson[])
    .filter((s) => s.categorie === categorie && s.activ !== false && s.stoc !== "ascuns")
    .map((s) => ({ ...s, pret: s.pret ?? pretCategorie[categorie] }));
}
