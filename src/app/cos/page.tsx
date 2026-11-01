import type { Viewport } from "next";
import Link from "next/link";
import { MatBackground } from "@/components/atelier/MatBackground";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { content } from "@/config/content";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// Placeholder: the cart's contents will come here. The title is in the
// text font (Craze Retro has no ș, ă).
export default function CartPage() {
  const { color, size, sizeLarge } = theme.pageTitle;
  return (
    <main className="relative min-h-dvh">
      <MatBackground />
      <SiteHeader />
      <div className="relative z-10 px-6 pt-8 md:px-12" style={{ color }}>
        <h1
          className="leading-none text-[length:var(--title)] md:text-[length:var(--title-large)]"
          style={{ "--title": `${size}px`, "--title-large": `${sizeLarge}px` } as React.CSSProperties}
        >
          {content.cart.title}
        </h1>
        <Link href="/atelier" className="mt-6 inline-flex min-h-11 items-center text-lg underline underline-offset-4">
          {content.cart.back}
        </Link>
      </div>
      <SiteFooter />
    </main>
  );
}
