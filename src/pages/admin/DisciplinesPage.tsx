import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitMerge, Pencil } from 'lucide-react';
import { getDisciplines, mergeDisciplines, renameDiscipline } from '../../api/disciplines';
import { getApiErrorMessage } from '../../api/errors';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { PeriodSelect } from '../../components/PeriodSelect';
import { MergeModal, type MergeOption } from '../../components/MergeModal';
import { usePeriodFilter, usePeriodFilterStore } from '../../store/periodStore';
import { Pagination } from '../../components/Pagination';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/Toast';
import { invalidateCatalog } from '../../utils/catalog';
import type { DisciplineDto } from '../../types';
import './AdminPages.css';

export function DisciplinesPage() {
  const queryClient = useQueryClient();
  const { page, pageSize, query, setPage, setQuery, resetPage } = usePagination();
  const periodValue = usePeriodFilterStore((s) => s.value);
  const period = usePeriodFilter();

  useEffect(() => resetPage(), [periodValue, resetPage]);

  const [editing, setEditing] = useState<DisciplineDto | null>(null);
  const [name, setName] = useState('');
  const [mergeSource, setMergeSource] = useState<MergeOption | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['disciplines', page, pageSize, query, period],
    queryFn: () => getDisciplines({ Page: page, PageSize: pageSize, Query: query, ...period }),
  });

  const renameMut = useMutation({
    mutationFn: () => renameDiscipline(editing!.id, name),
    onSuccess: () => {
      invalidateCatalog(queryClient);
      setEditing(null);
      toast('Название исправлено', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось сохранить'), 'error'),
  });

  const mergeMut = useMutation({
    mutationFn: (targetId: string) => mergeDisciplines(mergeSource!.id, targetId),
    onSuccess: (target) => {
      invalidateCatalog(queryClient);
      setMergeSource(null);
      toast(`Объединено с «${target.name}»`, 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось объединить'), 'error'),
  });

  const openEdit = (d: DisciplineDto) => {
    setEditing(d);
    setName(d.name);
  };

  const searchTargets = async (q: string): Promise<MergeOption[]> =>
    (await getDisciplines({ Page: 1, PageSize: 20, Query: q })).items.map((d) => ({ id: d.id, label: d.name }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Дисциплины</h1>
        <p className="page-subtitle">Справочник дисциплин: исправление названий и объединение дублей</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск дисциплины..." />
        <PeriodSelect />
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                  <th style={{ width: 120 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="ghost" size="sm" title="Исправить название" aria-label="Исправить название" onClick={() => openEdit(d)}>
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Объединить с другой"
                          aria-label="Объединить с другой"
                          onClick={() => setMergeSource({ id: d.id, label: d.name })}
                        >
                          <GitMerge size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Исправить название">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Название" value={name} onChange={(e) => setName(e.target.value)} />
          <p className="import-section__hint" style={{ margin: 0 }}>
            Если это дубль другой дисциплины, не переименовывайте, а объедините записи.
          </p>
          <Button disabled={!name.trim()} loading={renameMut.isPending} onClick={() => renameMut.mutate()}>
            Сохранить
          </Button>
        </div>
      </Modal>

      {mergeSource && (
        <MergeModal
          key={mergeSource.id}
          source={mergeSource}
          title="Объединить дисциплины"
          targetNoun="дисциплине"
          queryKey="disciplines"
          search={searchTargets}
          loading={mergeMut.isPending}
          onMerge={(targetId) => mergeMut.mutate(targetId)}
          onClose={() => setMergeSource(null)}
        />
      )}
    </div>
  );
}
