import { expect, test, type Page } from "@playwright/test";

// Devices without real 3D (see src/lib/gpuTier.ts, shouldUse3D) get still
// pictures instead of the WebGL letters; ?no3d=1 forces that. Then:
//   - no WebGL context is ever created (counted from the page's start)
//   - the landing shows its still title; a tap goes on to the atelier
//   - the atelier shows the letters as pictures (loaded), the album works
// Without ?no3d=1, on a device with a graphics card: the 3D as before.
//
// Run: npm run build, then npx playwright test (or npm run test:e2e).

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pm-album-hint", "1");
    // Count every WebGL context the page creates.
    const w = window as unknown as { webglContexts: number };
    w.webglContexts = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      const ctx = (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
      if (ctx && /webgl/i.test(type)) w.webglContexts++;
      return ctx;
    } as typeof original;
  });
});

const webglContexts = (page: Page) => page.evaluate(() => (window as unknown as { webglContexts: number }).webglContexts);

test("?no3d=1: the landing's still title, a tap to the atelier's still letters, no WebGL at all", async ({ page }) => {
  await page.goto("/?no3d=1");
  const title = page.locator("img.static-title");
  await title.waitFor({ state: "attached" });
  await page.waitForTimeout(1500);
  // The still title shows (it is not swapped for a 3D scene), loaded.
  expect(await title.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await title.evaluate((img) => getComputedStyle(img).opacity)).toBe("1");
  expect(await page.locator("canvas").count()).toBe(0);

  // A tap: the title leaves, the atelier's color rises, then the atelier.
  const { width, height } = page.viewportSize()!;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(width / 2, height / 2);
  else await page.mouse.click(width / 2, height / 2);
  await page.waitForURL("**/atelier", { timeout: 10000 });
  await page.locator("[data-object] .obj-art").waitFor();
  await page.waitForTimeout(3000);
  await expectStillAtelier(page);
});

test("?no3d=1 straight on /atelier: still letters, no WebGL; the album opens", async ({ page }) => {
  await page.goto("/atelier?no3d=1");
  await page.locator("[data-object] .obj-art").waitFor();
  await page.waitForTimeout(3000);
  await expectStillAtelier(page);

  // The album (CSS 3D, not WebGL) opens as everywhere.
  const box = (await page.locator("[data-object] .obj-art").boundingBox())!;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  else await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator("[data-page-index]").waitFor();
  expect(await webglContexts(page)).toBe(0);
});

async function expectStillAtelier(page: Page) {
  const letters = page.locator('img[src^="/images/litere/"]');
  // Phones: 3 letters on the mat; wide screens: more.
  expect(await letters.count()).toBeGreaterThanOrEqual(3);
  for (const img of await letters.all()) {
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  expect(await page.locator("canvas").count()).toBe(0);
  expect(await webglContexts(page)).toBe(0);
}

test("without ?no3d=1, with a graphics card: the 3D letters as before", async ({ page }) => {
  await page.goto("/atelier");
  // Only meaningful where this browser has real 3D (not software WebGL).
  const real3D = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    return !/swiftshader|llvmpipe|software|microsoft basic render/i.test(name);
  });
  test.skip(!real3D, "this browser has no graphics card (software WebGL): the pictures are right here");
  await page.locator("canvas").first().waitFor({ timeout: 10000 });
  expect(await page.locator('img[src^="/images/litere/"]').count()).toBe(0);
  await page.goto("/");
  await page.locator("canvas").first().waitFor({ timeout: 10000 });
});
