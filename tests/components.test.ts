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
