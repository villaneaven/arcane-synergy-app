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
  lastDays: string;
};

export function useAdmissionsCount(
  session: SessionWithAccessToken,
  filters: AdmissionsCountFilters,
) {
  const [count, setCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdmissionsCount = useCallback(async () => {
    const accessToken = session?.access_token;
    const queryParams = new URLSearchParams();

    if (filters.group !== "all") queryParams.set("group", filters.group);
    if (filters.insurance !== "all") {
      queryParams.set("insurance", filters.insurance);
    }
    if (filters.clinic !== "all") queryParams.set("clinic", filters.clinic);
    if (filters.admissionType !== "all") {
      queryParams.set("admissionType", filters.admissionType);
    }
    if (filters.lastDays !== "all") {
      queryParams.set("lastDays", filters.lastDays);
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
      setCount(data.count);
    } catch (error) {
      console.error("Error fetching admissions count:", error);
      setCount(null);
    } finally {
      setIsLoading(false);
    }
  }, [session, filters]);

  useEffect(() => {
    if (session) {
      void fetchAdmissionsCount();
    }
  }, [session, fetchAdmissionsCount]);

  return { count, isLoading };
}
