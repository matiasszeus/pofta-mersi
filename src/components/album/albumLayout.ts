import { content } from "@/config/content";
import { theme } from "@/config/theme";

const { page, spreadMinWidth, spreadWidth, offsetY, unitWidth, ribbon, opening, pages } = theme.album;
const { controls } = pages;

// Where the open book's page goes on a screen of this size, in CSS px from
// the top-left corner: centred (a little above the middle), as big as
// `page` in theme.ts allows, leaving room under it for the buttons
// (controlsTop: where they go). u = px per "u" (see theme.album). spread =
// wide screen: the book then slides half a page right as it opens, so the
// open cover and the page are centred together.
export type AlbumLayout = {
  spread: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  u: number;
  controlsTop: number;
};

export function albumLayout(screenWidth: number, screenHeight: number): AlbumLayout {
  const spread = screenWidth >= spreadMinWidth;
  // Under the page, per px of its width: the ribbon hanging out; then the
  // buttons and the free margin under them, in px.
  const ribbonPerWidth = ribbon.below / unitWidth;
  const buttons = controls.gap + controls.button + controls.margin;
  const width = Math.min(
    (screenWidth - 2 * page.sideMargin) / (spread ? spreadWidth : 1),
    page.maxWidth,
    ((page.maxHeightVh / 100) * screenHeight) / page.ratio,
    // Book, ribbon and buttons fit the screen's height.
    (screenHeight - controls.margin - buttons) / (page.ratio + ribbonPerWidth),
  );
  const height = width * page.ratio;
  // Once open the book sits `settled.y` lower / higher than `top` (see
  // opening.flight; given for a 340px wide page).
  const settledY = (opening.flight.settled.y * width) / 340;
  const below = width * ribbonPerWidth + buttons;
  // A little above the middle; higher if the buttons would not fit under it.
  const top = Math.min(
    (screenHeight - height) / 2 + offsetY * screenHeight,
    screenHeight - below - height - settledY,
  );
  return {
    spread,
    left: (screenWidth - width) / 2,
    top,
    width,
    height,
    u: width / unitWidth,
    controlsTop: top + settledY + height + width * ribbonPerWidth + controls.gap,
  };
}

// What can be on the screen once the book is open, in order (the buttons go
// from one to the next):
//   flipped  the sheet with the contents is turned (lies on the left)
//   side     phones show one page at a time: the left or the right one
//            (the book slides one page width to show the left one)
//   page     which part of the book it is (an id from content.album.pages)
//   label    shown between the buttons
// Phones: 1 contents, 2 the stickers' divider, 3 the stickers' first page.
// Wide screens: 1 the cover's inside + contents, 2-3 divider + first page.
export type AlbumView = { flipped: boolean; side: "left" | "right"; page: string; label: string };

export function albumViews(spread: boolean): AlbumView[] {
  const [contents, chapter] = content.album.pages;
  if (spread) {
    return [
      { flipped: false, side: "right", page: contents.id, label: `1 · ${contents.label}` },
      { flipped: true, side: "right", page: chapter.id, label: `2–3 · ${chapter.label}` },
    ];
  }
  return [
    { flipped: false, side: "right", page: contents.id, label: `1 · ${contents.label}` },
    { flipped: true, side: "left", page: chapter.id, label: `2 · ${chapter.label}` },
    { flipped: true, side: "right", page: chapter.id, label: `3 · ${chapter.label}` },
  ];
}

// The first view showing this page (contents or a chapter's start).
export function viewOf(pageId: string, spread: boolean) {
  return Math.max(0, albumViews(spread).findIndex((v) => v.page === pageId));
}
