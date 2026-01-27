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
  const { data: session } = useSession();

  const handleAdmissionAdded = useCallback(async () => {
    const accessToken = (session as { access_token?: string })?.access_token;

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

  const columns = useMemo(() => createColumns(), []);

  return (
    <DataTable
      columns={columns}
      data={data}
      onAdmissionAdded={handleAdmissionAdded}
    />
  );
}
