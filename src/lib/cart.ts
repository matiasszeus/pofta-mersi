"use client";

import { useSyncExternalStore } from "react";
import { produse, reducereStickere, type Categorie, type Produs } from "@/config/products";

// The cart: kept in the browser (localStorage, under KEY), so it survives a
// refresh and is shared by all the site's tabs. Nothing is sent anywhere.

export type CartItem = { id: string; nume: string; pret: number; cantitate: number; categorie?: Categorie };
// total: what is to be paid (lei, the discount taken off); reducere: the
// discount (lei, 0 if none); bucati: the pieces (quantities added up).
export type CartSummary = { total: number; bucati: number; reducere: number };

const KEY = "pofta-cos";
const EMPTY: CartSummary = { total: 0, bucati: 0, reducere: 0 };

// localStorage can be missing or refuse (private windows, blocked site
// data): the cart is then simply empty.
function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Only well-formed items count (an id and a name, a price of 0 or more, a
// whole number of pieces above 0): anything else in the stored text
// (another site's data, an old or hand-edited cart) is dropped, never a
// crash or "NaN lei". Not JSON at all: an empty cart.
function isItem(x: unknown): x is CartItem {
  if (typeof x !== "object" || x === null) return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.id === "string" &&
    typeof i.nume === "string" &&
    typeof i.pret === "number" &&
    Number.isFinite(i.pret) &&
    i.pret >= 0 &&
    typeof i.cantitate === "number" &&
    Number.isInteger(i.cantitate) &&
    i.cantitate > 0 &&
    (i.categorie === undefined || typeof i.categorie === "string")
  );
}

function parse(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const items: unknown = JSON.parse(raw);
    return Array.isArray(items) ? items.filter(isItem) : [];
  } catch {
    return [];
  }
}

function citeste(): CartItem[] {
  return parse(readRaw());
}

// Who wants to know when the cart changes (useCos).
const listeners = new Set<() => void>();

function scrie(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Not saved (see readRaw); nothing else to do.
  }
  // The "storage" event only reaches the other tabs: tell this one too.
  listeners.forEach((l) => l());
}

// Puts `cantitate` (default 1) of a product (from src/config/products.ts)
// in the cart; one already there (same id) gets more of it instead. Its
// name and price are always the product's.
export function adauga(p: Produs, cantitate = 1) {
  const items = citeste();
  const there = items.find((i) => i.id === p.id);
  if (there) {
    there.cantitate += cantitate;
    there.nume = p.nume;
    there.pret = p.pret;
    there.categorie = p.categorie;
  } else {
    items.push({ id: p.id, nume: p.nume, pret: p.pret, cantitate, categorie: p.categorie });
  }
  scrie(items);
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

// An item's category: kept with it, or (older carts) its product's.
const categoryOf = (i: CartItem) => i.categorie ?? produse.find((p) => p.id === i.id)?.categorie;
// Lei rounded to bani: no 87.49999999.
const bani = (lei: number) => Math.round(lei * 100) / 100;

// The cart's sums, with the stickers' discount (see reducereStickere).
export function summarize(items: CartItem[]): CartSummary {
  const subtotal = items.reduce((sum, i) => sum + i.pret * i.cantitate, 0);
  const bucati = items.reduce((sum, i) => sum + i.cantitate, 0);
  const r = reducereStickere;
  const stickers = items.filter((i) => categoryOf(i) === r.categorie);
  const stickerCount = stickers.reduce((sum, i) => sum + i.cantitate, 0);
  const stickerSubtotal = stickers.reduce((sum, i) => sum + i.pret * i.cantitate, 0);
  const reducere = stickerCount >= r.minim ? bani((stickerSubtotal * r.procent) / 100) : 0;
  return { total: bani(subtotal - reducere), bucati, reducere };
}

// The cart's total (lei) and number of pieces (the quantities added up).
// On the server and at the first render in the browser: 0 and 0, like the
// HTML from the server (no hydration mismatch); right after, the real cart.
export function useCos(): CartSummary {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

// Development only: try it from the browser's console, e.g.
//   __cosTest.adauga(__cosTest.produse[0], 3)
//   __cosTest.goleste()
declare global {
  interface Window {
    __cosTest?: { adauga: typeof adauga; goleste: typeof goleste; produse: Produs[] };
  }
}
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  window.__cosTest = { adauga, goleste, produse };
}
