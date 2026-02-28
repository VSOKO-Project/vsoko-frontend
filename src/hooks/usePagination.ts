import { useState, useCallback } from 'react';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';

export function usePagination(pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  const resetPage = useCallback(() => setPage(1), []);

  const onSearch = useCallback((q: string) => {
    setQuery(q);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    query,
    setPage,
    setQuery: onSearch,
    resetPage,
  };
}
