import type { Metadata, Viewport } from "next";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { content } from "@/config/content";
import { theme } from "@/config/theme";

export const metadata: Metadata = { title: content.errors.notFoundTitle, robots: { index: false } };
export const viewport: Viewport = { themeColor: theme.atelier.background };

// Any address the site does not have (404).
export default function NotFound() {
  return <ErrorScreen text={content.errors.notFound} />;
}
