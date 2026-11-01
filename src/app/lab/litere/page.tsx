import type { Metadata } from "next";
import { LetterSnapshotLoader } from "./LetterSnapshotLoader";

// For scripts/letters-static.ts only: one atelier letter alone, to be
// photographed (see LetterSnapshot). Never linked from the site, kept out
// of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LetterSnapshotPage() {
  return <LetterSnapshotLoader />;
}
