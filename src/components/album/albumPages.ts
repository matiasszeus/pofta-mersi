import { content, type AlbumChapter, type AlbumCredit, type AlbumOffer, type AlbumPageContent } from "@/config/content";
import { theme } from "@/config/theme";

// Everything about the book's pages, worked out from the one list of
// chapters (content.album.chapters): nothing else lists them.

// A title as Craze Retro can draw it: capitals, no diacritics
// ("Brățări" -> "BRATARI"). NFD splits "ă" into "a" + a breve mark.
export const drawnTitle = (title: string) =>
  title.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
// Its name under the book: "brățări".
export const shortName = (title: string) => title.toLowerCase();

type Chapter = Exclude<AlbumChapter, { contents: true }>;
const isChapter = (c: AlbumChapter): c is Chapter => !c.contents;
const colorOf = (c: Chapter) => c.color ?? theme.album.colors.divider;

// One page of the book. number: from 1, the contents' first.
//   contents  the contents page
//   divider   a chapter's first page: its title big, and the blurb
//   page      one of a chapter's pages
//   blank     paper only: makes the count odd (see below)
export type BookPage =
  | { kind: "contents"; number: number; chapterId: string }
  | {
      kind: "divider";
      number: number;
      chapterId: string;
      title: string;
      blurb?: string;
      accent?: string;
      oferta?: AlbumOffer;
      credit?: AlbumCredit;
      color: string;
    }
  | { kind: "page"; number: number; chapterId: string; title: string; content: AlbumPageContent }
  | { kind: "blank"; number: number; chapterId: null };

function buildPages(): BookPage[] {
  const list: BookPage[] = [];
  const next = () => list.length + 1;
  for (const c of content.album.chapters) {
    if (c.contents) {
      list.push({ kind: "contents", number: next(), chapterId: c.id });
    } else if (c.pages.length > 0) {
      list.push({
        kind: "divider",
        number: next(),
        chapterId: c.id,
        title: c.title,
        blurb: c.blurb,
        accent: c.accent,
        oferta: c.oferta,
        credit: c.credit,
        color: colorOf(c),
      });
      for (const p of c.pages) list.push({ kind: "page", number: next(), chapterId: c.id, title: c.title, content: p });
    }
  }
  // Page 1 lies on the right, and so does every odd page: with an odd
  // count the last page lies on the right too, under all the sheets.
  if (list.length % 2 === 0) list.push({ kind: "blank", number: next(), chapterId: null });
  return list;
}

export const bookPages = buildPages();

// The sheets that turn: sheet s has page 2s+1 on its front (right) and
// 2s+2 on its back (left). The last page is no sheet: it lies under them.
export const sheets = Array.from({ length: (bookPages.length - 1) / 2 }, (_, s) => ({
  front: bookPages[2 * s],
  back: bookPages[2 * s + 1],
}));
export const lastPage = bookPages[bookPages.length - 1];

// The contents: every chapter but the contents itself, with the page it
// starts on (null = not in the book yet: "în curând").
const contentsChapter = content.album.chapters.find((c) => c.contents);
export const contentsTitle = drawnTitle(contentsChapter?.title ?? "");
export const contentsId = contentsChapter?.id ?? "";
export const contentsRows = content.album.chapters.filter(isChapter).map((c) => ({
  id: c.id,
  name: c.title,
  title: drawnTitle(c.title),
  color: colorOf(c),
  page: bookPages.find((p) => p.kind === "divider" && p.chapterId === c.id)?.number ?? null,
}));

// The tabs on the edge: the contents and the chapters in the book, top to
// bottom in their order; a tap leafs there (MatAlbum's goToChapter). top: in u (see theme.album.tabs).
const { tabs } = theme.album;
// The contents first (its own color), then the chapters in the book.
export const bookTabs = content.album.chapters
  .filter((c) => c.contents || c.pages.length > 0)
  .map((c, i) => ({
    id: c.id,
    name: c.title,
    title: drawnTitle(c.title),
    color: c.contents ? theme.album.colors.contentsTab : colorOf(c),
    top: tabs.top + i * tabs.step,
  }));
// u from the page's top to the last tab's bottom (0: no tabs).
export const tabsBottom = bookTabs.length ? bookTabs[bookTabs.length - 1].top + tabs.height : 0;

// What can be on the screen once the book is open, in order (the buttons go
// from one to the next):
//   turned  how many sheets are turned (lie on the left)
//   side    phones show one page at a time: the left or the right one
//           (the book slides one page width to show the left one)
//   pages   the page numbers on the screen
//   label   shown between the buttons
// Phones: every page by itself. Wide screens: the cover's inside with the
// contents, then two pages at a time.
export type AlbumView = { turned: number; side: "left" | "right"; pages: number[]; label: string };

const chapterName = new Map(content.album.chapters.map((c) => [c.id, shortName(c.title)]));
// "2–3 · stickere": the pages and the chapters they belong to.
function labelFor(numbers: number[]) {
  const shown = numbers.filter((n) => bookPages[n - 1].kind !== "blank");
  const names = [...new Set(shown.map((n) => chapterName.get(bookPages[n - 1].chapterId ?? "")))];
  const range = shown.length > 1 ? `${shown[0]}–${shown[shown.length - 1]}` : `${shown[0]}`;
  return `${range} · ${names.join(", ")}`;
}

function buildViews(spread: boolean): AlbumView[] {
  const views: AlbumView[] = [];
  if (spread) {
    // Left page 2k (0: the cover's inside), right page 2k+1.
    for (let k = 0; k <= sheets.length; k++) {
      const pages = [2 * k, 2 * k + 1].filter((n) => n >= 1);
      views.push({ turned: k, side: "right", pages, label: labelFor(pages) });
    }
  } else {
    for (const p of bookPages) {
      if (p.kind === "blank") continue;
      const left = p.number % 2 === 0;
      views.push({ turned: Math.floor(p.number / 2), side: left ? "left" : "right", pages: [p.number], label: labelFor([p.number]) });
    }
  }
  return views;
}

const views = { spread: buildViews(true), phone: buildViews(false) };
export const albumViews = (spread: boolean) => (spread ? views.spread : views.phone);

// The view showing this page number (the nearest one before it if none).
export function viewWithPage(pageNumber: number, spread: boolean) {
  const list = albumViews(spread);
  const i = list.findIndex((v) => v.pages.includes(pageNumber));
  return i >= 0 ? i : list.length - 1;
}

// The page a chapter starts on (its divider, or the contents); 1 if it is
// not in the book.
export const firstPageOf = (chapterId: string) =>
  bookPages.find((p) => p.chapterId === chapterId)?.number ?? 1;
