"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useSession } from "next-auth/react";
import type { SortingState } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { Gap, GapStatusUpdate, createColumns, gapKey } from "./columns";
import { PAGE_SIZE_COOKIE, PAGE_SIZE_OPTIONS } from "./page-size";
import { API_BASE_URL } from "@/lib/api";

interface GapsTableWrapperProps {
  initialData: Gap[];
  initialTotalCount: number;
  pageSize: number;
}

interface GapsResponse {
  items: Gap[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function GapsTableWrapper({
  initialData,
  initialTotalCount,
  pageSize: initialPageSize,
}: GapsTableWrapperProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<Gap[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFirstRender = useRef(true);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  const fetchGaps = useCallback(
    async (
      targetPageIndex: number,
      targetPageSize: number,
      targetSorting: SortingState,
      targetSearch: string,
    ) => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      const params = new URLSearchParams({
        page: String(targetPageIndex + 1),
        pageSize: String(targetPageSize),
      });
      if (targetSearch.trim()) params.set("search", targetSearch.trim());
      if (targetSorting[0]) {
        params.set("sortBy", targetSorting[0].id);
        params.set("sortDir", targetSorting[0].desc ? "desc" : "asc");
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/gaps?${params.toString()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch gaps");
        }

        const result: GapsResponse = await res.json();

        if (result.items.length === 0 && targetPageIndex > 0) {
          setPageIndex(targetPageIndex - 1);
          return;
        }

        setData(result.items);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Error fetching gaps:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearTimeout(searchDebounceRef.current);
    fetchGaps(pageIndex, pageSize, sorting, search);
  }, [pageIndex, pageSize, sorting]);

  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting((old) =>
        typeof updaterOrValue === "function"
          ? updaterOrValue(old)
          : updaterOrValue,
      );
      setPageIndex(0);
    },
    [],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      setPageIndex(0);
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        fetchGaps(0, pageSize, sorting, value);
      }, 400);
    },
    [fetchGaps, pageSize, sorting],
  );

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
    document.cookie = `${PAGE_SIZE_COOKIE}=${newPageSize}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const handleStatusSaved = useCallback((gap: Gap, update: GapStatusUpdate) => {
    const key = gapKey(gap);
    setData((rows) =>
      rows.map((row) => (gapKey(row) === key ? { ...row, ...update } : row)),
    );
  }, []);

  const columns = useMemo(
    () => createColumns(handleStatusSaved),
    [handleStatusSaved],
  );
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <DataTable
      columns={columns}
      data={data}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={pageCount}
      totalCount={totalCount}
      isLoading={isLoading}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      searchValue={search}
      onSearchChange={handleSearchChange}
      onPageChange={setPageIndex}
      onPageSizeChange={handlePageSizeChange}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
    />
  );
}
