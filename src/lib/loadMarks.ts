// Timeline of the landing's loading, for measuring it: each step is a
// performance mark ("pm:<step>"), recorded once per page load. Read them in
// the browser's devtools (Performance panel) or with
//   performance.getEntriesByType("mark")
export type LoadStep =
  | "hydrated" // the page's JavaScript is running
  | "chunk" // the 3D code has arrived
  | "webgl" // the 3D canvas has its WebGL context
  | "fonts" // the 3D letters' font and the outlines' font are loaded
  | "physics" // the physics engine (WASM) is loaded
  | "ready" // the first frame with the 3D letters has been drawn
  | "fallback"; // the 3D scene could not start; the static title stays

export function markLoad(step: LoadStep) {
  if (typeof performance === "undefined") return;
  const name = `pm:${step}`;
  if (performance.getEntriesByName(name).length === 0) performance.mark(name);
}
