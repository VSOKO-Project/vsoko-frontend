import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPeriods, setPeriodFeedback } from '../../api/periods';
import { getApiErrorMessage } from '../../api/errors';
import { Spinner } from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import type { PeriodListItemDto } from '../../types';
import './AdminPages.css';

export function PeriodsPage() {
  const queryClient = useQueryClient();

  const { data: periods, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['periods'],
    queryFn: ({ signal }) => getPeriods(signal),
  });

  const { mutate, isPending, variables } = useMutation({
    mutationFn: ({ id, isOpen }: { id: string; isOpen: boolean }) => setPeriodFeedback(id, isOpen),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({ queryKey: ['periods'] });
      void queryClient.invalidateQueries({ queryKey: ['workloads'] });
      toast(period.isFeedbackOpen ? `Сбор отзывов открыт: ${period.title}` : `Сбор отзывов закрыт: ${period.title}`, 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось изменить сбор отзывов'), 'error'),
  });

  const handleToggle = (period: PeriodListItemDto) => {
    const isOpen = !period.isFeedbackOpen;
    const opened = periods?.find((p) => p.isFeedbackOpen && p.id !== period.id);

    const message = isOpen
      ? `Открыть сбор отзывов за «${period.title}»?` +
        (opened ? `\n\nСбор за «${opened.title}» будет закрыт: открытым может быть только один семестр.` : '')
      : `Закрыть сбор отзывов за «${period.title}»?\n\nСтуденты не смогут оставлять и изменять отзывы за этот семестр.`;

    if (window.confirm(message)) mutate({ id: period.id, isOpen });
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Учебные периоды</h1>
        <p className="page-subtitle">
          Сбор отзывов открыт только у одного семестра. Новые периоды создаются при импорте.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <div className="empty-state" role="alert">
          <p>Не удалось загрузить периоды.</p>
          <Button onClick={() => void refetch()} loading={isFetching}>Повторить</Button>
        </div>
      ) : periods?.length === 0 ? (
        <div className="empty-state">Периодов пока нет. Они появятся после импорта нагрузки.</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Период</th>
                <th>Нагрузок</th>
                <th>Отзывов</th>
                <th>Сбор отзывов</th>
              </tr>
            </thead>
            <tbody>
              {periods?.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.workloadCount}</td>
                  <td>{p.feedbackCount}</td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={p.isFeedbackOpen}
                        disabled={isPending}
                        onChange={() => handleToggle(p)}
                        aria-label={`Сбор отзывов: ${p.title}`}
                      />
                      <span className="switch__track" />
                      {isPending && variables?.id === p.id ? 'Сохранение…' : p.isFeedbackOpen ? 'Открыт' : 'Закрыт'}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
