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
  await page.goto("/dashboard");
  await page.getByRole("combobox", { name: "Период" }).click();
  await page.getByRole("option", { name: "Осень 2026 · сбор открыт" }).click();
  await expect(page.locator(".stat-card__value").first()).toHaveText(/1\s284/);
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
