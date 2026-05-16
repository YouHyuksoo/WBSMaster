import { paginateList, type PaginatedList } from "./listPagination";

export type ListViewMode = "pagination" | "scroll";

export interface ListDisplayItems<T> extends PaginatedList<T> {
  showPagination: boolean;
}

export function getListDisplayItems<T>(
  items: T[],
  viewMode: ListViewMode,
  requestedPage: number,
  pageSize: number
): ListDisplayItems<T> {
  if (viewMode === "scroll") {
    return {
      items,
      page: 1,
      totalPages: 1,
      totalItems: items.length,
      startIndex: items.length > 0 ? 1 : 0,
      endIndex: items.length,
      showPagination: false,
    };
  }

  return {
    ...paginateList(items, requestedPage, pageSize),
    showPagination: items.length > pageSize,
  };
}
