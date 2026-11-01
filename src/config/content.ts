// Texts shown on the site, in one place so they are easy to change.

import { palette } from "./theme";

// One chapter of the album (see album.chapters below).
export type AlbumChapter =
  | { id: string; title: string; contents: true }
  | { id: string; title: string; contents?: false; color?: string; blurb?: string; pages: { id: string }[] };

export const content = {
  // The handwritten note on the atelier mat. Shown tiny (unreadable) on the
  // mat, and full size when tapped. Each string is one paragraph.
  atelierNote: [
    "Acest concept este pentru tine – cel care simte in adancul sufletului ca e facut pentru ceva maret. Este pentru cei care au curajul sa viseze si determinarea sa-si atinga scopurile.",
    "Autenticitatea inseamna sa fii fidel lui cine esti, chiar si atunci cand toti cei din jurul tau vor fi altcineva.",
  ],


  // The album.
  album: {
    coverTitle: "ALBUM",
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
    //   pages  its pages after the divider (their stickers come later);
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
        pages: [{ id: "bratari-1" }],
      },
      { id: "tricouri", title: "Tricouri", pages: [] },
      { id: "tote-bags", title: "Tote bags", pages: [] },
    ] as AlbumChapter[],
  },
};
