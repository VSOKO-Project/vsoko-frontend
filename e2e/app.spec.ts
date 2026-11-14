import { test, expect } from "./fixtures";
const routes = [
  ["/dashboard", "Обзор результатов"],
  ["/workloads", "Оценить занятия"],
  ["/feedback/new?workloadId=w1", "Оценка занятия"],
  ["/my-feedback", "Мои оценки"],
  ["/feedback", "Отзывы"],
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
  const notice = page.getByText(
    /После переезда на новый сервер пароли сброшены/,
  );
  if (process.env.VITE_SHOW_PASSWORD_RESET_NOTICE === "false")
    await expect(notice).toHaveCount(0);
  else await expect(notice).toBeVisible();
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
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("button", { name: "Включить тёмную тему" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(21, 26, 32)");
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
  await page
    .getByRole("combobox", { name: "Преподаватель", exact: true })
    .click();
  await page.getByRole("option", { name: "Петрова Анна Ивановна" }).click();
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
test("custom period menu selects with keyboard and restores focus", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/dashboard");
  const trigger = page.getByRole("combobox", { name: "Период" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("Осень 2026");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});
test("custom select remains usable inside the native modal", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/criteria");
  await page.getByRole("button", { name: "Добавить критерий" }).click();
  const dialog = page.getByRole("dialog", { name: "Новый критерий" });
  await dialog
    .getByLabel("Название", { exact: true })
    .fill("Структура материала");
  await dialog.getByRole("combobox", { name: "Тип критерия" }).click();
  await expect(
    dialog.getByRole("option", { name: "Дисциплина", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("option", { name: "Дисциплина", exact: true }).click();
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/Criteria") && request.method() === "POST",
  );
  await dialog.getByRole("button", { name: "Создать", exact: true }).click();
  expect((await request).postDataJSON()).toEqual({
    name: "Структура материала",
    criteriaObject: "Discipline",
  });
});
test("signed-in identity and clean navigation have no footer slogans", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/dashboard");
  await expect(page.locator(".account-login")).toHaveText("admin");
  await expect(page.locator(".account-role")).toHaveText("Администратор");
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(
    page.getByText("Данные помогают обсуждать и улучшать."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "Количество отзывов по семестрам" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Количество дисциплин по средней оценке" }),
  ).toBeVisible();
});
test("merge results filter as you type without a search button", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.route("**/api/Disciplines?**", (route) =>
    route.fulfill({
      json: {
        data: {
          items: [
            { id: "d1", name: "Математический анализ" },
            { id: "d2", name: "Информатика" },
          ],
          totalPages: 1,
          totalCount: 2,
          page: 1,
          pageSize: 10,
        },
      },
    }),
  );
  await page.goto("/disciplines");
  await page
    .getByRole("button", { name: "Объединить", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Объединение записей" });
  await expect(
    dialog.getByRole("button", { name: "Найти", exact: true }),
  ).toHaveCount(0);
  const search = page.waitForRequest(
    (request) =>
      new URL(request.url()).searchParams.get("Query") === "Информатика",
  );
  await dialog
    .getByRole("searchbox", { name: "Поиск записи для объединения" })
    .fill("Информатика");
  await search;
  await dialog.getByRole("radio", { name: "Информатика", exact: true }).check();
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith("/api/Disciplines/d1/merge") &&
      request.method() === "POST",
  );
  await dialog.getByRole("button", { name: "Объединить", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Объединить записи?" })
    .getByRole("button", { name: "Объединить", exact: true })
    .click();
  expect((await request).postDataJSON()).toEqual({ targetId: "d2" });
});
test("admin chooses a target before loading reviews and sorts the filtered result", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  let calls = 0;
  const { feedback, paged } = await import("../tests/fixtures");
  await page.route("**/api/Feedback?**", (route) => {
    calls++;
    const sort = new URL(route.request().url()).searchParams.get("Sort");
    const rows = [
      {
        ...feedback,
        id: "new",
        createdAtUtc: "2026-11-14T12:00:00Z",
        averageGrade: 2,
        comment: "Новый отзыв",
      },
      {
        ...feedback,
        id: "high",
        createdAtUtc: "2026-11-10T12:00:00Z",
        averageGrade: 5,
        comment: "Высокая оценка",
      },
    ];
    if (sort === "GradeDesc" || sort === "Oldest") rows.reverse();
    return route.fulfill({ json: { data: paged(rows) } });
  });
  await page.goto("/feedback");
  await expect(
    page.getByRole("button", { name: /Математический анализ/ }),
  ).toBeVisible();
  expect(calls).toBe(0);
  const request = page.waitForRequest(
    (r) => new URL(r.url()).pathname === "/api/Feedback",
  );
  await page.getByRole("button", { name: /Математический анализ/ }).click();
  expect(new URL((await request).url()).searchParams.get("DisciplineId")).toBe(
    "d1",
  );
  await expect(page.locator(".review-card").first()).toContainText(
    "Новый отзыв",
  );
  await page.getByRole("combobox", { name: "Сортировка отзывов" }).click();
  await page.getByRole("option", { name: "Сначала высокая оценка" }).click();
  await expect(page.locator(".review-card").first()).toContainText(
    "Высокая оценка",
  );
  await page.getByRole("button", { name: "Изменить выбор" }).click();
  const count = calls;
  await page
    .getByRole("button", { name: "По преподавателю", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Петрова Анна Ивановна/ }),
  ).toBeVisible();
  expect(calls).toBe(count);
  const teacherRequest = page.waitForRequest((r) =>
    new URL(r.url()).searchParams.has("TeacherId"),
  );
  await page.getByRole("button", { name: /Петрова Анна Ивановна/ }).click();
  expect(
    new URL((await teacherRequest).url()).searchParams.get("TeacherId"),
  ).toBe("t1");
});
test("period confirmation uses the app dialog and cancellation makes no request", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  let nativeDialogs = 0;
  page.on("dialog", (d) => {
    nativeDialogs++;
    void d.dismiss();
  });
  await page.goto("/periods");
  const checkbox = page.getByRole("checkbox", {
    name: "Сбор отзывов: Осень 2026",
  });
  await checkbox.click();
  const dialog = page.getByRole("dialog", { name: "Закрыть сбор отзывов?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Осень 2026");
  await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(checkbox).toBeChecked();
  await checkbox.click();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/Periods/p1/feedback") && r.method() === "PUT",
  );
  await dialog
    .getByRole("button", { name: "Закрыть сбор", exact: true })
    .click();
  expect((await request).postDataJSON()).toEqual({ isOpen: false });
  expect(nativeDialogs).toBe(0);
});
test("theme is in the sidebar and password visibility is an icon button", async ({
  page,
  app,
}, testInfo) => {
  await app.signIn(true);
  await page.goto("/dashboard");
  await expect(page.locator(".header .theme-toggle")).toHaveCount(0);
  await expect(page.locator(".sidebar__settings .theme-toggle")).toHaveCount(1);
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.locator(".sidebar__settings .theme-toggle")).toBeVisible();
});
