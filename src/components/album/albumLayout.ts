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
