"use client";

import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LetterGlyph } from "@/components/hero/LetterGlyph";
import { theme } from "@/config/theme";

// The atelier's 3D letters, lying on the mat. The canvas is transparent: the
// mat behind it is the page's own HTML/SVG background.
//
// World units: the camera looks straight down at the mat (the plane z = 0)
// from a height chosen so that, on the mat, 1 unit = 1 CSS pixel. The origin
// is the middle of the screen, x to the right, y up, z towards the camera.

const cfg = theme.atelier.letters;
const rad = THREE.MathUtils.degToRad;

type LetterSpot = (typeof cfg.phone)[number];

// Height above the mat and extra turn of a letter `t` seconds after its own
// start: a fall that speeds up (like gravity), then one small bounce.
function landing(t: number, startHeight: number, size: number) {
  const { duration, spin, bounceHeight, bounceDuration } = cfg.fall;
  if (t < duration) {
    const u = t / duration;
    // The turn unwinds quickly at first, then settles (ease-out).
    return { z: startHeight * (1 - u * u), turn: spin * (1 - u) * (1 - u) };
  }
  const v = (t - duration) / bounceDuration;
  if (v < 1) return { z: bounceHeight * size * Math.sin(Math.PI * v), turn: 0 };
  return { z: 0, turn: 0 };
}

type MatLetterProps = {
  spot: LetterSpot;
  x: number;
  y: number;
  // null = no animation, the letter simply lies there.
  startAt: number | null;
  startHeight: number;
  // Shared clock: seconds since the landing animation started.
  clock: React.RefObject<number>;
};

function MatLetter({ spot, x, y, startAt, startHeight, clock }: MatLetterProps) {
  // lift moves the letter up/down and turns it; glyph is the 3D letter.
  const lift = useRef<THREE.Group>(null);
  const glyph = useRef<THREE.Mesh>(null);

  // Text3D builds the letter from the left end of its baseline. Shift it so
  // its middle is on (x, y) and its underside rests exactly on the mat.
  useLayoutEffect(() => {
    const mesh = glyph.current;
    if (!mesh) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const middle = box.getCenter(new THREE.Vector3());
    mesh.position.set(-middle.x, -middle.y, -box.min.z);
  }, []);

  useFrame(() => {
    const g = lift.current;
    if (!g || startAt === null) return;
    const t = clock.current - startAt;
    // Not its turn yet: hidden, so it does not hang huge over the mat.
    g.visible = t >= 0;
    const { z, turn } = landing(Math.max(t, 0), startHeight, spot.size);
    g.position.z = z;
    g.rotation.z = rad(spot.rotation + turn);
  });

  return (
    <group position={[x, y, 0]}>
      <group ref={lift} rotation={[0, 0, rad(spot.rotation)]} visible={startAt === null}>
        <LetterGlyph ref={glyph} char={spot.char} size={spot.size} />
      </group>
    </group>
  );
}

