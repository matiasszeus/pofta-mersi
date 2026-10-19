"use client";

import { Suspense, useEffect, useRef } from "react";
import { PerspectiveCamera, useFont } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import * as THREE from "three";
import { theme } from "@/config/theme";
import { Bounds } from "./Bounds";
import { diveDrop, type DiveState } from "./dive";
import { DiveBackground } from "./DiveBackground";
import { Letters } from "./Letters";
import { Outlines } from "./Outlines";
import { useSceneLayout } from "./useSceneLayout";

export type HeroCanvasProps = {
  // false = letters sit in their outlines; true = they let go, fall, and the
  // camera dives after them.
  falling: boolean;
  // false = no idle animation (prefers-reduced-motion).
  animate: boolean;
  debug?: boolean;
  // Called once the dive is over: its planned time has passed and the last
  // letter has left the screen. The screen is the gallery's color by then.
  onDiveEnd: () => void;
  // Reports where the hint text goes (distance from the top, 0..1).
  onHintTop: (top: number) => void;
};

// Everything inside <Canvas> is 3D scene content, not HTML. Hooks that read the
// viewport (useSceneLayout) only work in here, hence the separate component.
function Scene({ falling, animate, debug = false, onDiveEnd, onHintTop }: HeroCanvasProps) {
  // Loads the font file (pausing this component until it arrives); the layout
  // needs the letter widths from it.
  const font = useFont(theme.fonts[theme.font].typeface);
  const { fov, walls, bottom, letterSize, slots, z, hintTop, visibleHeight } = useSceneLayout(font.data);
  const { camera, lights, physics } = theme;

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const dive = useRef<DiveState>({ drop: 0, progress: 0 });
  const startedAt = useRef<number | null>(null);
  const allGone = useRef(false);
  const ended = useRef(false);

  useEffect(() => onHintTop(hintTop), [hintTop, onHintTop]);

  // The dive: from the tap on, move the camera straight down (it keeps looking
  // in the same direction) and advance the background color.
  useFrame((state) => {
    const cam = cameraRef.current;
    if (!falling || !cam) return;
    const now = state.clock.elapsedTime;
    startedAt.current ??= now;
    const t = now - startedAt.current;

    dive.current.drop = diveDrop(t) * theme.dive.distance * visibleHeight;
    dive.current.progress = Math.min(t / theme.dive.duration, 1);
    cam.position.y = camera.position[1] - dive.current.drop;

    if (!ended.current && t >= theme.dive.duration && allGone.current) {
      ended.current = true;
      onDiveEnd();
    }
  });

  return (
    <>
      <DiveBackground dive={dive} />

      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={camera.position}
        fov={fov}
        // Runs after the props above are applied: aim the camera at the scene.
        onUpdate={(self) => self.lookAt(...camera.lookAt)}
      />

      <ambientLight intensity={lights.ambientIntensity} />
      <directionalLight position={lights.keyPosition} intensity={lights.keyIntensity} />
      <directionalLight position={lights.fillPosition} intensity={lights.fillIntensity} />

      {/* Fixed in the scene: as the camera dives, they leave through the top. */}
      <Outlines slots={slots} size={letterSize} z={z} />

      {/* Suspense: render nothing until the physics engine (WASM) has loaded. */}
      <Suspense fallback={null}>
        {/* paused = the engine is loaded and ready, but simulates nothing until
            the tap. debug draws every collider as a wireframe. */}
        <Physics gravity={physics.gravity} paused={!falling} debug={debug}>
          {/* The key rebuilds the walls whenever the viewport shape changes. */}
          <Bounds key={walls.map((w) => w.normal.toArray().join()).join("|")} walls={walls} dive={dive} />
          <Letters
            slots={slots}
            size={letterSize}
            z={z}
            falling={falling}
            animate={animate}
            bottom={bottom}
            dive={dive}
            onAllGone={() => (allGone.current = true)}
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
