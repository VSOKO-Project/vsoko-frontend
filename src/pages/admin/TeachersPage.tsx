import { useQuery } from '@tanstack/react-query';
import { getTeachers } from '../../api/teachers';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/ui/Spinner';

export function TeachersPage() {
  const { page, pageSize, query, setPage, setQuery } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, pageSize, query],
    queryFn: () => getTeachers({ Page: page, PageSize: pageSize, Query: query }),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Преподаватели</h1>
        <p className="page-subtitle">Справочник преподавателей</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск преподавателя..." />
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ФИО</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.fullName || [t.surname, t.name, t.patronymic].filter(Boolean).join(' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
