"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageBackground } from "@/components/PageBackground";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";

// WebGL only exists in the browser, so the canvas is never rendered on the server.
// The <main> below already has the background color, which doubles as placeholder.
const HeroCanvas = dynamic(() => import("@/components/hero/HeroCanvas"), { ssr: false });

// idle    = letters wait in their outlines
// falling = a tap happened; letters drop out of the screen
// leaving = the screen fades to the next page's color, then we navigate
type Phase = "idle" | "falling" | "leaving";

export function LabHero() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const [debug, setDebug] = useState(theme.debug.enabled);
  // Where the hint text goes; the 3D scene reports it once it has measured itself.
  const [hintTop, setHintTop] = useState<number | null>(null);
  // Changing this rebuilds the canvas from scratch (letters back in their outlines).
  const [run, setRun] = useState(0);
  const { href, duration, color } = theme.transition;

  // One tap starts the sequence; taps while it is running do nothing.
  // With reduced motion there is no fall, only the fade.
  const start = () => {
    if (phase === "idle") setPhase(reducedMotion ? "leaving" : "falling");
  };

  const leave = useCallback(() => setPhase((p) => (p === "falling" ? "leaving" : p)), []);

  // Download the next page in the background so the switch is instant.
  useEffect(() => router.prefetch(href), [router, href]);

  // Safety net: leave even if some letter never reports that it is gone.
  useEffect(() => {
    if (phase !== "falling") return;
    const timer = setTimeout(leave, theme.fall.maxDuration * 1000);
    return () => clearTimeout(timer);
  }, [phase, leave]);

  // Once the fade has covered the screen, go to the next page.
  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => router.push(href), duration * 1000);
    return () => clearTimeout(timer);
  }, [phase, router, href, duration]);

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
      <PageBackground color={theme.colors.background} />

      <HeroCanvas
        key={run}
        falling={phase === "falling"}
        animate={!reducedMotion}
        debug={debug}
        onAllGone={leave}
        onHintTop={setHintTop}
      />

      {/* Hint under the outlines; fades away once the sequence starts. */}
      {hintTop !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 text-center transition-opacity duration-300"
          style={{ top: `${hintTop * 100}%`, color: theme.hint.color, opacity: phase === "idle" ? 1 : 0 }}
        >
          <p className="animate-pulse text-xs uppercase tracking-[0.3em] motion-reduce:animate-none">
            {/* pointer-coarse = the main input is a finger, not a mouse */}
            <span className="pointer-coarse:hidden">{theme.hint.mouse}</span>
            <span className="hidden pointer-coarse:inline">{theme.hint.touch}</span>
          </p>
        </div>
      )}

      {/* Plain link for anyone who does not get the interaction (or uses a keyboard). */}
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-2 text-sm opacity-60 transition-opacity hover:opacity-100"
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

      {/* The fade: a sheet in the next page's color, on top of everything. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: color,
          opacity: phase === "leaving" ? 1 : 0,
          transition: `opacity ${duration}s ease`,
        }}
      />
    </main>
  );
}
