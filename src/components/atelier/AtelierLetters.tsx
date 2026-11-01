"use client";

import dynamic from "next/dynamic";
import type { MatObjectConfig } from "./objectLayout";

// WebGL only exists in the browser, so the canvas is never rendered on the
// server. Until it loads, the mat simply shows without letters.
const MatLettersCanvas = dynamic(() => import("./MatLettersCanvas"), { ssr: false });

type AtelierLettersProps = {
  // true = play the landing animation; false = already lying on the mat.
  animate: boolean;
  // Called once, when the objects should start falling (see slam.delay).
  onLanded: () => void;
  // The objects on the mat: the letters keep clear of them.
  objects: MatObjectConfig[];
};

// The letters lying on the atelier's mat, in a transparent layer between the
// mat and the page's content.
export function AtelierLetters({ animate, onLanded, objects }: AtelierLettersProps) {
  return (
    // fixed + 100lvh, like the mat's drawings, so the two always line up.
    <div className="pointer-events-none fixed inset-0 h-lvh">
      <MatLettersCanvas animate={animate} onObjectsCue={onLanded} objects={objects} />
    </div>
  );
}
