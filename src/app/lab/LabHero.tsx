"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBackground } from "@/components/PageBackground";
import { FlowerBackground } from "@/components/hero/FlowerBackground";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";

// WebGL only exists in the browser, so the canvas is never rendered on the server.
// The <main> below already has the background color, which doubles as placeholder.
const HeroCanvas = dynamic(() => import("@/components/hero/HeroCanvas"), { ssr: false });

// idle    = letters wait in their outlines
// diving  = a tap happened; letters fall and the camera dives after them
// fading  = reduced motion only: the screen fades to the next page's color
// arrived = the screen shows the next page's color; navigate
type Phase = "idle" | "diving" | "fading" | "arrived";

export function LabHero() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [debug, setDebug] = useState(theme.debug.enabled);
  // Changing this rebuilds the canvas from scratch (letters back in their outlines).
  const [run, setRun] = useState(0);
  const { href, fadeDuration, color } = theme.transition;

  // One tap starts the sequence; taps while it is running do nothing.
  // With reduced motion there is no fall, only the fade.
  const start = () => {
    if (phase === "idle") setPhase(reducedMotion ? "fading" : "diving");
  };

  const arrive = useCallback(() => setPhase((p) => (p === "idle" ? p : "arrived")), []);

  // Download the next page in the background so the switch is instant.
  useEffect(() => router.prefetch(href), [router, href]);

  // Safety net: arrive even if some letter never reports that it is gone.
  useEffect(() => {
    if (phase !== "diving") return;
    const timer = setTimeout(arrive, theme.fall.maxDuration * 1000);
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
      setRun((n) => n + 1);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    // h-dvh = full visible height, also with mobile browser bars showing.
    // touch-none = a finger on the canvas does not scroll/zoom the page.
    <main
      className="relative h-dvh w-full cursor-pointer touch-none select-none overflow-hidden"
      style={{ background: theme.colors.background }}
      onClick={start}
    >
      {/* On arrival the page itself already takes the atelier's color, so
          nothing else can show through while the pages switch. */}
      <PageBackground color={phase === "arrived" ? color : theme.colors.background} />
      <FlowerBackground />

      <HeroCanvas
        key={run}
        falling={phase === "diving" || (phase === "arrived" && !reducedMotion)}
        debug={debug}
        onDiveEnd={arrive}
      />

      {/* Plain link for anyone who does not get the interaction (or uses a keyboard). */}
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-2 text-sm transition-opacity duration-300 ${
          phase === "idle" ? "opacity-80 hover:opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ color: theme.hint.color }}
      >
        {theme.hint.skip}
      </Link>

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
