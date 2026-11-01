"use client";

import dynamic from "next/dynamic";
import type { MatLayout } from "./objectLayout";

// WebGL only exists in the browser, so the canvas is never rendered on the
// server. Until it loads, the mat simply shows without letters.
const MatLettersCanvas = dynamic(() => import("./MatLettersCanvas"), { ssr: false });

type AtelierLettersProps = {
  // true = play the landing animation; false = already lying on the mat.
  animate: boolean;
  // Called once, when the objects should start falling (see slam.delay).
  onLanded: () => void;
  // What lies on the mat: the letters keep clear of it.
  mat: MatLayout;
  // Something covers them (the open album): no drawing meanwhile.
  paused?: boolean;
};

// The letters lying on the atelier's mat, in a transparent layer between the
// mat and the page's content.
export function AtelierLetters({ animate, onLanded, mat, paused = false }: AtelierLettersProps) {
  return (
    // fixed + 100lvh, like the mat's drawings, so the two always line up.
    // mat-dims: steps back while the album is open (globals.css): the
    // whole canvas, not the letters' materials.
    <div className="mat-dims pointer-events-none fixed inset-0 h-lvh">
      <MatLettersCanvas animate={animate} onObjectsCue={onLanded} mat={mat} paused={paused} />
    </div>
  );
}
