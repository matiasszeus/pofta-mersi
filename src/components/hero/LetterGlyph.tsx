import type { Ref } from "react";
import { Text3D } from "@react-three/drei";
import type * as THREE from "three";
import { theme } from "@/config/theme";

type LetterGlyphProps = {
  char: string;
  // Font size, in world units.
  size: number;
  color?: string;
  ref?: Ref<THREE.Mesh>;
};

// One 3D letter with the brand's shape and material (theme.letters). Shared
// by the landing and the atelier, so the letters look the same on both.
// Text3D builds the glyph from the left end of its baseline, extruding
// towards +z.
export function LetterGlyph({ char, size, color = theme.colors.letters[0], ref }: LetterGlyphProps) {
  const cfg = theme.letters;

  return (
    <Text3D
      ref={ref}
      castShadow
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
  );
}
