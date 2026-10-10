import { useQuery } from '@tanstack/react-query';
import { getPeriods } from '../api/periods';
import { usePeriodFilterStore } from '../store/periodStore';

function yearTitle(startYear: number) {
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** Фильтр периода для рейтингов, отчёта и сводок. */
export function PeriodSelect() {
  const value = usePeriodFilterStore((s) => s.value);
  const setValue = usePeriodFilterStore((s) => s.setValue);

  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: ({ signal }) => getPeriods(signal),
  });

  const years = [...new Set(periods?.map((p) => p.startYear))];

  return (
    <select
      value={value}
      onChange={(e) => setValue(e.target.value)}
      aria-label="Период"
      style={{ maxWidth: 280 }}
    >
      <option value="">Все периоды</option>
      {periods?.map((p) => (
        <option key={p.id} value={`p:${p.id}`}>
          {p.title}{p.isFeedbackOpen ? ' (сбор открыт)' : ''}
        </option>
      ))}
      {years.length > 0 && (
        <optgroup label="Учебный год целиком">
          {years.map((y) => (
            <option key={y} value={`y:${y}`}>{yearTitle(y)} учебный год</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
