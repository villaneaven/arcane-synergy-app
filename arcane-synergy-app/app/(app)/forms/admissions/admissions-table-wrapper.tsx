"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "./data-table";
import { Admission, createColumns } from "./columns";

interface AdmissionsTableWrapperProps {
  initialData: Admission[];
}

export function AdmissionsTableWrapper({
  initialData,
}: AdmissionsTableWrapperProps) {
  const [data, setData] = useState<Admission[]>(initialData);
  const [admissionType, setAdmissionType] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const { data: session } = useSession();

  const filteredData = useMemo(() => {
    const startTime = startDate?.setHours(0, 0, 0, 0) ?? null;
    const endTime = endDate?.setHours(23, 59, 59, 999) ?? null;

    return data.filter((admission) => {
      if (admissionType !== "all" && admission.type !== admissionType) {
        return false;
      }

      const admissionTime = new Date(admission.admissionDate).getTime();

      if (startTime !== null && admissionTime < startTime) {
        return false;
      }

      if (endTime !== null && admissionTime > endTime) {
        return false;
      }

      return true;
    });
  }, [data, admissionType, startDate, endDate]);

  const refreshAdmissions = useCallback(async () => {
    const accessToken = (session as { access_token?: string })?.access_token;

    if (!accessToken) {
      return;
    }

    try {
      const res = await fetch("http://localhost:5201/api/admissions", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch admissions");
      }

      const updatedData: Admission[] = await res.json();
      setData(updatedData);
    } catch (error) {
      console.error("Error refreshing admissions:", error);
    }
  }, [session]);

  const handleAdmissionAdded = useCallback(async () => {
    await refreshAdmissions();
  }, [refreshAdmissions]);

  const columns = useMemo(
    () => createColumns(handleAdmissionAdded),
    [handleAdmissionAdded],
  );

  return (
    <DataTable
      columns={columns}
      data={filteredData}
      onAdmissionAdded={handleAdmissionAdded}
      admissionType={admissionType}
      onAdmissionTypeChange={setAdmissionType}
      startDate={startDate}
      onStartDateChange={setStartDate}
      endDate={endDate}
      onEndDateChange={setEndDate}
    />
  );
}
