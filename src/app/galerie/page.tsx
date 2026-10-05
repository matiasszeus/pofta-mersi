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
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center"
      style={{
        background: theme.transition.color,
        color: theme.hint.color,
        // Continues the hero's fade: the content appears out of the same color.
        animation: `fade-in ${theme.transition.duration}s ease both`,
      }}
    >
      <PageBackground color={theme.transition.color} />
      <h1 className="text-4xl font-bold tracking-wide">Galerie</h1>
      <p className="text-sm uppercase tracking-widest opacity-70">în curând</p>
      {/* TODO: point this at "/" once the hero moves to the landing page. */}
      <Link href="/lab" className="mt-6 text-sm underline underline-offset-4">
        ← înapoi
      </Link>
    </main>
  );
}
