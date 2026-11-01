"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { SceneBoundary } from "@/components/hero/SceneBoundary";
import { shouldUse3D } from "@/lib/gpuTier";
import type { MatLayout } from "./objectLayout";
import { StaticMatLetters } from "./StaticMatLetters";

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

// 3D or pictures (see shouldUse3D): decided in the browser; on the server
// (and in the browser's first pass) nothing yet.
const noSubscribe = () => () => {};
function use3D(): boolean | null {
  return useSyncExternalStore(noSubscribe, shouldUse3D, () => null);
}

// The letters lying on the atelier's mat, in a transparent layer between the
// mat and the page's content: the 3D letters, or, on devices where 3D would
// stutter, their pictures (StaticMatLetters).
export function AtelierLetters({ animate, onLanded, mat, paused = false }: AtelierLettersProps) {
  // The 3D letters broke (an error in the scene, its code or font not
  // loading, or the browser taking WebGL away): their pictures instead,
  // without the page going down.
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const device3D = use3D();
  const threeD = failed ? false : device3D;
  return (
    // fixed + 100lvh, like the mat's drawings, so the two always line up.
    // mat-dims: steps back while the album is open (globals.css): the
    // whole layer, not the letters' materials.
    <div className="mat-dims pointer-events-none fixed inset-0 h-lvh">
      {threeD === true && (
        <SceneBoundary onError={fail}>
          <MatLettersCanvas animate={animate} onObjectsCue={onLanded} mat={mat} paused={paused} onLost={fail} />
        </SceneBoundary>
      )}
      {threeD === false && <StaticMatLetters mat={mat} onLanded={onLanded} />}
    </div>
  );
}
