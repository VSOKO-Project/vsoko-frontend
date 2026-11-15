export function feedbackLocation(kind: 'teachers' | 'disciplines', id: string, period = '') {
  return { path: `/${kind}`, query: { tab: 'feedback', targetId: id, period } };
}
export function feedbackCountText(count: number = 0) {
  const last = count % 10, lastTwo = count % 100;
  const word = lastTwo >= 11 && lastTwo <= 14 ? 'отзывов' : last === 1 ? 'отзыв' : last >= 2 && last <= 4 ? 'отзыва' : 'отзывов';
  return `${count.toLocaleString('ru-RU')} ${word}`;
}
