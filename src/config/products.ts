// The products that can be bought: the only place their prices are kept.
// The pages (the album's, later the shop's) and the cart take names and
// prices from here, never from a text on a page.
//   id         unique and stable (the cart keeps it; never changed)
//   nume       as shown
//   pret       in lei
//   categorie  which chapter of the album it belongs to

export type Categorie = "bratari" | "stickere";
export type Produs = { id: string; nume: string; pret: number; categorie: Categorie };

export const produse: Produs[] = [
  { id: "bratara-basalt", nume: "Basalt", pret: 30, categorie: "bratari" },
  { id: "bratara-synthesis", nume: "Synthesis", pret: 30, categorie: "bratari" },
];

// The product with this id (an unknown id is a mistake in content.ts:
// it stops the build rather than showing a product without a price).
export function produs(id: string): Produs {
  const found = produse.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown product "${id}" (see src/config/products.ts)`);
  return found;
}
