import type { SyntheticEvent } from "react";

// A picture or video that does not load (missing file, network gone): it
// is simply not shown, and keeps its place (visibility, not display), so
// nothing around it moves. What lies under it shows instead (the page's
// paper, the photo's black frame, the mat). Use as onError={hideOnError}.
export function hideOnError(e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) {
  e.currentTarget.style.visibility = "hidden";
}

// The same for a picture that failed before the page's script was running
// (in the HTML from the server, before React took over): its onError came
// too early. As a ref: checked once it is in the page.
export function hideIfBroken(img: HTMLImageElement | null) {
  if (img && img.complete && img.naturalWidth === 0 && img.currentSrc) img.style.visibility = "hidden";
}
