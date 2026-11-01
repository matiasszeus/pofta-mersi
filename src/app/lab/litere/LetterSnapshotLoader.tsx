"use client";

import dynamic from "next/dynamic";

// WebGL only exists in the browser: the snapshot is never rendered on the server.
const LetterSnapshot = dynamic(() => import("@/components/atelier/LetterSnapshot"), { ssr: false });

export function LetterSnapshotLoader() {
  return <LetterSnapshot />;
}
