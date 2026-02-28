export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatGrade(grade: number): string {
  return grade.toFixed(1);
}

export function getGradeColor(grade: number): string {
  if (grade >= 4) return 'var(--color-success)';
  if (grade >= 3) return 'var(--color-warning)';
  return 'var(--color-danger)';
}
