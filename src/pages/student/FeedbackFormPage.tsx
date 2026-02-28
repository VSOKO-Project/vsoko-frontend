import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, User } from 'lucide-react';
import { getWorkloadById } from '../../api/workload';
import { getCriteria } from '../../api/criteria';
import { createFeedback } from '../../api/feedback';
import { StarRating } from '../../components/ui/StarRating';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/Toast';
import type { Grades } from '../../types';
import './FeedbackFormPage.css';

export function FeedbackFormPage() {
  const [searchParams] = useSearchParams();
  const workloadId = searchParams.get('workloadId') || '';
  const navigate = useNavigate();

  const { data: workload, isLoading: wLoading, isError: wError } = useQuery({
    queryKey: ['workload', workloadId],
    queryFn: () => getWorkloadById(workloadId),
    enabled: !!workloadId,
  });

  const { data: criteria, isLoading: cLoading, isError: cError } = useQuery({
    queryKey: ['criteria'],
    queryFn: getCriteria,
  });

  const [grades, setGrades] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');

  const queryClient = useQueryClient();

  const { mutate: submit, isPending } = useMutation({
    mutationFn: createFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workloads'] });
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast('Отзыв успешно отправлен!', 'success');
      navigate('/workloads');
    },
    onError: (err) => {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Ошибка отправки';
      toast(msg, 'error');
    },
  });

  const teacherCriteria = criteria?.filter((c) => c.object === 'Teacher') || [];
  const disciplineCriteria = criteria?.filter((c) => c.object === 'Discipline') || [];

  const allRated = criteria?.every((c) => grades[c.id] && grades[c.id] > 0) ?? false;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!allRated) {
      toast('Оцените все критерии', 'error');
      return;
    }
    const feedback: Grades[] = Object.entries(grades).map(([criteriaId, grade]) => ({
      criteriaId,
      grade,
    }));
    submit({ feedback, comment, workloadId });
  };

  if (wLoading || cLoading) return <Spinner />;

  if (wError || cError) {
    return (
      <div>
        <button className="feedback-form__back" onClick={() => navigate('/workloads')}>
          <ArrowLeft size={18} />
          <span>Назад к нагрузкам</span>
        </button>
        <div className="empty-state">Ошибка загрузки данных. Попробуйте позже.</div>
      </div>
    );
  }

  return (
    <div className="feedback-form">
      <button className="feedback-form__back" onClick={() => navigate('/workloads')}>
        <ArrowLeft size={18} />
        <span>Назад к нагрузкам</span>
      </button>

      <div className="page-header">
        <h1 className="page-title">Оставить отзыв</h1>
      </div>

      {workload && (
        <Card className="feedback-form__workload-info">
          <div className="feedback-form__info-row">
            <BookOpen size={18} />
            <strong>{workload.discipline.name}</strong>
          </div>
          <div className="feedback-form__info-row">
            <User size={18} />
            <span>{workload.teacher.fullName}</span>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        {teacherCriteria.length > 0 && (
          <div className="criteria-section">
            <h2 className="criteria-section__title">Оценка преподавателя</h2>
            {teacherCriteria.map((c) => (
              <div key={c.id} className="criteria-item">
                <span className="criteria-item__name">{c.name}</span>
                <StarRating
                  value={grades[c.id] || 0}
                  onChange={(v) => setGrades({ ...grades, [c.id]: v })}
                />
              </div>
            ))}
          </div>
        )}

        {disciplineCriteria.length > 0 && (
          <div className="criteria-section">
            <h2 className="criteria-section__title">Оценка дисциплины</h2>
            {disciplineCriteria.map((c) => (
              <div key={c.id} className="criteria-item">
                <span className="criteria-item__name">{c.name}</span>
                <StarRating
                  value={grades[c.id] || 0}
                  onChange={(v) => setGrades({ ...grades, [c.id]: v })}
                />
              </div>
            ))}
          </div>
        )}

        <div className="criteria-section">
          <h2 className="criteria-section__title">Комментарий</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Напишите ваш отзыв здесь (необязательно)..."
            className="feedback-form__textarea"
          />
        </div>

        <Button type="submit" loading={isPending} disabled={!allRated} size="lg">
          Отправить отзыв
        </Button>
      </form>
    </div>
  );
}
