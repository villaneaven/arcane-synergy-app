"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  normalizeGroupBreakdown,
  type NormalizedGroupCount,
  type RawGroupCount,
} from "@/lib/group-breakdown";
import { API_BASE_URL } from "@/lib/api";

type SessionWithAccessToken =
  | {
      access_token?: string;
    }
  | null
  | undefined;

type AdmissionsCountFilters = {
  insurance: string;
  clinic: string;
  admissionType: string;
  lastMonths: string;
};

export function usePendingPatientsCount(
  session: SessionWithAccessToken,
  filters: AdmissionsCountFilters,
) {
  const [pendingPatientsCount, setPendingPatientsCount] = useState<
    number | null
  >(null);
  const [pendingPatientsCountByGroup, setPendingPatientsCountByGroup] =
    useState<NormalizedGroupCount[]>([]);
  const [isLoading, startTransition] = useTransition();
  const accessToken = session?.access_token;

  const fetchPendingPatients = useCallback(async () => {
    const queryParams = new URLSearchParams();

    if (filters.insurance !== "all") {
      queryParams.set("insurance", filters.insurance);
    }
    if (filters.clinic !== "all") queryParams.set("clinic", filters.clinic);
    if (filters.admissionType !== "all") {
      queryParams.set("admissionType", filters.admissionType);
    }
    if (filters.lastMonths !== "all") {
      queryParams.set("lastMonths", filters.lastMonths);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Admissions/pending/count${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pending patients count");
      }

      const data: { total: number; byGroup: RawGroupCount[] } =
        await response.json();
      setPendingPatientsCount(data.total);
      setPendingPatientsCountByGroup(normalizeGroupBreakdown(data.byGroup));
    } catch (error) {
      console.error("Error fetching pending patients count:", error);
      setPendingPatientsCount(null);
      setPendingPatientsCountByGroup([]);
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (accessToken) {
      startTransition(fetchPendingPatients);
    }
  }, [accessToken, fetchPendingPatients]);

  return { isLoading, pendingPatientsCount, pendingPatientsCountByGroup };
}
