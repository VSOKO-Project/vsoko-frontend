import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { importReport } from "../tests/fixtures";

const file = { name: "данные.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("xlsx-fixture") };
async function upload(page: Page) { await page.getByLabel("Файл для импорта").setInputFiles(file); }
async function mode(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Режим импорта" }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function confirm(page: Page) {
  await page.getByRole("button", { name: "Импортировать", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Импортировать", exact: true }).click();
}

test("addition is the default and invalid replacement cannot import the previous file", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/import");
  await expect(page.getByRole("combobox", { name: "Режим импорта" })).toContainText("Добавить данные");
  const request = page.waitForRequest("**/api/Import/preview");
  await upload(page);
  expect((await request).postData()).toMatch(/name="mode"\r\n\r\nAddOnly/);
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toBeEnabled();
  await page.getByLabel("Файл для импорта").setInputFiles({ name: "ошибка.csv", mimeType: "text/csv", buffer: Buffer.from("bad") });
  await expect(page.getByRole("alert")).toContainText("Принимается только файл .xlsx");
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Убрать файл" }).click();
  await expect(page.getByRole("heading", { name: "3. Проверка" })).toHaveCount(0);
  await expect(page.locator(".uploaded-file")).toHaveCount(0);
});

test("updating shows differences, confirms the current mode and retains the final report", async ({ page, app }) => {
  await app.signIn(true);
  const updated = {
    ...importReport, mode: "UpdateExisting", previewToken: "update-token",
    changes: [{ entity: "Студент", key: "001", field: "Группа", before: "Г-1", after: "Г-2" },
      { entity: "Дисциплина", key: "d1", field: "Дисциплина", before: "Матиматика", after: "Математика" }],
    summary: { ...importReport.summary, students: { create: 0, update: 1, existing: 2, delete: 0 } },
  };
  await page.route("**/api/Import/preview", route => route.fulfill({ json: { data: updated } }));
  let applied = "";
  await page.route("**/api/Import/apply", route => {
    applied = route.request().postData() || "";
    return route.fulfill({ json: { data: updated } });
  });
  await page.goto("/import");
  await mode(page, "Добавить и обновить");
  await upload(page);
  await expect(page.getByRole("table", { name: "Изменения: было → станет" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Г-1", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Г-2", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Импортировать", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Добавить и обновить");
  await expect(page.getByRole("dialog")).toContainText("во всех семестрах");
  await page.getByRole("dialog").getByRole("button", { name: "Импортировать", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Импорт выполнен" })).toBeVisible();
  expect(applied).toMatch(/name="mode"\r\n\r\nUpdateExisting/);
  expect(applied).toMatch(/name="previewToken"\r\n\r\nupdate-token/);
  await expect(page.getByRole("table", { name: "Применённые изменения" })).toBeVisible();
  await expect(page.locator(".import-summary")).toContainText("1 обновлено");
  await expect(page.locator(".import-summary")).toContainText("2 без изменений");
  await expect(page.getByRole("button", { name: "Скачать логины и пароли", exact: true })).toBeVisible();
});

test("synchronization errors block saving and explain missing source scope", async ({ page, app }) => {
  await app.signIn(true);
  await page.route("**/api/Import/preview", route => route.fulfill({ json: { data: {
    ...importReport, mode: "SynchronizeWorkloads",
    errors: [{ sheet: "", row: 0, message: "Для синхронизации нужна исходная выгрузка выбранного семестра." }],
  } } }));
  await page.goto("/import");
  await mode(page, "Синхронизировать нагрузку");
  await upload(page);
  await expect(page.getByRole("cell", { name: "Для синхронизации нужна исходная выгрузка выбранного семестра." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toBeDisabled();
});

test("a changed deletion plan requires a second explicit confirmation", async ({ page, app }) => {
  await app.signIn(true);
  const initial = { ...importReport, mode: "SynchronizeWorkloads", canSynchronize: true, previewToken: "old-plan",
    workloadsToDelete: [{ teacher: "Петров Иван Иванович", discipline: "Физика", group: "Г-1" }] };
  const changed = { ...initial, previewToken: "new-plan",
    workloadsToDelete: [...initial.workloadsToDelete, { teacher: "Новиков Иван Иванович", discipline: "Химия", group: "Г-1" }] };
  let applies = 0;
  await page.route("**/api/Import/preview", route => route.fulfill({ json: { data: initial } }));
  await page.route("**/api/Import/apply", route => {
    applies++;
    if (applies === 1) return route.fulfill({ status: 409, json: { detail: "План импорта изменился. Проверьте новый отчёт и подтвердите импорт ещё раз.", report: changed } });
    expect(route.request().postData()).toMatch(/name="previewToken"\r\n\r\nnew-plan/);
    return route.fulfill({ json: { data: changed } });
  });
  await page.goto("/import");
  await mode(page, "Синхронизировать нагрузку");
  await upload(page);
  await confirm(page);
  await expect(page.getByRole("alert")).toContainText("План импорта изменился");
  await expect(page.getByRole("cell", { name: "Новиков Иван Иванович" })).toBeVisible();
  expect(applies).toBe(1);
  await page.getByRole("button", { name: "Импортировать", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Будет удалено нагрузок: 2");
  await page.getByRole("dialog").getByRole("button", { name: "Импортировать", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Импорт выполнен" })).toBeVisible();
  expect(applies).toBe(2);
});

test("a failed recheck shows an error and retry instead of the previous report", async ({ page, app }) => {
  await app.signIn(true);
  let previews = 0;
  await page.route("**/api/Import/preview", route => {
    previews++;
    if (previews === 2) return route.fulfill({ status: 503, json: { detail: "Проверка временно недоступна" } });
    return route.fulfill({ json: { data: importReport } });
  });
  await page.goto("/import");
  await upload(page);
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toBeEnabled();
  await mode(page, "Добавить и обновить");
  await expect(page.getByRole("alert")).toContainText("Проверка временно недоступна");
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Повторить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Импортировать", exact: true })).toBeEnabled();
});
