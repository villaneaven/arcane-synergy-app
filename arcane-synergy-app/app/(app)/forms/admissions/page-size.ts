export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_COOKIE = "admissions-table-page-size";

export function parsePageSize(value: string | undefined): number {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}
