"use client";

import { useCallback, useEffect, useState } from "react";

type SessionWithAccessToken =
  | {
      access_token?: string;
    }
  | null
  | undefined;

type AdmissionsCountFilters = {
  group: string;
  insurance: string;
  clinic: string;
  admissionType: string;
  lastMonths: string;
};

export function useAdmissionsCount(
  session: SessionWithAccessToken,
  filters: AdmissionsCountFilters,
) {
  const [admissionsCount, setAdmissionsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessToken = session?.access_token;

  const fetchAdmissionsCount = useCallback(async () => {
    const queryParams = new URLSearchParams();

    if (filters.group !== "all") queryParams.set("group", filters.group);
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
        `http://localhost:5201/api/Admissions/count${
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
        throw new Error("Failed to fetch admissions count");
      }

      const data: { count: number } = await response.json();
      setAdmissionsCount(data.count);
    } catch (error) {
      console.error("Error fetching admissions count:", error);
      setAdmissionsCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filters]);

  useEffect(() => {
    if (accessToken) {
      void fetchAdmissionsCount();
    }
  }, [accessToken, fetchAdmissionsCount]);

  return { admissionsCount, isLoading };
}
