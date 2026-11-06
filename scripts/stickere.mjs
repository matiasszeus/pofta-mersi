// The stickers' catalog: src/data/stickere.json, and their pictures for the
// site. Run: npm run stickere
//
// For every PNG in assets-src/stickere/normale/ and .../holografice/ (the
// originals: never renamed, never changed) that is not in the catalog yet:
//   - its picture for the site, public/images/stickere/<id>.webp: cut out
//     with a white outline and a small shadow (scripts/sticker-outline.py,
//     WIDTH px wide)
//   - an entry at the end of the catalog:
//       nume       the file name without .png, cleaned (see cleanName):
//                  "POFTA_SUGACI STICKER 7X7 2.png" -> "Pofta sugaci"
//       id         the name without diacritics, small letters, with dashes
//                  ("Pofta Fața" -> "pofta-fata"); holographic ones end
//                  in -holo
//       fisier     the original's file name
//       categorie  "normale" or "holografice" (its folder)
//       stoc       "da" | "epuizat" | "ascuns" (ascuns: not on the site)
//       imagine    the picture's address on the site
//       latime, inaltime  the picture's size in px
//     and optionally (written by hand) pret: in lei; without it, the
//     category's price (src/lib/catalog.ts).
// Entries already in the catalog are left exactly as they are (edited by
// hand: names, stock, prices); only a picture that is missing is made again.
// Needs Python 3 with numpy and Pillow (pip install numpy pillow); its
// command: PYTHON, else python (Windows) / python3.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE = "assets-src/stickere";
const CATEGORIES = ["normale", "holografice"];
const OUT_DIR = "public/images/stickere";
const CATALOG = "src/data/stickere.json";
const WIDTH = 480; // px: ~2x the biggest a sticker is shown on a phone
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

function makePicture(source, out) {
  execFileSync(PYTHON, ["scripts/sticker-outline.py", source, out, String(WIDTH)], { stdio: "inherit" });
}

const catalog = existsSync(CATALOG) ? JSON.parse(readFileSync(CATALOG, "utf8")) : [];
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(CATALOG), { recursive: true });

const known = new Set(catalog.map((s) => `${s.categorie}/${s.fisier}`));
const ids = new Set(catalog.map((s) => s.id));
let added = 0;

// Pictures of entries already there that went missing: made again.
for (const s of catalog) {
  const out = path.join("public", s.imagine);
  const source = path.join(SOURCE, s.categorie, s.fisier);
  if (!existsSync(out) && existsSync(source)) {
    console.log(`(again) ${s.id}`);
    makePicture(source, out);
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
    const [latime, inaltime] = webpSize(out);
    catalog.push({ id, fisier, nume, categorie, stoc: "da", imagine: `/images/stickere/${id}.webp`, latime, inaltime });
    added++;
  }
}

writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
console.log(`${CATALOG}: ${catalog.length} stickers (${added} new)`);
