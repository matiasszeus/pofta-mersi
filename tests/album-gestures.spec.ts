import { expect, test, type Page } from "@playwright/test";

// The system's gestures around the open album (see MatAlbum, AtelierWithAlbum):
//   - a swipe that starts in the screen's outer 20px (theme.album.systemEdge)
//     is the system's back / forward, never a page turn; further in it is
//   - back closes the album (popstate), a second back leaves for where you
//     came from
//   - the album never lets a sideways touchpad swipe go back in the browser
//     (overscroll-behavior-x: none)
//
// Run: npm run build, then npx playwright test (or npm run test:e2e).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("pm-album-hint", "1"));
});

const pageIndex = async (page: Page) => Number(await page.locator("[data-page-index]").getAttribute("data-page-index"));
const isOpen = (page: Page) => page.evaluate(() => !!document.querySelector(".album-open"));

async function settled(page: Page) {
  await page.waitForFunction(() => {
    const album = document.querySelector("[data-page-index]");
    return (
      !!album &&
      document
        .getAnimations()
        .every((a) => a.playState !== "running" || !(a.effect instanceof KeyframeEffect) || !album.contains(a.effect.target as Node))
    );
  });
}

async function openFromAtelier(page: Page) {
  await page.goto("/atelier");
  const album = page.locator("[data-object] .obj-art");
  await album.waitFor();
  await page.waitForTimeout(6000);
  const box = (await album.boundingBox())!;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator("[data-page-index]").waitFor();
  await settled(page);
}

// A one-finger swipe, as real touch events (Chrome's own input).
async function swipe(page: Page, from: [number, number], to: [number, number]) {
  const cdp = await page.context().newCDPSession(page);
  const point = ([x, y]: [number, number]) => [{ x, y }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from) });
  for (let i = 1; i <= 8; i++) {
    const p: [number, number] = [from[0] + ((to[0] - from[0]) * i) / 8, from[1] + ((to[1] - from[1]) * i) / 8];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(p) });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test("swipes from the screen's outer 20px are the system's; further in they turn the page", async ({ page }) => {
  test.skip(!test.info().project.use.hasTouch, "a touch screen's gesture");
  await openFromAtelier(page);
  const { width, height } = page.viewportSize()!;
  const y = height * 0.5;
  const next = async () => {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await settled(page);
  };
  const onAlbum = (x: number) =>
    page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest("[data-page-index]"), [x, y]);

  // Page 2 (a left page): the next page shows past the spine, right up to
  // the screen's right edge. A swipe from that edge to the left (the
  // system's forward) would turn to page 3: it must not.
  await next();
  expect(await pageIndex(page)).toBe(1);
  expect(await onAlbum(width - 6), "the swipe starts on the album").toBe(true);
  await swipe(page, [width - 6, y], [width - 180, y]);
  await page.waitForTimeout(300);
  await settled(page);
  expect(await pageIndex(page)).toBe(1);

  // Page 3 (a right page): the page before shows on the left, right up to
  // the screen's left edge. A swipe from that edge to the right (the
  // system's back) would turn back to page 2: it must not.
  await next();
  expect(await pageIndex(page)).toBe(2);
  expect(await onAlbum(6), "the swipe starts on the album").toBe(true);
  await swipe(page, [6, y], [180, y]);
  await page.waitForTimeout(300);
  await settled(page);
  expect(await pageIndex(page)).toBe(2);

  // The same swipe starting further in: back one page.
  await swipe(page, [60, y], [240, y]);
  await page.waitForTimeout(300);
  await settled(page);
  expect(await pageIndex(page)).toBe(1);
});

test("back closes the album (with its animation), a second back leaves for where you came from", async ({ page }) => {
  await page.goto("/");
  await openFromAtelier(page);
  expect(new URL(page.url()).pathname).toBe("/album");

  await page.goBack();
  await expect.poll(() => isOpen(page)).toBe(false);
  expect(new URL(page.url()).pathname).toBe("/atelier");
  // Closed with the closing animation, not cut off: the vignette fades out.
  expect(await page.locator(".album-vignette-out").count()).toBe(1);

  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
});

test("the open album lets no sideways touchpad swipe go back in the browser", async ({ page }) => {
  await openFromAtelier(page);
  const rules = await page.evaluate(() => ({
    album: getComputedStyle(document.querySelector<HTMLElement>("[data-page-index]")!).overscrollBehaviorX,
    page: getComputedStyle(document.documentElement).overscrollBehaviorX,
  }));
  expect(rules.album).toBe("none");
  expect(rules.page).toBe("none");
});

test("on a phone the open album keeps at least 12px from the screen's edges", async ({ page }) => {
  test.skip(!test.info().project.use.hasTouch, "phones");
  await openFromAtelier(page);
  const { width } = page.viewportSize()!;
  // The book's outer edge for the page on the screen (a right page: the
  // tabs and the stack on the right; a left page: the cover on the left).
  for (let i = 0; i < 4; i++) {
    const gap = await page.evaluate((w) => {
      const parts = [...document.querySelectorAll(".ab-board, .ab-edge-r, .ab-tab, .ab-cover")].map((el) => el.getBoundingClientRect());
      const onScreen = parts.filter((r) => r.right > 0 && r.left < w);
      const left = Math.min(...onScreen.map((r) => r.left));
      const right = Math.max(...onScreen.map((r) => r.right));
      return { left, right: w - right };
    }, width);
    // The outer side is the one where the book ends on the screen.
    const outer = Math.max(gap.left, gap.right);
    expect(outer, `view ${i}`).toBeGreaterThanOrEqual(12);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await settled(page);
  }
});
