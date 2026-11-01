import type { Viewport } from "next";
import { MatBackground } from "@/components/atelier/MatBackground";
import { PageTitle } from "@/components/site/PageTitle";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { theme } from "@/config/theme";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.atelier.background,
};

// Placeholder: the album with the stickers will come here.
export default function AlbumPage() {
  return (
    <main className="relative min-h-dvh">
      <MatBackground />
      <SiteHeader />
      <PageTitle>ALBUM</PageTitle>
      <SiteFooter />
    </main>
  );
}
