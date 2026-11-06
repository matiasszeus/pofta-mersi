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
  pret?: number; // lei; without it, the category's price
  stoc: StocSticker; // ascuns: not on the site
  imagine: string; // its picture on the site (white outline, shadow)
  latime: number; // the picture's size, px
  inaltime: number;
};

// As the site gets it: always with its price.
export type Sticker = StickerJson & { pret: number };

// A category's price per sticker, in lei (test values for now).
export const pretCategorie: Record<CategorieSticker, number> = { normale: 10, holografice: 15 };

// The stickers of a category, in the catalog's order, without the hidden
// ones; each with its price (its own, or the category's).
export function getStickere(categorie: CategorieSticker): Sticker[] {
  return (stickere as StickerJson[])
    .filter((s) => s.categorie === categorie && s.stoc !== "ascuns")
    .map((s) => ({ ...s, pret: s.pret ?? pretCategorie[categorie] }));
}
