export interface PaginatedList<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export function paginateList<T>(items: T[], requestedPage: number, pageSize: number): PaginatedList<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  };
}

export function getPageForTask<T extends { id: string }>(
  items: T[],
  taskId: string | null | undefined,
  pageSize: number
): number | null {
  if (!taskId) return null;
  const index = items.findIndex((item) => item.id === taskId);
  return index >= 0 ? Math.floor(index / pageSize) + 1 : null;
}
