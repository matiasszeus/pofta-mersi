// Whether this device should get the 3D scenes (the letters) or the still
// pictures that look (almost) the same. 3D needs a graphics card: where
// WebGL runs "in software" (no graphics card, e.g. Chrome with hardware
// acceleration switched off: chrome://gpu says "Software only", renderer
// SwiftShader) the letters stutter, so the pictures are better there.
//
// No 3D when:
//   - WebGL is not there at all
//   - the browser says it would be slow: a context asked for with
//     failIfMajorPerformanceCaveat: true is refused
//   - the graphics "card" is software: its name (WEBGL_debug_renderer_info,
//     where the browser tells it) has SwiftShader, llvmpipe, Software or
//     Microsoft Basic Render in it
//   - prefers-reduced-motion (nothing would move anyway)
//   - ?no3d=1 in the address (to try the pictures out)
//
// Checked once, in the browser, the first time it is asked; the test's
// WebGL context is let go of right after (WEBGL_lose_context).

let decided: boolean | undefined;

const SOFTWARE = /swiftshader|llvmpipe|software|microsoft basic render/i;

function check(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("no3d") === "1") return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

    const canvas = document.createElement("canvas");
    // Plain WebGL first: none at all = no 3D.
    if (!canvas.getContext("webgl2") && !canvas.getContext("webgl")) return false;

    // Then on a fresh canvas, asking the browser to refuse if it would be
    // slow (a canvas keeps the first kind of context it was given).
    const test = document.createElement("canvas");
    const options = { failIfMajorPerformanceCaveat: true };
    const gl = (test.getContext("webgl2", options) ?? test.getContext("webgl", options)) as WebGLRenderingContext | null;
    if (!gl) return false;
    try {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
      return !SOFTWARE.test(renderer);
    } finally {
      // Let go of both test contexts (browsers allow only a few at a time).
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      const plain = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
      plain?.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    return false;
  }
}

// true = draw the 3D scenes; false = use the still pictures. Only call it in
// the browser (on the server there is no WebGL to ask).
export function shouldUse3D(): boolean {
  if (decided === undefined) decided = check();
  return decided;
}
