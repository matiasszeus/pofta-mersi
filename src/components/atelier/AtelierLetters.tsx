"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";
import { arrivedFromDive } from "@/lib/arrival";

// WebGL only exists in the browser, so the canvas is never rendered on the
// server. Until it loads, the mat simply shows without letters.
const MatLettersCanvas = dynamic(() => import("./MatLettersCanvas"), { ssr: false });

// The letters lying on the atelier's mat, in a transparent layer between the
// mat and the header. They land with an animation only right after the
// landing's dive, and never when the visitor asked for less motion.
export function AtelierLetters() {
  const reducedMotion = useReducedMotion();
  // Decided once, when the page appears.
  const [fromDive] = useState(() => arrivedFromDive(theme.atelier.letters.arrivalWindow));

  return (
    // fixed + 100lvh, like the mat underneath, so the two always line up.
    <div className="pointer-events-none fixed inset-0 h-lvh">
      <MatLettersCanvas animate={fromDive && !reducedMotion} />
    </div>
  );
}
