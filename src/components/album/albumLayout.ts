import { theme } from "@/config/theme";

const { book, spreadMinWidth, offsetY, rim } = theme.album;

// Where the closed book goes on a screen of this size, in CSS px from the
// top-left corner: centred, as big as `book` in theme.ts allows. spread =
// wide screen: two pages side by side once it is open.
export type AlbumLayout = { spread: boolean; left: number; top: number; width: number; height: number; rim: number };

export function albumLayout(screenWidth: number, screenHeight: number): AlbumLayout {
  const spread = screenWidth >= spreadMinWidth;
  const room = (screenWidth - 2 * book.sideMargin) / (spread ? 2 : 1);
  const width = Math.min(room, book.maxWidth, ((book.maxHeightVh / 100) * screenHeight) / book.ratio);
  const height = width * book.ratio;
  return {
    spread,
    left: (screenWidth - width) / 2,
    top: (screenHeight - height) / 2 + offsetY * screenHeight,
    width,
    height,
    rim: Math.round(width * rim),
  };
}
