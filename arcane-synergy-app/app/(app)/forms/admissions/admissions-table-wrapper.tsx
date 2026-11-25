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
import { AdmissionQuickView } from "./admission-quick-view";
import { Admission, createColumns } from "./columns";
import { PAGE_SIZE_COOKIE, PAGE_SIZE_OPTIONS } from "./page-size";
import { API_BASE_URL } from "@/lib/api";

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

/*
Persisted per browser tab so returning from an admission's transfers page (via the back link or browser Back) restores the page, filters and sort.
*/
const LIST_STATE_STORAGE_KEY = "admissions-list-state";

interface SavedListState {
  pageIndex: number;
  sorting: SortingState;
  search: string;
  admissionType: string;
  group: string;
  status: string;
  facilityType: string;
  startDate: string | null;
  endDate: string | null;
}

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
    state.admissionType === "all" &&
    state.group === "all" &&
    state.status === "all" &&
    state.facilityType === "all" &&
    state.startDate === null &&
    state.endDate === null
  );
}

export function AdmissionsTableWrapper({
  initialData,
  initialTotalCount,
  pageSize: initialPageSize,
}: AdmissionsTableWrapperProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<Admission[]>(initialData);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [admissionType, setAdmissionType] = useState("all");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("all");
  const [facilityType, setFacilityType] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
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

  const fetchAdmissions = useCallback(
    async (
      targetPageIndex: number,
      targetPageSize: number,
      targetSorting: SortingState,
      targetSearch: string,
      targetAdmissionType: string,
      targetGroup: string,
      targetStatus: string,
      targetFacilityType: string,
      targetStartDate: Date | undefined,
      targetEndDate: Date | undefined,
    ) => {
      const accessToken = (session as { access_token?: string })?.access_token;
      if (!accessToken) return;

      const params = new URLSearchParams({
        page: String(targetPageIndex + 1),
        pageSize: String(targetPageSize),
      });
      if (targetSearch.trim()) params.set("search", targetSearch.trim());
      if (targetAdmissionType !== "all")
        params.set("admissionType", targetAdmissionType);
      if (targetGroup !== "all") params.set("group", targetGroup);
      if (targetStatus !== "all") params.set("status", targetStatus);
      if (targetFacilityType !== "all")
        params.set("facilityType", targetFacilityType);
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
          `${API_BASE_URL}/api/admissions?${params.toString()}`,
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
    [session],
  );

  useEffect(() => {
    const saved = readSavedListState();
    if (saved && !isDefaultListState(saved)) {
      setPageIndex(saved.pageIndex);
      setSorting(saved.sorting);
      setSearch(saved.search);
      setAdmissionType(saved.admissionType);
      setGroup(saved.group);
      setStatus(saved.status);
      setFacilityType(saved.facilityType);
      setStartDate(saved.startDate ? new Date(saved.startDate) : undefined);
      setEndDate(saved.endDate ? new Date(saved.endDate) : undefined);
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
      admissionType,
      group,
      status,
      facilityType,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    });
  }, [
    hasRestored,
    pageIndex,
    sorting,
    search,
    admissionType,
    group,
    status,
    facilityType,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (needsRestoreFetch.current) return;
    clearTimeout(searchDebounceRef.current);
    fetchAdmissions(
      pageIndex,
      pageSize,
      sorting,
      search,
      admissionType,
      group,
      status,
      facilityType,
      startDate,
      endDate,
    );
  }, [
    pageIndex,
    pageSize,
    sorting,
    admissionType,
    group,
    status,
    facilityType,
    startDate,
    endDate,
  ]);

  // Fetch the restored page once the session token is available; the session
  // may still be loading on mount, so this re-runs when fetchAdmissions changes.
  // Declared after the effect above so that effect sees the flag still set.
  useEffect(() => {
    if (!hasRestored || !needsRestoreFetch.current) return;
    const accessToken = (session as { access_token?: string })?.access_token;
    if (!accessToken) return;
    needsRestoreFetch.current = false;
    fetchAdmissions(
      pageIndex,
      pageSize,
      sorting,
      search,
      admissionType,
      group,
      status,
      facilityType,
      startDate,
      endDate,
    );
  }, [hasRestored, session, fetchAdmissions]);

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
        fetchAdmissions(
          0,
          pageSize,
          sorting,
          value,
          admissionType,
          group,
          status,
          facilityType,
          startDate,
          endDate,
        );
      }, 400);
    },
    [
      fetchAdmissions,
      pageSize,
      sorting,
      admissionType,
      group,
      status,
      facilityType,
      startDate,
      endDate,
    ],
  );

  const handleAdmissionTypeChange = useCallback((value: string) => {
    setAdmissionType(value);
    setPageIndex(0);
  }, []);

  const handleGroupChange = useCallback((value: string) => {
    setGroup(value);
    setPageIndex(0);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPageIndex(0);
  }, []);

  const handleFacilityTypeChange = useCallback((value: string) => {
    setFacilityType(value);
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

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
    document.cookie = `${PAGE_SIZE_COOKIE}=${newPageSize}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const handleAdmissionAdded = useCallback(() => {
    fetchAdmissions(
      pageIndex,
      pageSize,
      sorting,
      search,
      admissionType,
      group,
      status,
      facilityType,
      startDate,
      endDate,
    );
  }, [
    fetchAdmissions,
    pageIndex,
    pageSize,
    sorting,
    search,
    admissionType,
    group,
    status,
    facilityType,
    startDate,
    endDate,
  ]);

  const columns = useMemo(
    () => createColumns(handleAdmissionAdded),
    [handleAdmissionAdded],
  );
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const quickViewAdmission =
    data.find((admission) => admission.admissionId === quickViewId) ?? null;

  return (
    <>
      <AdmissionQuickView
        admission={quickViewAdmission}
        open={quickViewId !== null}
        onOpenChange={(open) => {
          if (!open) setQuickViewId(null);
        }}
        onDataChange={handleAdmissionAdded}
      />
      <DataTable
        onRowClick={(admission) => setQuickViewId(admission.admissionId)}
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
        onAdmissionAdded={handleAdmissionAdded}
        admissionType={admissionType}
        onAdmissionTypeChange={handleAdmissionTypeChange}
        group={group}
        onGroupChange={handleGroupChange}
        status={status}
        onStatusChange={handleStatusChange}
        facilityType={facilityType}
        onFacilityTypeChange={handleFacilityTypeChange}
        startDate={startDate}
        onStartDateChange={handleStartDateChange}
        endDate={endDate}
        onEndDateChange={handleEndDateChange}
      />
    </>
  );
}
