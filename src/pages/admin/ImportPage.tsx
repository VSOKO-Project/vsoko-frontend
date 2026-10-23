import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Download, FileSpreadsheet, KeyRound, Upload } from 'lucide-react';
import {
  applyImport, downloadCredentials, downloadImportTemplate, exportPeriod, getImportErrorReport, getImportGroups,
  getPeriodTeachers, previewImport,
} from '../../api/import';
import { getApiErrorMessage } from '../../api/errors';
import { getSuggestedPeriods } from '../../api/periods';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { toast } from '../../components/ui/Toast';
import { saveBlob } from '../../utils/download';
import type { ImportIssueDto, ImportReportDto, ImportWorkloadDto, Term } from '../../types';
import './AdminPages.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const SUMMARY_LABELS: [keyof ImportReportDto['summary'], string][] = [
  ['groups', 'Группы'],
  ['students', 'Студенты'],
  ['teachers', 'Преподаватели'],
  ['disciplines', 'Дисциплины'],
  ['workloads', 'Нагрузка'],
];

function parsePeriodKey(key: string): { startYear: number; term: Term } {
  const [year, term] = key.split(':');
  return { startYear: Number(year), term: term as Term };
}

function IssuesTable({ title, issues, kind }: { title: string; issues: ImportIssueDto[]; kind: 'errors' | 'warnings' }) {
  if (issues.length === 0) return null;
  return (
    <div className={`table-wrapper issues-table issues-table--${kind}`}>
      <table>
        <caption>{title}: {issues.length}</caption>
        <thead>
          <tr>
            <th>Лист</th>
            <th>Строка</th>
            <th>Сообщение</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, i) => (
            <tr key={i}>
              <td>{issue.sheet || '—'}</td>
              <td>{issue.row || '—'}</td>
              <td>{issue.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeletionsTable({ workloads }: { workloads: ImportWorkloadDto[] }) {
  if (workloads.length === 0) return null;
  return (
    <div className="table-wrapper issues-table issues-table--deletions">
      <table>
        <caption>Будет удалено из нагрузки: {workloads.length}</caption>
        <thead>
          <tr>
            <th>Преподаватель</th>
            <th>Дисциплина</th>
            <th>Группа</th>
          </tr>
        </thead>
        <tbody>
          {workloads.map((w, i) => (
            <tr key={i}>
              <td>{w.teacher}</td>
              <td>{w.discipline}</td>
              <td>{w.group}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportSummary({ report }: { report: ImportReportDto }) {
  return (
    <div className="import-summary">
      {SUMMARY_LABELS.map(([key, label]) => (
        <div key={key} className="import-summary__card">
          <div className="import-summary__label">{label}</div>
          <div className="import-summary__values">
            <span><strong>{report.summary[key].create}</strong>создать</span>
            <span><strong>{report.summary[key].existing}</strong>уже есть</span>
            {report.summary[key].delete > 0 && (
              <span className="import-summary__delete"><strong>{report.summary[key].delete}</strong>удалить</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ImportPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [periodKey, setPeriodKey] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // Счётчик выбора файла: ключ запроса предпросмотра, сам File в ключ не кладём.
  const [fileVersion, setFileVersion] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [applyErrorReport, setApplyErrorReport] = useState<ImportReportDto | null>(null);
  const [applied, setApplied] = useState<ImportReportDto | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  const { data: suggested, isLoading: suggestedLoading } = useQuery({
    queryKey: ['suggested-periods'],
    queryFn: ({ signal }) => getSuggestedPeriods(signal),
  });

  useEffect(() => {
    if (periodKey || !suggested) return;
    const current = suggested.find((p) => p.isCurrent) ?? suggested[0];
    if (current) setPeriodKey(`${current.startYear}:${current.term}`);
  }, [suggested, periodKey]);

  const selectedPeriod = suggested?.find((p) => `${p.startYear}:${p.term}` === periodKey);

  const { data: periodTeachers } = useQuery({
    queryKey: ['import-teachers', periodKey],
    queryFn: ({ signal }) => getPeriodTeachers(parsePeriodKey(periodKey), signal),
    enabled: !!selectedPeriod?.exists,
  });

  const {
    data: preview, isFetching: previewLoading, error: previewError,
  } = useQuery({
    queryKey: ['import-preview', fileVersion, periodKey],
    queryFn: ({ signal }) => previewImport({ file: file!, ...parsePeriodKey(periodKey) }, signal),
    enabled: !!file && !!periodKey,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: groups } = useQuery({
    queryKey: ['import-groups'],
    queryFn: ({ signal }) => getImportGroups(signal),
  });

  const { mutate: apply, isPending: applying } = useMutation({
    mutationFn: () => applyImport({ file: file!, ...parsePeriodKey(periodKey) }),
    onSuccess: (report) => {
      setApplied(report);
      setFile(null);
      setApplyErrorReport(null);
      for (const key of ['periods', 'suggested-periods', 'import-groups', 'import-teachers', 'workloads', 'teachers-rating', 'disciplines-rating']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast('Импорт выполнен', 'success');
    },
    onError: (err) => {
      const report = getImportErrorReport(err);
      if (report) setApplyErrorReport(report);
      toast(getApiErrorMessage(err, 'Не удалось выполнить импорт'), 'error');
    },
  });

  const { mutate: downloadLogins, isPending: downloadingLogins } = useMutation({
    mutationFn: (groupIds: string[]) => downloadCredentials(groupIds),
    onSuccess: (blob) => saveBlob(blob, 'vsoko-credentials.xlsx'),
    onError: () => toast('Не удалось выгрузить логины и пароли', 'error'),
  });

  const { mutate: downloadPeriod, isPending: downloadingPeriod } = useMutation({
    mutationFn: () => exportPeriod(parsePeriodKey(periodKey), selectedTeachers),
    onSuccess: (blob) => {
      const { startYear, term } = parsePeriodKey(periodKey);
      saveBlob(blob, `vsoko-${startYear}-${term.toLowerCase()}.xlsx`);
    },
    onError: (err) => toast(getApiErrorMessage(err, 'Не удалось выгрузить данные семестра'), 'error'),
  });

  const { mutate: downloadTemplate, isPending: downloadingTemplate } = useMutation({
    mutationFn: downloadImportTemplate,
    onSuccess: (blob) => saveBlob(blob, 'vsoko-import-template.xlsx'),
    onError: () => toast('Не удалось скачать шаблон', 'error'),
  });

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.xlsx')) {
      toast('Принимается только файл .xlsx', 'error');
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast('Файл больше 5 МБ', 'error');
      return;
    }
    setFile(selected);
    setFileVersion((v) => v + 1);
    setApplied(null);
    setApplyErrorReport(null);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    selectFile(e.dataTransfer.files[0]);
  };

  const report = applyErrorReport ?? preview;
  const hasErrors = (report?.errors.length ?? 0) > 0;

  const toggleGroup = (id: string) =>
    setSelectedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const toggleTeacher = (id: string) =>
    setSelectedTeachers((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const search = teacherSearch.trim().toLowerCase();
  const visibleTeachers = periodTeachers?.filter((t) => t.fullName.toLowerCase().includes(search));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Импорт</h1>
        <p className="page-subtitle">Загрузка студентов и нагрузки из Excel</p>
      </div>

      <Card className="import-section">
        <h2 className="import-section__title">1. Семестр и файл</h2>
        <p className="import-section__hint">
          Скачайте нагрузку семестра, поправьте её в Excel и загрузите обратно: новые строки добавятся,
          удалённые — уберутся из нагрузки. Нагрузка с отзывами не удаляется. Для нового семестра начните с шаблона
          или скачайте прошлый семестр: в другой семестр файл только добавляет.
        </p>

        <div className="form-group" style={{ maxWidth: 360, marginBottom: '1rem' }}>
          <label className="form-label" htmlFor="import-period">Семестр</label>
          {suggestedLoading ? <Spinner /> : (
            <select
              id="import-period"
              value={periodKey}
              onChange={(e) => {
                setPeriodKey(e.target.value);
                setApplyErrorReport(null);
                setSelectedTeachers([]);
                setTeacherSearch('');
              }}
            >
              {suggested?.map((p) => (
                <option key={`${p.startYear}:${p.term}`} value={`${p.startYear}:${p.term}`}>
                  {p.title}{p.isCurrent ? ' — текущий' : ''}{p.exists ? '' : ' (будет создан)'}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedPeriod?.exists && periodTeachers && periodTeachers.length > 0 && (
          <details className="teacher-filter">
            <summary>
              {selectedTeachers.length > 0
                ? `Выбрано преподавателей: ${selectedTeachers.length}`
                : 'Все преподаватели — выбрать отдельных'}
            </summary>
            <input
              type="search"
              placeholder="Поиск по ФИО"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
            />
            <div className="group-picker">
              {visibleTeachers?.map((t) => (
                <label key={t.id}>
                  <input type="checkbox" checked={selectedTeachers.includes(t.id)} onChange={() => toggleTeacher(t.id)} />
                  {t.fullName}
                </label>
              ))}
              {visibleTeachers?.length === 0 && <span className="import-section__hint">Никого не нашлось</span>}
            </div>
            {selectedTeachers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTeachers([])}>Сбросить выбор</Button>
            )}
          </details>
        )}

        <div className="import-actions">
          {selectedPeriod?.exists && (
            <Button
              icon={<Download size={18} />}
              loading={downloadingPeriod}
              onClick={() => downloadPeriod()}
            >
              Скачать данные семестра
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<FileSpreadsheet size={18} />}
            loading={downloadingTemplate}
            onClick={() => downloadTemplate()}
          >
            Пустой шаблон
          </Button>
        </div>
      </Card>

      <Card className="import-section">
        <h2 className="import-section__title">2. Загрузка файла</h2>
        <p className="import-section__hint">
          Нагрузка загрузится в семестр <strong>{selectedPeriod?.title ?? '—'}</strong>.
          Сначала файл проверяется, в базу ничего не пишется до нажатия «Импортировать».
        </p>

        <div
          className={`dropzone ${dragActive ? 'dropzone--active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload size={28} />
          <div>Перетащите файл .xlsx сюда или нажмите, чтобы выбрать</div>
          {file && <div className="dropzone__file">{file.name}</div>}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => {
              selectFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </Card>

      {file && (
        <Card className="import-section">
          <h2 className="import-section__title">3. Проверка</h2>
          {previewLoading ? (
            <Spinner />
          ) : previewError && !applyErrorReport ? (
            <div className="empty-state" role="alert">
              {getApiErrorMessage(previewError, 'Не удалось проверить файл')}
            </div>
          ) : report && (
            <>
              <p className="import-section__hint">
                Период: <strong>{report.period.title}</strong>
                {report.period.willBeCreated && ' — будет создан, сбор отзывов в нём закрыт'}
              </p>
              <ReportSummary report={report} />
              <DeletionsTable workloads={report.workloadsToDelete} />
              <IssuesTable title="Ошибки" issues={report.errors} kind="errors" />
              <IssuesTable title="Предупреждения" issues={report.warnings} kind="warnings" />
              {hasErrors && (
                <p className="import-section__hint" role="alert">
                  Исправьте ошибки в файле и загрузите его снова.
                </p>
              )}
              <Button
                icon={<Upload size={18} />}
                disabled={hasErrors}
                loading={applying}
                onClick={() => apply()}
              >
                Импортировать
              </Button>
            </>
          )}
        </Card>
      )}

      {applied && (
        <Card className="import-section">
          <h2 className="import-section__title">
            <CheckCircle size={18} style={{ verticalAlign: '-3px', color: 'var(--color-success)' }} /> Импорт выполнен
          </h2>
          <p className="import-section__hint">Период: {applied.period.title}</p>
          <ReportSummary report={applied} />
          {applied.studentGroupIds && applied.studentGroupIds.length > 0 && (
            <Button
              icon={<KeyRound size={18} />}
              loading={downloadingLogins}
              onClick={() => downloadLogins(applied.studentGroupIds!)}
            >
              Скачать логины и пароли
            </Button>
          )}
        </Card>
      )}

      <Card className="import-section">
        <h2 className="import-section__title">Логины и пароли</h2>
        <p className="import-section__hint">
          Логин — номер зачётки, временный пароль — Vsoko и номер зачётки. Студенты, уже сменившие пароль,
          помечены в выгрузке без пароля. Без выбора выгружаются все группы.
        </p>
        <div className="group-picker">
          {groups?.map((g) => (
            <label key={g.id}>
              <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={() => toggleGroup(g.id)} />
              {g.name}
            </label>
          ))}
          {groups?.length === 0 && <span className="import-section__hint">Групп пока нет</span>}
        </div>
        <Button
          variant="secondary"
          icon={<Download size={18} />}
          loading={downloadingLogins}
          onClick={() => downloadLogins(selectedGroups)}
        >
          {selectedGroups.length > 0 ? `Скачать (${selectedGroups.length})` : 'Скачать для всех групп'}
        </Button>
      </Card>
    </div>
  );
}
