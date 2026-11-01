// Texts shown on the site, in one place so they are easy to change.

import { palette } from "./theme";

// One page of a chapter (after its divider). Besides its id, all optional:
//   title     false = without the chapter's title top left (when the
//             divider facing it already shows it)
//   subtitle  under the chapter's title, top left (without the title: a
//             little bigger, in its place)
//   models    photos stuck on the page, each a looping video (made by
//             scripts/prepare-videos.mjs; poster: its first frame) with
//             the product's name under it, in the white frame. product:
//             its id in src/config/products.ts (name and price come from
//             there)
//   priceTag  a tag: `title` big, `unit` small in its bottom-right corner
//   note      a handwritten note under the photos, with a small arrow
export type AlbumModel = { product: string; video: string; poster: string; alt: string };
export type AlbumPageContent = {
  id: string;
  title?: boolean;
  subtitle?: string;
  models?: AlbumModel[];
  priceTag?: { title: string; unit: string };
  note?: string;
};

// One chapter of the album (see album.chapters below).
export type AlbumChapter =
  | { id: string; title: string; contents: true }
  | { id: string; title: string; contents?: false; color?: string; blurb?: string; pages: AlbumPageContent[] };

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
        blurb: "[o frază despre stickere]",
        pages: [{ id: "stickere-1" }],
      },
      {
        id: "bratari",
        title: "Brățări",
        color: palette.sage,
        blurb: "[o frază despre brățări]",
        pages: [
          {
            id: "bratari-1",
            title: false,
            models: [
              {
                product: "bratara-basalt",
                video: "/videos/bratari/model-1.mp4",
                poster: "/videos/bratari/model-1.webp",
                alt: "Brățara Basalt, rotindu-se",
              },
              {
                product: "bratara-synthesis",
                video: "/videos/bratari/model-2.mp4",
                poster: "/videos/bratari/model-2.webp",
                alt: "Brățara Synthesis, rotindu-se",
              },
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
