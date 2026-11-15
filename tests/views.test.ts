import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "../src/App.vue";
import { router } from "../src/router";
import { installSession, clearSession } from "../src/store/auth";
import { responseData, session } from "./fixtures";
// Route tests isolate page behavior; the actual popup, keyboard and modal portal are covered by Playwright.
vi.mock("../src/components/AppSelect.vue", () => ({
  default: {
    props: ["modelValue", "options", "label", "disabled"],
    emits: ["update:modelValue"],
    template: `<select :value="modelValue" :aria-label="label" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">{{option.label}}</option></select>`,
  },
}));
let wrapper: VueWrapper | undefined;
beforeEach(() => {
  vi.stubEnv("VITE_SHOW_PASSWORD_RESET_NOTICE", "true");
  if (!HTMLDialogElement.prototype.showModal)
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
  if (!HTMLDialogElement.prototype.close)
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      },
    });
  clearSession();
  localStorage.clear();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: vi.fn(async (_name: string, action: () => Promise<unknown>) =>
        action(),
      ),
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify({
            data: responseData(
              new URL(String(input)).pathname.replace(/^\/api/, ""),
            ),
          }),
        ),
    ),
  );
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function open(path: string, admin = true) {
  installSession({ ...session, isAdmin: admin }, true);
  await router.push(path);
  wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  await nextTick();
  return wrapper;
}
it.each([
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
])("renders %s with server data", async (path, title) => {
  const view = await open(path);
  expect(view.get("h1").text()).toBe(title);
  expect(view.find("[role=alert]").exists()).toBe(false);
});
it("protects administrator routes from students", async () => {
  await open("/dashboard", false);
  expect(router.currentRoute.value.path).toBe("/workloads");
});
it("forces a temporary password change", async () => {
  installSession({ ...session, mustChangePassword: true }, true);
  await router.push("/workloads");
  wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/change-password");
  expect(wrapper.get("h2").text()).toBe("Смена пароля");
});
it("renders an actual 404", async () => {
  const view = await open("/unknown");
  expect(view.text()).toContain("Мы не нашли эту страницу");
});
it("preserves drafts through navigation and submits only current criteria", async () => {
  let view = await open("/feedback/new?workloadId=w1", false);
  expect(view.get("button[type=submit]").attributes("disabled")).toBeDefined();
  await view.findAll("input[type=radio]")[4]!.setValue();
  await view.findAll("input[type=radio]")[8]!.setValue();
  await view.get("textarea").setValue("Спасибо за занятия");
  await flushPromises();
  expect(localStorage.getItem("vsoko.draft.v1:student:w1")).toContain(
    "Спасибо",
  );
  await router.push("/workloads");
  await flushPromises();
  await router.push("/feedback/new?workloadId=w1");
  await flushPromises();
  expect(view.get("textarea").element.value).toBe("Спасибо за занятия");
  await view.get("form").trigger("submit");
  await flushPromises();
  const request = vi
    .mocked(fetch)
    .mock.calls.find(
      ([, options]) =>
        options?.method === "POST" &&
        String(options?.body).includes("workloadId"),
    );
  expect(JSON.parse(String(request?.[1]?.body))).toEqual({
    workloadId: "w1",
    comment: "Спасибо за занятия",
    feedback: [
      { criteriaId: "c1", grade: 5 },
      { criteriaId: "c2", grade: 4 },
    ],
  });
  expect(localStorage.getItem("vsoko.draft.v1:student:w1")).toBeNull();
});
it("shows a recoverable error instead of zero analytics", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 503 }));
  const view = await open("/dashboard");
  expect(view.get("[role=alert]").text()).toContain("Не удалось загрузить");
  expect(view.find(".stat-card").exists()).toBe(false);
});
it("persists theme selection", async () => {
  const view = await open("/workloads", false);
  await view.get('button[aria-label="Включить тёмную тему"]').trigger("click");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("vsoko.theme")).toBe("dark");
});
function button(view: VueWrapper, text: string) {
  const result = view
    .findAll("button")
    .find((button) => button.text() === text) || view.findAll("button").find((button) => button.attributes("aria-label")?.startsWith(text));
  if (!result) throw new Error(`Button missing: ${text}`);
  return result;
}
it("logs in through the public form", async () => {
  await router.push("/login");
  wrapper = mount(App, { global: { plugins: [router] } });
  await wrapper.get("input[autocomplete=username]").setValue("student");
  await wrapper.get("input[autocomplete=current-password]").setValue("Secret1");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/workloads");
});
it("creates a criterion with its object type", async () => {
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    function () {
      this.setAttribute("open", "");
    },
  );
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(
    function () {
      this.removeAttribute("open");
    },
  );
  const view = await open("/criteria");
  await button(view, "Добавить критерий").trigger("click");
  await flushPromises();
  await view.get("dialog input").setValue("Уважительное отношение");
  await view.get("dialog select").setValue("Teacher");
  await view.get("dialog form").trigger("submit");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "POST");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({
    name: "Уважительное отношение",
    criteriaObject: "Teacher",
  });
  expect(view.text()).toContain("Изменения сохранены");
});
it("renames a teacher without losing the full name parts", async () => {
  vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(
    () => {},
  );
  vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(() => {});
  const view = await open("/teachers");
  await button(view, "Редактировать:").trigger("click");
  await flushPromises();
  const inputs = view.findAll("dialog input");
  await inputs[0]!.setValue("Иванова");
  await view.get("dialog form").trigger("submit");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({
    name: "Анна",
    surname: "Иванова",
    patronymic: "Ивановна",
  });
});
it("requires confirmation before closing a period", async () => {
  const native = vi.spyOn(window, "confirm");
  const view = await open("/periods");
  await view.get("input[type=checkbox]").trigger("change");
  await flushPromises();
  expect(view.text()).toContain("Закрыть сбор отзывов?");
  expect(vi.mocked(fetch).mock.calls.some(([, o]) => o?.method === "PUT")).toBe(
    false,
  );
  await confirmDialog(view, "Отмена");
  await view.get("input[type=checkbox]").trigger("change");
  await flushPromises();
  await confirmDialog(view, "Закрыть сбор");
  const call = vi.mocked(fetch).mock.calls.find(([, o]) => o?.method === "PUT");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({ isOpen: false });
  expect(native).not.toHaveBeenCalled();
});
it("generates a summary only after selection", async () => {
  const view = await open("/summaries");
  expect(
    button(view, "Сформировать сводку").attributes("disabled"),
  ).toBeDefined();
  const selects = view.findAll("main select");
  await selects[1]!.setValue("t1");
  await button(view, "Сформировать сводку").trigger("click");
  await flushPromises();
  expect(view.get(".summary-text").text()).toContain("понятные объяснения");
  expect(view.get(".ai-note").text()).toContain("неточности");
});
it("opens the original feedback from an evidence link", async () => {
  const view = await open("/summaries");
  await view.findAll("main select")[1]!.setValue("t1");
  await button(view, "Сформировать сводку").trigger("click");
  await flushPromises();
  const link = view.get('.analysis-evidence a[href="/feedback/f1"]');
  await link.trigger("click");
  await flushPromises();
  expect(router.currentRoute.value.path).toBe("/feedback/f1");
  expect(view.get("h1").text()).toBe("Исходный отзыв");
  expect(view.get("blockquote").text()).toBe("Понятные лекции");
});
it("archives a generated report and downloads its saved file after reopening the page", async () => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-report"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const original = vi.mocked(fetch).getMockImplementation()!;
  let generated = false;
  const entry = { id: "r1", periodTitle: "Осень 2026", createdAtUtc: "2026-11-15T17:00:00Z", fileName: "saved-report.pdf", sizeBytes: 2048 };
  vi.mocked(fetch).mockImplementation(async (input, options) => {
    const path = new URL(String(input)).pathname;
    if (path === "/api/Report/history") return new Response(JSON.stringify({ data: { items: generated ? [entry] : [], page: 1, pageSize: 10, totalCount: generated ? 1 : 0, totalPages: generated ? 1 : 0 } }));
    if (path === "/api/Report/history/r1") return new Response("%PDF-saved");
    if (path === "/api/Report" && options?.method === "POST") generated = true;
    return original(input, options);
  });
  const view = await open("/reports");
  expect(view.text()).toContain("Пока нет отчётов");
  await view.get("select[aria-label=Период]").setValue("p:p1");
  await button(view, "Сформировать отчёт").trigger("click");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "POST");
  expect(String(call?.[0])).toContain("/Report?periodId=p1");
  expect(view.text()).toContain("Отчёт готов и сохранён в истории");
  expect(view.get(".report-history__list").text()).toContain("Осень 2026");
  expect(view.get(".report-history__list").text()).toContain("2 КБ");
  await view.get("select[aria-label=Период]").setValue("y:2026");
  expect(view.get(".report-history__list").text()).toContain("Осень 2026");
  view.unmount();
  const reopened = await open("/reports");
  await reopened.get(".report-history__download").trigger("click");
  await flushPromises();
  expect(vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
  expect(String(vi.mocked(fetch).mock.calls.at(-1)?.[0])).toContain("/Report/history/r1");
  expect(clicks.mock.instances.at(-1)?.download).toBe("saved-report.pdf");
});
it("blocks invalid import files before any preview request", async () => {
  const view = await open("/import");
  const input = view.get("input[type=file]");
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: [new File(["x"], "data.txt")],
  });
  await input.trigger("change");
  await flushPromises();
  expect(view.get("[role=alert]").text()).toContain(
    "Принимается только файл .xlsx",
  );
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/Import/preview")),
  ).toBe(false);
});
it("previews and confirms an import before writing", async () => {
  const view = await open("/import");
  const input = view.get("input[type=file]");
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: [new File(["xlsx"], "data.xlsx")],
  });
  await input.trigger("change");
  await flushPromises();
  expect(view.text()).toContain("3. Проверка");
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/Import/apply")),
  ).toBe(false);
  await button(view, "Импортировать").trigger("click");
  await confirmDialog(view, "Импортировать");
  await flushPromises();
  expect(view.text()).toContain("Импорт выполнен");
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([url]) => String(url).includes("/Import/apply"));
  const body = call?.[1]?.body as FormData;
  expect(body.get("startYear")).toBe("2026");
  expect(body.get("term")).toBe("Autumn");
});
it("edits an existing feedback and sends the current criteria", async () => {
  const view = await open("/my-feedback", false);
  await button(view, "Редактировать оценку:").trigger("click");
  await flushPromises();
  await view.get("dialog textarea").setValue("Дополненный комментарий");
  await button(view, "Сохранить").trigger("click");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({
    id: "f1",
    comment: "Дополненный комментарий",
    feedback: [
      { criteriaId: "c1", grade: 4 },
      { criteriaId: "c2", grade: 4 },
    ],
  });
  expect(view.text()).toContain("Оценка обновлена");
});
it("deletes an own feedback only after confirmation", async () => {
  const view = await open("/my-feedback", false);
  await button(view, "Удалить отзыв:").trigger("click");
  await confirmDialog(view, "Удалить");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url, options]) =>
          String(url).endsWith("/Feedback/f1") && options?.method === "DELETE",
      ),
  ).toBe(true);
  expect(view.text()).toContain("Отзыв удалён");
});
it("updates and deletes a criterion", async () => {
  const view = await open("/criteria");
  await view
    .findAll("button")
    .find((b) => b.attributes("aria-label")?.startsWith("Редактировать:"))!
    .trigger("click");
  await flushPromises();
  await view.get("dialog input").setValue("Новая формулировка");
  await view.get("dialog form").trigger("submit");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url, o]) =>
          String(url).endsWith("/Criteria/c1") && o?.method === "PUT",
      ),
  ).toBe(true);
  await view
    .findAll("button")
    .find((b) => b.attributes("aria-label")?.startsWith("Удалить:"))!
    .trigger("click");
  await confirmDialog(view, "Удалить");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url, o]) =>
          String(url).endsWith("/Criteria/c1") && o?.method === "DELETE",
      ),
  ).toBe(true);
});
it("loads rating summaries from the selected result", async () => {
  const view = await open("/teachers/rating");
  await button(view, "Открыть").trigger("click");
  await flushPromises();
  expect(view.get(".summary-text").text()).toContain("понятные объяснения");
});
it("renames a discipline and merges a duplicate into another record", async () => {
  const view = await open("/disciplines");
  await button(view, "Редактировать:").trigger("click");
  await flushPromises();
  await view.get("dialog form input").setValue("Алгебра");
  await view.get("dialog form").trigger("submit");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url, o]) =>
          String(url).endsWith("/Disciplines/d1") && o?.method === "PUT",
      ),
  ).toBe(true);
  await button(view, "Объединить:").trigger("click");
  await flushPromises();
  const merge = view
    .findAll("dialog")
    .find((dialog) => dialog.get("h2").text() === "Объединение записей")!;
  const search = merge.get("input");
  await search.setValue("Алгебра");
  vi.mocked(fetch).mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [{ id: "d2", name: "Другая дисциплина" }],
            totalCount: 1,
            totalPages: 1,
          },
        }),
      ),
  );
  await search.setValue("Другая дисциплина");
  await vi.waitFor(() =>
    expect(merge.find('input[value="d2"]').exists()).toBe(true),
  );
  await merge.get('input[value="d2"]').setValue();
  await merge
    .findAll("button")
    .find((b) => b.text() === "Объединить")!
    .trigger("click");
  await confirmDialog(view, "Объединить");
  await flushPromises();
  await vi.waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([url, o]) => [String(url), o?.method, o?.body]),
    ).toContainEqual([
      expect.stringContaining("/Disciplines/d1/merge"),
      "POST",
      '{"targetId":"d2"}',
    ]),
  );
});
it("downloads semester data and a template from import", async () => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const view = await open("/import");
  await button(view, "Скачать данные семестра").trigger("click");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) =>
        String(url).includes("/Import/export?startYear=2026&term=Autumn"),
      ),
  ).toBe(true);
  await button(view, "Пустой шаблон").trigger("click");
  await flushPromises();
  expect(view.text()).not.toContain("Скачать для всех групп");
  expect(view.findAll("h2").some(h => h.text() === "Логины и пароли")).toBe(false);
});
it("displays an AI summary failure with retry", async () => {
  const view = await open("/summaries");
  await view.findAll("main select")[1]!.setValue("t1");
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "Сводка временно недоступна" }), {
      status: 503,
    }),
  );
  await button(view, "Сформировать сводку").trigger("click");
  await flushPromises();
  expect(view.get("[role=alert]").text()).toContain(
    "Сводка временно недоступна",
  );
});
it("handles login errors without navigating", async () => {
  await router.push("/login");
  wrapper = mount(App, { global: { plugins: [router] } });
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "Неверный пароль" }), {
      status: 401,
    }),
  );
  await wrapper.get("input[autocomplete=username]").setValue("student");
  await wrapper.get("input[autocomplete=current-password]").setValue("wrong");
  await wrapper.get("form").trigger("submit");
  await flushPromises();
  expect(wrapper.get("[role=alert]").text()).toContain("Неверный пароль");
  expect(router.currentRoute.value.path).toBe("/login");
});
it("shows the signed-in account and removes footer slogans", async () => {
  const view = await open("/dashboard");
  expect(view.get(".account-login").text()).toBe("student");
  expect(view.text()).not.toContain("Данные помогают обсуждать и улучшать");
  expect(view.text()).not.toContain("Обратная связь,которая помогает учиться");
  expect(view.find("footer").exists()).toBe(false);
});
it("shows charts and period-specific counts on the dashboard", async () => {
  const view = await open("/dashboard");
  expect(view.findAll("svg[role=img]")).toHaveLength(3);
  expect(view.text()).toContain("Заполнение по семестрам");
  expect(view.text()).toContain("Распределение оценок");
  await view.get("select[aria-label=Период]").setValue("p:p1");
  await flushPromises();
  expect(view.findAll(".stat-card")[0]!.text()).toContain("1");
});

