// Texts shown on the site, in one place so they are easy to change.

import { palette } from "./theme";

// One page of a chapter (after its divider). Besides its id, all optional:
//   subtitle  under the chapter's title, top left
//   models    photos stuck on the page, each a looping video (made by
//             scripts/prepare-videos.mjs; poster: its first frame) with
//             its name and price under it, in the white frame
//   note      a handwritten note under the photos, with a small arrow
export type AlbumModel = { name: string; price: string; video: string; poster: string; alt: string };
export type AlbumPageContent = { id: string; subtitle?: string; models?: AlbumModel[]; note?: string };

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
            subtitle: "personalizate de mână · 2 modele",
            models: [
              {
                name: "Model 1",
                price: "[preț]",
                video: "/videos/bratari/model-1.mp4",
                poster: "/videos/bratari/model-1.webp",
                alt: "Brățara model 1, rotindu-se",
              },
              {
                name: "Model 2",
                price: "[preț]",
                video: "/videos/bratari/model-2.mp4",
                poster: "/videos/bratari/model-2.webp",
                alt: "Brățara model 2, rotindu-se",
              },
            ],
            note: "[ce se poate personaliza: nume, culori…]",
          },
        ],
      },
      { id: "tricouri", title: "Tricouri", pages: [] },
      { id: "tote-bags", title: "Tote bags", pages: [] },
    ] as AlbumChapter[],
  },
};
