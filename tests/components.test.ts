import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import Rating from "../src/components/Rating.vue";
import LoadState from "../src/components/LoadState.vue";
import Pagination from "../src/components/Pagination.vue";
it("emits a numeric score from a labelled radio group", async () => {
  const wrapper = mount(Rating, {
    props: { modelValue: 0, label: "Понятность" },
  });
  expect(wrapper.get("[role=radiogroup]").attributes("aria-label")).toBe(
    "Понятность",
  );
  await wrapper.get('input[value="4"]').setValue();
  expect(wrapper.emitted("update:modelValue")).toEqual([[4]]);
});
it("uses independent radio names for different criteria", () => {
  const wrapper = mount({
    components: { Rating },
    template:
      '<Rating :model-value="0" label="Первый"/><Rating :model-value="0" label="Второй"/>',
  });
  const names = wrapper
    .findAll("input")
    .map((input) => input.attributes("name"));
  expect(names[0]).not.toBe(names[5]);
});
it("shows read-only results without controls", () => {
  const wrapper = mount(Rating, {
    props: { modelValue: 4.5, label: "Материалы", readonly: true },
  });
  expect(wrapper.findAll("input")).toHaveLength(0);
  expect(wrapper.text()).toContain("4,5");
});
it("offers retry and never displays stale content on error", async () => {
  const wrapper = mount(LoadState, {
    props: { error: "Нет соединения" },
    slots: { default: "старые данные" },
  });
  expect(wrapper.text()).not.toContain("старые данные");
  await wrapper.get("button").trigger("click");
  expect(wrapper.emitted("retry")).toHaveLength(1);
});
it("announces loading and hides content", () => {
  const wrapper = mount(LoadState, {
    props: { loading: true },
    slots: { default: "данные" },
  });
  expect(wrapper.get("[role=status]").text()).toContain("Загружаем");
  expect(wrapper.text()).not.toBe("данные");
});
it("prevents paging beyond the first and last page", async () => {
  const wrapper = mount(Pagination, { props: { page: 1, total: 3 } });
  expect(wrapper.findAll("button")[0]!.attributes("disabled")).toBeDefined();
  await wrapper.findAll("button")[1]!.trigger("click");
  expect(wrapper.emitted("update:page")).toEqual([[2]]);
  await wrapper.setProps({ page: 3 });
  expect(wrapper.findAll("button")[1]!.attributes("disabled")).toBeDefined();
});
it("renders an accessible custom menu with the selected option", async () => {
  const { default: AppSelect } =
    await import("../src/components/AppSelect.vue");
  const { flushPromises } = await import("@vue/test-utils");
  const wrapper = mount(AppSelect, {
    props: {
      modelValue: "fall",
      label: "Период",
      options: [
        { value: "", label: "Все периоды" },
        { value: "fall", label: "Осень 2026" },
      ],
    },
  });
  await flushPromises();
  expect(wrapper.get("[role=combobox]").attributes("aria-label")).toBe(
    "Период",
  );
  expect(wrapper.get("[role=combobox]").text()).toContain("Осень 2026");
  expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  wrapper.unmount();
});
it("keeps a custom menu disabled during a pending action", async () => {
  const { default: AppSelect } =
    await import("../src/components/AppSelect.vue");
  const wrapper = mount(AppSelect, {
    props: {
      modelValue: "",
      label: "Тип критерия",
      disabled: true,
      options: [{ value: "", label: "Выберите тип" }],
    },
  });
  expect(wrapper.get("[role=combobox]").attributes("disabled")).toBeDefined();
  wrapper.unmount();
});

it.each(["table", "cards", "form", "dashboard", "workloads", "text", "list", "field", "options", "feedback", "criteria", "import"] as const)(
  "replaces the %s skeleton with content after loading",
  async (skeleton) => {
    const wrapper = mount(LoadState, {
      props: { loading: true, skeleton },
      slots: { default: '<p class="loaded">Результат</p>' },
    });
    expect(wrapper.findAll(".skeleton-block").length).toBeGreaterThan(0);
    expect(wrapper.get("[role=status]").attributes("aria-busy")).toBe("true");
    expect(wrapper.get(".sr-only").text()).toContain("Загружаем");
    expect(wrapper.find(".loaded").exists()).toBe(false);
    await wrapper.setProps({ loading: false });
    expect(wrapper.find(".loading-skeleton").exists()).toBe(false);
    expect(wrapper.get(".loaded").text()).toBe("Результат");
  },
);

it("updates the shared page heading and omits an absent subtitle", async () => {
  const { default: PageHeader } = await import("../src/components/PageHeader.vue");
  const header = mount(PageHeader, { props: { title: "Справочник" } });
  expect(header.get("h1").text()).toBe("Справочник");
  expect(header.find(".page-subtitle").exists()).toBe(false);
  expect(header.classes()).not.toContain("page-header--with-actions");
  await header.setProps({ title: "Преподаватели", subtitle: "Записи справочника" });
  expect(header.get("h1").text()).toBe("Преподаватели");
  expect(header.get(".page-subtitle").text()).toBe("Записи справочника");
});

