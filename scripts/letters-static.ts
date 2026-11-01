// Renders the atelier's letters once as pictures, for devices without 3D
// (see shouldUse3D and StaticMatLetters): public/images/litere/<char>.webp,
// see-through, each photographed from the real 3D letter (same font,
// material and lights) at /lab/litere?char=<char> (see LetterSnapshot).
// Run again when the letters' font, material, lights or size change:
//
//   npm run build
//   npm run letters
//
// Uses the production build (it starts it on port 3100 if nothing runs
// there) and the Google Chrome installed on this computer, with its
// graphics card (the pictures must come from real 3D, not from software).

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = process.env.URL ?? "http://localhost:3100";
const OUT = "public/images/litere";
const CANVAS = 400; // px, as theme.atelier.letters.still.canvas
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function up() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

let server: ChildProcess | null = null;
if (!(await up())) {
  server = spawn("npx", ["next", "start", "-p", "3100"], { shell: true, stdio: "ignore" });
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(500);
  if (!(await up())) throw new Error("The site did not start: run `npm run build` first.");
}

mkdirSync(OUT, { recursive: true });
// The graphics card, not software rendering.
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: CANVAS, height: CANVAS }, deviceScaleFactor: 1 });

try {
  // Which letters (theme.atelier.letters.still.chars).
  await page.goto(`${BASE}/lab/litere`);
  await page.waitForSelector("body[data-chars]");
  const chars = (await page.getAttribute("body", "data-chars"))!.split(",");
  for (const char of chars) {
    await page.goto(`${BASE}/lab/litere?char=${encodeURIComponent(char)}`);
    await page.waitForSelector("body[data-ready]", { timeout: 20000 });
    const png = await page.screenshot({ omitBackground: true });
    await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(`${OUT}/${char}.webp`);
    console.log(`${OUT}/${char}.webp`);
  }
} finally {
  await browser.close();
  if (server?.pid) {
    // npx starts next in a child process: stop the whole tree (waited for).
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
  }
}
