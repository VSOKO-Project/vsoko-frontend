import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain } from 'lucide-react';
import { getTeachers } from '../../api/teachers';
import { getDisciplines } from '../../api/disciplines';
import { getTeacherSummary, getDisciplineSummary } from '../../api/summaries';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

type Mode = 'teacher' | 'discipline';

export function SummariesPage() {
  const [mode, setMode] = useState<Mode>('teacher');
  const [selectedId, setSelectedId] = useState('');
  const [fetchId, setFetchId] = useState<string | null>(null);

  const { data: teachers } = useQuery({
    queryKey: ['teachers-list'],
    queryFn: () => getTeachers({ Page: 1, PageSize: 100 }),
  });

  const { data: disciplines } = useQuery({
    queryKey: ['disciplines-list'],
    queryFn: () => getDisciplines({ Page: 1, PageSize: 100 }),
  });

  const { data: summary, isLoading: summaryLoading, isFetching } = useQuery({
    queryKey: ['summary', mode, fetchId],
    queryFn: () => mode === 'teacher' ? getTeacherSummary(fetchId!) : getDisciplineSummary(fetchId!),
    enabled: !!fetchId,
  });

  const handleGenerate = () => {
    if (selectedId) setFetchId(selectedId);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI-сводки</h1>
        <p className="page-subtitle">Генерация аналитических сводок с помощью ИИ</p>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Тип</label>
            <select
              value={mode}
              onChange={(e) => { setMode(e.target.value as Mode); setSelectedId(''); setFetchId(null); }}
            >
              <option value="teacher">По преподавателю</option>
              <option value="discipline">По дисциплине</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">
              {mode === 'teacher' ? 'Преподаватель' : 'Дисциплина'}
            </label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Выберите...</option>
              {mode === 'teacher'
                ? teachers?.items.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)
                : disciplines?.items.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
              }
            </select>
          </div>
          <Button onClick={handleGenerate} disabled={!selectedId} loading={isFetching} icon={<Brain size={18} />}>
            Сгенерировать
          </Button>
        </div>
      </Card>

      {(summaryLoading || isFetching) && <Spinner />}

      {summary && !isFetching && (
        <Card>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem' }}>
            {summary}
          </div>
        </Card>
      )}
    </div>
  );
}
