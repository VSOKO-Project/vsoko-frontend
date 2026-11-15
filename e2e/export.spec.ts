import { test, expect } from "./fixtures";

test("credentials are downloaded from Export and the general block is absent from Import", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/import");
  await expect(page.getByRole("heading", { name: "Логины и пароли", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Скачать для всех групп" })).toHaveCount(0);
  if (await page.getByRole("button", { name: "Открыть меню" }).isVisible())
    await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("link", { name: "Экспорт", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Экспорт", exact: true })).toBeVisible();
  const allRequest = page.waitForRequest("**/api/Import/credentials");
  const allDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать для всех групп" }).click();
  expect(new URL((await allRequest).url()).searchParams.has("groupIds")).toBe(false);
  expect((await allDownload).suggestedFilename()).toBe("vsoko-credentials.xlsx");
  await page.locator("summary").filter({ hasText: "Группы для выгрузки" }).click();
  await page.getByRole("checkbox", { name: "ПИ-26" }).check();
  const selectedRequest = page.waitForRequest("**/api/Import/credentials?**");
  const selectedDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать (1)", exact: true }).click();
  expect(new URL((await selectedRequest).url()).searchParams.getAll("groupIds")).toEqual(["g1"]);
  expect((await selectedDownload).suggestedFilename()).toBe("vsoko-credentials.xlsx");
});

test("students cannot open the export page", async ({ page, app }) => {
  await app.signIn();
  await page.goto("/export");
  await expect(page).toHaveURL(/\/workloads$/);
  await expect(page.getByRole("link", { name: "Экспорт", exact: true })).toHaveCount(0);
});
