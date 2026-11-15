import { test, expect } from "./fixtures";
const routes = [
  ["/dashboard", "Сводка"],
  ["/workloads", "Оценка обучения"],
  ["/feedback/new?workloadId=w1", "Оценка дисциплины и преподавателя"],
  ["/my-feedback", "Мои оценки"],
  ["/feedback", "Дисциплины"],
  ["/teachers", "Преподаватели"],
  ["/disciplines", "Дисциплины"],
  ["/criteria", "Критерии оценки"],
  ["/teachers/rating", "Преподаватели"],
  ["/disciplines/rating", "Дисциплины"],
  ["/summaries", "Анализ отзывов"],
  ["/reports", "Отчёты и данные"],
  ["/periods", "Учебные периоды"],
  ["/import", "Импорт"],
  ["/export", "Экспорт"],
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
  await expect(page.getByRole("heading", { name: "Оценка отправлена" })).toBeVisible();
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
    page.getByText(/Анализ ИИ может содержать неточности/),
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
    page.getByRole("img", { name: "Заполнение отзывов по семестрам: оставлено из возможных, шкала от 0 до 100 процентов" }),
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
    .getByRole("button", { name: /^Объединить:/ })
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
  await page.getByRole("button", { name: /К списку (преподавателей|дисциплин)/ }).click();
  const count = calls;
  await page.goto("/teachers?tab=feedback");
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

test("custom upload opens picker, displays file and replaces it", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/import");
  await expect(page.getByLabel("Файл для импорта")).toBeHidden();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Выбрать файл", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "нагрузка.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from("fixture"),
  });
  await expect(page.locator(".uploaded-file")).toContainText("нагрузка.xlsx");
  await expect(page.locator(".uploaded-file")).toContainText("1 КБ");
  await page.getByLabel("Файл для импорта").setInputFiles({
    name: "новый.xlsx",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("replacement"),
  });
  await expect(page.locator(".uploaded-file")).toContainText("новый.xlsx");
  await expect(page.locator(".uploaded-file")).not.toContainText(
    "нагрузка.xlsx",
  );
});

test("dropzone accepts Excel and rejects oversized files", async ({
  page,
  app,
}) => {
  await app.signIn(true);
  await page.goto("/import");
  await page.locator(".file-upload").evaluate((zone) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["data"], "перетаскивание.xlsx"));
    zone.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer: transfer }),
    );
  });
  await expect(page.locator(".uploaded-file")).toContainText(
    "перетаскивание.xlsx",
  );
  await page.getByLabel("Файл для импорта").setInputFiles({
    name: "большой.xlsx",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toContainText("Файл больше 5 МБ");
  await expect(page.locator(".uploaded-file")).toContainText(
    "перетаскивание.xlsx",
  );
});

test("dashboard skeleton remains until response and respects reduced motion", async ({
  page,
  app,
}, testInfo) => {
  await app.signIn(true);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/Dashboard*", async (route) => {
    await gate;
    await route.fallback();
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await expect(page.locator(".loading-skeleton--dashboard")).toBeVisible();
  await expect(page.locator(".skeleton-stats .skeleton-card")).toHaveCount(4);
  expect(
    await page
      .locator(".skeleton-block")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".loading-skeleton .sr-only")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath("skeleton.png"),
    fullPage: true,
  });
  release();
  await expect(page.locator(".loading-skeleton")).toHaveCount(0);
  await expect(
    page.locator(".dashboard-stats, .stats-grid").first(),
  ).toBeVisible();
});

