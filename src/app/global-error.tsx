"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { hankenGrotesk, whitenice } from "./fonts";
import "./globals.css";

// An error in the root layout itself: this replaces the whole page, so it
// brings its own <html> and <body> (and the fonts and styles).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="ro" className={`${whitenice.variable} ${hankenGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full" style={{ background: theme.atelier.background }}>
        <ErrorScreen text={content.errors.error} onRetry={reset} />
      </body>
    </html>
  );
}
