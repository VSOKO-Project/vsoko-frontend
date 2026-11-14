export function averageGrade(items: { grade: number }[]): number | null {
  const rated = items.filter(
    (item) => Number.isFinite(item.grade) && item.grade > 0,
  );
  return rated.length
    ? rated.reduce((sum, item) => sum + item.grade, 0) / rated.length
    : null;
}
export function alphabeticalSample<T extends { name: string }>(
  items: T[],
  limit = 10,
): T[] {
  return [...items]
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .slice(0, limit);
}
