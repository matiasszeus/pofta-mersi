import { theme } from "@/config/theme";

// Shared, per-frame state of the dive after the tap. Lives in a ref (not React
// state) because it changes every frame and only the 3D scene reads it.
export type DiveState = {
  // How far the camera has moved down, in world units.
  drop: number;
  // 0 = landing color everywhere, 1 = atelier color everywhere.
  progress: number;
};

// Camera drop `t` seconds after the tap, as a fraction of `distance`.
// Still at first, then an ease-in curve (slow start, accelerating) that
// reaches 1 at `duration`. Past that the camera keeps going at its final speed,
// in case the scene waits for a letter that is late leaving the screen.
export function diveDrop(t: number) {
  const { cameraDelay, duration, easePower } = theme.dive;
  const u = (t - cameraDelay) / (duration - cameraDelay);
  if (u <= 0) return 0;
  if (u <= 1) return u ** easePower;
  return 1 + easePower * (u - 1); // slope of u^p at u = 1 is p
}
