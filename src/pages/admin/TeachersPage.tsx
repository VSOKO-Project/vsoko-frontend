import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitMerge, Pencil } from 'lucide-react';
import { getTeachers, mergeTeachers, renameTeacher, type TeacherName } from '../../api/teachers';
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
import type { TeacherDto } from '../../types';
import './AdminPages.css';

const fullName = (t: TeacherDto) => t.fullName || [t.surname, t.name, t.patronymic].filter(Boolean).join(' ');

export function TeachersPage() {
  const queryClient = useQueryClient();
  const { page, pageSize, query, setPage, setQuery, resetPage } = usePagination();
  const periodValue = usePeriodFilterStore((s) => s.value);
  const period = usePeriodFilter();

  useEffect(() => resetPage(), [periodValue, resetPage]);

  const [editing, setEditing] = useState<TeacherDto | null>(null);
  const [fio, setFio] = useState<TeacherName>({ surname: '', name: '', patronymic: '' });
  const [mergeSource, setMergeSource] = useState<MergeOption | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, pageSize, query, period],
    queryFn: () => getTeachers({ Page: page, PageSize: pageSize, Query: query, ...period }),
  });

  const renameMut = useMutation({
    mutationFn: () => renameTeacher(editing!.id, fio),
    onSuccess: () => {
      invalidateCatalog(queryClient);
      setEditing(null);
      toast('ФИО исправлено', 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось сохранить'), 'error'),
  });

  const mergeMut = useMutation({
    mutationFn: (targetId: string) => mergeTeachers(mergeSource!.id, targetId),
    onSuccess: (target) => {
      invalidateCatalog(queryClient);
      setMergeSource(null);
      toast(`Объединено с «${fullName(target)}»`, 'success');
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось объединить'), 'error'),
  });

  const openEdit = (t: TeacherDto) => {
    setEditing(t);
    setFio({ surname: t.surname, name: t.name, patronymic: t.patronymic });
  };

  const searchTargets = async (q: string): Promise<MergeOption[]> =>
    (await getTeachers({ Page: 1, PageSize: 20, Query: q })).items.map((t) => ({ id: t.id, label: fullName(t) }));

  const canSave = fio.surname.trim() && fio.name.trim() && fio.patronymic.trim();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Преподаватели</h1>
        <p className="page-subtitle">Справочник преподавателей: исправление ФИО и объединение дублей</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск преподавателя..." />
        <PeriodSelect />
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th style={{ width: 120 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((t) => (
                  <tr key={t.id}>
                    <td>{fullName(t)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="ghost" size="sm" title="Исправить ФИО" aria-label="Исправить ФИО" onClick={() => openEdit(t)}>
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Объединить с другим"
                          aria-label="Объединить с другим"
                          onClick={() => setMergeSource({ id: t.id, label: fullName(t) })}
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Исправить ФИО">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Фамилия" value={fio.surname} onChange={(e) => setFio({ ...fio, surname: e.target.value })} />
          <Input label="Имя" value={fio.name} onChange={(e) => setFio({ ...fio, name: e.target.value })} />
          <Input label="Отчество" value={fio.patronymic} onChange={(e) => setFio({ ...fio, patronymic: e.target.value })} />
          <p className="import-section__hint" style={{ margin: 0 }}>
            Если это дубль другого преподавателя, не переименовывайте, а объедините записи.
          </p>
          <Button disabled={!canSave} loading={renameMut.isPending} onClick={() => renameMut.mutate()}>
            Сохранить
          </Button>
        </div>
      </Modal>

      {mergeSource && (
        <MergeModal
          key={mergeSource.id}
          source={mergeSource}
          title="Объединить преподавателей"
          targetNoun="преподавателю"
          queryKey="teachers"
          search={searchTargets}
          loading={mergeMut.isPending}
          onMerge={(targetId) => mergeMut.mutate(targetId)}
          onClose={() => setMergeSource(null)}
        />
      )}
    </div>
  );
}
