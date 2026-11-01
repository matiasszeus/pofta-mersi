import { theme } from "@/config/theme";
import { u, uCss } from "./albumUnits";

// How a tag looks and where it hangs (see theme.album.priceTag); a page can
// change any of it.
export type TagLook = typeof theme.album.priceTag;

type PriceTagProps = {
  big: string;
  small: string;
  look?: Partial<TagLook>;
};

// A tag hanging on a page of the album: a mustard label pointed on the
// left, turned, with a small hole in the tip and a thin thread from it
// curving up-left. `big` at its top, `small` in its bottom-right corner.
// The label's shape is a clip-path (which would cut a box-shadow off), so
// its shadow is a drop-shadow on the box around it.
export function PriceTag({ big, small, look }: PriceTagProps) {
  const tag = { ...theme.album.priceTag, ...look };
  const tipX = tag.tip * tag.width;
  const hole = { x: tipX * 0.62, y: tag.height / 2 };
  // The thread: from the hole, curving up and to the left, `reach` u (in
  // the tag's own units, before its turn).
  const r = tag.thread.reach;
  const thread = `M ${hole.x} ${hole.y} C ${hole.x - r * 0.3} ${hole.y - r * 0.12}, ${hole.x - r * 0.65} ${hole.y - r * 0.6}, ${hole.x - r} ${hole.y - r}`;
  return (
    <div
      className="absolute"
      style={{
        left: u(tag.left),
        top: u(tag.top),
        width: u(tag.width),
        height: u(tag.height),
        rotate: `${tag.rotation}deg`,
        filter: `drop-shadow(${uCss(tag.shadow)})`,
      }}
    >
      <div
        className="absolute inset-0 leading-none"
        style={{
          background: tag.color,
          clipPath: `polygon(${tag.tip * 100}% 0, 100% 0, 100% 100%, ${tag.tip * 100}% 100%, 0 50%)`,
        }}
      >
        <span
          className="absolute text-center"
          style={{ left: u(tipX), right: 0, top: u(tag.titleTop), fontSize: u(tag.titleSize) }}
        >
          {big}
        </span>
        <span
          className="absolute whitespace-nowrap"
          style={{ right: u(tag.unitRight), bottom: u(tag.unitBottom), fontSize: u(tag.unitSize), opacity: tag.unitOpacity }}
        >
          {small}
        </span>
      </div>
      <div
        className="absolute rounded-full"
        style={{
          left: u(hole.x - tag.hole.size / 2),
          top: u(hole.y - tag.hole.size / 2),
          width: u(tag.hole.size),
          height: u(tag.hole.size),
          background: tag.hole.color,
        }}
      />
      <svg
        aria-hidden
        className="absolute overflow-visible"
        style={{ left: 0, top: 0, width: u(tag.width), height: u(tag.height) }}
        viewBox={`0 0 ${tag.width} ${tag.height}`}
        fill="none"
      >
        <path
          d={thread}
          stroke={tag.thread.color}
          strokeOpacity={tag.thread.opacity}
          strokeWidth={tag.thread.width}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
