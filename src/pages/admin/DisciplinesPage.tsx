import { useQuery } from '@tanstack/react-query';
import { getDisciplines } from '../../api/disciplines';
import { usePagination } from '../../hooks/usePagination';
import { SearchInput } from '../../components/SearchInput';
import { Pagination } from '../../components/Pagination';
import { Spinner } from '../../components/ui/Spinner';

export function DisciplinesPage() {
  const { page, pageSize, query, setPage, setQuery } = usePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['disciplines', page, pageSize, query],
    queryFn: () => getDisciplines({ Page: page, PageSize: pageSize, Query: query }),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Дисциплины</h1>
        <p className="page-subtitle">Справочник дисциплин</p>
      </div>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Поиск дисциплины..." />
      </div>

      {isLoading ? <Spinner /> : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Название</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
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
