// Makes the pictures shown when a link is shared (WhatsApp, Instagram,
// Facebook): 1200x630 JPGs in public/og/, photographed from the site
// itself:
//   landing.jpg            the landing: the 3D title over the flowers (/)
//   atelier.jpg            the mat with the album lying closed (/atelier)
//   album.jpg              the album open at the contents (/album)
//   <chapter slug>.jpg     the album open at that chapter (/album/<slug>),
//                          for every chapter in the book
// Run again when the album or a chapter changes:
//
//   npm run build
//   npm run og
//
// Uses the production build (it starts it on port 3100 if nothing runs
// there) and the Google Chrome installed on this computer.

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

// The chapters in the book: the build makes a page for each
// (generateStaticParams in src/app/album/[capitol]/page.tsx).
const built = ".next/server/app/album";
if (!existsSync(built)) throw new Error("No build: run `npm run build` first.");
const bookSlugs = readdirSync(built)
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -".html".length));

const BASE = process.env.URL ?? "http://localhost:3100";
const OUT = "public/og";
const size = { width: 1200, height: 630 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function up() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

// The site: the one already running, or the production build started here.
let server: ChildProcess | null = null;
if (!(await up())) {
  server = spawn("npx", ["next", "start", "-p", "3100"], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(500);
  if (!(await up())) throw new Error("The site did not start: run `npm run build` first.");
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
// prefers-reduced-motion: a link opens the album at once (no animation).
const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: "reduce" });
// No first-opening hint (the page corner lifting) in the pictures.
await context.addInitScript(() => localStorage.setItem("pm-album-hint", "1"));
const page = await context.newPage();

async function shoot(path: string, file: string, albumOpen: boolean) {
  await page.goto(BASE + path, { waitUntil: "load" });
  if (albumOpen) {
    await page.locator("[data-page-index]").waitFor({ timeout: 15000 });
    // The close button is not part of the picture.
    await page.addStyleTag({ content: 'button[aria-label="Închide albumul"] { display: none !important; }' });
  }
  // Everything landed and loaded (the letters, the pictures on the pages;
  // the landing keeps fetching in the background: not waited for).
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await sleep(albumOpen ? 1500 : 7000);
  await page.screenshot({ path: `${OUT}/${file}`, type: "jpeg", quality: 88 });
  console.log(`${OUT}/${file}  <-  ${path}`);
}

try {
  await shoot("/", "landing.jpg", false);
  await shoot("/atelier", "atelier.jpg", false);
  await shoot("/album", "album.jpg", true);
  for (const slug of bookSlugs) await shoot(`/album/${slug}`, `${slug}.jpg`, true);
} finally {
  await browser.close();
  if (server?.pid) {
    // npx starts next in a child process: stop the whole tree.
    // (Waited for: the script must not end with the server still running.)
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
  }
}
