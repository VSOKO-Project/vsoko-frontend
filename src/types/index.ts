// === Auth ===
export interface LoginQuery {
  login: string;
  password: string;
}

export interface LoginResultDto {
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
  existing: number;
}

export interface ImportIssueDto {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportReportDto {
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
  createdGroupIds: string[] | null;
  studentGroupIds: string[] | null;
}

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

export interface FeedbackDto {
  id: string;
  comment: string;
  workload: WorkloadDto;
  student: StudentDto;
  criteriaFeedback: CriteriaFeedbackDto[];
}

// === Rating ===
export interface RatingDto {
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
