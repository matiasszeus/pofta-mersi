import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy: the list of places the browser may load things
// from on this site. Anything else is refused (or, while the policy is
// "Report-Only", only reported in the console). One directive per line:
const csp = [
  // Everything not listed below: only from this site itself.
  "default-src 'self'",
  // JavaScript: our own files. 'unsafe-inline': Next.js puts small scripts
  // straight into the HTML (the page's data for React). 'wasm-unsafe-eval':
  // the physics engine (Rapier) is WebAssembly, which the browser must be
  // allowed to compile. 'unsafe-eval' only in dev (hot reload needs it).
  // blob:: code the page makes itself (troika, which draws drei's text,
  // starts its helper worker from such code). vercel.live: the comments
  // toolbar Vercel shows on preview deployments.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} blob: https://vercel.live`,
  // CSS: our own files, plus style="..." and <style> in the page (React's
  // inline styles, the album's CSS, the animations' keyframes).
  "style-src 'self' 'unsafe-inline'",
  // Pictures: ours; data: and blob: for pictures made in the page itself
  // (three.js, the browser's own small icons). vercel.live/vercel.com: the
  // preview toolbar's avatars and icons.
  "img-src 'self' data: blob: https://vercel.live https://vercel.com",
  // Fonts: only ours (public/fonts and next/font, all served from here).
  "font-src 'self' data:",
  // Videos (the bracelets): only ours.
  "media-src 'self' blob:",
  // fetch() and similar: ours (the 3D letters' font file, Next.js's page
  // data). ws: in dev for hot reload. The preview toolbar talks to
  // vercel.live and to Pusher (its live comments).
  `connect-src 'self'${isDev ? " ws: wss:" : ""} https://vercel.live wss://ws-us3.pusher.com`,
  // Web workers: ours, or made in the page (blob:).
  "worker-src 'self' blob:",
  // Pages shown inside ours (<iframe>): only the preview toolbar.
  "frame-src https://vercel.live",
  // No other site may show ours inside a frame (against "clickjacking":
  // our page hidden under a fake button). Same as X-Frame-Options: DENY.
  "frame-ancestors 'none'",
  // No <object>/<embed> plugins (old Flash-style content) at all.
  "object-src 'none'",
  // <base href>: may not point elsewhere (it would redirect every relative link).
  "base-uri 'self'",
  // Forms may only send to this site (the cart will have forms later).
  "form-action 'self'",
  // Anything the page asks for over http is fetched over https instead.
  // Only on Vercel (always https): a local build on http://localhost would
  // otherwise ask itself for https and find nothing.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Sent with every page and file of the site.
const securityHeaders = [
  // No other site may show ours in a frame (older browsers; CSP above for newer).
  { key: "X-Frame-Options", value: "DENY" },
  // The browser trusts the file type we send (no guessing "this .txt is a script").
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites we link to (e.g. Etichete Creative) see only
  // "poftamersi..." as where the visitor came from, not the full address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The site never uses the camera, microphone or location: switched off,
  // even for anything embedded. (The phone's tilt sensor is not affected.)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HTTPS only, remembered for 2 years, subdomains included. "preload":
  // allows adding the domain to the browsers' built-in HTTPS-only list
  // (a separate sign-up at hstspreload.org; hard to undo). Ignored on
  // http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Enforced: anything not allowed above is blocked (with an error in the
  // console naming the directive). Something new from another site (an
  // embed, analytics, a payment form...) must be added above first. To try a
  // change without risk, send it as "Content-Security-Policy-Report-Only":
  // then the browser only reports.
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Dev only: lets other devices on the home network (e.g. a phone) load the
  // dev server. Wildcard because the router may hand this PC a different address.
  allowedDevOrigins: ["192.168.1.*"],

  // Fonts and pictures change rarely: browsers may keep them for a week
  // without asking (and for a month more while quietly checking for a new
  // version), so a second visit loads them from the phone itself. Their file
  // names do not change with their content, hence not "forever".
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/fonts/:path*", headers: cache },
      { source: "/images/:path*", headers: cache },
      { source: "/videos/:path*", headers: cache },
    ];
  },
};

export default nextConfig;
