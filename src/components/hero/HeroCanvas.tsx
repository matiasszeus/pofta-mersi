"use client";

import { Suspense, useEffect } from "react";
import { PerspectiveCamera, useFont } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { theme } from "@/config/theme";
import { Bounds } from "./Bounds";
import { Letters } from "./Letters";
import { Outlines } from "./Outlines";
import { useSceneLayout } from "./useSceneLayout";

export type HeroCanvasProps = {
  // false = letters sit in their outlines; true = they let go and fall.
  falling: boolean;
  // false = no idle animation (prefers-reduced-motion).
  animate: boolean;
  debug?: boolean;
  // Called when the last letter has fallen out of the screen.
  onAllGone: () => void;
  // Reports where the hint text belongs (distance from the top, 0..1).
  onHintTop: (top: number) => void;
};

// Everything inside <Canvas> is 3D scene content, not HTML. Hooks that read the
// viewport (useSceneLayout) only work in here, hence the separate component.
function Scene({ falling, animate, debug = false, onAllGone, onHintTop }: HeroCanvasProps) {
  // Loads the font file (pausing this component until it arrives); the layout
  // needs the letter widths from it.
  const font = useFont(theme.fonts[theme.font].typeface);
  const { fov, walls, bottom, letterSize, slots, z, hintTop } = useSceneLayout(font.data);
  const { camera, lights, physics } = theme;

  useEffect(() => onHintTop(hintTop), [hintTop, onHintTop]);

  return (
    <>
      <color attach="background" args={[theme.colors.background]} />

      <PerspectiveCamera
        makeDefault
        position={camera.position}
        fov={fov}
        // Runs after the props above are applied: aim the camera at the scene.
        onUpdate={(self) => self.lookAt(...camera.lookAt)}
      />

      <ambientLight intensity={lights.ambientIntensity} />
      <directionalLight position={lights.keyPosition} intensity={lights.keyIntensity} />
      <directionalLight position={lights.fillPosition} intensity={lights.fillIntensity} />

      <Outlines slots={slots} size={letterSize} z={z} />

      {/* Suspense: render nothing until the physics engine (WASM) has loaded. */}
      <Suspense fallback={null}>
        {/* paused = the engine is loaded and ready, but simulates nothing until
            the tap. debug draws every collider as a wireframe. */}
        <Physics gravity={physics.gravity} paused={!falling} debug={debug}>
          {/* The key rebuilds the walls whenever the viewport shape changes. */}
          <Bounds key={walls.map((w) => w.normal.toArray().join()).join("|")} walls={walls} />
          <Letters
            slots={slots}
            size={letterSize}
            z={z}
            falling={falling}
            animate={animate}
            bottom={bottom}
            onAllGone={onAllGone}
          />
        </Physics>
      </Suspense>
    </>
  );
}

export default function HeroCanvas(props: HeroCanvasProps) {
  return (
    // dpr = device pixel ratio range: sharp on phones, capped at 2 to stay fast.
    <Canvas dpr={[1, 2]}>
      {/* Suspense: render nothing until the fonts have loaded. */}
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
