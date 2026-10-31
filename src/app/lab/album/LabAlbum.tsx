"use client";

import { useCallback, useState } from "react";
import { AlbumOpening, type AlbumPhoto } from "@/components/album/AlbumOpening";
import { AtelierStage } from "@/components/atelier/AtelierStage";
import { useReducedMotion } from "@/components/hero/useReducedMotion";
import { theme } from "@/config/theme";

const album = theme.atelier.objects[0];

// The atelier's stage, with the album opening on tap instead of going to
// /album; plus lab-only buttons to replay the opening or close it.
export function LabAlbum() {
  const reducedMotion = useReducedMotion();
  // The album on the mat at the moment of the tap; null = closed.
  const [photo, setPhoto] = useState<AlbumPhoto | null>(null);
  const [run, setRun] = useState(0);
  const [albumHidden, setAlbumHidden] = useState(false);

  const onObjectActivate = useCallback((key: string, link: HTMLAnchorElement) => {
    if (key !== album.key) return;
    const r = link.getBoundingClientRect(); // the link is not turned: its box
    const img = link.querySelector<HTMLImageElement>("img:last-of-type");
    setPhoto({
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      src: album.src,
      width: album.width,
      height: album.height,
      rotation: album.rotation,
      sizes: img?.sizes ?? "100vw",
    });
  }, []);

  const close = () => {
    setPhoto(null);
    setAlbumHidden(false);
  };

  return (
    // display: contents = no box of its own, the stage is laid out exactly
    // as on /atelier. The class hides the album on the mat while its copy
    // opens.
    <div className={`contents ${albumHidden ? "hide-album" : ""}`}>
      <AtelierStage onObjectActivate={onObjectActivate} />
      {photo && (
        <>
          <AlbumOpening key={run} from={photo} reducedMotion={reducedMotion} onCovering={() => setAlbumHidden(true)} />
          <div className="fixed top-[max(env(safe-area-inset-top),12px)] right-3 z-50 flex gap-2 font-sans text-sm">
            <button
              type="button"
              className="rounded-full bg-white/85 px-3 py-1.5 text-black shadow"
              onClick={() => {
                setAlbumHidden(false);
                setRun((n) => n + 1);
              }}
            >
              reia animația
            </button>
            <button type="button" className="rounded-full bg-white/85 px-3 py-1.5 text-black shadow" onClick={close}>
              închide
            </button>
          </div>
        </>
      )}
    </div>
  );
}