it("renders page heading context and an accessible action through slots", async () => {
  const { default: PageHeader } = await import("../src/components/PageHeader.vue");
  const header = mount(PageHeader, {
    props: { title: "Сводка", subtitle: "Запасной текст" },
    slots: { default: "Статистика выбранного периода", actions: '<button type="button">Выбрать период</button>' },
  });
  expect(header.classes()).toContain("page-header--with-actions");
  expect(header.get(".page-subtitle").text()).toBe("Статистика выбранного периода");
  expect(header.get("button").text()).toBe("Выбрать период");
  expect(header.findAll("h1")).toHaveLength(1);
});

it("keeps empty semesters distinct from zero completion in the coverage chart", async () => {
  const { default: CoverageChart } = await import("../src/components/CoverageChart.vue");
  const { dashboard } = await import("./fixtures");
  const sample = dashboard.timeline[0]!;
  const items = [
    { ...sample, periodId: "empty", title: "2025/2026, Осень", coverage: { submittedCount: 0, possibleCount: 0, completionPercent: null } },
    { ...sample, periodId: "zero", title: "2025/2026, Весна", coverage: { submittedCount: 0, possibleCount: 10, completionPercent: 0 } },
    { ...sample, periodId: "partial", title: "2026/2027, Осень", coverage: { submittedCount: 5, possibleCount: 10, completionPercent: 50 } },
  ];
  const chart = mount(CoverageChart, { props: { items } });
  expect(chart.findAll(".coverage-track")).toHaveLength(2);
  expect(chart.findAll(".chart-column")).toHaveLength(2);
  expect(chart.findAll("rect[tabindex]")[0]!.attributes("aria-label")).toContain("0 из 0");
  expect(chart.findAll("rect[tabindex]")[1]!.attributes("aria-label")).toContain("0%");
  expect(chart.get("svg").attributes("style")).toContain("min-width: 400px");
  chart.unmount();
});

it("leaves gaps in the grade trend when a semester has no grades", async () => {
  const { default: GradeTrend } = await import("../src/components/GradeTrend.vue");
  const { dashboard } = await import("./fixtures");
  const sample = dashboard.timeline[0]!;
  const chart = mount(GradeTrend, {
    props: { items: [
      { ...sample, periodId: "first", averageGrade: 4 },
      { ...sample, periodId: "gap", averageGrade: null },
      { ...sample, periodId: "last", averageGrade: 5 },
    ] },
  });
  expect(chart.findAll(".grade-trend-line")).toHaveLength(0);
  expect(chart.findAll(".grade-trend-point")).toHaveLength(2);
  expect(chart.text()).toContain("—");
  chart.unmount();
});

it("keeps the same table and column headings across loading, error, empty and data states", async () => {
  const { default: DataTable } = await import("../src/components/DataTable.vue");
  const table = mount(DataTable, {
    props: { columns: ["Название", "Действия"], loading: true },
    slots: { default: "<tr><td>Математика</td><td>Открыть</td></tr>" },
  });
  const head = table.get("thead").element;
  const element = table.get("table").element;
  expect(table.get('[role="status"]').text()).toContain("Загружаем");
  await table.setProps({ loading: false, error: "Нет связи" });
  expect(table.get('[role="alert"]').text()).toContain("Нет связи");
  await table.get("button").trigger("click");
  expect(table.emitted("retry")).toHaveLength(1);
  await table.setProps({ error: "", empty: true });
  expect(table.text()).toContain("Здесь пока нет данных");
  await table.setProps({ empty: false });
  expect(table.get("thead").element).toBe(head);
  expect(table.get("table").element).toBe(element);
  expect(table.get("tbody").text()).toContain("Математика");
  table.unmount();
});

it("delays skeleton visibility and cancels its timer after a fast response", async () => {
  const { vi } = await import("vitest");
  vi.useFakeTimers();
  const state = mount(LoadState, { props: { loading: true } });
  try {
    expect(state.get(".skeleton-layout").attributes("style")).toContain("hidden");
    await state.setProps({ loading: false });
    await vi.advanceTimersByTimeAsync(200);
    expect(state.find(".loading-skeleton").exists()).toBe(false);
    await state.setProps({ loading: true });
    await vi.advanceTimersByTimeAsync(159);
    expect(state.get(".skeleton-layout").attributes("style")).toContain("hidden");
    await vi.advanceTimersByTimeAsync(1);
    expect(state.get(".skeleton-layout").attributes("style")).toContain("visible");
  } finally {
    state.unmount();
    vi.useRealTimers();
  }
});
