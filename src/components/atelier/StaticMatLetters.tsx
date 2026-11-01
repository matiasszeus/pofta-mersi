"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { theme } from "@/config/theme";
import { useStableViewport } from "@/lib/stableViewport";
import {
  blockerOutlines,
  chooseLetters,
  letterBlocked,
  letterRect,
  letterScale,
  letterSpots,
  rectMiddle,
  visibleSize,
  type MatLayout,
} from "./objectLayout";

// The atelier's letters without 3D (see shouldUse3D): pictures rendered
// once from the 3D letters (scripts/letters-static.ts), placed exactly where
// MatLettersCanvas puts them (the same layout: letterSpots, letterRect,
// letterScale, the same letters left out), turned, the same size. They fade
// in (no falling); then the objects are slammed down as usual (onLanded).
//
// The shadow is drawn here, not in the pictures: a turned letter's shadow
// still falls the same way (down and to the right, away from the light), so
// it is a drop-shadow on an unturned box around the turned picture. Its
// offset and softness come from the light's direction and the letters'
// thickness, like the 3D shadow of a letter lying on the mat.

const cfg = theme.atelier.letters;
const { still } = cfg;
const shape = theme.letters;

function shadowFor(glyphPx: number) {
  // The letter's thickness (px): font size x (flat part + the two bulges).
  const fontSize = glyphPx / cfg.glyphHeight;
  const thick = fontSize * (shape.depth + 2 * shape.bevelThickness);
  // A point at half the thickness casts its shadow this far (the light's
  // direction, "towards the light", is (x, y, z) with y up).
  const [lx, ly, lz] = cfg.shadow.lightDirection;
  const half = thick / 2;
  const dx = (-lx / lz) * half;
  const dy = (ly / lz) * half; // world y up = screen y down
  const blur = cfg.shadow.blurLanded * 0.5 + thick * 0.25;
  const { color, opacity } = cfg.shadow;
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur.toFixed(1)}px ${color}${alpha})`;
}

type Props = {
  mat: MatLayout;
  // Called once, when the objects should come down (after the fade).
  onLanded: () => void;
};

export function StaticMatLetters({ mat, onLanded }: Props) {
  const vp = useStableViewport();
  // Which letters: decided once, as on the 3D mat (see MatLettersCanvas).
  const [chars] = useState(() => {
    const { width, height } = visibleSize();
    return chooseLetters(width, height, mat);
  });

  // The objects come down once the letters have faded in.
  useEffect(() => {
    const timer = setTimeout(onLanded, still.fade * 1000);
    return () => clearTimeout(timer);
    // Once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!vp) return null;
  const width = vp.width;
  const height = vp.height;
  const spots = letterSpots(width, height, mat).filter((s) => chars.has(s.char));
  const scale = letterScale(width, height);
  const shapes = blockerOutlines(mat, cfg.clearance);

  return (
    <>
      {spots.map((spot) => {
        // Hidden as on the 3D mat: still touching something, except corners.
        if (!cfg.keep.corners.includes(spot.char) && letterBlocked(spot, width, height, shapes, scale)) return null;
        const box = letterRect(spot, width, height);
        const middle = rectMiddle(box);
        const glyphPx = box.width * scale; // the letter's height on the screen
        const side = (glyphPx * still.canvas) / still.glyph; // the picture's size
        const style: CSSProperties = {
          left: middle.x - side / 2,
          top: middle.y - side / 2,
          width: side,
          height: side,
          filter: shadowFor(glyphPx),
          animation: `fade-in ${still.fade}s ease-out both`,
        };
        return (
          <div key={spot.char} className="absolute" style={style}>
            {/* eslint-disable-next-line @next/next/no-img-element -- already the right size, see-through */}
            <img
              src={`${still.dir}/${spot.char}.webp`}
              alt=""
              draggable={false}
              className="art block h-full w-full"
              style={{ rotate: `${spot.rotation}deg` }}
            />
          </div>
        );
      })}
    </>
  );
}
