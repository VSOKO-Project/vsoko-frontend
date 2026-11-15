// === Auth ===
export interface LoginQuery {
  login: string;
  password: string;
}

export interface LoginResultDto {
  login?: string;
  accessToken: string;
  refreshToken: string;
  expires: string;
  userId: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface ChangePasswordCommand {
  currentPassword: string;
  newPassword: string;
}

export interface ApiSuccessResult<T> {
  code: number | null;
  message: string | null;
  data: T;
}

export interface RefreshQuery {
  refresh: string;
}

export interface LogOutQuery {
  refresh: string;
}

// === Criteria ===
export type CriteriaObject = "Teacher" | "Discipline";

export interface CriteriaDto {
  id: string;
  name: string;
  object: CriteriaObject;
}

export interface PostCriteriaCommandRequest {
  name: string;
  criteriaObject: CriteriaObject;
}

export interface PutCriteriaCommandRequest {
  id: string;
  name: string;
  criteriaObject: CriteriaObject;
}

// === Discipline ===
export interface DisciplineDto {
  id: string;
  name: string;
}

// === Teacher ===
export interface TeacherDto {
  id: string;
  name: string;
  surname: string;
  patronymic: string;
  fullName: string;
}

// === Student / Group ===
export interface StudentGroupDto {
  id: string;
  name: string;
  semester: number;
}

export interface StudentDto {
  id: string;
  group: StudentGroupDto;
}

// === Academic period ===
export type Term = "Autumn" | "Spring";

export interface PeriodDto {
  id: string;
  startYear: number;
  term: Term;
  title: string;
  isFeedbackOpen: boolean;
}

export interface PeriodListItemDto extends PeriodDto {
  workloadCount: number;
  feedbackCount: number;
}

export interface SuggestedPeriodDto {
  id: string | null;
  startYear: number;
  term: Term;
  title: string;
  exists: boolean;
  isCurrent: boolean;
}

/** Фильтр админских выборок: конкретный семестр или весь учебный год. Без полей — за всё время. */
export interface PeriodFilterParams {
  PeriodId?: string;
  StartYear?: number;
}

// === Workload ===
export interface WorkloadDto {
  id: string;
  teacher: TeacherDto;
  discipline: DisciplineDto;
  group: StudentGroupDto;
  period: PeriodDto;
}

// === Import ===
export interface ImportCountDto {
  create: number;
  update: number;
  existing: number;
  delete: number;
}

export interface ImportWorkloadDto {
  teacher: string;
  discipline: string;
  group: string;
}

export interface ImportIssueDto {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportReportDto {
  mode: ImportMode;
  previewToken: string;
  canSynchronize: boolean;
  scopeDescription: string;
  changes: { entity: string; key: string; field: string; before: string; after: string }[];
  newTeachers: string[];
  newDisciplines: string[];
  period: {
    id: string | null;
    startYear: number;
    term: Term;
    title: string;
    willBeCreated: boolean;
  };
  summary: {
    groups: ImportCountDto;
    students: ImportCountDto;
    teachers: ImportCountDto;
    disciplines: ImportCountDto;
    workloads: ImportCountDto;
  };
  errors: ImportIssueDto[];
  warnings: ImportIssueDto[];
  workloadsToDelete: ImportWorkloadDto[];
  createdGroupIds: string[] | null;
  studentGroupIds: string[] | null;
}

export type ImportMode = "AddOnly" | "UpdateExisting" | "SynchronizeWorkloads";

// === Feedback ===
export interface Grades {
  criteriaId: string;
  grade: number;
}

export interface PostFeedbackRequest {
  feedback: Grades[];
  comment: string;
  workloadId: string;
}

export interface PutFeedbackRequest {
  id: string;
  comment: string;
  feedback: Grades[];
}

export interface CriteriaFeedbackDto {
  criteria: CriteriaDto;
  criteriaScore: number;
}

export type FeedbackSort = "Newest" | "Oldest" | "GradeDesc" | "GradeAsc";

export interface FeedbackDto {
  createdAtUtc?: string | null;
  averageGrade?: number | null;
  id: string;
  comment: string;
  workload: WorkloadDto;
  student: StudentDto;
  criteriaFeedback: CriteriaFeedbackDto[];
}

// === Rating ===
export interface RatingDto {
  feedbackCount: number;
  id: string;
  name: string;
  grade: number;
}

// === Pagination ===
export interface PagedResultDto<T> {
  items: T[];
  totalPages: number;
  pageSize: number;
  totalCount: number;
  page: number;
}

// === Error ===
export interface ProblemDetails {
  type: string | null;
  title: string | null;
  status: number | null;
  detail: string | null;
  instance: string | null;
}

export interface DashboardCoverageDto {
  submittedCount: number;
  possibleCount: number;
  completionPercent: number | null;
}
export interface DashboardSemesterDto {
  coverage: DashboardCoverageDto;
  periodId: string;
  title: string;
  feedbackCount: number;
  averageGrade: number | null;
  disciplineCount: number;
}
export interface DashboardDto {
  ratedFeedbackCount: number;
  comparison: { currentTitle: string; previousTitle: string; delta: number; currentFeedbackCount: number; previousFeedbackCount: number } | null;
  coverage: DashboardCoverageDto;
  feedbackCount: number;
  teacherCount: number;
  disciplineCount: number;
  averageGrade: number | null;
  lowGradeCount: number;
  distribution: { label: string; value: number }[];
  lowGrades: RatingDto[];
  highGrades: RatingDto[];
  timeline: DashboardSemesterDto[];
}

export interface FeedbackCategoryDto {
  id: string;
  name: string;
  description: string;
  requiresAttention: boolean;
}
export interface FeedbackEvidenceDto {
  feedbackId: string;
  quote: string;
  sentiment: "Positive" | "Negative" | "Neutral";
  basis: "Personal" | "Hearsay" | "Ambiguous";
}
export interface FeedbackSignalDto {
  feedbackId: string;
  signalKey: string;
  categoryName: string;
  quote: string;
  basis: FeedbackEvidenceDto["basis"];
  status: "Pending" | "InReview" | "Reviewed";
  note: string;
}
export interface ProposedFeedbackCategoryDto {
  name: string;
  description: string;
  requiresAttention: boolean;
  evidence: FeedbackEvidenceDto[];
}
export interface FeedbackReportDto {
  name: string;
  totalFeedbackCount: number;
  commentCount: number;
  processedCount: number;
  failedCount: number;
  pendingCount: number;
  generatedAtUtc: string;
  version: string;
  summary: string;
  topics: {
    categoryId: string;
    name: string;
    count: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    evidence: FeedbackEvidenceDto[];
  }[];
  signals: FeedbackSignalDto[];
  proposedCategories: ProposedFeedbackCategoryDto[];
}
