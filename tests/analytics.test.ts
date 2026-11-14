import { expect, it } from "vitest";
import { averageGrade, alphabeticalSample } from "../src/utils/analytics";
it("distinguishes no results from a real average", () => {
  expect(averageGrade([])).toBeNull();
  expect(averageGrade([{ grade: 0 }])).toBeNull();
  expect(averageGrade([{ grade: 5 }, { grade: 3 }])).toBe(4);
});
it("excludes unrated or nonfinite records", () =>
  expect(averageGrade([{ grade: 0 }, { grade: NaN }, { grade: 4 }])).toBe(4));
it("limits an alphabetical chart without mutating data", () => {
  const items = [{ name: "Язык" }, { name: "Алгебра" }, { name: "История" }];
  expect(alphabeticalSample(items, 2)).toEqual([
    { name: "Алгебра" },
    { name: "История" },
  ]);
  expect(items[0]?.name).toBe("Язык");
});
