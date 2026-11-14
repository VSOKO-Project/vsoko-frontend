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
  period: { ...period, willBeCreated: false },
  summary: Object.fromEntries(
    ["groups", "students", "teachers", "disciplines", "workloads"].map(
      (key) => [key, { create: 1, existing: 0, delete: 0 }],
    ),
  ),
  errors: [],
  warnings: [],
  workloadsToDelete: [],
  createdGroupIds: ["g1"],
  studentGroupIds: ["g1"],
};
export function responseData(path: string) {
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
    return paged([{ id: "t1", name: teacher.fullName, grade: 4.3 }]);
  if (path === "/Disciplines/rating")
    return paged([{ id: "d1", name: discipline.name, grade: 4.3 }]);
  if (path === "/Teachers") return paged([teacher]);
  if (path === "/Disciplines") return paged([discipline]);
  if (path === "/Feedback") return paged([feedback]);
  if (path === "/Feedback/f1") return feedback;
  if (path.startsWith("/Summaries/"))
    return "Студенты отмечают понятные объяснения и доступные материалы.";
  if (path === "/Import/groups") return [group];
  if (path === "/Import/teachers") return [teacher];
  if (path === "/Import/preview" || path === "/Import/apply")
    return importReport;
  return null;
}
