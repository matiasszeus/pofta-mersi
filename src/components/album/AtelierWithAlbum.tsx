"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import type { Placed } from "@/components/atelier/objectLayout";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { MatAlbum, matAlbumObject } from "./MatAlbum";

const album = matAlbumObject(theme.atelier.objects[0]);
const overrides = { [album.key]: album };

const pill = "rounded-full bg-white/85 px-3 py-1.5 text-black shadow";

// The mat stepping back while the album is open (see dimFade in theme.ts),
// as CSS variables for .mat-dims and the vignette (globals.css).
const { dimFade, dimCenter, dimEdge, objectsOpacity, opening } = theme.album;
const dimVars = {
  "--dim-fade": `${dimFade}s`,
  "--dim-easing": opening.flight.easing,
  "--objects-opacity": objectsOpacity,
} as CSSProperties;

// The atelier's stage with the album drawn in code lying on the mat: a tap
// opens it right there (see MatAlbum), "închide" puts it back. Used by
// /atelier and /lab/album; `lab` adds a button to replay the opening.
export function AtelierWithAlbum({ lab = false }: { lab?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  // The vignette is in the page from the tap until it has faded out after
  // closing (then taken away, not left at opacity 0).
  const [vignette, setVignette] = useState(false);
  if (open && !vignette) setVignette(true);

  const onObjectActivate = useCallback((key: string) => {
    if (key === album.key) setOpen(true);
  }, []);

  const art = useMemo(
    () => ({
      // Given where the album lies on the mat (see matLayout).
      [album.key]: (_: typeof album, place: Placed) => (
        <MatAlbum place={place} open={open} run={run} reducedMotion={reducedMotion} />
      ),
    }),
    [open, run, reducedMotion],
  );

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as without it.
    <div className={`contents ${open ? "album-open" : ""}`} style={dimVars}>
      <AtelierStage
        onObjectActivate={onObjectActivate}
        objectArt={art}
        objectOverrides={overrides}
        albumOpen={open}
      />
      {/* The vignette, between the mat (and what lies on it) and the album;
          while open it also takes the taps meant for the things on the mat. */}
      {vignette && (
        <div
          className={`fixed inset-0 z-15 h-lvh ${open ? "album-vignette-in" : "album-vignette-out pointer-events-none"}`}
          style={{ background: `radial-gradient(ellipse at center, ${dimCenter} 0%, ${dimEdge} 100%)` }}
          onAnimationEnd={() => {
            if (!open) setVignette(false);
          }}
        />
      )}
      {open && (
        <div className="fixed top-[max(env(safe-area-inset-top),12px)] right-3 z-50 flex gap-2 font-sans text-sm">
          {lab && (
            <button type="button" className={pill} onClick={() => setRun((n) => n + 1)}>
              {content.album.replay}
            </button>
          )}
          <button
            type="button"
            className={pill}
            onClick={() => {
              // A new run: reopened, it starts again from the contents.
              setOpen(false);
              setRun((n) => n + 1);
            }}
          >
            {content.album.close}
          </button>
        </div>
      )}
    </div>
  );
}
