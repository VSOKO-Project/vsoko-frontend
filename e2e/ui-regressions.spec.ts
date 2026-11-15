import { test, expect } from "./fixtures";

test("mobile navigation isolates focus, restores it and adapts to desktop", async ({ page, app }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await app.signIn(true);
  await page.goto("/dashboard");
  const sidebar = page.locator(".sidebar");
  const trigger = page.getByRole("button", { name: "Открыть меню", exact: true });
  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(page.getByRole("navigation", { name: "Основная навигация" })).toHaveCount(0);
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Меню навигации" })).toBeVisible();
  await expect(page.locator(".app-layout__main")).toHaveAttribute("inert", "");
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  const close = sidebar.getByRole("button", { name: "Закрыть меню", exact: true });
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(sidebar.locator(".theme-toggle")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(sidebar).toHaveAttribute("inert", "");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await trigger.click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(sidebar).not.toHaveAttribute("inert", "");
  await expect(page.locator(".app-layout__main")).not.toHaveAttribute("inert", "");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await expect(page.locator(".sidebar-overlay")).toHaveCount(0);
});

test("changing the review period retains sorting and the loaded record", async ({ page, app }) => {
  await app.signIn(true);
  let records = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/Teachers/t1") records++;
  });
  await page.goto("/teachers?tab=feedback&targetId=t1");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Сортировка отзывов" }).click();
  await page.getByRole("option", { name: "Сначала низкая оценка" }).click();
  await page.getByRole("combobox", { name: "Период" }).click();
  const request = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === "/api/Feedback" && url.searchParams.get("PeriodId") === "p1";
  });
  await page.getByRole("option", { name: /Осень 2026/ }).click();
  expect(new URL((await request).url()).searchParams.get("Sort")).toBe("GradeAsc");
  await expect(page).toHaveURL(url => url.searchParams.get("period") === "p:p1");
  await expect(page.getByRole("combobox", { name: "Сортировка отзывов" })).toContainText("Сначала низкая оценка");
  await expect(page.getByRole("combobox", { name: "Период" })).toBeFocused();
  expect(records).toBe(1);
  await page.reload();
  await expect(page.locator(".review-card")).toHaveCount(1);
  await expect(page.getByRole("combobox", { name: "Период" })).toContainText("Осень 2026");
});

test("review directory search survives changing the period", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/disciplines?tab=feedback");
  const search = page.getByRole("searchbox");
  await search.fill("Математический");
  await page.waitForRequest(request => new URL(request.url()).searchParams.get("Query") === "Математический");
  await page.getByRole("combobox", { name: "Период" }).click();
  const request = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname === "/api/Disciplines" && url.searchParams.get("PeriodId") === "p1";
  });
  await page.getByRole("option", { name: /Осень 2026/ }).click();
  expect(new URL((await request).url()).searchParams.get("Query")).toBe("Математический");
  await expect(search).toHaveValue("Математический");
});

test("dialog locks background scrolling and restores it after closing", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/criteria");
  await page.getByRole("button", { name: "Добавить критерий" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});
