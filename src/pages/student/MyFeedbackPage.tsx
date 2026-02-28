import { useQuery } from '@tanstack/react-query';
import { MessageSquare, BookOpen, User } from 'lucide-react';
import { getFeedbacks } from '../../api/feedback';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';

export function MyFeedbackPage() {
  const { page, pageSize, setPage } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['my-feedback', page, pageSize],
    queryFn: () => getFeedbacks({ Page: page, PageSize: pageSize }),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Мои отзывы</h1>
        <p className="page-subtitle">История ваших оценок</p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {data?.items.map((fb) => (
            <Card key={fb.id} className="workload-card" style={{ marginBottom: '1rem' }}>
              <div className="workload-card__top">
                <div className="workload-card__icon">
                  <MessageSquare size={20} />
                </div>
                <h3 className="workload-card__discipline">{fb.workload.discipline.name}</h3>
              </div>
              <div className="workload-card__info">
                <div className="workload-card__row">
                  <User size={16} />
                  <span>{fb.workload.teacher.fullName}</span>
                </div>
                <div className="workload-card__row">
                  <BookOpen size={16} />
                  <span>{fb.workload.group.name} — {fb.workload.group.semester} сем.</span>
                </div>
              </div>
              {fb.criteriaFeedback.map((cf) => (
                <div key={cf.criteria.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{cf.criteria.name}</span>
                  <StarRating value={Math.round(cf.criteriaScore)} readonly />
                </div>
              ))}
              {fb.comment && (
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  «{fb.comment}»
                </p>
              )}
            </Card>
          ))}
          {data && data.totalPages > 1 && (
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
          {data?.items.length === 0 && (
            <div className="empty-state">У вас пока нет отзывов</div>
          )}
        </>
      )}
    </div>
  );
}
