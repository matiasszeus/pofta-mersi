import { theme } from "@/config/theme";

const { cover, thickness, boardEdge, book, spreadMinWidth, offsetY } = theme.album;

// The cover's height / width (from its picture).
export const coverRatio = cover.height / cover.width;

// The whole closed book (cover, the stack of pages showing right of and
// below it, the board around that), for a cover this wide.
export function bookSize(coverWidth: number) {
  return {
    width: coverWidth * (1 + thickness + boardEdge),
    height: coverWidth * (coverRatio + thickness + boardEdge),
  };
}

// The open book on a screen of this size, in CSS px from the top-left
// corner: the closed book's box (left, top, width, height) centred, as big
// as `book` in theme.ts allows, and the cover's width. spread = wide screen:
// open, the cover lies left of the pages, and the book slides half a cover
// to the right so the two are centred.
export type AlbumLayout = {
  spread: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  coverWidth: number;
};

export function albumLayout(screenWidth: number, screenHeight: number): AlbumLayout {
  const spread = screenWidth >= spreadMinWidth;
  const one = bookSize(1);
  // Width taken by a cover 1px wide: the closed book, or (spread) the open
  // cover plus the closed book.
  const across = spread ? 1 + one.width : one.width;
  const coverWidth = Math.min(
    (screenWidth - 2 * book.sideMargin) / across,
    book.maxWidth,
    ((book.maxHeightVh / 100) * screenHeight) / one.height,
  );
  const { width, height } = bookSize(coverWidth);
  return {
    spread,
    left: (screenWidth - width) / 2,
    top: (screenHeight - height) / 2 + offsetY * screenHeight,
    width,
    height,
    coverWidth,
  };
}
