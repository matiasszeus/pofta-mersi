// The stickers' catalog: src/data/stickere.json, and their pictures for the
// site. Run: npm run stickere
//
// For every PNG in assets-src/stickere/normale/ and .../holografice/ (the
// originals: never renamed, never changed) that is not in the catalog yet:
//   - its pictures for the site, cut out with a white outline and a small
//     shadow (scripts/sticker-outline.py): public/images/stickere/<id>.webp
//     (WIDTH px wide: on the page and in the bags) and <id>-mare.webp
//     (WIDTH_BIG px: its card, big on the screen, sharp on a retina phone;
//     loaded only when the card opens)
//   - an entry at the end of the catalog:
//       nume       the file name without .png, cleaned (see cleanName):
//                  "POFTA_SUGACI STICKER 7X7 2.png" -> "Pofta sugaci"
//       id         the name without diacritics, small letters, with dashes
//                  ("Pofta Fața" -> "pofta-fata"); holographic ones end
//                  in -holo
//       fisier     the original's file name
//       categorie  "normale" or "holografice" (its folder)
//       activ      true; false = taken off the site (see below), its entry
//                  kept (the cart still knows its id)
//       stoc       "da" | "epuizat" | "ascuns" (ascuns: not on the site)
//       imagine    the picture's address on the site
//       imagineMare  the big one's (its card)
//       latime, inaltime  the (small) picture's size in px
//     and optionally (written by hand) pret: in lei, and dimensiune: like
//     "7×7 cm"; without them, the category's (src/lib/catalog.ts).
// Entries already in the catalog are left as they are (edited by hand:
// names, stock, prices, activ); only a picture that is missing is made
// again. Never deleted: an entry whose PNG is gone from assets-src gets
// "activ": false (and "lipsaFisier": true: why); if that PNG comes back, it
// is active again. An entry set "activ": false by hand stays so.
// Needs Python 3 with numpy and Pillow (pip install numpy pillow); its
// command: PYTHON, else python (Windows) / python3.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE = "assets-src/stickere";
const CATEGORIES = ["normale", "holografice"];
const OUT_DIR = "public/images/stickere";
const CATALOG = "src/data/stickere.json";
const WIDTH = 480; // px: ~2x the biggest a sticker is shown on a page
// px: the card is up to ~365 CSS px wide on a phone (85% of a 430px
// screen), x3 on a retina iPhone; about the originals' own width.
const WIDTH_BIG = 1100;
const PYTHON = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

// Kept in capitals in a name (initialisms).
const ACRONYMS = ["DVD"];

// A file name made into a sticker's name: without the print shop's words
// (STICKER, 7X7, X2, VL + digits) and without a lone number at the end
// ("1", "2"); _ as a space, single spaces; only the first letter capital
// (diacritics kept), except ACRONYMS.
function cleanName(fileName) {
  const words = fileName
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(sticker|7x7|x2|vl\d+)$/i.test(w));
  while (words.length > 1 && /^\d+$/.test(words[words.length - 1])) words.pop();
  return words
    .map((w, i) => {
      if (ACRONYMS.includes(w.toUpperCase())) return w.toUpperCase();
      const low = w.toLocaleLowerCase("ro");
      return i === 0 ? low.charAt(0).toLocaleUpperCase("ro") + low.slice(1) : low;
    })
    .join(" ");
}

// "Pofta Fața" -> "pofta-fata"
const slug = (name) =>
  name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// A WebP's width and height, read from its header (VP8X: the extended
// format, which ours are, having transparency; VP8L / VP8 just in case).
function webpSize(file) {
  const b = readFileSync(file);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  throw new Error(`${file}: not a WebP`);
}

function makePicture(source, out, width = WIDTH) {
  execFileSync(PYTHON, ["scripts/sticker-outline.py", source, out, String(width)], { stdio: "inherit" });
}
const bigOf = (id) => `/images/stickere/${id}-mare.webp`;

const catalog = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, "utf8")) : [];
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(CATALOG), { recursive: true });

const known = new Set(catalog.map((s) => `${s.categorie}/${s.fisier}`));
const ids = new Set(catalog.map((s) => s.id));
let added = 0;

// The fields in this order in the JSON (any other, like pret, after them).
const ORDER = ["id", "fisier", "nume", "categorie", "activ", "stoc", "imagine", "imagineMare", "latime", "inaltime"];
const ordered = (s) => Object.fromEntries([...ORDER.filter((k) => k in s), ...Object.keys(s).filter((k) => !ORDER.includes(k))].map((k) => [k, s[k]]));

let deactivated = 0;
let reactivated = 0;
for (const s of catalog) {
  const out = path.join("public", s.imagine);
  const source = path.join(SOURCE, s.categorie, s.fisier);
  if (s.activ === undefined) s.activ = true;
  if (!existsSync(source)) {
    // Its original is gone: off the site, entry kept.
    if (s.activ) {
      s.activ = false;
      s.lipsaFisier = true;
      deactivated++;
      console.log(`(off: ${s.categorie}/${s.fisier} is gone) ${s.id}`);
    }
    continue;
  }
  if (s.lipsaFisier) {
    // Its original is back: on the site again.
    s.activ = true;
    delete s.lipsaFisier;
    reactivated++;
    console.log(`(on again) ${s.id}`);
  }
  // Its picture for the site went missing: made again.
  if (!existsSync(out)) {
    console.log(`(again) ${s.id}`);
    makePicture(source, out);
  }
  // Its big picture (for its card): made if missing (or new).
  if (!s.imagineMare) s.imagineMare = bigOf(s.id);
  if (!existsSync(path.join("public", s.imagineMare))) {
    console.log(`(big) ${s.id}`);
    makePicture(source, path.join("public", s.imagineMare), WIDTH_BIG);
  }
}

for (const categorie of CATEGORIES) {
  const dir = path.join(SOURCE, categorie);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, "ro"));
  for (const fisier of files) {
    if (known.has(`${categorie}/${fisier}`)) continue;
    const nume = cleanName(fisier.replace(/\.png$/i, ""));
    // Two files with the same id: the second gets -2, and so on.
    const base = slug(nume) + (categorie === "holografice" ? "-holo" : "");
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);

    const out = path.join(OUT_DIR, `${id}.webp`);
    console.log(`(new) ${id}`);
    makePicture(path.join(dir, fisier), out);
    makePicture(path.join(dir, fisier), path.join("public", bigOf(id)), WIDTH_BIG);
    const [latime, inaltime] = webpSize(out);
    catalog.push({ id, fisier, nume, categorie, activ: true, stoc: "da", imagine: `/images/stickere/${id}.webp`, imagineMare: bigOf(id), latime, inaltime });
    added++;
  }
}

writeFileSync(CATALOG, JSON.stringify(catalog.map(ordered), null, 2) + "\n");
const active = catalog.filter((s) => s.activ).length;
console.log(`${CATALOG}: ${catalog.length} stickers, ${active} active (${added} new, ${deactivated} off, ${reactivated} on again)`);
