import type { Viewport } from "next";
import { theme } from "@/config/theme";
import { LabHero } from "./LabHero";

// Tints the mobile browser's own bars (Safari, Chrome) to match the page.
export const viewport: Viewport = {
  themeColor: theme.colors.background,
};

export default function LabPage() {
  return <LabHero />;
}
