import { theme } from "@/config/theme";

// An invisible wall behind the letters that shows only the shadows falling on
// it (ShadowMaterial draws nothing else), so the flowers behind the
// see-through canvas stay visible and the letters seem to float above them.
export function ShadowWall({ z }: { z: number }) {
  const { color, opacity } = theme.shadow;

  return (
    // Huge, so it is still behind the letters while they fall during the dive.
    <mesh position={[0, 0, z]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <shadowMaterial color={color} opacity={opacity} />
    </mesh>
  );
}
