import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { theme } from "@/config/theme";

// An infinite wall: everything on the side `normal` points to is "inside".
export type Wall = { point: THREE.Vector3; normal: THREE.Vector3 };

// The parts of a three.js typeface JSON font that the layout needs.
// Glyph numbers are in font units; divide by `resolution` and multiply by the
// letter size to get world units.
export type FontMetrics = {
  resolution: number;
  glyphs: Record<string, { ha: number; o?: string } | undefined>;
};

// Where one letter sits: the left end of its baseline (the point both Text3D
// and <Text> draw a glyph from), in world x/y.
export type Slot = {
  char: string;
  index: number; // reading order, used for the color
  dropOrder: number; // 0 = first to fall
  x: number;
  y: number;
};

export type SceneLayout = {
  fov: number;
  // Solid walls on the left and right edges of the screen.
  walls: Wall[];
  // The bottom edge of the screen. Not solid: used to tell when a letter has
  // fallen out of view.
  bottom: Wall;
  letterSize: number;
  slots: Slot[];
  // Depth (world z) of the outlines and of the letters.
  z: number;
  // Where the hint text goes: distance from the top of the screen, 0..1.
  hintTop: number;
  // Height of the screen, in world units, measured on the letters' plane.
  visibleHeight: number;
};

// Highest point of a glyph outline, in font units. The outline is a list of
// commands: "m x y" (move), "l x y" (line), "q x y cx cy" (curve).
function glyphTop(outline = "") {
  const tokens = outline.split(" ");
  let top = 0;
  for (let i = 0; i < tokens.length; ) {
    const argCount = { m: 2, l: 2, q: 4, b: 6 }[tokens[i]] ?? 0;
    if (argCount) top = Math.max(top, Number(tokens[i + 2]));
    i += argCount + 1;
  }
  return top;
}

// Everything that depends on the viewport shape, derived in one place so the
// camera, the walls, the outlines and the letters always agree with each other.
//
// The letters and their outlines live on one upright plane through
// camera.lookAt, which is the center of the screen. The side walls are the
// left and right sides of the camera's view volume, so they sit exactly on the
// screen edges even though the camera is tilted.
export function computeSceneLayout(aspect: number, font: FontMetrics): SceneLayout {
  const { camera, bounds, letters, outline, hint } = theme;
  const fov = aspect >= 1 ? camera.fovLandscape : camera.fovPortrait;

  // Camera axes in world space: forward (where it looks), right, up.
  const position = new THREE.Vector3(...camera.position);
  const center = new THREE.Vector3(...camera.lookAt);
  const forward = center.clone().sub(position).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);

  // The view volume (frustum) is a pyramid with its tip at the camera. One unit
  // forward, the screen edge is tanV up/down and tanH left/right.
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanH = tanV * aspect;

  // Inward-facing normals of the frustum sides; all pass through the camera.
  const wallTan = tanH * bounds.screenFraction;
  const walls: Wall[] = [
    { point: position, normal: right.clone().addScaledVector(forward, wallTan).normalize() },
    { point: position, normal: right.clone().negate().addScaledVector(forward, wallTan).normalize() },
  ];
  const bottom: Wall = { point: position, normal: up.clone().addScaledVector(forward, tanV).normalize() };

  const z = center.z;
  // How far in front of the camera a point on the letters' plane is, and where
  // it lands on the screen (0 = top edge, 1 = bottom edge).
  const depthAt = (y: number) => new THREE.Vector3(0, y, z).sub(position).dot(forward);
  const screenY = (y: number) => {
    const p = new THREE.Vector3(0, y, z).sub(position);
    return (1 - p.dot(up) / p.dot(forward) / tanV) / 2;
  };

  // Visible size of the letters' plane around the middle of the screen.
  const visibleHeight = 2 * depthAt(center.y) * tanV;
  const blockCenterY = center.y + visibleHeight * outline.offsetY;
  // The tilted camera sees a little less width higher up, so measure the width
  // at the top of the tallest block allowed.
  const blockTopMax = blockCenterY + (visibleHeight * outline.maxHeight) / 2;
  const visibleWidth = 2 * depthAt(blockTopMax) * tanH;

  // Text measurements in "letter sizes" (multiply by the letter size for world units).
  const advance = (char: string) => (font.glyphs[char]?.ha ?? 0) / font.resolution;
  const rows = letters.rows.map((row) => [...row]);
  const rowWidths = rows.map(
    (row) => row.reduce((w, char) => w + advance(char), 0) + outline.letterSpacing * (row.length - 1),
  );
  const widestRow = Math.max(...rowWidths);
  const capHeight =
    Math.max(...rows.flat().map((char) => glyphTop(font.glyphs[char]?.o))) / font.resolution;
  const blockHeight = rows.length * capHeight + (rows.length - 1) * outline.rowGap;

  // One size for all rows: the widest row must fit the width, and the whole
  // block must fit the height. Rounded down so a window being resized does not
  // rebuild the letters on every pixel.
  const byWidth = (visibleWidth * (1 - 2 * outline.paddingX)) / widestRow;
  const byHeight = (visibleHeight * outline.maxHeight) / blockHeight;
  const letterSize = Math.floor(Math.min(letters.maxSize, byWidth, byHeight) * 20) / 20;

  // Lay the rows out like centered lines of text around blockCenterY.
  // The bottom row falls first, so falling letters do not land on waiting ones.
  const slots: Slot[] = [];
  const blockTop = blockCenterY + (blockHeight * letterSize) / 2;
  const blockBottom = blockCenterY - (blockHeight * letterSize) / 2;
  let index = 0;
  rows.forEach((row, r) => {
    let x = (-rowWidths[r] * letterSize) / 2;
    const y = blockTop - capHeight * letterSize - r * (capHeight + outline.rowGap) * letterSize;
    const lettersBelow = rows.slice(r + 1).reduce((n, other) => n + other.length, 0);
    row.forEach((char, c) => {
      slots.push({ char, index: index++, dropOrder: lettersBelow + c, x, y });
      x += (advance(char) + outline.letterSpacing) * letterSize;
    });
  });

  const hintTop = screenY(blockBottom) + hint.gap;

  return { fov, walls, bottom, letterSize, slots, z, hintTop, visibleHeight };
}

export function useSceneLayout(font: FontMetrics): SceneLayout {
  // `size` is the canvas size in CSS pixels; it changes on resize and rotation.
  const aspect = useThree((state) => state.size.width / state.size.height);
  return useMemo(() => computeSceneLayout(aspect, font), [aspect, font]);
}
