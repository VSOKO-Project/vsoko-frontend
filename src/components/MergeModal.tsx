import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { SearchInput } from './SearchInput';
import { Spinner } from './ui/Spinner';

export interface MergeOption {
  id: string;
  label: string;
}

interface MergeModalProps {
  /** Запись, которая исчезнет; null — окно закрыто. */
  source: MergeOption | null;
  title: string;
  /** Например «преподавателю» или «дисциплине»: «…перейдут к выбранной дисциплине». */
  targetNoun: string;
  queryKey: string;
  search: (query: string) => Promise<MergeOption[]>;
  loading: boolean;
  onMerge: (targetId: string) => void;
  onClose: () => void;
}

/** Выбор основной записи для объединения дублей. */
export function MergeModal({ source, title, targetNoun, queryKey, search, loading, onMerge, onClose }: MergeModalProps) {
  const [query, setQuery] = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);

  const { data: options, isFetching } = useQuery({
    queryKey: [queryKey, 'merge-search', query],
    queryFn: () => search(query),
    enabled: !!source,
  });

  const close = () => {
    setQuery('');
    setTargetId(null);
    onClose();
  };

  const target = options?.find((o) => o.id === targetId);
  const candidates = options?.filter((o) => o.id !== source?.id);

  return (
    <Modal open={!!source} onClose={close} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p className="import-section__hint" style={{ margin: 0 }}>
          Нагрузка и отзывы «{source?.label}» перейдут к выбранному {targetNoun}, а «{source?.label}» исчезнет из списка.
        </p>
        <SearchInput value={query} onChange={setQuery} placeholder="Найти основную запись..." />
        {isFetching ? <Spinner /> : (
          <div className="merge-options">
            {candidates?.map((o) => (
              <label key={o.id}>
                <input type="radio" name="merge-target" checked={o.id === targetId} onChange={() => setTargetId(o.id)} />
                {o.label}
              </label>
            ))}
            {candidates?.length === 0 && <span className="import-section__hint">Ничего не нашлось</span>}
          </div>
        )}
        <Button
          disabled={!targetId}
          loading={loading}
          onClick={() => targetId && onMerge(targetId)}
        >
          {target ? `Объединить с «${target.label}»` : 'Выберите основную запись'}
        </Button>
      </div>
    </Modal>
  );
}
