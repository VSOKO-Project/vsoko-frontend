import { test, expect } from "./fixtures";
import { feedback, paged } from "../tests/fixtures";

const routes = ["/dashboard", "/workloads", "/feedback/new?workloadId=w1", "/my-feedback", "/teachers", "/disciplines?tab=ratings", "/disciplines?tab=feedback&targetId=d1", "/criteria", "/summaries", "/reports", "/periods", "/import", "/export"];
for (const width of [320, 375, 640, 768, 769, 1024, 1440]) {
  test(`layout audit at ${width}px`, async ({ page, app }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await app.signIn(true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(theme => localStorage.setItem("vsoko.theme", theme), testInfo.project.name === "mobile" ? "dark" : "light");
    for (const path of routes) {
      await page.goto(path);
      await expect(page.locator(".loading-skeleton")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll("main *")].filter(el => {
          if (el.closest(".table-wrapper, .coverage-scroll, .grade-trend-scroll, dialog")) return false;
          const rect = el.getBoundingClientRect();
          return rect.width && (rect.right > innerWidth + 1 || rect.left < -1);
        }).map(el => ({ tag: el.tagName, class: el.getAttribute("class") })),
      }));
      expect(overflow.document, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(width);
      expect(overflow.elements, path).toEqual([]);
      if (path === "/dashboard" && [320, 769, 1440].includes(width)) await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
    }
  });
}

test("slow period loading does not move the dashboard body", async ({ page, app }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await app.signIn(true);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/Periods", async route => { await gate; await route.fallback(); });
  await page.goto("/dashboard");
  await expect(page.locator(".stats-grid")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const before = await page.locator(".stats-grid").boundingBox();
  release();
  await expect(page.getByRole("combobox", { name: "Период" })).toBeVisible();
  const after = await page.locator(".stats-grid").boundingBox();
  expect(after!.y).toBeCloseTo(before!.y, 0);
});

test("slow review refresh retains content and focus without a skeleton flash", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/teachers?tab=feedback&targetId=t1");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await page.locator(".review-card").evaluate(el => el.setAttribute("data-retained", "yes"));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/Feedback?**", async route => {
    await gate;
    await route.fulfill({ json: { data: paged([{ ...feedback, comment: "Обновлённый отзыв" }]) } });
  });
  await page.getByRole("combobox", { name: "Сортировка отзывов" }).click();
  await page.getByRole("option", { name: "Сначала старые" }).click();
  await expect(page.locator(".refresh-progress")).toBeVisible();
  await expect(page.locator(".review-card[data-retained=yes]")).toHaveCount(1);
  await expect(page.locator(".loading-skeleton")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Сортировка отзывов" })).toBeFocused();
  release();
  await expect(page.locator(".review-card")).toContainText("Обновлённый отзыв");
  await expect(page.locator(".refresh-progress")).toHaveCount(0);
});

test("long review names and comments fit a narrow viewport", async ({ page, app }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await app.signIn(true);
  const name = "ОченьДлинноеНазваниеБезПробелов".repeat(8);
  await page.route("**/api/Disciplines/d1", route => route.fulfill({ json: { data: { id: "d1", name } } }));
  await page.route("**/api/Feedback?**", route => route.fulfill({ json: { data: paged([{ ...feedback, comment: name, workload: { ...feedback.workload, discipline: { id: "d1", name } } }]) } }));
  await page.goto("/disciplines?tab=feedback&targetId=d1");
  await expect(page.locator(".review-card")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.screenshot({ path: testInfo.outputPath("long-review.png"), fullPage: true });
});

test("period placeholder reserves the same height as the loaded control", async ({ page, app }) => {
  await app.signIn(true);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/Periods", async route => { await gate; await route.fallback(); });
  await page.goto("/reports");
  const period = page.locator(".period-select");
  await expect(period.locator(".loading-skeleton")).toBeVisible();
  const before = await period.boundingBox();
  release();
  await expect(period.getByRole("combobox")).toBeVisible();
  const after = await period.boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThan(1);
});

test("dashboard skeleton uses the same columns as loaded stats on tablets", async ({ page, app }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await app.signIn(true);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/Dashboard*", async route => { await gate; await route.fallback(); });
  await page.goto("/dashboard");
  await expect(page.locator(".skeleton-stats")).toBeVisible();
  const columns = await page.locator(".skeleton-stats").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  release();
  await expect(page.locator(".stats-grid")).toBeVisible();
  expect(await page.locator(".stats-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(columns);
});

test("a single semester stays visible without scrolling narrow charts", async ({ page, app }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await app.signIn(true);
  await page.goto("/dashboard");
  await expect(page.locator(".grade-trend-point")).toHaveCount(1);
  for (const [container, mark] of [[".grade-trend-scroll", ".grade-trend-point"], [".coverage-scroll", "rect[tabindex]"]]) {
    const visible = await page.locator(container!).evaluate((el, selector) => {
      const plot = el.getBoundingClientRect();
      const point = el.querySelector(selector!)!.getBoundingClientRect();
      return point.left >= plot.left && point.right <= plot.right;
    }, mark);
    expect(visible, container).toBe(true);
  }
});
