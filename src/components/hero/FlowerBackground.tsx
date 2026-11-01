import { theme } from "@/config/theme";

// The landing's background: one still image, cropped to fill the screen
// (object-fit: cover). <picture> lets the browser download only the version
// that fits the screen's orientation.
//
// fixed + 100lvh ("large viewport height" = the height with Safari's bars
// hidden), so the image also reaches under the browser bars on iPhone.
export function FlowerBackground() {
  const { flowersPortrait, flowersLandscape } = theme.landing;

  return (
    <picture className="pointer-events-none fixed inset-0 h-lvh">
      <source media="(orientation: portrait)" srcSet={flowersPortrait} />
      {/* A plain <img>: next/image cannot switch files by orientation.
          alt="" marks it as decoration for screen readers. */}
      <img src={flowersLandscape} alt="" draggable={false} className="art h-full w-full object-cover" />
    </picture>
  );
}
