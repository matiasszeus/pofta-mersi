import { expect, test, type Page } from "@playwright/test";

// When things go wrong, the site carries on:
//   - an unknown address: the 404 note on the mat, a way back to the atelier
//   - a broken cart in localStorage: an empty cart, no crash
//   - the browser taking WebGL away: the still pictures (landing, atelier)
//   - a picture that does not load: hidden, nothing around it moves
//
// Run: npm run build, then npx playwright test (or npm run test:e2e).

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

// Takes the WebGL context away from every 3D canvas on the page, as the
// browser would (WEBGL_lose_context).
async function loseWebGL(page: Page) {
  return page.evaluate(() => {
    let lost = 0;
    for (const canvas of document.querySelectorAll("canvas")) {
      const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
      const ext = gl?.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
        lost++;
      }
    }
    return lost;
  });
}

test("an unknown address: the 404 note, and a way back to the atelier", async ({ page }) => {
  const response = await page.goto("/nu-exista-pagina-asta");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("pagina asta a căzut sub masă")).toBeVisible();
  const back = page.getByRole("link", { name: "înapoi la atelier" });
  await expect(back).toHaveAttribute("href", "/atelier");
  await back.click();
  await page.waitForURL("**/atelier");
});

test("a broken cart in localStorage: an empty cart, no crash", async ({ page }) => {
  const errors = collectErrors(page);
  for (const broken of ["{not json", '[null, 7, {"id": 1}, {"id": "x", "nume": "x", "pret": "NaN", "cantitate": 2}]', '{"a": 1}']) {
    await page.addInitScript((value) => localStorage.setItem("pofta-cos", value), broken);
    await page.goto("/atelier");
    const calc = page.locator('a[href="/cos"]').first();
    await calc.waitFor({ timeout: 10000 });
    await expect(calc).toHaveAttribute("aria-label", /0 produse, total 0,00 lei/);
  }
  expect(errors).toEqual([]);
});

test("a good item in the cart still counts next to broken ones", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "pofta-cos",
      JSON.stringify([null, { id: "x", nume: "Test", pret: 10, cantitate: 2 }, { id: "y", pret: -1 }]),
    ),
  );
  await page.goto("/atelier");
  const calc = page.locator('a[href="/cos"]').first();
  await calc.waitFor({ timeout: 10000 });
  await expect(calc).toHaveAttribute("aria-label", /2 produse, total 20,00 lei/);
});

test("WebGL taken away on the atelier: the letters' pictures instead", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/atelier");
  await page.waitForTimeout(5000);
  test.skip((await page.locator("canvas").count()) === 0, "no 3D here (no graphics card): the pictures are already used");
  expect(await loseWebGL(page)).toBeGreaterThan(0);
  await expect.poll(() => page.locator('img[src^="/images/litere/"]').count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator("canvas").count()).toBe(0);
  expect(errors).toEqual([]);
});

test("WebGL taken away on the landing: the still title instead", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await page.waitForTimeout(4000);
  test.skip((await page.locator("canvas").count()) === 0, "no 3D here (no graphics card): the still title is already used");
  expect(await loseWebGL(page)).toBeGreaterThan(0);
  await expect.poll(() => page.locator("canvas").count()).toBe(0);
  await expect.poll(() => page.locator("img.static-title").evaluate((img) => getComputedStyle(img).opacity)).toBe("1");
  expect(errors).toEqual([]);
});

test("pictures that do not load are hidden, keeping their place", async ({ page }) => {
  const errors = collectErrors(page);
  // The note's paper and the landing's flowers never arrive.
  await page.route(/notita\.png|flowers-(landscape|portrait)\.webp/, (route) => route.abort());
  await page.goto("/");
  const flowers = page.locator('img[src*="flowers-"]');
  await expect.poll(() => flowers.evaluate((img) => getComputedStyle(img).visibility)).toBe("hidden");
  await page.goto("/atelier");
  await page.waitForTimeout(4000);
  const paper = page.locator('img[src*="notita.png"]').first();
  await expect.poll(() => paper.evaluate((img) => getComputedStyle(img).visibility)).toBe("hidden");
  // Still laid out where it was (visibility keeps the box).
  const box = await paper.boundingBox();
  expect(box && box.width > 20 && box.height > 20).toBe(true);
  expect(errors).toEqual([]);
});
