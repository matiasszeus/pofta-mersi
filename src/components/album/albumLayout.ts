import { theme } from "@/config/theme";

const { page, spreadMinWidth, spreadWidth, offsetY, unitWidth } = theme.album;

// Where the open book's page goes on a screen of this size, in CSS px from
// the top-left corner: centred (a little above the middle), as big as
// `page` in theme.ts allows. u = px per "u" (see theme.album). spread =
// wide screen: the book then slides half a page right as it opens, so the
// open cover and the page are centred together.
export type AlbumLayout = {
  spread: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  u: number;
};

export function albumLayout(screenWidth: number, screenHeight: number): AlbumLayout {
  const spread = screenWidth >= spreadMinWidth;
  const width = Math.min(
    (screenWidth - 2 * page.sideMargin) / (spread ? spreadWidth : 1),
    page.maxWidth,
    ((page.maxHeightVh / 100) * screenHeight) / page.ratio,
  );
  const height = width * page.ratio;
  return {
    spread,
    left: (screenWidth - width) / 2,
    top: (screenHeight - height) / 2 + offsetY * screenHeight,
    width,
    height,
    u: width / unitWidth,
  };
}
