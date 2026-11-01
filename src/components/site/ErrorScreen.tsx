import { MatBackground } from "@/components/atelier/MatBackground";
import { content } from "@/config/content";
import { theme } from "@/config/theme";

// The error pages' look (app/not-found.tsx, app/error.tsx,
// app/global-error.tsx): the atelier's green mat, the atelier note's paper
// in the middle with a handwritten line, and under it "înapoi la atelier"
// (a plain link: it loads the atelier afresh, whatever broke) and, for an
// error, "reîncearcă" (onRetry). Only plain HTML and CSS: it must show even
// when the rest of the site does not work.
const note = theme.atelier.note.paper;
const look = theme.errorScreen;
const pill = "inline-flex min-h-11 items-center rounded-full px-5 text-base shadow";

export function ErrorScreen({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <MatBackground />
      <div
        className="relative flex items-center justify-center"
        style={{
          width: `min(${look.width}px, 86vw)`,
          aspectRatio: `${note.width} / ${note.height}`,
          rotate: `${look.rotation}deg`,
          backgroundImage: `url(${note.src})`,
          backgroundSize: "100% 100%",
        }}
      >
        <p
          className="px-[16%] pt-[10%] text-center leading-tight"
          style={{ color: look.ink, fontSize: look.textSize }}
        >
          {text}
        </p>
      </div>
      <div className="relative flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className={`${pill} cursor-pointer bg-white/90 text-black`}>
            {content.errors.retry}
          </button>
        )}
        {/* A plain link on purpose: the atelier loads afresh. */}
        <a href="/atelier" className={`${pill} bg-white/90 text-black`}>
          {content.errors.backToAtelier}
        </a>
      </div>
    </main>
  );
}
