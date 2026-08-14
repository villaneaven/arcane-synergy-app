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
import { Patient, createColumns } from "./columns";

interface PatientsTableWrapperProps {
  initialData: Patient[];
  initialTotalCount: number;
  pageSize: number;
}

interface PatientsResponse {
  items: Patient[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export function PatientsTableWrapper({
  initialData,
  initialTotalCount,
  pageSize,
}: PatientsTableWrapperProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<Patient[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isFirstRender = useRef(true);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const fetchPatients = useCallback(
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
          `http://localhost:5201/api/patients?${params.toString()}`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error("Failed to fetch patients");
        }

        const result: PatientsResponse = await res.json();

        if (result.items.length === 0 && targetPageIndex > 0) {
          setPageIndex(targetPageIndex - 1);
          return;
        }

        setData(result.items);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Error fetching patients:", error);
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
    fetchPatients(pageIndex, pageSize, sorting, search);
  }, [pageIndex, sorting]);

  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
      setSorting((old) => {
        const next =
          typeof updaterOrValue === "function"
            ? updaterOrValue(old)
            : updaterOrValue;
        return next;
      });
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
        fetchPatients(0, pageSize, sorting, value);
      }, 400);
    },
    [fetchPatients, pageSize, sorting],
  );

  const handlePatientAdded = useCallback(() => {
    fetchPatients(pageIndex, pageSize, sorting, search);
  }, [fetchPatients, pageIndex, pageSize, sorting, search]);

  const columns = useMemo(
    () => createColumns(handlePatientAdded),
    [handlePatientAdded],
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
      onPatientAdded={handlePatientAdded}
    />
  );
}
