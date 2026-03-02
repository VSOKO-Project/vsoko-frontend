import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeedbacks, getFeedbackById, deleteFeedback } from '../../api/feedback';
import { getTeachers } from '../../api/teachers';
import { getDisciplines } from '../../api/disciplines';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { Trash2 } from 'lucide-react';
import type { FeedbackDto } from '../../types';

export function FeedbackListPage() {
  const { page, pageSize, setPage } = usePagination();
  const [teacherFilter, setTeacherFilter] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('');
  const [selected, setSelected] = useState<FeedbackDto | null>(null);
  const queryClient = useQueryClient();

  const { data: teachers } = useQuery({
    queryKey: ['teachers-filter'],
    queryFn: () => getTeachers({ Page: 1, PageSize: 100 }),
  });

  const { data: disciplines } = useQuery({
    queryKey: ['disciplines-filter'],
    queryFn: () => getDisciplines({ Page: 1, PageSize: 100 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['feedback-list', page, pageSize, teacherFilter, disciplineFilter],
    queryFn: () => getFeedbacks({
      Page: page,
      PageSize: pageSize,
      TeacherId: teacherFilter || undefined,
      DisciplineId: disciplineFilter || undefined,
    }),
  });

  const { mutate: deleteMutate, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => deleteFeedback(id),
    onSuccess: () => {
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['feedback-list'] });
      toast('Отзыв удалён', 'success');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Ошибка при удалении';
      toast(msg, 'error');
    },
  });

  const handleRowClick = async (id: string) => {
    const fb = await getFeedbackById(id);
    setSelected(fb);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Все отзывы</h1>
        <p className="page-subtitle">Список отзывов с фильтрацией</p>
      </div>

      <div className="toolbar">
        <select value={teacherFilter} onChange={(e) => { setTeacherFilter(e.target.value); setPage(1); }}>
          <option value="">Все преподаватели</option>
          {teachers?.items.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
        <select value={disciplineFilter} onChange={(e) => { setDisciplineFilter(e.target.value); setPage(1); }}>
          <option value="">Все дисциплины</option>
          {disciplines?.items.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Студент</th>
                  <th>Дисциплина</th>
                  <th>Преподаватель</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((fb) => (
                  <tr key={fb.id} onClick={() => handleRowClick(fb.id)} style={{ cursor: 'pointer' }}>
                    <td>{fb.student.group.name}</td>
                    <td>{fb.workload.discipline.name}</td>
                    <td>{fb.workload.teacher.fullName}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fb.comment || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Детали отзыва">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div><strong>Дисциплина:</strong> {selected.workload.discipline.name}</div>
            <div><strong>Преподаватель:</strong> {selected.workload.teacher.fullName}</div>
            <div><strong>Группа:</strong> {selected.student.group.name}</div>
            {selected.criteriaFeedback.map((cf) => (
              <div key={cf.criteria.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{cf.criteria.name}</span>
                <StarRating value={Math.round(cf.criteriaScore)} readonly />
              </div>
            ))}
            {selected.comment && (
              <div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                «{selected.comment}»
              </div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                loading={isDeleting}
                onClick={() => {
                  if (window.confirm('Удалить этот отзыв?')) {
                    deleteMutate(selected.id);
                  }
                }}
              >
                Удалить отзыв
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}