function Scene({ animate, onSettled }: { animate: boolean; onSettled: () => void }) {
  const { width, height } = useThree((state) => state.size);
  const spots = width >= cfg.wideFrom ? cfg.wide : cfg.phone;
  // Camera height for which the mat fills the screen at 1 unit = 1 px.
  const distance = height / 2 / Math.tan(rad(cfg.fov / 2));
  const startHeight = distance * cfg.fall.startHeight;
  const { lights } = theme;
  const shadow = cfg.shadow;

  const light = useRef<THREE.DirectionalLight>(null);
  const clock = useRef(0);
  const startedAt = useRef<number | null>(null);
  const settled = useRef(!animate);
  const { stagger, duration, bounceDuration } = cfg.fall;
  const total = stagger * (spots.length - 1) + duration + bounceDuration;

  // From a corner-relative spot to world x/y.
  const place = (spot: LetterSpot) => ({
    x: spot.corner.endsWith("l") ? -width / 2 + spot.x : width / 2 - spot.x,
    y: spot.corner.startsWith("t") ? height / 2 - spot.y : -height / 2 + spot.y,
  });

  useFrame((state) => {
    if (settled.current) return;
    startedAt.current ??= state.clock.elapsedTime;
    clock.current = state.clock.elapsedTime - startedAt.current;

    // One light casts all shadows: blur them by how high the letters are on
    // average (blurred far up, crisper as they land).
    const heights = spots.map((_, i) => {
      const t = Math.max(clock.current - i * stagger, 0);
      return landing(t, startHeight, 1).z / startHeight;
    });
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    if (light.current) {
      light.current.shadow.radius = THREE.MathUtils.lerp(shadow.blurLanded, shadow.blurHigh, avg);
    }

    if (clock.current > total) {
      settled.current = true;
      onSettled();
    }
  });

  // The shadow light: far off in `lightDirection`, its shadow box covering
  // the whole screen. The box's depth (near..far) is kept as short as
  // possible: shadow depths are stored with little precision, and a long
  // range shows up as fine stripes on the mat ("shadow acne").
  const dir = new THREE.Vector3(...shadow.lightDirection).normalize();
  const half = Math.max(width, height);
  // Highest point a letter reaches, and how far the screen's corners reach
  // towards / away from the light.
  const top = startHeight + Math.max(...spots.map((s) => s.size));
  const spread = half * Math.hypot(dir.x, dir.y);
  // Just far enough that even the highest letter is in front of the light.
  const lightDistance = top * dir.z + spread + 50;
  const lightPosition = dir.clone().multiplyScalar(lightDistance).toArray();
  const near = 10;
  const far = lightDistance + spread + 10;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[0, 0, distance]}
        fov={cfg.fov}
        near={1}
        far={distance * 3}
      />

      <ambientLight intensity={lights.ambientIntensity} />
      <directionalLight
        ref={light}
        position={lightPosition}
        intensity={lights.keyIntensity}
        castShadow
        shadow-mapSize={[shadow.mapSize, shadow.mapSize]}
        shadow-radius={animate ? shadow.blurHigh : shadow.blurLanded}
        shadow-blurSamples={16}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={near}
        shadow-camera-far={far}
      />
      <directionalLight position={lights.frontPosition} intensity={lights.frontIntensity} />
      <directionalLight position={lights.rimPosition} intensity={lights.rimIntensity} color={lights.rimColor} />

      {/* The mat as seen by the light: invisible, shows only the shadows. Just
          under the letters, which rest at z = 0. */}
      <mesh position={[0, 0, -0.5]} receiveShadow>
        <planeGeometry args={[width * 2, height * 2]} />
        <shadowMaterial color={shadow.color} opacity={shadow.opacity} />
      </mesh>

      {spots.map((spot, i) => {
        const { x, y } = place(spot);
        return (
          <MatLetter
            key={`${spot.char}-${i}`}
            spot={spot}
            x={x}
            y={y}
            startAt={animate ? i * stagger : null}
            startHeight={startHeight}
            clock={clock}
          />
        );
      })}
    </>
  );
}

// animate = play the landing (coming from the landing's dive); otherwise the
// letters are drawn once, already lying on the mat.
export default function MatLettersCanvas({ animate }: { animate: boolean }) {
  const [settled, setSettled] = useState(!animate);
  const { largeScreen, maxDpr, maxDprLargeScreen } = theme.performance;
  const [dprCap] = useState(() => (window.innerWidth >= largeScreen ? maxDprLargeScreen : maxDpr));

  return (
    // frameloop "demand" = draw a frame only when something changes (e.g. a
    // resize). While the letters land it runs every frame ("always"); once
    // they lie still, the page stops drawing altogether.
    <Canvas dpr={[1, dprCap]} shadows="variance" frameloop={settled ? "demand" : "always"}>
      {/* Suspense: render nothing until the font has loaded. */}
      <Suspense fallback={null}>
        <Scene animate={animate} onSettled={() => setSettled(true)} />
      </Suspense>
    </Canvas>
  );
}
