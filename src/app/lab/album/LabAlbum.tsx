"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { MatAlbum, matAlbumObject } from "@/components/album/MatAlbum";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";

const album = matAlbumObject(theme.atelier.objects[0]);
const overrides = { [album.key]: album };

// The atelier's stage with the album drawn in code lying on the mat; a tap
// opens it instead of going to /album. Plus lab-only buttons to replay the
// opening or close it.
export function LabAlbum() {
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState(0);
  const dim = useRef<HTMLDivElement>(null);

  const onObjectActivate = useCallback((key: string) => {
    if (key === album.key) setOpen(true);
  }, []);

  const art = useMemo(
    () => ({ [album.key]: <MatAlbum object={album} open={open} run={run} reducedMotion={reducedMotion} dimRef={dim} /> }),
    [open, run, reducedMotion],
  );

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as on /atelier.
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
          <button
            type="button"
            className="rounded-full bg-white/85 px-3 py-1.5 text-black shadow"
            onClick={() => setRun((n) => n + 1)}
          >
            reia animația
          </button>
          <button
            type="button"
            className="rounded-full bg-white/85 px-3 py-1.5 text-black shadow"
            onClick={() => {
              // A new run: reopened, it starts again from the contents.
              setOpen(false);
              setRun((n) => n + 1);
            }}
          >
            închide
          </button>
        </div>
      )}
    </div>
  );
}
