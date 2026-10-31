import type { Ref } from "react";
import { useFont } from "@react-three/drei";
import * as THREE from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { theme } from "@/config/theme";

type LetterGlyphProps = {
  char: string;
  // Font size, in world units.
  size: number;
  color?: string;
  ref?: Ref<THREE.Mesh>;
};

type FontData = ConstructorParameters<typeof Font>[0];

// Building a letter's 3D shape (extruded outline with a rounded bevel) is the
// slowest step before the first frame, so every shape is built once and kept
// for the whole visit: the landing, the atelier and going back and forth all
// reuse it. Keyed by letter and size (the landing's size changes only in
// steps, so there are just a few).
const fonts = new WeakMap<object, Font>();
const shapes = new Map<string, THREE.BufferGeometry>();

function glyphGeometry(data: FontData, char: string, size: number) {
  const key = `${char}|${size}`;
  let geometry = shapes.get(key);
  if (!geometry) {
    let font = fonts.get(data);
    if (!font) fonts.set(data, (font = new Font(data)));
    const cfg = theme.letters;
    geometry = new TextGeometry(char, {
      font,
      size,
      depth: size * cfg.depth,
      bevelEnabled: true,
      bevelSize: size * cfg.bevelSize,
      // Negative offset = the rounding starts inside the font's outline.
      bevelOffset: -size * cfg.bevelInset,
      bevelThickness: size * cfg.bevelThickness,
      bevelSegments: cfg.bevelSegments,
      curveSegments: cfg.curveSegments,
    });
    geometry.computeBoundingBox();
    shapes.set(key, geometry);
  }
  return geometry;
}

// The shape the physics engine wraps its collision shape around (a convex
// hull: the letter shrink-wrapped, holes filled in). Wrapping the detailed
// shape cost the engine most of the time before the first frame, so it gets
// a coarse version of the same letter instead: same size and bevel extents,
// far fewer points. Kept like the detailed shapes. `z` = where to put it so
// it lines up with the visible letter (centred in depth, like the letters'
// layout code does).
const hulls = new Map<string, { geometry: THREE.BufferGeometry; z: number }>();

export function useHullShape(char: string, size: number) {
  const font = useFont(theme.fonts[theme.font].typeface);
  const data = font.data as unknown as FontData;
  const key = `${char}|${size}`;
  let hull = hulls.get(key);
  if (!hull) {
    let f = fonts.get(data);
    if (!f) fonts.set(data, (f = new Font(data)));
    const cfg = theme.letters;
    const geometry = new TextGeometry(char, {
      font: f,
      size,
      depth: size * cfg.depth,
      bevelEnabled: true,
      bevelSize: size * cfg.bevelSize,
      bevelOffset: -size * cfg.bevelInset,
      bevelThickness: size * cfg.bevelThickness,
      bevelSegments: 1,
      curveSegments: 3,
    });
    const middle = glyphGeometry(data, char, size).boundingBox!.getCenter(new THREE.Vector3());
    hull = { geometry, z: -middle.z };
    hulls.set(key, hull);
  }
  return hull;
}

// One 3D letter with the brand's shape and material (theme.letters). Shared
// by the landing and the atelier, so the letters look the same on both.
// The shape starts at the left end of the baseline and extrudes towards +z.
export function LetterGlyph({ char, size, color = theme.colors.letters[0], ref }: LetterGlyphProps) {
  const cfg = theme.letters;
  // Loads the font file once (pausing this component until it arrives).
  const font = useFont(theme.fonts[theme.font].typeface);
  // drei's and three's font types differ slightly; the data is the same.
  const data = font.data as unknown as FontData;

  return (
    // dispose={null}: the shape is shared, so it is never thrown away when
    // one letter goes.
    <mesh ref={ref} castShadow geometry={glyphGeometry(data, char, size)} dispose={null}>
      <meshStandardMaterial color={color} roughness={cfg.roughness} metalness={cfg.metalness} />
    </mesh>
  );
}
