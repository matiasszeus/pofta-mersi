// Texts shown on the site, in one place so they are easy to change.

import { palette } from "./theme";

// One page of a chapter (after its divider). Besides its id, all optional:
//   title     false = without the chapter's title top left (when the
//             divider facing it already shows it)
//   subtitle  under the chapter's title, top left (without the title: a
//             little bigger, in its place)
//   models    photos stuck on the page: the product's blurred picture,
//             and on a tap its video, big (both from
//             src/config/products.ts, like its name, under it on the white
//             frame). product: its id there; alt: what the picture shows,
//             for screen readers
//   priceTag  a tag: `title` big, `unit` small in its bottom-right corner
//   note      a handwritten note under the photos, with a small arrow
export type AlbumModel = { product: string; alt: string };
export type AlbumPageContent = {
  id: string;
  title?: boolean;
  subtitle?: string;
  models?: AlbumModel[];
  priceTag?: { title: string; unit: string };
  note?: string;
};

// The credit for a partner on a chapter's divider (the stickers' printer):
// a handwritten line (one string per line) and a link to their site, and
// a discount code at their shop, copied on a tap.
export type AlbumCredit = {
  text: string[];
  url: string;
  ariaLabel: string;
  cod: string;
  codLabel: string;
  copyLabel: string;
  copied: string;
};
// An offer on a chapter's divider, on a tag: big and small text.
export type AlbumOffer = { mare: string; mic: string };

// One chapter of the album (see album.chapters below).
export type AlbumChapter =
  | { id: string; title: string; contents: true }
  | {
      id: string;
      title: string;
      contents?: false;
      color?: string;
      blurb?: string;
      accent?: string;
      oferta?: AlbumOffer;
      credit?: AlbumCredit;
      pages: AlbumPageContent[];
    };

export const content = {
  // The handwritten note on the atelier mat. Shown tiny (unreadable) on the
  // mat, and full size when tapped. Each string is one paragraph.
  atelierNote: [
    "Acest concept este pentru tine – cel care simte in adancul sufletului ca e facut pentru ceva maret. Este pentru cei care au curajul sa viseze si determinarea sa-si atinga scopurile.",
    "Autenticitatea inseamna sa fii fidel lui cine esti, chiar si atunci cand toti cei din jurul tau vor fi altcineva.",
  ],


  // The cart: the calculator on the atelier's mat and the page /cos.
  cart: {
    title: "coșul tău",
    back: "← înapoi în atelier",
    // What screen readers say for the calculator (a link to /cos).
    // "1 produs", "2 produse", "20 de produse" (Romanian: "de" from 20 on,
    // except 101-119, 201-219...).
    calcLabel: (pieces: number, total: string) => {
      const rest = pieces % 100;
      const word = pieces === 1 ? "produs" : rest >= 20 || (rest === 0 && pieces > 0) ? "de produse" : "produse";
      return `Coșul tău: ${pieces} ${word}, total ${total} lei`;
    },
  },

  // The album.
  album: {
    coverTitle: "ALBUM",
    // A photo with a video in the album: what screen readers say for it
    // (it opens the big view), and for the big view itself.
    video: {
      open: (name: string) => `Pornește video ${name}`,
      dialog: (name: string) => `Video ${name}`,
    },
    // The buttons over the open album (replay: /lab/album only).
    close: "închide",
    replay: "reia animația",
    soon: "în curând",
    // The chapters, in the book's order: the only place it is written.
    // From this list come the pages and their numbers, the contents (each
    // chapter with the page it starts on), the tabs on the edge and the
    // buttons' leafing. Moving an entry moves all of that.
    //   id     stable, never changed (later each gets its address,
    //          /album/<id>, and the book can open right there)
    //   title  with diacritics; drawn in Craze Retro (A-Z only) without them
    //          and in capitals, shown under the book in small letters
    //   color  its divider page, its dot in the contents, its tab
    //   blurb  under the title on its divider
    //   accent optional: a word of the blurb, in color (theme.album.colors.accent)
    //   oferta optional: an offer on a tag on its divider (the discount
    //          itself is worked out in src/lib/cart.ts)
    //   credit optional: a partner's credit on its divider
    //          (oferta / credit: the divider has its title on the left, see
    //          theme.album.stickereDivider)
    //   pages  its pages after the divider (see AlbumPageContent above);
    //          none = not there yet: "în curând" in the contents, not in
    //          the book
    // contents: true = the contents page itself (one page, no divider).
    chapters: [
      { id: "cuprins", title: "Cuprins", contents: true },
      {
        id: "stickere",
        title: "Stickere",
        color: palette.lilac,
        oferta: { mare: "−20%", mic: "la 10+ stickere" },
        credit: {
          text: ["eu le creez,", "ei le printează ↗"],
          url: "https://etichetecreative.ro/",
          ariaLabel: "Etichete Creative, site",
          cod: "poftamersi10",
          codLabel: "cod de reducere la ei",
          copyLabel: "Copiază codul de reducere poftamersi10",
          copied: "copiat!",
        },
        pages: [{ id: "stickere-1" }],
      },
      {
        id: "bratari",
        title: "Brățări",
        color: palette.sage,
        blurb: "din material textil",
        accent: "textil",
        pages: [
          {
            id: "bratari-1",
            title: false,
            models: [
              { product: "bratara-basalt", alt: "Brățara Basalt" },
              { product: "bratara-synthesis", alt: "Brățara Synthesis" },
            ],
            priceTag: { title: "3 foi", unit: "/ buc" },
            note: "mai ieftin decât un pachet de țigări",
          },
        ],
      },
      { id: "tricouri", title: "Tricouri", pages: [] },
      { id: "tote-bags", title: "Tote bags", pages: [] },
    ] as AlbumChapter[],
  },
};
