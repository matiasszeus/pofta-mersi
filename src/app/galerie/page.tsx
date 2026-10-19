import type { CSSProperties } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { PageBackground } from "@/components/PageBackground";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.transition.color,
};

// Placeholder until the real gallery exists.
export default function GaleriePage() {
  const { distance, duration, easing } = theme.galleryEnter;

  return (
    // The background is there from the very first frame, in exactly the color
    // the hero's dive ended on, so the switch between pages cannot be seen.
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ background: theme.transition.color, color: theme.hint.color }}
    >
      <PageBackground color={theme.transition.color} />
      {/* Only the content moves: it rises from below, continuing the dive.
          (enter-up and its reduced-motion fallback are in globals.css.) */}
      <div
        className="enter-up flex flex-col items-center gap-3"
        style={
          {
            "--enter-distance": distance,
            animation: `enter-up ${duration}s ${easing} both`,
          } as CSSProperties
        }
      >
        <h1 className="text-4xl font-bold tracking-wide">Galerie</h1>
        <p className="text-sm uppercase tracking-widest opacity-70">în curând</p>
        {/* TODO: point this at "/" once the hero moves to the landing page. */}
        <Link href="/lab" className="mt-6 text-sm underline underline-offset-4">
          ← înapoi
        </Link>
      </div>
    </main>
  );
}