async function confirmDialog(view: VueWrapper, label: string) {
  await flushPromises();
  const actions = view.get(".confirmation-actions");
  await actions
    .findAll("button")
    .find((button) => button.text() === label)!
    .trigger("click");
  await flushPromises();
}
it("does not fetch admin feedback until a target is chosen", async () => {
  const view = await open("/feedback");
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url]) => new URL(String(url)).pathname === "/api/Feedback",
      ),
  ).toBe(false);
  await view.get(".feedback-target").trigger("click");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(
      ([url]) => new URL(String(url)).pathname === "/api/Feedback",
    );
  expect(new URL(String(call?.[0])).searchParams.get("DisciplineId")).toBe(
    "d1",
  );
  expect(new URL(String(call?.[0])).searchParams.get("Sort")).toBe("Newest");
  await view
    .get('select[aria-label="Сортировка отзывов"]')
    .setValue("GradeAsc");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(
        ([url]) => new URL(String(url)).searchParams.get("Sort") === "GradeAsc",
      ),
  ).toBe(true);
});
it("hides the password reset notice when the feature is disabled", async () => {
  vi.stubEnv("VITE_SHOW_PASSWORD_RESET_NOTICE", "false");
  await router.push("/login");
  wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  expect(wrapper.find(".login-notice").exists()).toBe(false);
});
it("places the reset notice before the login card", async () => {
  await router.push("/login");
  wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  expect(wrapper.get(".login-stack").element.firstElementChild?.className).toBe(
    "login-notice",
  );
});
it("selects a teacher before loading their reviews", async () => {
  const view = await open("/feedback");
  await router.push("/teachers?tab=feedback");
  await flushPromises();
  expect(view.text()).toContain("Петрова Анна Ивановна");
  await view.get(".feedback-target").trigger("click");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(
      ([url]) => new URL(String(url)).pathname === "/api/Feedback",
    );
  const params = new URL(String(call?.[0])).searchParams;
  expect(params.get("TeacherId")).toBe("t1");
  expect(params.has("DisciplineId")).toBe(false);
});

it("keeps the directory heading mounted when switching tabs and choosing a review target", async () => {
  const view = await open("/teachers");
  const header = view.get(".page-header").element;
  await router.push("/teachers?tab=ratings");
  await flushPromises();
  expect(view.get(".page-header").element).toBe(header);
  await router.push("/teachers?tab=feedback&targetId=t1");
  await flushPromises();
  expect(view.get(".page-header").element).toBe(header);
  expect(view.find(".review-card").exists()).toBe(true);
});

it("restores catalog rows immediately when returning to a tab with a slow request", async () => {
  const view = await open("/teachers");
  const original = view.get("tbody").text();
  await router.push("/teachers?tab=ratings");
  await flushPromises();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const fetch = vi.mocked(globalThis.fetch);
  const previous = fetch.getMockImplementation()!;
  fetch.mockImplementation(async (input, init) => {
    if (new URL(String(input)).pathname === "/api/Teachers") await gate;
    return previous(input, init);
  });
  await router.push("/teachers");
  await flushPromises();
  expect(view.get("tbody").text()).toBe(original);
  expect(view.find(".table-state[role=status]").exists()).toBe(false);
  expect(view.find(".loading-skeleton").exists()).toBe(false);
  release();
  await flushPromises();
});
