"use client";

import { Suspense, useRef, useState } from "react";
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
import { ShadowWall } from "./ShadowWall";
import { useSceneLayout } from "./useSceneLayout";

export type HeroCanvasProps = {
  // false = letters sit in their outlines; true = they let go, fall, and the
  // camera dives after them.
  falling: boolean;
  debug?: boolean;
  // Called once the dive is over: its planned time has passed and the last
  // letter has left the screen. The screen is the atelier's color by then.
  onDiveEnd: () => void;
};

// Everything inside <Canvas> is 3D scene content, not HTML. Hooks that read the
// viewport (useSceneLayout) only work in here, hence the separate component.
function Scene({ falling, debug = false, onDiveEnd }: HeroCanvasProps) {
  // Loads the font file (pausing this component until it arrives); the layout
  // needs the letter widths from it.
  const font = useFont(theme.fonts[theme.font].typeface);
  const { fov, walls, bottom, letterSize, slots, z, visibleHeight } = useSceneLayout(font.data);
  const { camera, lights, physics } = theme;

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const dive = useRef<DiveState>({ drop: 0, progress: 0 });
  const startedAt = useRef<number | null>(null);
  const allGone = useRef(false);
  const ended = useRef(false);

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
      <KeyLight />
      <directionalLight position={lights.fillPosition} intensity={lights.fillIntensity} />
      <directionalLight position={lights.frontPosition} intensity={lights.frontIntensity} />
      <directionalLight position={lights.rimPosition} intensity={lights.rimIntensity} color={lights.rimColor} />

      <ShadowWall z={z - theme.shadow.distance * letterSize} />

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
            bottom={bottom}
            dive={dive}
            onAllGone={() => (allGone.current = true)}
          />
        </Physics>
      </Suspense>
    </>
  );
}

// The main light, which also casts the letters' shadow. A directional light's
// shadow is computed inside a box (an orthographic "shadow camera") around
// where the light points; `area` sets that box's sides.
function KeyLight() {
  const { keyPosition, keyIntensity } = theme.lights;
  const { mapSize, blur, area } = theme.shadow;

  return (
    <directionalLight
      position={keyPosition}
      intensity={keyIntensity}
      castShadow
      // R3F shorthand: "shadow-mapSize" sets light.shadow.mapSize, etc.
      shadow-mapSize={[mapSize, mapSize]}
      shadow-radius={blur}
      shadow-blurSamples={16}
      shadow-camera-left={area.left}
      shadow-camera-right={area.right}
      shadow-camera-top={area.top}
      shadow-camera-bottom={area.bottom}
      shadow-camera-near={1}
      shadow-camera-far={60}
    />
  );
}

export default function HeroCanvas(props: HeroCanvasProps) {
  // Decided once, when the canvas is created (this file only ever runs in the
  // browser, so `window` exists).
  const { largeScreen, maxDpr, maxDprLargeScreen } = theme.performance;
  const [dprCap] = useState(() => (window.innerWidth >= largeScreen ? maxDprLargeScreen : maxDpr));

  return (
    // dpr = device pixel ratio range: as sharp as the screen allows, up to the
    // cap (fewer pixels to draw on big screens).
    // shadows="variance": a shadow technique whose edges can be blurred
    // cheaply, which gives the soft shadow behind the letters.
    <Canvas dpr={[1, dprCap]} shadows="variance">
      {/* Suspense: render nothing until the fonts have loaded. */}
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  );
}
