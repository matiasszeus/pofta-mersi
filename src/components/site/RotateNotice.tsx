import { content } from "@/config/content";
import { theme } from "@/config/theme";

// A phone held sideways: a screen over the whole site asking to hold it
// upright (a web page cannot stop the screen from turning). Phones only:
// wider than tall, at most maxHeight px tall (tablets are taller, and
// sideways is normal for them) and touch as the main input ("pointer:
// coarse", so a small desktop window never gets it). Pure CSS (a media
// query), no JavaScript: right from the first frame, and gone the moment
// the phone is upright again. The site keeps running underneath.
const { background, color, accent, maxHeight, iconSize, textSize, turn } = theme.rotateNotice;

const css = `
.rotate-notice { display: none; }
@media (orientation: landscape) and (max-height: ${maxHeight}px) and (pointer: coarse) {
  .rotate-notice { display: flex; }
}
/* The phone in the icon: lying sideways, turns upright, waits, again. */
@keyframes rotate-notice-turn {
  0%, 20% { transform: rotate(-90deg); }
  55%, 100% { transform: rotate(0deg); }
}
.rotate-notice-icon { animation: rotate-notice-turn ${turn}s ease-in-out infinite alternate; }
`;

export function RotateNotice() {
  return (
    <>
      <style>{css}</style>
      <div
        className="rotate-notice fixed inset-0 z-[1000] flex-col items-center justify-center gap-5 text-center"
        style={{ background, color }}
      >
        <svg
          className="rotate-notice-icon"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
          <path d="M10.5 18.5h3" stroke={accent} />
        </svg>
        <p style={{ fontSize: textSize }}>{content.rotateNotice}</p>
      </div>
    </>
  );
}
