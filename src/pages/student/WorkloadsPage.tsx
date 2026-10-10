import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Users } from 'lucide-react';
import { getWorkloads } from '../../api/workload';
import { getPeriods } from '../../api/periods';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { Pagination } from '../../components/Pagination';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import './WorkloadsPage.css';

export function WorkloadsPage() {
  const { page, pageSize, query, setPage, setQuery } = usePagination();
  const navigate = useNavigate();

  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: ({ signal }) => getPeriods(signal),
  });
  const openPeriod = periods?.find((p) => p.isFeedbackOpen);
  const feedbackClosed = !!periods && !openPeriod;

  // Без periodId сервер отдаёт нагрузку открытого периода.
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['workloads', page, pageSize, query],
    queryFn: ({ signal }) => getWorkloads({ Page: page, PageSize: pageSize, Query: query }, signal),
    enabled: !feedbackClosed,
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Мои нагрузки</h1>
        <p className="page-subtitle">
          {openPeriod ? `${openPeriod.title} — дисциплины и преподаватели вашей группы` : 'Дисциплины и преподаватели вашей группы'}
        </p>
      </div>

      {!feedbackClosed && (
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск по дисциплине..." />
        </div>
      )}

      {feedbackClosed ? (
        <div className="empty-state">Сбор отзывов сейчас закрыт</div>
      ) : isLoading || periodsLoading ? (
        <Spinner />
      ) : isError ? (
        <div className="empty-state" role="alert">
          <p>Не удалось загрузить нагрузки.</p>
          <Button onClick={() => void refetch()} loading={isFetching}>Повторить</Button>
        </div>
      ) : (
        <>
          <div className="workloads-grid">
            {data?.items.map((w) => (
              <Card key={w.id} className="workload-card">
                <div className="workload-card__top">
                  <div className="workload-card__icon">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="workload-card__discipline">{w.discipline.name}</h3>
                </div>
                <div className="workload-card__info">
                  <div className="workload-card__row">
                    <User size={16} />
                    <span>{w.teacher.fullName}</span>
                  </div>
                  <div className="workload-card__row">
                    <Users size={16} />
                    <span>{w.group.name}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="workload-card__btn"
                  onClick={() => navigate(`/feedback/new?workloadId=${w.id}`)}
                >
                  Оставить отзыв
                </Button>
              </Card>
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
          {data?.items.length === 0 && (
            <div className="empty-state">Нагрузки не найдены</div>
          )}
        </>
      )}
    </div>
  );
}
