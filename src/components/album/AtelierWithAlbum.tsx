"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import type { Placed } from "@/components/atelier/objectLayout";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { content } from "@/config/content";
import { theme } from "@/config/theme";
import { MatAlbum, matAlbumObject } from "./MatAlbum";

const album = matAlbumObject(theme.atelier.objects[0]);
const overrides = { [album.key]: album };

const pill = "rounded-full bg-white/85 px-3 py-1.5 text-black shadow";

// The atelier's stage with the album drawn in code lying on the mat: a tap
// opens it right there (see MatAlbum), "închide" puts it back. Used by
// /atelier and /lab/album; `lab` adds a button to replay the opening.
export function AtelierWithAlbum({ lab = false }: { lab?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  const dim = useRef<HTMLDivElement>(null);

  const onObjectActivate = useCallback((key: string) => {
    if (key === album.key) setOpen(true);
  }, []);

  const art = useMemo(
    () => ({
      // Given where the album lies on the mat (see matLayout).
      [album.key]: (_: typeof album, place: Placed) => (
        <MatAlbum place={place} open={open} run={run} reducedMotion={reducedMotion} dimRef={dim} />
      ),
    }),
    [open, run, reducedMotion],
  );

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as without it.
    <div className={`contents ${open ? "album-open" : ""}`}>
      <AtelierStage onObjectActivate={onObjectActivate} objectArt={art} objectOverrides={overrides} />
      {/* Darkens the mat (letters, note) under the open album; while open it
          also takes the taps meant for them. */}
      <div
        ref={dim}
        className={`fixed inset-0 z-15 h-lvh opacity-0 ${open ? "" : "pointer-events-none"}`}
        style={{ background: theme.album.opening.dim.color }}
      />
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
