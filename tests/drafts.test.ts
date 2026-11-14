import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allCriteriaRated,
  draftKey,
  readDraft,
  saveDraft,
} from "../src/utils/drafts";
beforeEach(() => localStorage.clear());
describe("feedback draft lifecycle", () => {
  it("isolates students and workloads", () => {
    expect(draftKey("a", "x")).not.toBe(draftKey("b", "x"));
    expect(draftKey("a", "x")).not.toBe(draftKey("a", "y"));
  });
  it("restores Unicode comments and grades", () => {
    const draft = { grades: { c: 4 }, comment: "Понятные объяснения" };
    expect(saveDraft("draft", draft)).toBe(true);
    expect(readDraft("draft")).toEqual(draft);
  });
  it.each([
    "invalid",
    "null",
    "[]",
    '{"grades":[],"comment":"x"}',
    '{"grades":{},"comment":12}',
  ])("handles damaged storage: %s", (raw) => {
    localStorage.setItem("draft", raw);
    expect(readDraft("draft")).toEqual({ grades: {}, comment: "" });
  });
  it("filters tampered grades", () => {
    localStorage.setItem(
      "draft",
      JSON.stringify({
        grades: { low: 0, high: 6, fraction: 2.5, text: "5", valid: 5 },
        comment: "x",
      }),
    );
    expect(readDraft("draft").grades).toEqual({ valid: 5 });
  });
  it("reports unavailable storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(saveDraft("draft", { grades: {}, comment: "x" })).toBe(false);
  });
  it("does not accept an empty criterion list", () =>
    expect(allCriteriaRated([], {})).toBe(false));
  it("requires each current criterion", () => {
    expect(allCriteriaRated(["a", "b"], { a: 5 })).toBe(false);
    expect(allCriteriaRated(["a"], { old: 5 })).toBe(false);
    expect(allCriteriaRated(["a", "b"], { a: 5, b: 1 })).toBe(true);
  });
  it.each([0, 6, 1.5, NaN, Infinity])("rejects invalid grade %s", (grade) =>
    expect(allCriteriaRated(["a"], { a: grade })).toBe(false),
  );
});
