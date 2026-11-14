import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import App from "../src/App.vue";
import { router } from "../src/router";
import { installSession, clearSession } from "../src/store/auth";
import { responseData, session } from "./fixtures";
let wrapper: VueWrapper | undefined;
beforeEach(() => {
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
  await view.get('select[aria-label="Тема оформления"]').setValue("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("vsoko.theme")).toBe("dark");
});
function button(view: VueWrapper, text: string) {
  const result = view
    .findAll("button")
    .find((button) => button.text() === text);
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
  await button(view, "Изменить").trigger("click");
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
  vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = await open("/periods");
  await view.get("input[type=checkbox]").trigger("change");
  await flushPromises();
  expect(
    (view.get("input[type=checkbox]").element as HTMLInputElement).checked,
  ).toBe(true);
  expect(vi.mocked(fetch).mock.calls.some(([, o]) => o?.method === "PUT")).toBe(
    false,
  );
  vi.mocked(window.confirm).mockReturnValue(true);
  await view.get("input[type=checkbox]").trigger("change");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "PUT");
  expect(JSON.parse(String(call?.[1]?.body))).toEqual({ isOpen: false });
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
it("downloads the report for the selected semester", async () => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:test-report"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const view = await open("/reports");
  await view.get("select[aria-label=Период]").setValue("p:p1");
  await button(view, "Сформировать отчёт ↓").trigger("click");
  await flushPromises();
  const call = vi
    .mocked(fetch)
    .mock.calls.find(([, options]) => options?.method === "POST");
  expect(String(call?.[0])).toContain("/Report?periodId=p1");
  expect(view.text()).toContain("Скачать повторно");
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
  vi.spyOn(window, "confirm").mockReturnValue(true);
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
  await button(view, "Редактировать").trigger("click");
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
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const view = await open("/my-feedback", false);
  await button(view, "Удалить").trigger("click");
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
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const view = await open("/criteria");
  await view
    .findAll("button")
    .find((b) => b.text() === "Изменить")!
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
    .find((b) => b.text() === "Удалить")!
    .trigger("click");
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
  await button(view, "Открыть ↗").trigger("click");
  await flushPromises();
  expect(view.get(".summary-text").text()).toContain("понятные объяснения");
});
it("renames a discipline and merges a duplicate into another record", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const view = await open("/disciplines");
  await button(view, "Изменить").trigger("click");
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
  await button(view, "Объединить").trigger("click");
  await flushPromises();
  const dialogs = view.findAll("dialog");
  const merge = dialogs[1]!;
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
  await merge.get("form").trigger("submit");
  await flushPromises();
  await vi.waitFor(() =>
    expect(
      merge
        .findAll("option")
        .some((option) => option.attributes("value") === "d2"),
    ).toBe(true),
  );
  await merge.get("select").setValue("d2");
  await vi.waitFor(() =>
    expect(
      merge
        .findAll("button")
        .find((b) => b.text() === "Объединить")!
        .attributes("disabled"),
    ).toBeUndefined(),
  );
  await merge
    .findAll("button")
    .find((b) => b.text() === "Объединить")!
    .trigger("click");
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
it("exports a semester and selected credentials", async () => {
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
  await button(view, "Пустой шаблон ↓").trigger("click");
  await flushPromises();
  await button(view, "Скачать для всех групп ↓").trigger("click");
  await flushPromises();
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/Import/credentials")),
  ).toBe(true);
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
