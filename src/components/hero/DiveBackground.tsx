import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { theme } from "@/config/theme";
import type { DiveState } from "./dive";

// The scene's background: a flat quad that always covers the whole screen.
// During the dive a soft band of the gallery color rises from the bottom edge
// until it fills everything, as if the camera sinks into that color.
//
// The vertex shader ignores the camera entirely: the quad's corners (-1..1)
// are written straight to screen coordinates, at the far end of the depth range.
const vertexShader = /* glsl */ `
  varying float vScreenY;
  void main() {
    vScreenY = position.y * 0.5 + 0.5; // 0 = bottom edge, 1 = top edge
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uFrom;
  uniform vec3 uTo;
  uniform float uProgress;
  uniform float uSoftness;
  varying float vScreenY;
  void main() {
    // The band's middle travels from just below the screen to just above it,
    // so progress 0 and 1 are exactly the pure colors.
    float edge = mix(-uSoftness, 1.0 + uSoftness, uProgress);
    float k = 1.0 - smoothstep(edge - uSoftness, edge + uSoftness, vScreenY);
    gl_FragColor = vec4(mix(uFrom, uTo, k), 1.0);
    // Colors are mixed in linear space; convert for the screen so the result
    // matches the same hex color used in CSS.
    #include <colorspace_fragment>
  }
`;

export function DiveBackground({ dive }: { dive: RefObject<DiveState> }) {
  const mesh = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uFrom: { value: new THREE.Color(theme.dive.colors.from) },
          uTo: { value: new THREE.Color(theme.dive.colors.to) },
          uProgress: { value: 0 },
          uSoftness: { value: theme.dive.bandSoftness },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    if (mesh.current) mesh.current.material.uniforms.uProgress.value = dive.current.progress;
  });

  return (
    // frustumCulled off: three would otherwise judge the quad by its (fake)
    // world position and might skip it. renderOrder -1: drawn before the rest.
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
