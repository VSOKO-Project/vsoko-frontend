import type { QueryClient } from '@tanstack/react-query';

/** Имена преподавателей и дисциплин видны в нагрузке, отзывах, рейтингах и импорте. */
const CATALOG_QUERIES = [
  'teachers', 'teachers-list', 'teachers-filter', 'teachers-rating', 'teachers-rating-dash', 'teacher-summary',
  'disciplines', 'disciplines-list', 'disciplines-filter', 'disciplines-rating', 'disciplines-rating-dash',
  'discipline-summary', 'workloads', 'workload', 'feedback-list', 'my-feedback', 'summary', 'import-teachers',
];

export function invalidateCatalog(queryClient: QueryClient) {
  for (const key of CATALOG_QUERIES) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}
