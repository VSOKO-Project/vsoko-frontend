import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import FeedbackReport from "../src/components/FeedbackReport.vue";
import FeedbackCategoryForm from "../src/components/FeedbackCategoryForm.vue";
import FeedbackSignal from "../src/components/FeedbackSignal.vue";
import { feedbackReport } from "./fixtures";
import type { FeedbackReportDto, FeedbackSignalDto } from "../src/types";

const api = vi.hoisted(() => ({ addFeedbackCategory: vi.fn(), reviewFeedbackSignal: vi.fn() }));
vi.mock("../src/api/summaries", () => api);
const global = { stubs: {
  RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' },
  AppSelect: { props: ["modelValue", "options"], emits: ["update:modelValue"], template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :value="o.value">{{ o.label }}</option></select>' },
} };
afterEach(() => vi.resetAllMocks());

describe("feedback report evidence", () => {
  it("links every topic and a rare signal to the original feedback", () => {
    const report = structuredClone(feedbackReport) as FeedbackReportDto;
    report.totalFeedbackCount = report.commentCount = report.processedCount = 200;
    report.signals = [{ feedbackId: "rare/id", signalKey: "key", categoryName: "Возможное унижение", quote: "назвал меня тупым", basis: "Personal", status: "Pending", note: "" }];
    const view = mount(FeedbackReport, { props: { report }, global });
    expect(view.text()).toContain("Обработано 200 из 200");
    expect(view.get('a[href="/feedback/rare%2Fid"]').text()).toContain("Открыть отзыв");
    expect(view.find('a[href="/feedback/f1"]').exists()).toBe(true);
    expect(view.text()).toContain("назвал меня тупым");
    view.unmount();
  });

  it("shows incomplete coverage and retains evidence on partial failure", async () => {
    const report = { ...structuredClone(feedbackReport), processedCount: 0, failedCount: 1 } as FeedbackReportDto;
    const view = mount(FeedbackReport, { props: { report }, global });
    expect(view.text()).toContain("Отчёт неполный");
    expect(view.find('a[href="/feedback/f1"]').exists()).toBe(true);
    await view.get("button").trigger("click");
    expect(view.emitted("refresh")).toHaveLength(1);
    view.unmount();
  });

  it("keeps proposed categories unapproved until the form is submitted", async () => {
    const report = { ...structuredClone(feedbackReport), proposedCategories: [{ name: "Доступность", description: "Альтернативные форматы", requiresAttention: false, evidence: feedbackReport.topics[0]!.evidence }] } as FeedbackReportDto;
    const view = mount(FeedbackReport, { props: { report }, global });
    expect(api.addFeedbackCategory).not.toHaveBeenCalled();
    await view.get("button").trigger("click");
    expect(api.addFeedbackCategory).not.toHaveBeenCalled();
    const form = view.getComponent(FeedbackCategoryForm);
    await form.get("input[maxlength='120']").setValue("Доступность материалов");
    await form.get("form").trigger("submit");
    await flushPromises();
    expect(api.addFeedbackCategory).toHaveBeenCalledWith({ name: "Доступность материалов", description: "Альтернативные форматы", requiresAttention: false });
    expect(view.emitted("refresh")).toHaveLength(1);
    view.unmount();
  });

  it("saves human review separately from the quoted source", async () => {
    const signal: FeedbackSignalDto = { feedbackId: "f1", signalKey: "key", categoryName: "Унижение", quote: "исходная цитата", basis: "Hearsay", status: "Pending", note: "" };
    const view = mount(FeedbackSignal, { props: { signal }, global });
    await view.get("select").setValue("Reviewed");
    await view.get("textarea").setValue("Проверено сотрудником");
    await view.get("form").trigger("submit");
    await flushPromises();
    expect(api.reviewFeedbackSignal).toHaveBeenCalledWith("f1", "key", { status: "Reviewed", note: "Проверено сотрудником" });
    expect(view.get("blockquote").text()).toBe("исходная цитата");
    expect(view.emitted("saved")).toHaveLength(1);
    view.unmount();
  });
});
