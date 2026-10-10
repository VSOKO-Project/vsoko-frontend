import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, BookOpen, User, Pencil, Trash2 } from 'lucide-react';
import { getFeedbacks, deleteFeedback, updateFeedback } from '../../api/feedback';
import { getCriteria } from '../../api/criteria';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import type { FeedbackDto, PeriodDto } from '../../types';

const TERM_ORDER = { Autumn: 1, Spring: 2 } as const;

export function MyFeedbackPage() {
  const { page, pageSize, setPage } = usePagination();
  const queryClient = useQueryClient();

  const [editingFeedback, setEditingFeedback] = useState<FeedbackDto | null>(null);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-feedback', page, pageSize],
    queryFn: () => getFeedbacks({ Page: page, PageSize: pageSize }),
  });

  // Свежие периоды сверху. Отзывы за закрытые периоды только для чтения.
  const sections = useMemo(() => {
    const byPeriod = new Map<string, { period: PeriodDto | null; items: FeedbackDto[] }>();
    for (const fb of data?.items ?? []) {
      const period = fb.workload.period ?? null;
      const key = period?.id ?? '';
      if (!byPeriod.has(key)) byPeriod.set(key, { period, items: [] });
      byPeriod.get(key)!.items.push(fb);
    }
    return [...byPeriod.values()].sort((a, b) =>
      (b.period?.startYear ?? 0) - (a.period?.startYear ?? 0) ||
      (b.period ? TERM_ORDER[b.period.term] : 0) - (a.period ? TERM_ORDER[a.period.term] : 0));
  }, [data]);

  const { data: criteria, isLoading: criteriaLoading } = useQuery({
    queryKey: ['criteria'],
    queryFn: getCriteria,
    enabled: !!editingFeedback,
  });

  const { mutate: deleteMutate } = useMutation({
    mutationFn: (id: string) => deleteFeedback(id),
    onMutate: (id) => setIsDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast('Отзыв удалён', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Ошибка при удалении';
      toast(msg, 'error');
    },
    onSettled: () => setIsDeletingId(null),
  });

  const { mutate: updateMutate, isPending: isUpdating } = useMutation({
    mutationFn: updateFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      setEditingFeedback(null);
      toast('Отзыв обновлён', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Ошибка при обновлении';
      toast(msg, 'error');
    },
  });

  const handleEditOpen = (fb: FeedbackDto) => {
    const initialGrades: Record<string, number> = {};
    fb.criteriaFeedback.forEach((cf) => {
      initialGrades[cf.criteria.id] = Math.round(cf.criteriaScore);
    });
    setGrades(initialGrades);
    setComment(fb.comment || '');
    setEditingFeedback(fb);
  };

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
          {sections.map(({ period, items }) => (
            <section key={period?.id ?? ''} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.05rem', color: 'var(--color-primary)', margin: '0 0 0.75rem' }}>
                {period?.title ?? 'Без периода'}
                {period?.isFeedbackOpen
                  ? <Badge variant="success">сбор открыт</Badge>
                  : <Badge>только просмотр</Badge>}
              </h2>
              {items.map((fb) => (
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
                      <span>{fb.workload.group.name}</span>
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
                  {period?.isFeedbackOpen && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => handleEditOpen(fb)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        loading={isDeletingId === fb.id}
                        onClick={() => {
                          if (window.confirm('Удалить этот отзыв?')) {
                            deleteMutate(fb.id);
                          }
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </section>
          ))}
          {data && data.totalPages > 1 && (
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          )}
          {data?.items.length === 0 && (
            <div className="empty-state">У вас пока нет отзывов</div>
          )}
        </>
      )}

      <Modal
        open={!!editingFeedback}
        onClose={() => setEditingFeedback(null)}
        title="Редактировать отзыв"
      >
        {editingFeedback && criteriaLoading && <Spinner />}
        {editingFeedback && criteria && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {criteria.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.9rem' }}>{c.name}</span>
                <StarRating
                  value={grades[c.id] || 0}
                  onChange={(v) => setGrades({ ...grades, [c.id]: v })}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Комментарий
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Напишите ваш отзыв (необязательно)..."
                style={{ width: '100%', minHeight: '80px', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setEditingFeedback(null)}>
                Отмена
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isUpdating}
                onClick={() => {
                  updateMutate({
                    id: editingFeedback.id,
                    comment,
                    feedback: Object.entries(grades).map(([criteriaId, grade]) => ({ criteriaId, grade })),
                  });
                }}
              >
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}