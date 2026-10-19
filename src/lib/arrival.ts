// Remembers when the landing's dive last ended, so the atelier can tell
// "arrived from the landing" (play the landing animation) from "opened
// directly" (link, refresh, back: letters already lying on the mat).
//
// A plain module variable: it survives page changes inside the site (Next
// swaps pages without reloading the JavaScript) but is gone after a refresh
// or a new visit, which is exactly the difference we need.
let diveEndedAt = -Infinity;

export function markDiveArrival() {
  diveEndedAt = performance.now();
}

// true if the dive ended less than `withinSeconds` ago. Reading does not
// clear it, so React may safely call this more than once.
export function arrivedFromDive(withinSeconds: number) {
  return performance.now() - diveEndedAt < withinSeconds * 1000;
}
