import { theme } from "@/config/theme";

const { scatter } = theme.album.stickerBags.open;

// Where a sticker lands on the page: its middle, its turn, the side of the
// square it fits in (all in the reference's px, see StickerBags).
export type Spot = { x: number; y: number; rotation: number; size: number };

// A number in [0, 1) that looks random but is always the same for the same
// i: the stickers land in the same places every time.
const noise = (i: number) => {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// Spreads n stickers over the free part of the page (scatter): a grid with
// as many columns as suit the area's shape, of square cells as big as fit
// (as wide as the area, or less if the rows would not fit in its height),
// the last row centred; the group centred on the page's middle, kept inside
// the area (above the small bag and the button). Each sticker as big as its
// cell allows (up to maxSize: few stickers come out bigger), moved a little
// off its cell's middle and turned, so they look thrown rather than lined
// up. Neighbours never overlap by more than the small jitter and turn.
export function scatterSpots(n: number): Spot[] {
  if (n <= 0) return [];
  const width = scatter.right - scatter.left;
  const height = scatter.bottom - scatter.top;
  const cols = Math.max(1, Math.min(n, Math.ceil(Math.sqrt((n * width) / height))));
  const rows = Math.ceil(n / cols);
  const cell = Math.min(width / cols, height / rows);
  const gridW = cols * cell;
  const gridH = rows * cell;
  const left = scatter.left + (width - gridW) / 2;
  const top = Math.min(Math.max(scatter.middle - gridH / 2, scatter.top), scatter.bottom - gridH);
  const size = Math.min(scatter.maxSize, cell * scatter.fill);
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = row === rows - 1 ? n - row * cols : cols;
    const x = left + (col + 0.5 + (cols - inRow) / 2) * cell;
    const y = top + (row + 0.5) * cell;
    return {
      x: x + (noise(i) - 0.5) * 2 * scatter.jitter * cell,
      y: y + (noise(i + 100) - 0.5) * 2 * scatter.jitter * cell,
      rotation: scatter.rotations[i % scatter.rotations.length],
      size,
    };
  });
}
