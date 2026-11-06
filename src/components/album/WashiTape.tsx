import { theme } from "@/config/theme";
import { u } from "./albumUnits";

const { tape } = theme.album.photos;

// The strip of washi tape at the top of a photo's frame (sizes in u, so it
// scales with the frame it is in: the photo on the page, or the big one in
// PhotoZoom, which grows and lands with it on). No animation of its own.
export function WashiTape({ color, rotation }: { color: string; rotation: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: u(tape.left),
        top: u(tape.top),
        width: u(tape.width),
        height: u(tape.height),
        opacity: tape.opacity,
        background: color,
        rotate: `${rotation}deg`,
      }}
    />
  );
}
