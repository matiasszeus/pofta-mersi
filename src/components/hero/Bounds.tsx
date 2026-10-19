import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { theme } from "@/config/theme";
import type { DiveState } from "./dive";
import type { Wall } from "./useSceneLayout";

const Z_AXIS = new THREE.Vector3(0, 0, 1);

type WallBodyProps = { wall: Wall; dive: RefObject<DiveState> };

// One invisible wall: a big thick slab whose inner face lies on the wall plane;
// thick so a fast letter cannot pass through in one step.
function WallBody({ wall, dive }: WallBodyProps) {
  const { wallThickness, wallSize } = theme.bounds;
  const body = useRef<RapierRigidBody>(null);
  // Push the slab back by half its thickness and turn its local Z to the normal.
  const center = wall.point.clone().addScaledVector(wall.normal, -wallThickness / 2);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, wall.normal);

  // The walls are the screen edges, so they move down with the diving camera.
  useFrame(() => {
    body.current?.setNextKinematicTranslation({ x: center.x, y: center.y - dive.current.drop, z: center.z });
  });

  return (
    // "kinematicPosition" = moved only by code (above), never by collisions,
    // but other bodies still bounce off it.
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={center}
      quaternion={quaternion}
    >
      {/* args are half-sizes along x, y, z */}
      <CuboidCollider args={[wallSize / 2, wallSize / 2, wallThickness / 2]} />
    </RigidBody>
  );
}

export function Bounds({ walls, dive }: { walls: Wall[]; dive: RefObject<DiveState> }) {
  return (
    <>
      {walls.map((wall, i) => (
        <WallBody key={i} wall={wall} dive={dive} />
      ))}
    </>
  );
}
