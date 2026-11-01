"use client";

import { Suspense, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LetterGlyph } from "@/components/hero/LetterGlyph";
import { theme } from "@/config/theme";
import {
  chooseLetters,
  letterRect,
  letterScale,
  letterSpots,
  objectRect,
  orientationOf,
  rectMiddle,
  type LetterSpot,
} from "./objectLayout";

// The atelier's 3D letters, lying on the mat. The canvas is transparent: the
// mat behind it is the page's own HTML/SVG background.
//
// World units: the camera looks straight down at the mat (the plane z = 0)
// from a height chosen so that, on the mat, 1 unit = 1 CSS pixel. The origin
// is the middle of the screen, x to the right, y up, z towards the camera.

const cfg = theme.atelier.letters;
const rad = THREE.MathUtils.degToRad;

// The current jolt, shared by all letters: when it started (scene clock, in
// seconds), and from where it pushes (the middle of the object that hit the
// mat, world x/y).
type Jolt = { startedAt: number; fromX: number; fromY: number };

// Offset of a letter at (x, y), `t` seconds after an object's impact: pushed
// away from the object and back, a few times, dying out quickly; plus a
// small hop. Letters further than `reach` do not move.
function joltOffset(t: number, x: number, y: number, jolt: Jolt) {
  const { distance, hop, reach, frequency, decay, duration } = cfg.jolt;
  if (t < 0 || t > duration) return { x: 0, y: 0, z: 0 };
  const dx = x - jolt.fromX;
  const dy = y - jolt.fromY;
  const d = Math.hypot(dx, dy) || 1;
  const strength = Math.max(0, 1 - d / reach);
  const wave = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-decay * t);
  return {
    x: (dx / d) * distance * strength * wave,
    y: (dy / d) * distance * strength * wave,
    z: hop * strength * Math.max(0, wave),
  };
}

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

// The height of the part of the screen the page shows (window.innerHeight):
// the album and the note are placed in it. This canvas is taller on phones
// whose browser bar covers the bottom of the page (iOS Safari): it reaches
// under the bar, so the letters must be placed by the visible part, not by
// the canvas.
function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
function useVisibleHeight(fallback: number) {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => fallback);
}

type MatLetterProps = {
  spot: LetterSpot;
  // Where its middle lies (world x/y), its font size and turn (world units,
  // radians counter-clockwise).
  x: number;
  y: number;
  size: number;
  rotation: number;
  // null = no animation, the letter simply lies there.
  startAt: number | null;
  startHeight: number;
  // Shared clock: seconds since the landing animation started.
  clock: React.RefObject<number>;
  jolt: React.RefObject<Jolt>;
};

function MatLetter({ spot, x, y, size, rotation, startAt, startHeight, clock, jolt }: MatLetterProps) {
  // lift moves the letter up/down and turns it; glyph is the 3D letter.
  const lift = useRef<THREE.Group>(null);
  const glyph = useRef<THREE.Mesh>(null);

  // The letter is built from the left end of its baseline. Shift it so its
  // middle is on (x, y) and its underside rests exactly on the mat.
  useLayoutEffect(() => {
    const mesh = glyph.current;
    if (!mesh) return;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const middle = box.getCenter(new THREE.Vector3());
    mesh.position.set(-middle.x, -middle.y, -box.min.z);
  }, [size]);

  useFrame((state) => {
    const g = lift.current;
    if (!g) return;
    let z = 0;
    let turn = 0;
    if (startAt !== null) {
      const t = clock.current - startAt;
      // Not its turn yet: hidden, so it does not hang huge over the mat.
      g.visible = t >= 0;
      ({ z, turn } = landing(Math.max(t, 0), startHeight, size));
    }
    const j = joltOffset(state.clock.elapsedTime - jolt.current.startedAt, x, y, jolt.current);
    g.position.set(j.x, j.y, z + j.z);
    g.rotation.z = rotation + rad(turn);
  });

  return (
    <group position={[x, y, 0]}>
      <group ref={lift} rotation={[0, 0, rotation]} visible={startAt === null}>
        <LetterGlyph ref={glyph} char={spot.char} size={size} />
      </group>
    </group>
  );
}

type SceneProps = {
  animate: boolean;
  // The letters on the mat (chosen once, when the page opens).
  chars: Set<string>;
  // Called once, when the objects should start falling: `slam.delay`
  // seconds after the last letter touches the mat (negative = before).
  onObjectsCue: () => void;
  // Called once, when the letters lie completely still (jolts included).
  onSettled: () => void;
};

