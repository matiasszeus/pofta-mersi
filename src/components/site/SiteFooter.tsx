import { content } from "@/config/content";
import { theme } from "@/config/theme";

// The small "© 2026 Pofta Mersi" at the bottom of the pages after the
// landing. Absolute: it sits on the bottom edge of the page (the parent must
// be "relative") without making a one-screen page taller. In the text font
// (Hanken Grotesk has the ©). env(safe-area-inset-bottom): above the
// iPhone's home bar. Only text, nothing to tap: taps go through it.
export function SiteFooter() {
  const { color, opacity, size } = theme.siteFooter;
  return (
    <footer
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 pb-[max(env(safe-area-inset-bottom),6px)] text-center leading-none"
      style={{ color, opacity, fontSize: size, fontFamily: "var(--font-hanken), sans-serif" }}
    >
      <small style={{ fontSize: "inherit" }}>{content.copyright}</small>
    </footer>
  );
}
