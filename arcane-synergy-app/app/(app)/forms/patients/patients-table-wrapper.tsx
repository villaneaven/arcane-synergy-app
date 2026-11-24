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
import { PAGE_SIZE_COOKIE, PAGE_SIZE_OPTIONS } from "./page-size";
import { API_BASE_URL } from "@/lib/api";

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

interface ListQuery {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  search: string;
  group: string;
  insurance: string;
  clinic: string;
}

/*
Persisted per browser tab so returning from a patient's page (browser Back)
restores the page, search, filters and sort.
*/
const LIST_STATE_STORAGE_KEY = "patients-list-state";

type SavedListState = Omit<ListQuery, "pageSize">;

function readSavedListState(): SavedListState | null {
  try {
    const raw = sessionStorage.getItem(LIST_STATE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedListState) : null;
  } catch {
    return null;
  }
}

function writeSavedListState(state: SavedListState) {
  try {
    sessionStorage.setItem(LIST_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota); state just won't persist.
  }
}

function isDefaultListState(state: SavedListState) {
  return (
    state.pageIndex === 0 &&
    state.sorting.length === 0 &&
    state.search === "" &&
    state.group === "all" &&
    state.insurance === "all" &&
    state.clinic === "all"
  );
}

export function PatientsTableWrapper({
  initialData,
  initialTotalCount,
  pageSize: initialPageSize,
}: PatientsTableWrapperProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<Patient[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [insurance, setInsurance] = useState("all");
  const [clinic, setClinic] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [hasRestored, setHasRestored] = useState(false);

  const isFirstRender = useRef(true);
  const needsRestoreFetch = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(searchDebounceRef.current);
  }, []);

  const fetchPatients = useCallback(
    async (query: ListQuery) => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      const params = new URLSearchParams({
        page: String(query.pageIndex + 1),
        pageSize: String(query.pageSize),
      });
      if (query.search.trim()) params.set("search", query.search.trim());
      if (query.group !== "all") params.set("group", query.group);
      if (query.insurance !== "all") params.set("insurance", query.insurance);
      if (query.clinic !== "all") params.set("clinic", query.clinic);
      if (query.sorting[0]) {
        params.set("sortBy", query.sorting[0].id);
        params.set("sortDir", query.sorting[0].desc ? "desc" : "asc");
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/patients?${params.toString()}`,
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

        if (result.items.length === 0 && query.pageIndex > 0) {
          setPageIndex(query.pageIndex - 1);
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

  const currentQuery: ListQuery = {
    pageIndex,
    pageSize,
    sorting,
    search,
    group,
    insurance,
    clinic,
  };

  useEffect(() => {
    const saved = readSavedListState();
    if (saved && !isDefaultListState(saved)) {
      setPageIndex(saved.pageIndex);
      setSorting(saved.sorting);
      setSearch(saved.search);
      setGroup(saved.group ?? "all");
      setInsurance(saved.insurance ?? "all");
      setClinic(saved.clinic ?? "all");
      needsRestoreFetch.current = true;
    }
    setHasRestored(true);
  }, []);

  useEffect(() => {
    if (!hasRestored) return;
    writeSavedListState({
      pageIndex,
      sorting,
      search,
      group,
      insurance,
      clinic,
    });
  }, [hasRestored, pageIndex, sorting, search, group, insurance, clinic]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (needsRestoreFetch.current) return;
    clearTimeout(searchDebounceRef.current);
    fetchPatients(currentQuery);
  }, [pageIndex, pageSize, sorting, group, insurance, clinic]);

  useEffect(() => {
    if (!hasRestored || !needsRestoreFetch.current) return;
    const accessToken = (session as { access_token?: string })?.access_token;
    if (!accessToken) return;
    needsRestoreFetch.current = false;
    fetchPatients(currentQuery);
  }, [hasRestored, session, fetchPatients]);

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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPageIndex(0);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchPatients({ ...currentQuery, pageIndex: 0, search: value });
    }, 400);
  };

  const withPageReset =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setPageIndex(0);
    };

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
    document.cookie = `${PAGE_SIZE_COOKIE}=${newPageSize}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const currentQueryRef = useRef(currentQuery);
  useEffect(() => {
    currentQueryRef.current = currentQuery;
  });

  const handlePatientAdded = useCallback(() => {
    fetchPatients(currentQueryRef.current);
  }, [fetchPatients]);

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
      group={group}
      onGroupChange={withPageReset(setGroup)}
      insurance={insurance}
      onInsuranceChange={withPageReset(setInsurance)}
      clinic={clinic}
      onClinicChange={withPageReset(setClinic)}
      onPageChange={setPageIndex}
      onPageSizeChange={handlePageSizeChange}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      onPatientAdded={handlePatientAdded}
    />
  );
}
