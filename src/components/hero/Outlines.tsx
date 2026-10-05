import { Text } from "@react-three/drei";
import { theme } from "@/config/theme";
import type { Slot } from "./useSceneLayout";

type OutlinesProps = { slots: Slot[]; size: number; z: number };

// The flat "footprints" the letters sit in. <Text> draws flat text with a
// distance-field shader, which can stroke just the edge of a glyph.
export function Outlines({ slots, size, z }: OutlinesProps) {
  const cfg = theme.outline;

  return (
    <>
      {slots.map((slot) => (
        <Text
          key={slot.index}
          font={theme.fonts[theme.font].file}
          // Same size and same origin (left end of the baseline) as the 3D
          // letter, so the two line up exactly.
          fontSize={size}
          anchorX="left"
          anchorY="bottom-baseline"
          position={[slot.x, slot.y, z]}
          // No fill, only a line along the inside of the edge.
          fillOpacity={0}
          strokeWidth={size * cfg.width}
          strokeColor={cfg.color}
          strokeOpacity={cfg.opacity}
          // Resolution of the glyph's distance field; higher = crisper corners.
          sdfGlyphSize={128}
        >
          {slot.char}
        </Text>
      ))}
    </>
  );
}
