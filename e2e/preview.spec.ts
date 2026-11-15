import { test, expect } from "./fixtures";
import { period, teacher, paged } from "../tests/fixtures";
test("dashboard preview with representative sample data", async ({
  page,
  app,
}, testInfo) => {
  await app.signIn(true);
  await page.route("**/api/Periods", (route) =>
    route.fulfill({
      json: {
        data: [
          { ...period, feedbackCount: 1284, workloadCount: 48 },
          {
            ...period,
            id: "p0",
            startYear: 2025,
            term: "Spring",
            title: "Весна 2026",
            isFeedbackOpen: false,
            feedbackCount: 1060,
          },
          {
            ...period,
            id: "p-1",
            startYear: 2025,
            title: "Осень 2025",
            isFeedbackOpen: false,
            feedbackCount: 947,
          },
          {
            ...period,
            id: "p-2",
            startYear: 2024,
            term: "Spring",
            title: "Весна 2025",
            isFeedbackOpen: false,
            feedbackCount: 812,
          },
        ],
      },
    }),
  );
  await page.route("**/api/Disciplines/rating?**", (route) =>
    route.fulfill({
      json: {
        data: paged([
          { id: "d1", name: "Математический анализ", grade: 4.3 },
          { id: "d2", name: "Информатика", grade: 4.8 },
          { id: "d3", name: "История", grade: 3.2 },
          { id: "d4", name: "Английский язык", grade: 4.5 },
          { id: "d5", name: "Философия", grade: 3.4 },
          { id: "d6", name: "Физика", grade: 3.8 },
          { id: "d7", name: "Экономика", grade: 4.1 },
          { id: "d8", name: "Правоведение", grade: 3.7 },
          { id: "d9", name: "Дискретная математика", grade: 4.6 },
          { id: "d10", name: "Линейная алгебра", grade: 2.9 },
        ]),
      },
    }),
  );
  await page.route("**/api/Teachers/rating?**", (route) =>
    route.fulfill({
      json: {
        data: {
          ...paged([{ id: teacher.id, name: teacher.fullName, grade: 4.2 }]),
          totalCount: 32,
        },
      },
    }),
  );
  await page.route("**/api/Feedback?**", (route) =>
    route.fulfill({ json: { data: { ...paged([]), totalCount: 4103 } } }),
  );
  await page.route('**/api/Dashboard*', async route => {
    const { dashboard } = await import('../tests/fixtures');
    await route.fulfill({ json: { data: { ...dashboard, feedbackCount: 1284, teacherCount: 32, coverage: { submittedCount: 1284, possibleCount: 2000, completionPercent: 64.2 }, timeline: [
      { periodId: 'p-2', title: '2024/25, весенний семестр', averageGrade: 3.6, feedbackCount: 812, disciplineCount: 10, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
      { periodId: 'p-1', title: '2025/26, осенний семестр', averageGrade: 3.8, feedbackCount: 947, disciplineCount: 10, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
      { periodId: 'p0', title: '2025/26, весенний семестр', averageGrade: 4, feedbackCount: 1060, disciplineCount: 10, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
      { periodId: 'p1', title: '2026/27, осенний семестр', averageGrade: 4.1, feedbackCount: 1284, disciplineCount: 10, coverage: { submittedCount: 5, possibleCount: 20, completionPercent: 25 } },
    ] } } });
  });
  await page.goto("/dashboard");
  await page.getByRole("combobox", { name: "Период" }).click();
  await page.getByRole("option", { name: "Осень 2026 · сбор открыт" }).click();
  await expect(page.locator(".stat-card__value").first()).toContainText(/1\s284/);
  await page.screenshot({
    path: testInfo.outputPath("dashboard-preview.png"),
    fullPage: true,
    scale: "css",
  });
  await page.getByRole("combobox", { name: "Период" }).click();
  await page.screenshot({
    path: testInfo.outputPath("dropdown-preview.png"),
    fullPage: true,
    scale: "css",
  });
});