function Scene({ animate, chars, onObjectsCue, onSettled }: SceneProps) {
  const { width, height } = useThree((state) => state.size);
  // Layout height: the visible part, from the top of the canvas.
  const visibleHeight = Math.min(useVisibleHeight(height), height);
  const orientation = orientationOf(width, visibleHeight);
  const spots = letterSpots(width, visibleHeight).filter((s) => chars.has(s.char));
  // Phones: more letters, smaller letters (see phoneScale in theme.ts).
  const scale = letterScale(spots.length, orientation);
  // Camera height for which the mat fills the screen at 1 unit = 1 px.
  const distance = height / 2 / Math.tan(rad(cfg.fov / 2));
  const startHeight = distance * cfg.fall.startHeight;
  const { lights } = theme;
  const shadow = cfg.shadow;

  const light = useRef<THREE.DirectionalLight>(null);
  const clock = useRef(0);
  const startedAt = useRef<number | null>(null);
  const settled = useRef(!animate);
  const jolt = useRef<Jolt>({ startedAt: -Infinity, fromX: 0, fromY: 0 });

  const { stagger, duration, bounceDuration } = cfg.fall;
  const slam = theme.atelier.object.slam;
  // The last letter touches the mat, then bounces once and lies still.
  const lastTouchdown = stagger * (spots.length - 1) + duration;
  // The objects start falling at the cue (see slam.delay in theme.ts)...
  const objectsCue = Math.max(0, lastTouchdown + slam.delay);
  // ...and each hits the mat `fall` seconds after it starts. The jolts are
  // timed here, on this scene's own clock, so they match the impacts exactly.
  const impacts = theme.atelier.objects.map((o, i) => ({
    at: objectsCue + i * slam.stagger + slam.fall,
    middle: rectMiddle(objectRect(o, width, visibleHeight)),
  }));
  const nextImpact = useRef(0);
  const cued = useRef(!animate);
  // Keep drawing until the letters lie still and the last jolt has died out
  // (one extra frame, so they are drawn back at rest); then the canvas sleeps.
  const lastJoltEnd = Math.max(...impacts.map((i) => i.at)) + cfg.jolt.duration + 0.05;
  const total = Math.max(lastTouchdown + bounceDuration, lastJoltEnd);

  // From a spot in theme.ts to the letter's middle (world x/y), font size,
  // and turn (theme.ts turns clockwise like CSS; three.js counter-clockwise).
  // A smaller letter (scale) stays centred on its box.
  const place = (spot: LetterSpot) => {
    const box = letterRect(spot, width, visibleHeight);
    const middle = rectMiddle(box);
    const size = (box.width * scale) / cfg.glyphHeight; // font size that shows the letter box.width * scale tall
    return { x: middle.x - width / 2, y: height / 2 - middle.y, size, rotation: -rad(spot.rotation) };
  };
  const placed = spots.map(place);

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

    if (!cued.current && clock.current >= objectsCue) {
      cued.current = true;
      onObjectsCue();
    }
    // An object hits the mat: the letters jolt, pushed away from its middle
    // (screen px with a top-left origin, turned into world x/y).
    const impact = impacts[nextImpact.current];
    if (impact && clock.current >= impact.at) {
      nextImpact.current += 1;
      jolt.current = {
        startedAt: startedAt.current + impact.at,
        fromX: impact.middle.x - width / 2,
        fromY: height / 2 - impact.middle.y,
      };
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
  const top = startHeight + Math.max(...placed.map((p) => p.size));
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
        const { x, y, size, rotation } = placed[i];
        return (
          <MatLetter
            key={spot.char}
            spot={spot}
            x={x}
            y={y}
            size={size}
            rotation={rotation}
            startAt={animate ? i * stagger : null}
            startHeight={startHeight}
            clock={clock}
            jolt={jolt}
          />
        );
      })}
    </>
  );
}

type MatLettersCanvasProps = {
  // true = play the landing (and the jolts at the objects' impacts); false =
  // the letters are drawn once, already lying on the mat.
  animate: boolean;
  // Called once, when the objects should start falling (see slam.delay in
  // theme.ts). Not called when not animating.
  onObjectsCue?: () => void;
};

export default function MatLettersCanvas({ animate, onObjectsCue }: MatLettersCanvasProps) {
  const [settled, setSettled] = useState(!animate);
  const { largeScreen, maxDpr, maxDprLargeScreen } = theme.performance;
  const [dprCap] = useState(() => (window.innerWidth >= largeScreen ? maxDprLargeScreen : maxDpr));
  // Which letters lie on the mat: decided once, for the screen the page
  // opened on, so turning the phone neither adds nor removes any. The
  // others are never built. (This canvas fills the screen: see
  // AtelierLetters.)
  const [chars] = useState(() => chooseLetters(window.innerWidth, window.innerHeight));

  return (
    // frameloop "demand" = draw a frame only when something changes (e.g. a
    // resize). While the letters land it runs every frame ("always"); once
    // they lie still, the page stops drawing altogether.
    <Canvas dpr={[1, dprCap]} shadows="variance" frameloop={settled ? "demand" : "always"}>
      {/* Suspense: render nothing until the font has loaded. */}
      <Suspense fallback={null}>
        <Scene
          animate={animate}
          chars={chars}
          onObjectsCue={() => onObjectsCue?.()}
          onSettled={() => setSettled(true)}
        />
      </Suspense>
    </Canvas>
  );
}
