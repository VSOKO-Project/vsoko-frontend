import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeachersRating } from '../../api/teachers';
import { getTeacherSummary } from '../../api/summaries';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { formatGrade, getGradeColor } from '../../utils/formatters';

export function TeachersRatingPage() {
  const { page, pageSize, query, setPage, setQuery } = usePagination();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers-rating', page, pageSize, query],
    queryFn: () => getTeachersRating({ Page: page, PageSize: pageSize, Query: query }),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['teacher-summary', selectedId],
    queryFn: () => getTeacherSummary(selectedId!),
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
        <h1 className="page-title">Рейтинг преподавателей</h1>
        <p className="page-subtitle">Средние оценки по всем критериям</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск преподавателя..." />
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Преподаватель</th>
                  <th>Средний балл</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)} style={{ cursor: 'pointer' }}>
                    <td>{t.name}</td>
                    <td>
                      <Badge variant={getBadgeVariant(t.grade)}>
                        <span style={{ color: getGradeColor(t.grade), fontWeight: 700 }}>{formatGrade(t.grade)}</span>
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

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="AI-сводка по преподавателю">
        {summaryLoading ? <Spinner /> : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.92rem' }}>
            {summary || 'Сводка недоступна'}
          </div>
        )}
      </Modal>
    </div>
  );
}
