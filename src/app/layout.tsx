import type { Metadata, Viewport } from "next";
import { NoZoom } from "@/components/site/NoZoom";
import { theme } from "@/config/theme";
import { hankenGrotesk, whitenice } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "POFTA MERSI",
};

export const viewport: Viewport = {
  // "cover" = the page may draw under the iPhone's notch and home bar too;
  // without it Safari leaves empty bands at the top and bottom.
  viewportFit: "cover",
  // Tints the mobile browser's own bars.
  themeColor: theme.colors.background,
  // No zooming the page (the owner's decision; see NoZoom for the browsers
  // that ignore this).
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      // The fonts' CSS variables (--font-whitenice, --font-hanken...), used
      // by globals.css for all text.
      className={`${whitenice.variable} ${hankenGrotesk.variable} h-full antialiased`}
      style={{ background: theme.colors.background }}
      // Some in-app browsers (e.g. the Google app on iPhone) add their own
      // attributes to <html> before React starts; without this, React
      // reports that as an error. Only this element's own attributes are
      // ignored, nothing inside it.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" style={{ background: theme.colors.background }}>
        {children}
        <NoZoom />
      </body>
    </html>
  );
}
