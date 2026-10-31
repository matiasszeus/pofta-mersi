"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBackground } from "@/components/PageBackground";
import { FlowerBackground } from "@/components/hero/FlowerBackground";
import { SceneBoundary } from "@/components/hero/SceneBoundary";
import { SlideBand } from "@/components/hero/SlideBand";
import { StaticTitle } from "@/components/hero/StaticTitle";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";
import { markLoad } from "@/lib/loadMarks";
import { preloadAtelier, whenIdle } from "@/lib/preload";

// WebGL only exists in the browser, so the canvas is never rendered on the server.
// The <main> below already has the background color, which doubles as placeholder.
// Its download starts as soon as this file runs in the browser, before the
// page is even interactive. (A failure surfaces when the scene is shown,
// where SceneBoundary catches it.)
const HeroCanvas = dynamic(
  () =>
    import("@/components/hero/HeroCanvas").then((m) => {
      markLoad("chunk");
      return m;
    }),
  { ssr: false },
);

// idle    = letters wait in their outlines
// waiting = a tap happened while the 3D scene was still loading: dive as
//           soon as it is ready (or slide, if it takes too long)
// diving  = a tap happened; letters fall and the camera dives after them
// sliding = a tap happened but the 3D scene is not there (not ready yet, or
//           it could not start): only the color change, as a rising band
// fading  = reduced motion only: the screen fades to the next page's color
// arrived = the screen shows the next page's color; navigate
type Phase = "idle" | "waiting" | "diving" | "sliding" | "fading" | "arrived";

// The 3D scene: still loading (the still picture of the title shows), ready
// (its first frame is drawn), or failed (no WebGL, or an error: the picture
// stays for good).
type Scene = "loading" | "ready" | "failed";

// Whether this browser can draw 3D at all (checked once).
let webglSupport: boolean | undefined;
function hasWebGL() {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

// "?snapshot" in the address: only the 3D title on a see-through page, for
// scripts/render-title.mjs to photograph it (see StaticTitle).
const noSubscribe = () => () => {};
function useSnapshotMode() {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(location.search).has("snapshot"),
    () => false,
  );
}

