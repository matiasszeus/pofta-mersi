import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { theme } from "@/config/theme";
import type { MatObjectConfig, Placed } from "./objectLayout";

// none    = already lying on the mat (direct visit)
// waiting = coming from the landing, the letters are still landing
// slam    = the letters have landed: slam it down (after `slamDelay`)
// fade    = coming from the landing with reduced motion: a short fade in
export type Entrance = "none" | "waiting" | "slam" | "fade";

type ShadowPose = { x: number; y: number; scale: number; opacity: number };

const { shadow, slam, pulse, hoverScale, hoverDuration, reducedMotionFade } = theme.atelier.object;
const slamDuration = slam.fall + slam.squashDuration;

// CSS variables for one pose of the shadow, e.g. --obj-shadow-hover-x.
function shadowVars(name: string, pose: ShadowPose) {
  return {
    [`--obj-shadow-${name}-x`]: `${pose.x}px`,
    [`--obj-shadow-${name}-y`]: `${pose.y}px`,
    [`--obj-shadow-${name}-scale`]: pose.scale,
    [`--obj-shadow-${name}-opacity`]: pose.opacity,
  };
}

const shadowPose = (p: ShadowPose) =>
  `translate: ${p.x}px ${p.y}px; scale: ${p.scale}; opacity: ${p.opacity};`;

// The slam, as keyframes. Their percentages depend on the durations in
// theme.ts, and the turn on each object's rotation, so they are written here
// rather than in globals.css.
//   0%      in the air: big, turned, faint wide shadow
//   impact  normal size, shadow snapped tight and dark
//   +a bit  squashed a little
//   100%    at rest
// Each keyframe's timing function shapes the way to the next one: an ease-in
// (slow, then faster and faster, like falling) down to the impact.
function slamKeyframes(name: string, rotation: number) {
  const impact = (slam.fall / slamDuration) * 100;
  const squashed = ((slam.fall + slam.squashDuration * 0.4) / slamDuration) * 100;
  const fallEase = "cubic-bezier(0.4, 0, 0.9, 0.4)";
  return `
    @keyframes ${name} {
      0% { scale: ${slam.startScale}; rotate: ${rotation + slam.startTurn}deg; animation-timing-function: ${fallEase}; }
      ${impact}% { scale: 1; rotate: ${rotation}deg; animation-timing-function: ease-out; }
      ${squashed}% { scale: ${slam.squash}; animation-timing-function: ease-in-out; }
      100% { scale: 1; rotate: ${rotation}deg; }
    }
    @keyframes ${name}-shadow {
      0% { ${shadowPose(slam.shadowStart)} animation-timing-function: ${fallEase}; }
      ${impact}% { ${shadowPose(slam.shadowImpact)} animation-timing-function: ease-out; }
      100% { ${shadowPose(shadow.rest)} }
    }
  `;
}

type MatObjectProps = {
  object: MatObjectConfig;
  // Its place and turn on the mat (see matLayout); null = not known yet
  // (on the server): hidden until then.
  place: Placed | null;
  entrance: Entrance;
  // Seconds from the start of the slam phase until this object starts falling.
  slamDelay?: number;
  // Optional: a tap calls this (with the link element) instead of going to
  // the object's page. Used for the album (see AtelierWithAlbum).
  onActivate?: (link: HTMLAnchorElement) => void;
  // Optional: drawn instead of the picture and its shadow, filling the
  // object's box (the album drawn in code).
  art?: ReactNode;
};

// One object lying on the atelier mat (the album):
// a picture that links to its page, lifts a little on hover / press, and can
// be slammed down onto the mat.
//
// Its shadow is a second copy of the same image (same file, downloaded once),
// turned black and blurred, under it. Moving, scaling and fading that copy is
// cheap for the browser; animating a CSS drop-shadow would make it re-blur
// the whole image on every frame.
export function MatObject({ object, place, entrance, slamDelay = 0, onActivate, art }: MatObjectProps) {
  const animationName = `slam-${object.key}`;
  const rotation = place?.rotation ?? 0;

  const vars = {
    "--obj-rotation": `${rotation}deg`,
    "--obj-hover-scale": hoverScale,
    "--obj-hover-duration": `${hoverDuration}s`,
    "--obj-shadow-blur": `${shadow.blur}px`,
    ...shadowVars("rest", shadow.rest),
    ...shadowVars("hover", shadow.hover),
    "--obj-slam-name": animationName,
    "--obj-slam-shadow-name": `${animationName}-shadow`,
    "--obj-slam-delay": `${slamDelay}s`,
    "--obj-slam-duration": `${slamDuration}s`,
    "--obj-pulse-delay": `${slamDelay + slamDuration + pulse.delay}s`,
    "--obj-pulse-duration": `${pulse.duration}s`,
    "--obj-fade-duration": `${reducedMotionFade}s`,
    // Place and size, read by the classes below.
    "--obj-width": `${place?.width ?? 0}px`,
    "--obj-left": `${place?.left ?? 0}px`,
    "--obj-top": `${place?.top ?? 0}px`,
  } as CSSProperties;

  const state = { none: "", waiting: "obj-waiting", slam: "obj-slam", fade: "obj-fade" }[entrance];
  // Shown this wide, so the browser picks a suitably sized file.
  const sizes = place ? `${Math.ceil(place.width)}px` : "50vw";

  return (
    <Link
      href={object.href}
      aria-label={object.ariaLabel}
      data-object={object.key}
      onClick={
        onActivate &&
        ((e) => {
          e.preventDefault(); // no navigation
          onActivate(e.currentTarget);
        })
      }
      className={`mat-object absolute z-10 block w-(--obj-width) top-(--obj-top) left-(--obj-left) ${place ? "" : "invisible"} ${state}`}
      style={vars}
    >
      {entrance === "slam" && <style>{slamKeyframes(animationName, rotation)}</style>}
      <div className="obj-art relative w-full">
        {art ?? (
          <>
            <Image
              src={object.src}
              width={object.width}
              height={object.height}
              alt=""
              aria-hidden
              sizes={sizes}
              priority
              className="obj-shadow absolute inset-0 h-auto w-full"
            />
            <Image
              src={object.src}
              width={object.width}
              height={object.height}
              alt={object.alt}
              // Visible right away: load it first, without lazy loading.
              priority
              sizes={sizes}
              className="relative h-auto w-full"
            />
          </>
        )}
      </div>
    </Link>
  );
}
