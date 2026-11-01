import { expect, test, type Page } from "@playwright/test";

// Leafing through the open album on a phone by tapping the edges of what is
// on the screen (see MatAlbum, "Leafing by hand"):
//   - a tap in the right 25% of the album's visible part = next page, in the
//     left 25% = back, whatever page is shown
//   - taps during a turn are ignored: never the wrong way, never a page
//     skipped
// The page on the screen is read from data-page-index on the open album.
//
// Run: npm run build, then npx playwright test (see playwright.config.ts).

const RUNS = 30;

// The same "random" places every time the test runs (a fixed seed).
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const index = (page: Page) =>
  page.locator("[data-page-index]").getAttribute("data-page-index").then((v) => Number(v));

// Nothing in the album is moving any more (turning, sliding, opening).
async function settled(page: Page) {
  await page.waitForFunction(() => {
    const album = document.querySelector("[data-page-index]");
    if (!album) return false;
    return document
      .getAnimations()
      .every((a) => a.playState !== "running" || !(a.effect instanceof KeyframeEffect) || !album.contains(a.effect.target as Node));
  });
}

// The album's part on the screen right now: everything of the book that is
// visible (pages, board, stacks, tabs, cover), cut to the screen.
async function visibleAlbum(page: Page) {
  return page.evaluate(() => {
    const parts = document.querySelectorAll(".ab-page, .ab-board, .ab-edge-r, .ab-tab, .ab-cover");
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    for (const el of parts) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right < 0 || r.left > innerWidth) continue;
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
    }
    // Up and down: the page on the screen (in the middle of the screen).
    const shown = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest(".ab-page");
    const p = shown!.getBoundingClientRect();
    top = p.top;
    bottom = p.bottom;
    return { left: Math.max(0, left), right: Math.min(innerWidth, right), top, bottom };
  });
}

async function openAlbum(page: Page) {
  // The first-opening hint (a page corner lifting) is not part of this test.
  await page.addInitScript(() => localStorage.setItem("pm-album-hint", "1"));
  await page.goto("/atelier");
  const album = page.locator("[data-object] .obj-art");
  await album.waitFor();
  // The album has landed on the mat.
  await page.waitForTimeout(2500);
  const box = (await album.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator("[data-page-index]").waitFor();
  await settled(page);
}

// A tap low on the page (under the tabs, the coupon and the photos), in the
// right / left 25% of the album's visible part, at a varying place in it.
async function tapEdge(page: Page, side: "right" | "left", rand: () => number) {
  const a = await visibleAlbum(page);
  const zone = (a.right - a.left) * 0.25;
  const inZone = 2 + rand() * (zone - 4);
  const x = side === "right" ? a.right - inZone : a.left + inZone;
  const y = a.top + (a.bottom - a.top) * 0.92;
  await page.touchscreen.tap(x, y);
  return Math.round(x);
}

type Wrong = { run: number; from: number; to: number; side: string; x: number };

test("tapping the edges turns exactly one page, the right way (30 runs)", async ({ page }) => {
  const rand = seeded(42);
  const wrong: Wrong[] = [];
  let failedRuns = 0;
  for (let run = 1; run <= RUNS; run++) {
    if (run === 1) await openAlbum(page);
    else {
      await page.reload();
      await page.locator("[data-object] .obj-art").waitFor();
      await page.waitForTimeout(2500);
      const box = (await page.locator("[data-object] .obj-art").boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.locator("[data-page-index]").waitFor();
      await settled(page);
    }
    const before = wrong.length;
    // Forwards to the last page, then back to the first.
    for (const side of ["right", "left"] as const) {
      const step = side === "right" ? 1 : -1;
      for (let attempt = 0; attempt < 20; attempt++) {
        const from = await index(page);
        const x = await tapEdge(page, side, rand);
        await page.waitForTimeout(150);
        await settled(page);
        const to = await index(page);
        if (to === from) break; // the end (or the start): nowhere to go
        if (to !== from + step) wrong.push({ run, from, to, side, x });
      }
    }
    // Back at the first page.
    expect.soft(await index(page), `run ${run}: back at the first page`).toBe(0);
    if (wrong.length > before) failedRuns++;
  }
  console.log(`\nRuns with a wrong turn: ${failedRuns} of ${RUNS}`);
  for (const w of wrong) console.log(`  run ${w.run}: tap ${w.side} at x=${w.x}: page ${w.from} -> ${w.to}`);
  expect(wrong, "every tap turned exactly one page, the right way").toEqual([]);
});

test("fast taps during the turns: never the wrong way, never a page skipped", async ({ page }) => {
  const rand = seeded(7);
  await openAlbum(page);
  // Every change of the page index, recorded in the page as it happens.
  await page.evaluate(() => {
    const album = document.querySelector("[data-page-index]")!;
    const seen: number[] = [Number(album.getAttribute("data-page-index"))];
    (window as unknown as { __seen: number[] }).__seen = seen;
    new MutationObserver(() => seen.push(Number(album.getAttribute("data-page-index")))).observe(album, {
      attributes: true,
      attributeFilter: ["data-page-index"],
    });
  });
  for (const side of ["right", "left"] as const) {
    for (let i = 0; i < 25; i++) {
      await tapEdge(page, side, rand);
      await page.waitForTimeout(150);
    }
    await settled(page);
  }
  const seen = await page.evaluate(() => (window as unknown as { __seen: number[] }).__seen);
  console.log(`\nPages seen: ${seen.join(" ")}`);
  // Going right: +1 at a time up to the end; then -1 at a time back.
  const top = Math.max(...seen);
  const turn = seen.indexOf(top);
  for (let i = 1; i < seen.length; i++) {
    const expected = i <= turn ? 1 : -1;
    expect(seen[i] - seen[i - 1], `change ${i}: ${seen[i - 1]} -> ${seen[i]}`).toBe(expected);
  }
  expect(seen[0]).toBe(0);
  expect(seen[seen.length - 1]).toBe(0);
});