test("student sees completed progress and edits a sent assessment", async ({ page, app }) => {
  await app.signIn();
  await page.goto('/workloads');
  await expect(page.getByRole('heading', { name: 'Оценено 1 из 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Осталось оценить' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.workload-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Спасибо, всё оценено!' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Посмотреть оценки' })).toHaveAttribute('href', '/my-feedback');
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await page.getByRole('link', { name: 'Изменить оценку' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('status')).toContainText('Оценка обновлена');
});


test("long criteria form remains usable", async ({ page, app }, testInfo) => {
  await app.signIn();
  await page.route('**/api/Criteria', route => route.fulfill({ json: { data: Array.from({ length: 10 }, (_, i) => ({ id: `long-${i}`, name: `Критерий ${i + 1}: понятность объяснений и доступность дополнительных учебных материалов`, object: i < 5 ? 'Teacher' : 'Discipline' })) } }));
  await page.goto('/feedback/new?workloadId=w1');
  await expect(page.getByRole('radiogroup')).toHaveCount(10);
  for (const group of await page.getByRole('radiogroup').all()) await group.getByRole('radio', { name: '4 из 5' }).check();
  await expect(page.getByRole('button', { name: 'Отправить оценку' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('long-form.png'), fullPage: true });
  await page.getByRole('button', { name: 'Отправить оценку' }).click();
  await expect(page.getByRole('heading', { name: 'Оценка отправлена' })).toBeVisible();
});

test("admin finds list, ratings and reviews inside each directory", async ({ page, app }, testInfo) => {
  await app.signIn(true);
  for (const [kind, title] of [['teachers', 'Преподаватели'], ['disciplines', 'Дисциплины']]) {
    await page.goto(`/${kind}`);
    await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible();
    const tabs = page.getByRole('navigation', { name: `Разделы: ${title}` });
    await tabs.getByRole('link', { name: 'Оценки', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: 'Средний балл', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('columnheader', { name: 'Средний балл', exact: true })).toBeVisible();
    await tabs.getByRole('link', { name: 'Отзывы', exact: true }).click();
    await expect(page.locator('.feedback-target')).toHaveCount(1);
    await page.locator('.feedback-target').click();
    await expect(page.locator('.review-card')).toHaveCount(1);
    await tabs.getByRole('link', { name: 'Список', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Редактировать:/ })).toBeVisible();
    if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Открыть меню' }).click();
    const nav = page.getByRole('navigation', { name: 'Основная навигация' });
    await expect(nav.getByRole('link', { name: 'Оценки', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Отзывы', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: title!, exact: true })).toHaveClass(/sidebar__link--active/);
  }
  await page.goto('/teachers/rating');
  await expect(page).toHaveURL(/teachers\?tab=ratings/);
  await page.goto('/disciplines/rating');
  await expect(page).toHaveURL(/disciplines\?tab=ratings/);
});

for (const [path, skeleton] of [
  ['/workloads', 'workloads'], ['/feedback/new?workloadId=w1', 'feedback'],
  ['/my-feedback', 'cards'], ['/dashboard', 'dashboard'],
  ['/ratings', 'table'], ['/teachers', 'table'], ['/disciplines', 'table'], ['/criteria', 'table'],
  ['/periods', 'table'], ['/feedback', 'table'], ['/summaries', 'field'], ['/import', 'field'],
]) test(`loading layout ${path}`, async ({ page, app }, testInfo) => {
  await app.signIn(true);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: testInfo.project.name === 'mobile' ? 'dark' : 'light' });
  await page.addInitScript((theme) => localStorage.setItem('vsoko.theme', theme), testInfo.project.name === 'mobile' ? 'dark' : 'light');
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/**', async route => { await gate; await route.fallback(); });
  await page.goto(path!);
  const placeholder = page.locator(`.loading-skeleton--${skeleton}`).first();
  await expect(placeholder).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await placeholder.locator('.skeleton-block').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.screenshot({ path: testInfo.outputPath('loading.png'), fullPage: true });
  release();
  await expect(page.locator('.loading-skeleton')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('summary modal uses text loading state', async ({ page, app }, testInfo) => {
  await app.signIn(true);
  await page.goto('/ratings');
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/Summaries/**', async route => { await gate; await route.fallback(); });
  await page.getByRole('button', { name: 'Открыть', exact: true }).first().click();
  await expect(page.getByRole('dialog').locator('.loading-skeleton--text')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('summary-loading.png'), fullPage: true });
  release();
  await expect(page.getByRole('dialog').locator('.loading-skeleton')).toHaveCount(0);
  await expect(page.getByRole('dialog').locator('.summary-text')).toContainText('Студенты');
});

test('assessment edit modal shows rating placeholders', async ({ page, app }, testInfo) => {
  await app.signIn();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/Criteria', async route => { await gate; await route.fallback(); });
  await page.goto('/my-feedback');
  await page.getByRole('button', { name: /^Редактировать оценку:/ }).first().click();
  await expect(page.getByRole('dialog').locator('.loading-skeleton--criteria')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('edit-loading.png'), fullPage: true });
  release();
  await expect(page.getByRole('dialog').locator('.loading-skeleton')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('radiogroup')).toHaveCount(2);
});

test('dashboard loads aggregates in one request and leaves gaps in the trend', async ({ page, app }) => {
  await app.signIn(true);
  const calls: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) calls.push(new URL(request.url()).pathname); });
  await page.route('**/api/Dashboard*', async route => {
    const { dashboard } = await import('../tests/fixtures');
    await route.fulfill({ json: { data: { ...dashboard, timeline: [
      { periodId: 'p0', title: '2025/26, осенний семестр', feedbackCount: 5, averageGrade: 3, disciplineCount: 2, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
      { periodId: 'p1', title: '2025/26, весенний семестр', feedbackCount: 0, averageGrade: null, disciplineCount: 0, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
      { periodId: 'p2', title: '2026/27, осенний семестр', feedbackCount: 10, averageGrade: 4.5, disciplineCount: 3, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
    ] } } });
  });
  await page.goto('/dashboard');
  await expect(page.locator('.grade-trend-point')).toHaveCount(2);
  await expect(page.locator('.grade-trend-line')).toHaveCount(0);
  expect(calls.filter(path => path === '/api/Dashboard')).toHaveLength(1);
  expect(calls.some(path => /rating|Feedback/.test(path))).toBe(false);
  await expect(page.getByRole('heading', { name: 'Сводка', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('feedback directory uses the same table layout as ratings', async ({ page, app }) => {
  await app.signIn(true);
  await page.goto('/feedback');
  await expect(page.locator('.feedback-picker')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Разделы: Дисциплины' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Дисциплина', exact: true })).toBeVisible();
  await expect(page.getByText('Показать отзывы', { exact: true })).toHaveCount(0);
  await page.goto('/teachers?tab=feedback');
  await expect(page.getByRole('columnheader', { name: 'Преподаватель', exact: true })).toBeVisible();
});

test('coverage shows submitted and possible reviews and distinguishes missing workload', async ({ page, app }) => {
  await app.signIn(true);
  await page.route('**/api/Dashboard*', async route => {
    const { dashboard } = await import('../tests/fixtures');
    const selected = new URL(route.request().url()).searchParams.has('PeriodId');
    const coverage = selected ? { submittedCount: 0, possibleCount: 0, completionPercent: null } : { submittedCount: 24, possibleCount: 96, completionPercent: 25 };
    await route.fulfill({ json: { data: { ...dashboard, coverage, timeline: dashboard.timeline.map(item => ({ ...item, coverage })) } } });
  });
  await page.goto('/dashboard');
  await expect(page.locator('.stat-card').first()).toContainText('24 / 96');
  await expect(page.locator('.stat-card').first()).toContainText('25% заполнено');
  await expect(page.locator('.coverage-chart')).toContainText('24 / 96');
  await expect(page.locator('.coverage-chart rect[tabindex]')).toHaveAttribute('aria-label', /24 из 96 возможных отзывов, 25%/);
  await page.getByRole('combobox', { name: 'Период' }).click();
  await page.getByRole('option', { name: /Осень 2026/ }).click();
  await expect(page.locator('.stat-card').first()).toContainText('Нет доступной нагрузки');
  await expect(page.locator('.coverage-chart')).toContainText('0 / 0');
  await expect(page.locator('.coverage-chart .chart-column')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('quiet rating context links directly to reviews and keeps the period on reload', async ({ page, app }) => {
  await app.signIn(true);
  await page.route('**/api/Dashboard*', async route => {
    const { dashboard, discipline } = await import('../tests/fixtures');
    await route.fulfill({ json: { data: { ...dashboard, ratedFeedbackCount: 12,
      lowGrades: [{ id: discipline.id, name: discipline.name, grade: 3.2, feedbackCount: 12 }],
      highGrades: [], comparison: { currentTitle: '2026/27, осенний семестр', previousTitle: '2025/26, весенний семестр', delta: -0.3, currentFeedbackCount: 12, previousFeedbackCount: 20 },
    } } });
  });
  await page.goto('/dashboard');
  await expect(page.locator('.stat-card').nth(1)).toContainText('12 отзывов');
  await expect(page.locator('.trend-comparison')).toContainText('−0,3');
  await expect(page.locator('.trend-comparison')).not.toContainText('отзыв');
  await page.getByRole('combobox', { name: 'Период' }).click();
  await page.getByRole('option', { name: '2026/2027 учебный год', exact: true }).click();
  const request = page.waitForRequest(r => new URL(r.url()).pathname === '/api/Feedback');
  await page.locator('a.result-row').first().click();
  const params = new URL((await request).url()).searchParams;
  expect(params.get('DisciplineId')).toBe('d1');
  expect(params.get('StartYear')).toBe('2026');
  await expect(page.locator('.feedback-selection h2')).toHaveText('Математический анализ');
  await expect(page.locator('.results-footer')).toContainText('Всего отзывов: 1');
  await expect(page.locator('.feedback-sorting')).not.toContainText('Отзывов:');
  await expect(page.locator('.review-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.review-card')).toHaveCount(1);
  await expect(page.getByRole('combobox', { name: 'Период' })).toContainText('2026/2027');
  await page.getByRole('button', { name: /К списку (преподавателей|дисциплин)/ }).click();
  await expect(page.locator('.feedback-target')).toHaveCount(1);
  await page.goto('/disciplines?tab=ratings');
  await expect(page.locator('.rating-meta')).toContainText('1 отзыв');
  await page.locator('.rating-name-link').click();
  await expect(page.locator('.review-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('icon actions stay labelled, work from keyboard and confirm deletion', async ({ page, app }) => {
  await app.signIn();
  let deletions = 0;
  page.on('request', request => { if (request.method() === 'DELETE') deletions++; });
  await page.goto('/my-feedback');
  const edit = page.getByRole('button', { name: /^Редактировать оценку:/ });
  await expect(edit).toHaveAttribute('title', 'Редактировать оценку');
  await expect(edit).toHaveText('');
  await expect(edit.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Редактировать оценку' })).toBeVisible();
  await page.keyboard.press('Escape');
  const remove = page.getByRole('button', { name: /^Удалить отзыв:/ });
  await expect(remove).toHaveAttribute('title', 'Удалить отзыв');
  await expect(remove).toHaveText('');
  await remove.click();
  await expect(page.getByRole('dialog', { name: 'Удалить отзыв?' })).toBeVisible();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  expect(deletions).toBe(0);
  await expect(remove).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('review heading edits the actual record and aligns period and sort controls', async ({ page, app }) => {
  await app.signIn(true);
  await page.route('**/api/Teachers/t1', async route => {
    if (route.request().method() !== 'PUT') { await route.fallback(); return; }
    const { teacher } = await import('../tests/fixtures');
    const body = route.request().postDataJSON();
    await route.fulfill({ json: { data: { ...teacher, ...body, fullName: `${body.surname} ${body.name} ${body.patronymic}` } } });
  });
  await page.goto('/teachers?tab=feedback&targetId=t1&period=');
  const edit = page.getByRole('button', { name: 'Редактировать преподавателя', exact: true });
  await expect(edit).toBeVisible();
  const heading = await page.locator('.feedback-name h2').boundingBox();
  const icon = await edit.boundingBox();
  expect(icon!.x).toBeGreaterThanOrEqual(heading!.x + heading!.width);
  const controls = page.locator('.feedback-sorting [role=combobox]');
  await expect(controls).toHaveCount(2);
  const first = await controls.nth(0).boundingBox(), second = await controls.nth(1).boundingBox();
  expect(Math.abs(first!.width - second!.width)).toBeLessThan(1);
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(1);
  await edit.click();
  const dialog = page.getByRole('dialog', { name: 'Редактировать преподавателя' });
  await expect(dialog.getByLabel('Фамилия', { exact: true })).toHaveValue('Петрова');
  await dialog.getByLabel('Фамилия', { exact: true }).fill('Иванова');
  const request = page.waitForRequest(r => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/Teachers/t1');
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  expect((await request).postDataJSON()).toEqual({ surname: 'Иванова', name: 'Анна', patronymic: 'Ивановна' });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.feedback-name h2')).toHaveText('Иванова Анна Ивановна');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('merge empty state has no results frame', async ({ page, app }) => {
  await app.signIn(true);
  await page.goto('/teachers');
  await page.getByRole('button', { name: /^Объединить:/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Объединение записей' });
  await expect(dialog.getByText('Подходящих записей нет.', { exact: true })).toBeVisible();
  await expect(dialog.locator('.merge-results')).toHaveCount(0);
  expect(await dialog.locator('.merge-empty').evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('0px');
});


test("summary evidence opens the full original feedback", async ({ page, app }) => {
  await app.signIn(true);
  await page.goto("/summaries");
  await page.getByRole("combobox", { name: "Преподаватель", exact: true }).click();
  await page.getByRole("option", { name: "Петрова Анна Ивановна" }).click();
  await page.getByRole("button", { name: "Сформировать сводку" }).click();
  await page.locator(".analysis-topic summary").first().click();
  await page.getByRole("link", { name: "Открыть отзыв f1", exact: true }).click();
  await expect(page).toHaveURL(/\/feedback\/f1$/);
  await expect(page.getByRole("heading", { name: "Исходный отзыв" })).toBeVisible();
  await expect(page.locator("blockquote")).toHaveText("Понятные лекции");
});
