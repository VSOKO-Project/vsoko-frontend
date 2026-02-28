import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDisciplinesRating } from '../../api/disciplines';
import { getDisciplineSummary } from '../../api/summaries';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { formatGrade, getGradeColor } from '../../utils/formatters';

export function DisciplinesRatingPage() {
  const { page, pageSize, query, setPage, setQuery } = usePagination();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['disciplines-rating', page, pageSize, query],
    queryFn: () => getDisciplinesRating({ Page: page, PageSize: pageSize, Query: query }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['discipline-summary', selectedId],
    queryFn: () => getDisciplineSummary(selectedId!),
    enabled: !!selectedId,
  });

  const getBadgeVariant = (grade: number) => {
    if (grade >= 4) return 'success';
    if (grade >= 3) return 'warning';
    return 'danger';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Рейтинг дисциплин</h1>
        <p className="page-subtitle">Средние оценки по всем критериям</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск дисциплины..." />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Дисциплина</th>
                  <th>Средний балл</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((d) => (
                  <tr key={d.id} onClick={() => setSelectedId(d.id)} style={{ cursor: 'pointer' }}>
                    <td>{d.name}</td>
                    <td>
                      <Badge variant={getBadgeVariant(d.grade)}>
                        <span style={{ color: getGradeColor(d.grade), fontWeight: 700 }}>{formatGrade(d.grade)}</span>
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="AI-сводка по дисциплине">
        {summaryLoading ? <Spinner /> : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem' }}>
            {summary || 'Сводка недоступна'}
          </div>
        )}
      </Modal>
    </div>
  );
}
