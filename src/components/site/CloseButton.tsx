import type { Ref } from "react";
import { theme } from "@/config/theme";

// Where it sits: the top-right corner of the screen (below a phone's notch).
export const closeCorner = "fixed top-[max(env(safe-area-inset-top),12px)] right-3";

// The one close button of the site: a dark round button with a cream X
// (two lines, SVG). The open album, its photos' big view, the stickers'
// card and the cart all close with it (see theme.album.closeButton); a tap
// beside them and Escape close them too. `label`: what screen readers say.
export function CloseButton({ onClick, label, ref }: { onClick: () => void; label: string; ref?: Ref<HTMLButtonElement> }) {
  const { size, background, color, iconSize, lineWidth } = theme.album.closeButton;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex cursor-pointer items-center justify-center rounded-full border-0 p-0"
      style={{ width: size, height: size, background, color }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={lineWidth}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    </button>
  );
}
