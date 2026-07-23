"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeGroupBreakdown,
  type NormalizedGroupCount,
  type RawGroupCount,
} from "@/lib/group-breakdown";

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
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);

      const response = await fetch(
        `http://localhost:5201/api/Admissions/pending/count${
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
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (accessToken) {
      void fetchPendingPatients();
    }
  }, [accessToken, fetchPendingPatients]);

  return { isLoading, pendingPatientsCount, pendingPatientsCountByGroup };
}
