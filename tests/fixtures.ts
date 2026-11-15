export const session = {
  login: "student",
  accessToken: "access",
  refreshToken: "refresh",
  userId: "student",
  expires: "",
  isAdmin: false,
  mustChangePassword: false,
};
export const period = {
  id: "p1",
  startYear: 2026,
  term: "Autumn",
  title: "Осень 2026",
  isFeedbackOpen: true,
  workloadCount: 1,
  feedbackCount: 1,
};
export const teacher = {
  id: "t1",
  name: "Анна",
  surname: "Петрова",
  patronymic: "Ивановна",
  fullName: "Петрова Анна Ивановна",
};
export const discipline = { id: "d1", name: "Математический анализ" };
export const group = { id: "g1", name: "ПИ-26", semester: 1 };
export const workload = { id: "w1", teacher, discipline, group, period };
export const criteria = [
  { id: "c1", name: "Понятность объяснений", object: "Teacher" },
  { id: "c2", name: "Доступность материалов", object: "Discipline" },
];
export const feedback = {
  id: "f1",
  comment: "Понятные лекции",
  workload,
  student: { id: "student", group },
  criteriaFeedback: criteria.map((c) => ({ criteria: c, criteriaScore: 4 })),
};
export const paged = (items: unknown[]) => ({
  items,
  totalCount: items.length,
  totalPages: 1,
  page: 1,
  pageSize: 10,
});
export const importReport = {
  mode: "AddOnly",
  previewToken: "preview-v1",
  canSynchronize: false,
  scopeDescription: "В файле нет данных выгрузки. Удаление недоступно.",
  changes: [],
  newTeachers: [],
  newDisciplines: [],
  period: { ...period, willBeCreated: false },
  summary: Object.fromEntries(
    ["groups", "students", "teachers", "disciplines", "workloads"].map(
      (key) => [key, { create: 1, update: 0, existing: 0, delete: 0 }],
    ),
  ),
  errors: [],
  warnings: [],
  workloadsToDelete: [],
  createdGroupIds: ["g1"],
  studentGroupIds: ["g1"],
};
export const dashboard = {
  ratedFeedbackCount: 1, comparison: null,
  coverage: { submittedCount: 1, possibleCount: 24, completionPercent: 4.2 },
  feedbackCount: 1, teacherCount: 1, disciplineCount: 1, averageGrade: 4.3, lowGradeCount: 0,
  distribution: [{ label: '1–2', value: 0 }, { label: '2–3', value: 0 }, { label: '3–4', value: 0 }, { label: '4–5', value: 1 }],
  lowGrades: [], highGrades: [{ id: 'd1', name: discipline.name, grade: 4.3, feedbackCount: 1 }],
  timeline: [{ periodId: 'p1', title: '2026/27, осенний семестр', feedbackCount: 1, averageGrade: 4.3, disciplineCount: 1, coverage: { submittedCount: 1, possibleCount: 24, completionPercent: 4.2 } }],
};
export const feedbackReport = {
  name: teacher.fullName, totalFeedbackCount: 1, commentCount: 1, processedCount: 1,
  failedCount: 0, pendingCount: 0, generatedAtUtc: "2026-11-15T12:00:00Z", version: "v1",
  summary: "Студенты отмечают понятные объяснения и доступные материалы.",
  topics: [{ categoryId: "explanation", name: "Понятность объяснений", count: 1, positiveCount: 1,
    negativeCount: 0, neutralCount: 0, evidence: [{ feedbackId: feedback.id, quote: feedback.comment, sentiment: "Positive", basis: "Personal" }] }],
  signals: [], proposedCategories: [],
};
export function responseData(path: string) {
  if (path === "/Dashboard") return dashboard;
  if (
    path === "/Security/Login" ||
    path === "/Security/Refresh" ||
    path === "/Security/ChangePassword"
  )
    return session;
  if (path === "/Periods") return [period];
  if (path === "/Periods/suggested")
    return [{ ...period, exists: true, isCurrent: true }];
  if (path === "/Workload") return paged([workload]);
  if (path === "/Workload/w1") return workload;
  if (path === "/Criteria") return criteria;
  if (path === "/Teachers/rating")
    return paged([{ id: "t1", name: teacher.fullName, grade: 4.3, feedbackCount: 1 }]);
  if (path === "/Disciplines/rating")
    return paged([{ id: "d1", name: discipline.name, grade: 4.3, feedbackCount: 1 }]);
  if (path === "/Teachers/t1") return teacher;
  if (path === "/Disciplines/d1") return discipline;
  if (path === "/Teachers") return paged([teacher]);
  if (path === "/Disciplines") return paged([discipline]);
  if (path === "/Feedback") return paged([feedback]);
  if (path === "/Feedback/f1") return feedback;
  if (path === "/Summaries/categories") return [{ id: "explanation", name: "Понятность объяснений", description: "Ясность изложения", requiresAttention: false }];
  if (path.startsWith("/Summaries/")) return feedbackReport;
  if (path === "/Import/groups") return [group];
  if (path === "/Report/history") return paged([]);
  if (path === "/Import/teachers") return [teacher];
  if (path === "/Import/preview" || path === "/Import/apply")
    return importReport;
  return null;
}
