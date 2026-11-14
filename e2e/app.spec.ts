import { test, expect } from "./fixtures";
const routes = [
  ["/dashboard", "Обзор результатов"],
  ["/workloads", "Оценить занятия"],
  ["/feedback/new?workloadId=w1", "Ваше мнение имеет значение"],
  ["/my-feedback", "Мои оценки"],
  ["/feedback", "Все отзывы"],
  ["/teachers", "Преподаватели"],
  ["/disciplines", "Дисциплины"],
  ["/criteria", "Критерии оценки"],
  ["/teachers/rating", "Оценки преподавателей"],
  ["/disciplines/rating", "Оценки дисциплин"],
  ["/summaries", "Сводки ИИ"],
  ["/reports", "Отчёты и данные"],
  ["/periods", "Учебные периоды"],
  ["/import", "Импорт"],
];
for (const [path, title] of routes)
  test(`route ${path}`, async ({ page, app }, testInfo) => {
    await app.signIn(true);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path!);
    await expect(
      page.getByRole("heading", { name: title!, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Загружаем" }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath("page.png"),
      fullPage: true,
      scale: "css",
    });
  });
test("login and password visibility", async ({ page, app }, testInfo) => {
  void app;
  await page.goto("/login");
  await expect(
    page.getByText(/После переезда на новый сервер пароли сброшены/),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByLabel("Логин", { exact: true }).fill("student");
  const password = page.getByLabel("Пароль", { exact: true });
  await password.fill("Secret1");
  await page.getByRole("button", { name: "Показать пароль" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Войти в кабинет" }).click();
  await expect(page).toHaveURL(/workloads/);
});
test("student cannot open admin area", async ({ page, app }) => {
  await app.signIn();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/workloads/);
});
test("temporary password forces change", async ({ page, app }) => {
  await app.signIn(false, true);
  await page.goto("/workloads");
  await expect(page).toHaveURL(/change-password/);
});
test("feedback draft survives reload and submits exact payload", async ({
  page,
  app,
}) => {
  await app.signIn();
  await page.goto("/feedback/new?workloadId=w1");
  const submit = page.getByRole("button", { name: "Отправить оценку" });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("radiogroup", { name: "Понятность объяснений" })
    .getByRole("radio", { name: "5 из 5" })
    .check();
  await page
    .getByRole("radiogroup", { name: "Доступность материалов" })
    .getByRole("radio", { name: "4 из 5" })
    .check();
  await page.getByLabel("Комментарий").fill("Материалы помогают учиться");
  await page.reload();
  await expect(page.getByLabel("Комментарий")).toHaveValue(
    "Материалы помогают учиться",
  );
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/Feedback") && request.method() === "POST",
  );
  await submit.click();
  expect((await request).postDataJSON()).toEqual({
    workloadId: "w1",
    comment: "Материалы помогают учиться",
    feedback: [
      { criteriaId: "c1", grade: 5 },
      { criteriaId: "c2", grade: 4 },
    ],
  });
  await expect(page).toHaveURL(/my-feedback/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("vsoko.draft.v1:student:w1"),
    ),
  ).toBeNull();
});
test("rating supports keyboard navigation", async ({ page, app }) => {
  await app.signIn();
  await page.goto("/feedback/new?workloadId=w1");
  const group = page.getByRole("radiogroup", { name: "Понятность объяснений" });
  await group.getByRole("radio", { name: "1 из 5" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "2 из 5" })).toBeChecked();
});
test("theme persists and dark surfaces use design tokens", async ({
  page,
  app,
}, testInfo) => {
  await app.signIn();
  await page.goto("/workloads");
  await page.getByLabel("Тема оформления").selectOption("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(19, 28, 35)");
  await page.screenshot({
    path: testInfo.outputPath("dark.png"),
    fullPage: true,
    scale: "css",
  });
});
test("404 keeps a working home link", async ({ page, app }) => {
  await app.signIn();
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Мы не нашли эту страницу" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "На главную" }).click();
  await expect(page).toHaveURL(/workloads/);
});
test("catalog dialog traps focus and closes on Escape", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/criteria");
  await page.getByRole("button", { name: "Добавить критерий" }).click();
  const dialog = page.getByRole("dialog", { name: "Новый критерий" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Название").fill("Новый критерий");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Добавить критерий" }),
  ).toBeFocused();
});
test("summary requires a selection and displays AI caveat", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/summaries");
  const button = page.getByRole("button", { name: "Сформировать сводку" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Преподаватель", { exact: true }).selectOption("t1");
  await button.click();
  await expect(
    page.getByText(
      "Студенты отмечают понятные объяснения и доступные материалы.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Сводка может содержать неточности/),
  ).toBeVisible();
});
test("report downloads PDF", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Сформировать отчёт/ }).click();
  expect((await download).suggestedFilename()).toBe("VSOKO-report.pdf");
});
test("API errors offer retry", async ({ page, app }) => {
  await app.signIn();
  await page.route("**/api/Workload?**", (route) =>
    route.fulfill({ status: 503, json: { detail: "Временная ошибка" } }),
  );
  await page.goto("/workloads");
  await expect(page.getByRole("alert")).toContainText("Временная ошибка");
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
});
test("import checks extension before upload", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/import");
  await page.getByLabel("Файл для импорта").setInputFiles({
    name: "data.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("bad"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Принимается только файл .xlsx",
  );
});
test("import preview appears before apply", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/import");
  await page.getByLabel("Файл для импорта").setInputFiles({
    name: "data.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("fixture"),
  });
  await expect(
    page.getByRole("heading", { name: "3. Проверка" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Импортировать", exact: true }),
  ).toBeEnabled();
});
