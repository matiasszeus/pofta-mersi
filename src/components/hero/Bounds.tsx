import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { theme } from "@/config/theme";
import type { Wall } from "./useSceneLayout";

const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Invisible walls. Each one is a big thick slab whose inner face lies on the
// wall plane; thick so a fast letter cannot pass through in one step.
export function Bounds({ walls }: { walls: Wall[] }) {
  const { wallThickness, wallSize } = theme.bounds;

  return (
    <>
      {walls.map((wall, i) => {
        // Push the slab back by half its thickness and turn its local Z to the normal.
        const center = wall.point.clone().addScaledVector(wall.normal, -wallThickness / 2);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, wall.normal);
        return (
          // "fixed" = never moves, but other bodies collide with it.
          <RigidBody key={i} type="fixed" colliders={false} position={center} quaternion={quaternion}>
            {/* args are half-sizes along x, y, z */}
            <CuboidCollider args={[wallSize / 2, wallSize / 2, wallThickness / 2]} />
          </RigidBody>
        );
      })}
    </>
  );
}
