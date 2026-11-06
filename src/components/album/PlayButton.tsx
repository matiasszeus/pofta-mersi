import type { Ref } from "react";
import { theme } from "@/config/theme";
import { u } from "./albumUnits";

const pb = theme.album.playButton;

// The round ▶ in the middle of a photo (sizes in u, so it scales with the
// frame it is in: the small photo on the page, or the big one in PhotoZoom
// as it lands back on the page). `opacity`: while it fades in.
export function PlayButton({ ref, opacity }: { ref?: Ref<HTMLSpanElement>; opacity?: number }) {
  return (
    <span
      ref={ref}
      aria-hidden
      className="absolute top-1/2 left-1/2 flex items-center justify-center rounded-full"
      style={{
        width: u(pb.size),
        height: u(pb.size),
        marginLeft: u(-pb.size / 2),
        marginTop: u(-pb.size / 2),
        background: pb.background,
        boxShadow: pb.shadow,
        opacity,
      }}
    >
      <svg viewBox="0 0 10 10" style={{ width: "40%", height: "40%", marginLeft: "8%" }}>
        <path d="M1.5 0.8 L9 5 L1.5 9.2 Z" fill={pb.color} />
      </svg>
    </span>
  );
}
