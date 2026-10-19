import { useLayoutEffect, useRef, type RefObject } from "react";
import { Text3D } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, useRapier, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { theme } from "@/config/theme";
import type { DiveState } from "./dive";
import type { Slot, Wall } from "./useSceneLayout";

type Vec3 = [number, number, number];

// Repeatable "random" number in [-1, 1] (same on every render, unlike Math.random).
function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const scratch = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();

type LetterProps = {
  char: string;
  color: string;
  size: number;
  // The letter's origin is the left end of its baseline.
  position: Vec3;
  // false = sitting in its outline; true = the fall has been triggered.
  falling: boolean;
  // Seconds after the trigger at which this letter lets go.
  dropAt: number;
  // false = no idle animation (prefers-reduced-motion).
  animate: boolean;
  seed: number;
  // Bottom edge of the screen at the start; past it the letter is out of view.
  bottom: Wall;
  dive: RefObject<DiveState>;
  onGone: () => void;
};

function Letter(props: LetterProps) {
  const { char, color, size, position, falling, dropAt, animate, seed, bottom, dive, onGone } = props;
  const { rapier } = useRapier();
  const body = useRef<RapierRigidBody>(null);
  // pivot sits at the middle of the letter and is what the idle animation and
  // squash & stretch move; mesh is the visible letter inside it.
  const pivot = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const middle = useRef(new THREE.Vector3());
  const triggeredAt = useRef<number | null>(null);
  const released = useRef(false);
  const gone = useRef(false);
  // Squash & stretch state: velocity last frame, and the current wobble.
  const lastVelocity = useRef(new THREE.Vector3());
  const wobble = useRef({ startedAt: -Infinity, amount: 0, axis: new THREE.Vector3(0, 1, 0) });
  const cfg = theme.letters;

  // Text3D builds a glyph from its bottom-left corner, extruding forward. Move
  // the mesh so the letter's middle is on the pivot, and the pivot so the letter
  // ends up where it was sideways, with its thickness centered on the body.
  // (Net effect on the shape's position: only the depth centering.)
  useLayoutEffect(() => {
    if (!mesh.current || !pivot.current) return;
    const geometry = mesh.current.geometry;
    geometry.computeBoundingBox();
    geometry.boundingBox!.getCenter(middle.current);
    mesh.current.position.copy(middle.current).negate();
    middle.current.z = 0;
    pivot.current.position.copy(middle.current);
  }, []);

  useFrame((state) => {
    const rb = body.current;
    const p = pivot.current;
    if (!rb || !p) return;
    const now = state.clock.elapsedTime;

    // --- Waiting in the outline: idle "breathing", visual only ---
    if (!released.current) {
      if (falling) triggeredAt.current ??= now;
      const letGo = triggeredAt.current !== null && now - triggeredAt.current >= dropAt;

      if (!letGo) {
        if (animate) {
          const { speed, scale, tilt, bob } = theme.idle;
          // Own rhythm per letter: a different start point and slightly different pace.
          const t = now * speed * (1 + noise(seed + 31) * 0.15) + seed * 1.7;
          p.scale.setScalar(1 + Math.sin(t) * scale);
          p.rotation.z = Math.sin(t * 0.7 + 1) * tilt;
          p.position.y = middle.current.y + Math.sin(t * 0.9 + 2) * bob * size;
        }
        return;
      }

      // Let go: back to the neutral pose, then turn the frozen ("fixed") body
      // into a normal dynamic one with a small sideways push and spin.
      released.current = true;
      p.scale.setScalar(1);
      p.rotation.z = 0;
      p.position.copy(middle.current);
      rb.setBodyType(rapier.RigidBodyType.Dynamic, true);
      rb.setLinvel({ x: noise(seed + 1) * theme.fall.sideSpeed, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: noise(seed + 21) * theme.fall.spin }, true);
    }

    // --- Falling: report once when it has left through the bottom ---
    // The bottom edge moves down with the diving camera.
    scratch.copy(rb.translation()).sub(bottom.point);
    scratch.y += dive.current.drop;
    const belowBottom = -scratch.dot(bottom.normal);
    if (!gone.current && belowBottom > theme.fall.exitMargin * size) {
      gone.current = true;
      onGone();
    }

    // --- Squash & stretch ---
    // An impact shows up as the velocity changing a lot from one frame to the
    // next (gravity alone changes it only a little).
    const sq = theme.squash;
    const w = wobble.current;
    const velocity = rb.linvel();
    scratch.set(velocity.x, velocity.y, velocity.z).sub(lastVelocity.current);
    lastVelocity.current.set(velocity.x, velocity.y, velocity.z);
    const impact = scratch.length();
    if (impact > sq.minImpact) {
      w.startedAt = now;
      w.amount = Math.min(impact * sq.perSpeed, sq.max);
      // Direction of the hit, seen from the (possibly rotated) letter itself.
      const rot = rb.rotation();
      scratchQuat.set(rot.x, rot.y, rot.z, rot.w).invert();
      w.axis.copy(scratch).normalize().applyQuaternion(scratchQuat);
    }

    const t = now - w.startedAt;
    if (t > sq.duration) {
      p.scale.setScalar(1);
    } else {
      // A wobble that fades out: flatter, then taller, then back to normal.
      const q = w.amount * Math.sin(2 * Math.PI * sq.frequency * t) * Math.exp(-sq.decay * t);
      // Flatten along the hit direction, widen across it.
      const along = (a: number) => 1 - q * a * a + q * sq.stretch * (1 - a * a);
      p.scale.set(along(w.axis.x), along(w.axis.y), along(w.axis.z));
    }
  });

  return (
    <RigidBody
      ref={body}
      // "fixed" = frozen in place until the letter lets go (see useFrame).
      type="fixed"
      // "hull" = convex hull collider: the letter shrink-wrapped, holes filled in.
      colliders="hull"
      position={position}
      enabledRotations={cfg.rotationAxes}
      enabledTranslations={cfg.moveAxes}
      restitution={theme.physics.restitution}
      friction={theme.physics.friction}
      linearDamping={theme.physics.linearDamping}
      angularDamping={theme.physics.angularDamping}
      // Continuous collision detection: fast letters do not skip through things.
      ccd
    >
      <group ref={pivot}>
        <Text3D
          ref={mesh}
          font={theme.fonts[theme.font].typeface}
          size={size}
          height={size * cfg.depth}
          bevelEnabled
          bevelSize={size * cfg.bevelSize}
          // Negative offset = the rounding starts inside the font's outline.
          bevelOffset={-size * cfg.bevelInset}
          bevelThickness={size * cfg.bevelThickness}
          bevelSegments={cfg.bevelSegments}
          curveSegments={cfg.curveSegments}
        >
          {char}
          <meshStandardMaterial color={color} roughness={cfg.roughness} metalness={cfg.metalness} />
        </Text3D>
      </group>
    </RigidBody>
  );
}

type LettersProps = {
  slots: Slot[];
  size: number;
  z: number;
  falling: boolean;
  animate: boolean;
  bottom: Wall;
  dive: RefObject<DiveState>;
  // Called once, when the last letter has left the screen.
  onAllGone: () => void;
};

export function Letters({ slots, size, z, falling, animate, bottom, dive, onAllGone }: LettersProps) {
  const palette = theme.colors.letters;
  const goneCount = useRef(0);

  const onGone = () => {
    goneCount.current += 1;
    if (goneCount.current === slots.length) onAllGone();
  };

  return (
    <>
      {slots.map((slot) => (
        <Letter
          // A different size or place means a new shape and collider, so the
          // letter is rebuilt from scratch.
          key={`${slot.index}-${size}-${slot.x.toFixed(3)}-${slot.y.toFixed(3)}`}
          char={slot.char}
          color={palette[slot.index % palette.length]}
          size={size}
          position={[slot.x, slot.y, z]}
          falling={falling}
          dropAt={slot.dropOrder * theme.fall.stagger}
          animate={animate}
          seed={slot.index}
          bottom={bottom}
          dive={dive}
          onGone={onGone}
        />
      ))}
    </>
  );
}
