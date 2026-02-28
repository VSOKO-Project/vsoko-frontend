import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getCriteria, createCriteria, updateCriteria, deleteCriteria } from '../../api/criteria';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import type { CriteriaDto, CriteriaObject } from '../../types';

export function CriteriaPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CriteriaDto | null>(null);
  const [name, setName] = useState('');
  const [object, setObject] = useState<CriteriaObject>('Teacher');

  const { data: criteria, isLoading } = useQuery({
    queryKey: ['criteria'],
    queryFn: getCriteria,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['criteria'] });

  const createMut = useMutation({
    mutationFn: createCriteria,
    onSuccess: () => { invalidate(); closeModal(); toast('Критерий создан', 'success'); },
    onError: () => toast('Ошибка создания', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: updateCriteria,
    onSuccess: () => { invalidate(); closeModal(); toast('Критерий обновлён', 'success'); },
    onError: () => toast('Ошибка обновления', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCriteria,
    onSuccess: () => { invalidate(); toast('Критерий удалён', 'success'); },
    onError: () => toast('Ошибка удаления', 'error'),
  });

  const openCreate = () => {
    setEditing(null);
    setName('');
    setObject('Teacher');
    setModalOpen(true);
  };

  const openEdit = (c: CriteriaDto) => {
    setEditing(c);
    setName(c.name);
    setObject(c.object);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editing) {
      updateMut.mutate({ id: editing.id, name, criteriaObject: object });
    } else {
      createMut.mutate({ name, criteriaObject: object });
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Критерии оценки</h1>
        <p className="page-subtitle">Управление критериями для преподавателей и дисциплин</p>
      </div>

      <div className="toolbar">
        <Button icon={<Plus size={18} />} onClick={openCreate}>Добавить критерий</Button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th style={{ width: 120 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {criteria?.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <Badge variant={c.object === 'Teacher' ? 'success' : 'default'}>
                      {c.object === 'Teacher' ? 'Преподаватель' : 'Дисциплина'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil size={16} />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => deleteMut.mutate(c.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Редактировать критерий' : 'Новый критерий'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название критерия"
          />
          <div className="form-group">
            <label className="form-label">Тип критерия</label>
            <select value={object} onChange={(e) => setObject(e.target.value as CriteriaObject)}>
              <option value="Teacher">Преподаватель</option>
              <option value="Discipline">Дисциплина</option>
            </select>
          </div>
          <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
            {editing ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
