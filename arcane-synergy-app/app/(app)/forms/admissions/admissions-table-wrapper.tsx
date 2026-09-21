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
import { Admission, createColumns } from "./columns";

interface AdmissionsTableWrapperProps {
  initialData: Admission[];
  initialTotalCount: number;
  pageSize: number;
}

interface AdmissionsResponse {
  items: Admission[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function AdmissionsTableWrapper({
  initialData,
  initialTotalCount,
  pageSize,
}: AdmissionsTableWrapperProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<Admission[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [admissionType, setAdmissionType] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const isFirstRender = useRef(true);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  const fetchAdmissions = useCallback(
    async (
      targetPageIndex: number,
      targetSorting: SortingState,
      targetSearch: string,
      targetAdmissionType: string,
      targetStartDate: Date | undefined,
      targetEndDate: Date | undefined,
    ) => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      const params = new URLSearchParams({
        page: String(targetPageIndex + 1),
        pageSize: String(pageSize),
      });
      if (targetSearch.trim()) params.set("search", targetSearch.trim());
      if (targetAdmissionType !== "all")
        params.set("admissionType", targetAdmissionType);
      if (targetStartDate)
        params.set("startDate", targetStartDate.toISOString());
      if (targetEndDate) params.set("endDate", targetEndDate.toISOString());
      if (targetSorting[0]) {
        params.set("sortBy", targetSorting[0].id);
        params.set("sortDir", targetSorting[0].desc ? "desc" : "asc");
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `http://localhost:5201/api/admissions?${params.toString()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch admissions");
        }

        const result: AdmissionsResponse = await res.json();

        if (result.items.length === 0 && targetPageIndex > 0) {
          setPageIndex(targetPageIndex - 1);
          return;
        }

        setData(result.items);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Error fetching admissions:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [session, pageSize],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    clearTimeout(searchDebounceRef.current);
    fetchAdmissions(
      pageIndex,
      sorting,
      search,
      admissionType,
      startDate,
      endDate,
    );
  }, [pageIndex, sorting, admissionType, startDate, endDate]);

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
        fetchAdmissions(0, sorting, value, admissionType, startDate, endDate);
      }, 400);
    },
    [fetchAdmissions, sorting, admissionType, startDate, endDate],
  );

  const handleAdmissionTypeChange = useCallback((value: string) => {
    setAdmissionType(value);
    setPageIndex(0);
  }, []);

  const handleStartDateChange = useCallback((date: Date | undefined) => {
    setStartDate(date);
    setPageIndex(0);
  }, []);

  const handleEndDateChange = useCallback((date: Date | undefined) => {
    setEndDate(date);
    setPageIndex(0);
  }, []);

  const handleAdmissionAdded = useCallback(() => {
    fetchAdmissions(
      pageIndex,
      sorting,
      search,
      admissionType,
      startDate,
      endDate,
    );
  }, [
    fetchAdmissions,
    pageIndex,
    sorting,
    search,
    admissionType,
    startDate,
    endDate,
  ]);

  const columns = useMemo(
    () => createColumns(handleAdmissionAdded),
    [handleAdmissionAdded],
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
      onAdmissionAdded={handleAdmissionAdded}
      admissionType={admissionType}
      onAdmissionTypeChange={handleAdmissionTypeChange}
      startDate={startDate}
      onStartDateChange={handleStartDateChange}
      endDate={endDate}
      onEndDateChange={handleEndDateChange}
    />
  );
}
