export interface FeedbackDraft {
  grades: Record<string, number>;
  comment: string;
}
export function draftKey(userId: string | null, workloadId: string) {
  return `vsoko.draft.v1:${userId}:${workloadId}`;
}
export function readDraft(key: string): FeedbackDraft {
  try {
    const draft: unknown = JSON.parse(localStorage.getItem(key) || "null");
    if (
      draft &&
      typeof draft === "object" &&
      "grades" in draft &&
      "comment" in draft &&
      typeof draft.comment === "string" &&
      draft.grades &&
      typeof draft.grades === "object" &&
      !Array.isArray(draft.grades)
    ) {
      const grades = Object.fromEntries(
        Object.entries(draft.grades).filter(
          ([, value]) => Number.isInteger(value) && value >= 1 && value <= 5,
        ),
      );
      return { grades, comment: draft.comment };
    }
  } catch {
    /* A damaged draft must not prevent opening the form. */
  }
  return { grades: {}, comment: "" };
}
export function saveDraft(key: string, draft: FeedbackDraft): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
export function allCriteriaRated(
  ids: string[],
  grades: Record<string, number>,
): boolean {
  return (
    ids.length > 0 &&
    ids.every(
      (id) =>
        Number.isInteger(grades[id]) && grades[id] >= 1 && grades[id] <= 5,
    )
  );
}
