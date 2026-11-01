// The browser can take a WebGL canvas's context away at any time (too many
// open, the graphics driver restarting, a phone short of memory): the 3D
// picture is then gone for good. We do not try to get it back (it may
// happen again, and the scene would have to be rebuilt): onLost switches to
// the still pictures (see shouldUse3D). Not calling preventDefault() is
// what tells the browser not to restore it.
export function onContextLost(canvas: HTMLCanvasElement, onLost: () => void) {
  canvas.addEventListener("webglcontextlost", () => onLost(), { once: true });
}
