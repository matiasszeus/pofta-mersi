import { expect, test, type Page } from "@playwright/test";

// Direct links to the album and the address following it (see
// AtelierWithAlbum): /album/<chapter> opens there, back closes it on the
// same page, leafing changes the address per chapter without adding
// history entries, X goes back to /atelier. Phone and desktop (see
// playwright.config.ts).
//
// Run: npm run build, then npx playwright test (or npm run test:e2e).

test.beforeEach(async ({ page }) => {
  // The first-opening hint (a page corner lifting) is not part of these.
  await page.addInitScript(() => localStorage.setItem("pm-album-hint", "1"));
});

const pageIndex = (page: Page) => page.locator("[data-page-index]").getAttribute("data-page-index");
const isOpen = (page: Page) => page.evaluate(() => !!document.querySelector(".album-open"));
const label = (page: Page) => page.locator(".sr-only p[aria-live]").textContent();

// Nothing in the album is moving any more.
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

test("/album/bratari opens at BRĂȚĂRI; back closes it, on the same page, at /atelier", async ({ page }, info) => {
  await page.goto("/album/bratari");
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  await page.locator("[data-page-index]").waitFor({ timeout: 15000 });
  await settled(page);
  // BRĂȚĂRI's divider is page 4: the 4th view on a phone (one page each),
  // the 3rd on a wide screen (two pages each, the first: cover + page 1).
  expect(await pageIndex(page)).toBe(info.project.name === "desktop" ? "2" : "3");
  expect(await label(page)).toContain("4");
  expect(page.url()).toMatch(/\/album\/bratari$/);

  await page.goBack();
  await expect.poll(() => isOpen(page)).toBe(false);
  expect(new URL(page.url()).pathname).toBe("/atelier");
  // The same page (not loaded again, not another site).
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
});

test("/album/tricouri (not in the book yet) opens INVENTAR, the address becomes /album", async ({ page }) => {
  await page.goto("/album/tricouri");
  await page.locator("[data-page-index]").waitFor({ timeout: 15000 });
  await settled(page);
  expect(await pageIndex(page)).toBe("0");
  expect(new URL(page.url()).pathname).toBe("/album");
});

test("tap on the album: /album; leafing to BRĂȚĂRI: /album/bratari, no new history entries; X: /atelier", async ({ page }) => {
  await page.goto("/atelier");
  const album = page.locator("[data-object] .obj-art");
  await album.waitFor();
  await page.waitForTimeout(6000); // the letters land, the album is slammed down
  const box = (await album.boundingBox())!;
  const length = await page.evaluate(() => history.length);
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator("[data-page-index]").waitFor();
  await settled(page);
  expect(new URL(page.url()).pathname).toBe("/album");
  expect(await page.evaluate(() => history.length)).toBe(length + 1);

  // Leaf on (arrow key) until BRĂȚĂRI; one entry the whole time.
  for (let i = 0; i < 6 && !new URL(page.url()).pathname.endsWith("/bratari"); i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    await settled(page);
    expect(await page.evaluate(() => history.length)).toBe(length + 1);
  }
  expect(new URL(page.url()).pathname).toBe("/album/bratari");

  await page.getByRole("button", { name: "Închide albumul" }).click();
  await expect.poll(() => isOpen(page)).toBe(false);
  expect(new URL(page.url()).pathname).toBe("/atelier");
});

test("/ is the landing as before", async ({ page }) => {
  await page.goto("/");
  await page.locator("canvas").first().waitFor();
  expect(new URL(page.url()).pathname).toBe("/");
  expect(await page.locator(".atelier-main").count()).toBe(0);
  expect(await page.locator("[data-object]").count()).toBe(0);
});

test("link previews: title, description, picture, canonical", async ({ page }) => {
  for (const [path, title, image, canonical] of [
    ["/album/bratari", "Pofta Mersi · brățări", "/og/bratari.jpg", "/album/bratari"],
    ["/album/stickere", "Pofta Mersi · stickere", "/og/stickere.jpg", "/album/stickere"],
    ["/album", "Pofta Mersi · album", "/og/album.jpg", "/album"],
    ["/album/tricouri", "Pofta Mersi · album", "/og/album.jpg", "/album"],
    ["/atelier", "Pofta Mersi · atelier", "/og/atelier.jpg", "/atelier"],
    ["/", "Pofta Mersi", "/og/atelier.jpg", "/"],
  ]) {
    await page.goto(path);
    expect(await page.title(), path).toBe(title);
    const meta = (sel: string) => page.locator(sel).first().getAttribute("content");
    expect(await meta('meta[property="og:title"]'), path).toBe(title);
    expect(await meta('meta[name="description"]'), path).toBeTruthy();
    expect(await meta('meta[name="twitter:card"]'), path).toBe("summary_large_image");
    const og = new URL((await meta('meta[property="og:image"]'))!);
    expect(og.pathname, path).toBe(image);
    expect(await meta('meta[property="og:image:width"]'), path).toBe("1200");
    const href = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(href!).pathname, path).toBe(canonical);
    // The picture is really there.
    expect((await page.request.get(og.pathname)).status(), image).toBe(200);
  }
});
