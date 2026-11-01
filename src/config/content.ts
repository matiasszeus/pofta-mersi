// Texts shown on the site, in one place so they are easy to change.

export const content = {
  // The handwritten note on the atelier mat. Shown tiny (unreadable) on the
  // mat, and full size when tapped. Each string is one paragraph.
  atelierNote: [
    "Acest concept este pentru tine – cel care simte in adancul sufletului ca e facut pentru ceva maret. Este pentru cei care au curajul sa viseze si determinarea sa-si atinga scopurile.",
    "Autenticitatea inseamna sa fii fidel lui cine esti, chiar si atunci cand toti cei din jurul tau vor fi altcineva.",
  ],


  // The album. Titles are in Craze Retro, which has only A–Z: no diacritics.
  album: {
    coverTitle: "ALBUM",
    contentsTitle: "CUPRINS",
    soon: "în curând",
    // The sections, in the order of the contents page. page: the page number
    // it starts on; null = not there yet ("în curând").
    sections: [
      { key: "stickere", title: "STICKERE", page: 2 },
      { key: "bratari", title: "BRATARI", page: 4 },
      { key: "tricouri", title: "TRICOURI", page: null },
      { key: "tote-bags", title: "TOTE BAGS", page: null },
    ] as { key: string; title: string; page: number | null }[],
    // The book's parts you can leaf to, in order. id: stable, never
    // changed (later each gets its address, /album/<id>, and the book can
    // open right there); label: shown under the book. A chapter has a
    // divider page (its title big, and the blurb) and then its first page.
    pages: [
      { id: "cuprins", label: "cuprins" },
      { id: "stickere", label: "stickere", title: "STICKERE", blurb: "[o frază despre stickere]" },
    ] as { id: string; label: string; title?: string; blurb?: string }[],
  },
};
