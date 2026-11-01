"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LetterGlyph } from "@/components/hero/LetterGlyph";
import { theme } from "@/config/theme";

// One of the atelier's letters, alone, for scripts/letters-static.ts to
// photograph (/lab/litere?char=P): lying flat in the middle of a
// see-through canvas, seen straight from above, with the same font, material
// and lights as on the mat (MatLettersCanvas), `still.glyph` px tall. No
// shadow: the page draws it (see StaticMatLetters). When it has been drawn,
// <body data-ready> is set. Without ?char: <body data-chars> lists the
// letters to photograph.

const cfg = theme.atelier.letters;
const { still } = cfg;
const rad = THREE.MathUtils.degToRad;

function Letter({ char }: { char: string }) {
  const { height } = useThree((s) => s.size);
  const glyph = useRef<THREE.Mesh>(null);
  // Font size that shows the letter `still.glyph` px tall (as on the mat).
  const size = still.glyph / cfg.glyphHeight;
  // The camera as high as on the mat of a usual screen (`still.screen` px
  // tall): seen from that far the letter's satin sheen looks the same. Its
  // field of view narrowed so that 1 unit is still 1 px on this canvas.
  const distance = still.screen / 2 / Math.tan(rad(cfg.fov / 2));
  const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(height / 2 / distance));
  const { lights } = theme;
  const toLight = new THREE.Vector3(...cfg.shadow.lightDirection).normalize().multiplyScalar(1000);

  // Centred on its box, resting on the mat (as MatLetter does).
  useLayoutEffect(() => {
    const mesh = glyph.current;
    if (!mesh) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const middle = box.getCenter(new THREE.Vector3());
    mesh.position.set(-middle.x, -middle.y, -box.min.z);
  }, [size]);

  // Drawn (two frames later, to be sure): ready to be photographed.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => document.body.setAttribute("data-ready", "1"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, distance]} fov={fov} near={1} far={distance * 3} />
      {/* The same lights as on the mat (MatLettersCanvas). */}
      <ambientLight intensity={lights.ambientIntensity} />
      <directionalLight position={toLight.toArray()} intensity={lights.keyIntensity} />
      <directionalLight position={lights.frontPosition} intensity={lights.frontIntensity} />
      <directionalLight position={lights.rimPosition} intensity={lights.rimIntensity} color={lights.rimColor} />
      <LetterGlyph ref={glyph} char={char} size={size} />
    </>
  );
}

export default function LetterSnapshot() {
  const char = new URLSearchParams(window.location.search).get("char");
  useEffect(() => {
    if (!char) document.body.setAttribute("data-chars", still.chars.join(","));
    // A see-through picture: no page background (the layout gives one).
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, [char]);
  if (!char) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "transparent" }}>
      {/* preserveDrawingBuffer: the picture stays readable for the screenshot. */}
      <Canvas dpr={1} gl={{ alpha: true, preserveDrawingBuffer: true, antialias: true }}>
        <Suspense fallback={null}>
          <Letter char={char} />
        </Suspense>
      </Canvas>
    </div>
  );
}