// The landing: the 3D title, and a tap that dives into the atelier. Shown at
// / and, for experiments, at /lab (`lab`: with the debug switch).
export function LandingHero({ lab = false }: { lab?: boolean }) {
  const snapshot = useSnapshotMode();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [sceneState, setScene] = useState<Scene>("loading");
  // No WebGL: the 3D scene is not even tried. (On the server: assume yes.)
  const webgl = useSyncExternalStore(noSubscribe, hasWebGL, () => true);
  const scene: Scene = webgl ? sceneState : "failed";
  // How the last tap set off: with the 3D dive, or without it.
  const [mode, setMode] = useState<"dive" | "slide" | "fade">("dive");
  const phaseRef = useRef(phase);
  useEffect(() => void (phaseRef.current = phase), [phase]);
  const [debug, setDebug] = useState(lab && theme.debug.enabled);
  // Changing this rebuilds the canvas from scratch (letters back in their outlines).
  const [run, setRun] = useState(0);
  const { href, fadeDuration, color } = theme.transition;

  // One tap starts the sequence; taps while it is running do nothing.
  // With reduced motion there is no fall, only the fade. While the 3D scene
  // is still loading, wait for it (the still title looks the same, so the
  // visitor cannot tell). Without the 3D scene, only the rising color.
  const start = () => {
    if (phase !== "idle") return;
    if (!reducedMotion && scene === "loading") return setPhase("waiting");
    const next = reducedMotion ? "fade" : scene === "ready" ? "dive" : "slide";
    setMode(next);
    setPhase(next === "dive" ? "diving" : next === "slide" ? "sliding" : "fading");
  };

  const slide = useCallback(() => {
    setMode("slide");
    setPhase("sliding");
  }, []);

  // The 3D scene has drawn its first frame: show it (the still title fades
  // out on top of it), and dive if a tap is waiting for it. Not once the
  // sequence has started without it.
  const onSceneReady = useCallback(() => {
    const p = phaseRef.current;
    if (p !== "idle" && p !== "waiting") return;
    setScene("ready");
    if (p === "waiting") {
      setMode("dive");
      setPhase("diving");
    }
  }, []);

  // A waiting tap gives up on the scene after theme.transition.sceneWait
  // seconds (or at once if the scene fails, see onSceneFailed): the rising
  // color instead.
  useEffect(() => {
    if (phase !== "waiting") return;
    const timer = setTimeout(slide, theme.transition.sceneWait * 1000);
    return () => clearTimeout(timer);
  }, [phase, slide]);
  const onSceneFailed = useCallback(() => {
    markLoad("fallback");
    setScene("failed");
    if (phaseRef.current === "waiting") slide();
  }, [slide]);

  useEffect(() => {
    if (!webgl) markLoad("fallback");
  }, [webgl]);

  const arrive = useCallback(() => setPhase((p) => (p === "idle" ? p : "arrived")), []);

  useEffect(() => markLoad("hydrated"), []);

  // Download the next page in the background so the switch is instant,
  // including the atelier's 3D letters and pictures. Once this page's own
  // scene is there (or has given up), so they do not compete with it.
  useEffect(() => {
    if (scene === "loading") return;
    router.prefetch(href);
    return whenIdle(preloadAtelier);
  }, [router, href, scene]);

  // Safety net: arrive even if some letter never reports that it is gone.
  useEffect(() => {
    if (phase !== "diving") return;
    const timer = setTimeout(arrive, theme.fall.maxDuration * 1000);
    return () => clearTimeout(timer);
  }, [phase, arrive]);

  // Without the 3D scene: arrive once the rising color has covered the screen.
  useEffect(() => {
    if (phase !== "sliding") return;
    const timer = setTimeout(arrive, theme.dive.duration * 1000);
    return () => clearTimeout(timer);
  }, [phase, arrive]);

  // Reduced motion: arrive once the fade has covered the screen.
  useEffect(() => {
    if (phase !== "fading") return;
    const timer = setTimeout(arrive, fadeDuration * 1000);
    return () => clearTimeout(timer);
  }, [phase, arrive, fadeDuration]);

  // The screen already shows the atelier's color: switch pages right away.
  useEffect(() => {
    if (phase === "arrived") router.push(href);
  }, [phase, router, href]);

  // Coming back with the browser's back button normally rebuilds this page from
  // scratch. Some browsers instead restore a frozen copy of it ("persisted"),
  // which would still be faded out; reset that copy by hand.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setPhase("idle");
      if (scene !== "failed") setScene("loading");
      setRun((n) => n + 1);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [scene]);

  return (
    // h-dvh = full visible height, also with mobile browser bars showing.
    // touch-none = a finger on the canvas does not scroll/zoom the page.
    // A "size container" named hero: the still title is placed in its units.
    <main
      className="relative h-dvh w-full cursor-pointer touch-none select-none overflow-hidden [container-name:hero] [container-type:size]"
      style={{ background: snapshot ? "transparent" : theme.colors.background }}
      onClick={start}
    >
      {/* On arrival the page itself already takes the atelier's color, so
          nothing else can show through while the pages switch. */}
      <PageBackground color={snapshot ? "transparent" : phase === "arrived" ? color : theme.colors.background} />
      {!snapshot && <FlowerBackground />}

      {/* The 3D scene: invisible until its first frame is drawn (the still
          title shows meanwhile). Dropped if it fails. */}
      {scene !== "failed" && (
        <div
          className="absolute inset-0"
          style={{ opacity: scene === "ready" || snapshot ? 1 : 0 }}
        >
          <SceneBoundary key={run} onError={onSceneFailed}>
            <HeroCanvas
              falling={phase === "diving" || (phase === "arrived" && mode === "dive")}
              debug={debug}
              onDiveEnd={arrive}
              onReady={onSceneReady}
            />
          </SceneBoundary>
        </div>
      )}

      {!snapshot && <StaticTitle hidden={scene === "ready"} />}

      {/* Without the 3D scene: the rising color instead of the dive. */}
      {(phase === "sliding" || (phase === "arrived" && mode === "slide")) && <SlideBand />}

      {/* The way on for keyboard and screen reader users (the tap is the
          only other way): not shown on screen, only when reached with Tab. */}
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:bottom-5 focus-visible:left-1/2 focus-visible:-translate-x-1/2 focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm"
        style={{ color: theme.hint.color }}
      >
        {theme.hint.skip}
      </Link>

      {lab && !snapshot && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDebug((on) => !on);
          }}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1.5 font-mono text-xs text-white"
        >
          debug: {debug ? "on" : "off"}
        </button>
      )}

      {/* Reduced motion only: a sheet in the next page's color fades in on top
          of everything. (The dive changes the color inside the 3D scene.) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: color,
          opacity: phase === "fading" || (phase === "arrived" && reducedMotion) ? 1 : 0,
          transition: `opacity ${fadeDuration}s ease`,
        }}
      />
    </main>
  );
}
