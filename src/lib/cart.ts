"use client";

import { useSyncExternalStore } from "react";
import { produse, reducereStickere, type Categorie } from "@/config/products";
import { deVanzare, getSticker } from "@/lib/catalog";

// The cart, shared by the whole site: kept in the browser (localStorage,
// under KEY), so it survives a refresh and is shared by all the site's
// tabs. Nothing is sent anywhere. If localStorage cannot be used (private
// windows, blocked site data), the cart lasts until the page is reloaded
// (kept in memory meanwhile).
//
// Only what was chosen is kept: {id, cantitate}. Prices, names and whether
// a product can still be bought always come from the catalogs
// (src/config/products.ts, src/data/stickere.json via src/lib/catalog.ts),
// never from the cart: a price changed there is the cart's price too.

export type CartItem = { id: string; cantitate: number };
// total: what is to be paid (lei, the discount taken off); reducere: the
// discount (lei, 0 if none); bucati: the pieces (quantities added up).
// Only products that can be bought now count (see catalogItem).
export type CartSummary = { total: number; bucati: number; reducere: number };

const KEY = "pofta-cos";
const EMPTY: CartSummary = { total: 0, bucati: 0, reducere: 0 };

// The cart kept in memory when localStorage does not work.
let memory: string | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

// Only well-formed items count (an id, a whole number of pieces above 0):
// anything else in the stored text (another site's data, a hand-edited
// cart) is dropped, never a crash or "NaN lei". Older carts kept a name and
// a price too: those are simply ignored now. Not JSON at all: an empty
// cart.
function isItem(x: unknown): x is CartItem {
  if (typeof x !== "object" || x === null) return false;
  const i = x as Record<string, unknown>;
  return typeof i.id === "string" && typeof i.cantitate === "number" && Number.isInteger(i.cantitate) && i.cantitate > 0;
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const items: unknown = JSON.parse(raw);
    return Array.isArray(items) ? items.filter(isItem).map((i) => ({ id: i.id, cantitate: i.cantitate })) : [];
  } catch {
    return [];
  }
}

function citeste(): CartItem[] {
  return parse(readRaw());
}

// Who wants to know when the cart changes (useCos, useInCos).
const listeners = new Set<() => void>();

function scrie(items: CartItem[]) {
  const raw = JSON.stringify(items);
  memory = raw;
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // Not saved: kept in memory until the page is reloaded (see readRaw).
  }
  // The "storage" event only reaches the other tabs: tell this one too.
  listeners.forEach((l) => l());
}

// A product as the cart needs it, from its catalog: its price, its
// category (for the stickers' discount), and whether it can be bought now
// (a sticker: active, not hidden, not sold out). undefined: no catalog
// knows the id (kept in the cart, never counted).
type CatalogItem = { pret: number; categorie: Categorie; deVanzare: boolean };
export function catalogItem(id: string): CatalogItem | undefined {
  const sticker = getSticker(id);
  if (sticker) return { pret: sticker.pret, categorie: "stickere", deVanzare: deVanzare(sticker) };
  const p = produse.find((x) => x.id === id);
  if (p) return { pret: p.pret, categorie: p.categorie, deVanzare: true };
  return undefined;
}

// Puts `cantitate` of a product (by its id) in the cart; one already there
// gets more of it instead, but never more than `max` pieces of it. Returns
// how many of it the cart holds now.
export function adauga(id: string, cantitate = 1, max = Infinity): number {
  const items = citeste();
  const there = items.find((i) => i.id === id);
  const now = Math.min(max, (there?.cantitate ?? 0) + cantitate);
  if (there) there.cantitate = now;
  else items.push({ id, cantitate: now });
  scrie(items);
  return now;
}

// Takes a product out of the cart (all of it).
export function scoate(id: string) {
  scrie(citeste().filter((i) => i.id !== id));
}

export function goleste() {
  scrie([]);
}

// useSyncExternalStore: React's way to read something outside React that
// can change on its own (here localStorage, also from another tab).
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// The summary must be the same object while the cart does not change
// (React compares it), so it is kept with the text it was read from.
let last: { raw: string | null; summary: CartSummary } = { raw: null, summary: EMPTY };
function getSnapshot(): CartSummary {
  const raw = readRaw();
  if (raw === last.raw) return last.summary;
  last = { raw, summary: summarize(parse(raw)) };
  return last.summary;
}

// Lei rounded to bani: no 87.49999999.
const bani = (lei: number) => Math.round(lei * 100) / 100;

// The cart's sums, with the stickers' discount (see reducereStickere).
// Only what can be bought now: a product taken off the catalog (or sold
// out) stays in the cart (to be shown as "no longer available" on the
// cart's page later) but is in neither the total nor the pieces.
export function summarize(items: CartItem[]): CartSummary {
  const lines = items
    .map((i) => ({ ...i, p: catalogItem(i.id) }))
    .filter((l): l is CartItem & { p: CatalogItem } => !!l.p && l.p.deVanzare);
  const subtotal = lines.reduce((sum, l) => sum + l.p.pret * l.cantitate, 0);
  const bucati = lines.reduce((sum, l) => sum + l.cantitate, 0);
  const r = reducereStickere;
  const stickers = lines.filter((l) => l.p.categorie === r.categorie);
  const stickerCount = stickers.reduce((sum, l) => sum + l.cantitate, 0);
  const stickerSubtotal = stickers.reduce((sum, l) => sum + l.p.pret * l.cantitate, 0);
  const reducere = stickerCount >= r.minim ? bani((stickerSubtotal * r.procent) / 100) : 0;
  return { total: bani(subtotal - reducere), bucati, reducere };
}

// The cart's total (lei) and number of pieces (the quantities added up).
// On the server and at the first render in the browser: 0 and 0, like the
// HTML from the server (no hydration mismatch); right after, the real cart.
export function useCos(): CartSummary {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// How many of one product the cart holds (0: none), kept up to date.
export function useInCos(id: string): number {
  return useSyncExternalStore(
    subscribe,
    () => citeste().find((i) => i.id === id)?.cantitate ?? 0,
    () => 0,
  );
}

// Development only: try it from the browser's console, e.g.
//   __cosTest.adauga("mil-moi", 3)
//   __cosTest.goleste()
declare global {
  interface Window {
    __cosTest?: { adauga: typeof adauga; goleste: typeof goleste; citeste: typeof citeste };
  }
}
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  window.__cosTest = { adauga, goleste, citeste };
}
