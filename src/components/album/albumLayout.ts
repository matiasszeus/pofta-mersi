import { theme } from "@/config/theme";
import { stableViewport } from "@/lib/stableViewport";

const { page, spreadMinWidth, spreadWidth, unitWidth, ribbon, board, opening, tabs, thickness, coverParts } = theme.album;

// How far the book reaches past its pages sideways (u): on the right the
// stack of pages and the board, and the tabs further still; on the left
// only the open cover's edge. So centring the pages alone leaves less room
// on the right than on the left.
const reachRight = Math.max(tabs.width, board.beyond + thickness);
const reachLeft = coverParts.over;

// The part of the screen you can actually see, in CSS px. Usually the whole
// window; in some in-app browsers (Instagram) the window is taller than
// what shows between their bars: visualViewport tells the visible part.
export type ViewBox = { left: number; top: number; width: number; height: number };

// As measured at zoom 1 (see stableViewport): pinch-zoomed in,
// visualViewport is only the zoomed-in piece; the book keeps its size and
// place.
export const visibleBox = (): ViewBox => stableViewport().box;

// Where the open book's page goes in that visible part, in CSS px from the
// window's top-left corner: as big as `page` in theme.ts allows, centred
// across, and up and down with the same free space above the board and
// below the ribbon (the book's top and bottom). u = px per "u" (see
// theme.album). spread = wide screen: the book then slides half a page
// right as it opens, so the open cover and the page are centred together.
// `top` is where the page is before the opening's last small move
// (flight.settled.y), so that once open it ends up centred.
//
// Sideways, the open book is placed by how far it reaches (see reachRight):
//   shiftSpread  wide screens: px the two pages move (left), so the whole
//                book (cover's edge to the tabs) is centred
//   shiftRight / shiftLeft  phones: px a right / a left page moves from the
//                middle, so the book's outer edge is equally far from the
//                screen's edge on both (the right page's tabs as far from
//                the right edge as the left page's cover from the left)
export type AlbumLayout = {
  spread: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
  u: number;
  shiftSpread: number;
  shiftRight: number;
  shiftLeft: number;
};

export function albumLayout(view: ViewBox): AlbumLayout {
  const spread = view.width >= spreadMinWidth;
  // Above the page the board shows, below it the ribbon hangs: per px of
  // the page's width.
  const abovePerWidth = board.top / unitWidth;
  const belowPerWidth = ribbon.below / unitWidth;
  const width = Math.min(
    spread
      ? (view.width - 2 * page.sideMargin) / spreadWidth
      : // A right page with its tabs, outerMargin from both edges.
        (view.width - 2 * page.outerMargin) / (1 + reachRight / unitWidth),
    page.maxWidth,
    ((page.maxHeightVh / 100) * view.height) / page.ratio,
    // The whole book (board to ribbon) fits, with marginY above and below.
    (view.height - 2 * page.marginY) / (page.ratio + abovePerWidth + belowPerWidth),
  );
  const height = width * page.ratio;
  // From the board's top to the ribbon's tip.
  const bookHeight = height + width * (abovePerWidth + belowPerWidth);
  const pageTop = view.top + (view.height - bookHeight) / 2 + width * abovePerWidth;
  // Once open the book sits `settled.y` lower / higher than `top` (see
  // opening.flight; given for a 340px wide page).
  const settledY = (opening.flight.settled.y * width) / 340;
  const u = width / unitWidth;
  const left = view.left + (view.width - width) / 2;
  // Phones: the free space at the outer edge, the same for both kinds of
  // page: a right page with its tabs is centred, and a left page keeps
  // that much space left of its cover's edge.
  const gap = (view.width - width - reachRight * u) / 2;
  return {
    spread,
    left,
    top: pageTop - settledY,
    width,
    height,
    u,
    shiftSpread: (-(reachRight - reachLeft) / 2) * u,
    shiftRight: view.left + gap - left,
    shiftLeft: view.left + gap + reachLeft * u - left,
  };
}
