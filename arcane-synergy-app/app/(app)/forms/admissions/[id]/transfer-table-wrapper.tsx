"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { SubDataTable } from "./sub-data-table";
import { Transfer, createColumns } from "./columns";
import { API_BASE_URL } from "@/lib/api";

interface TransferTableWrapperProps {
  initialData: Transfer[];
  admissionId: string;
}

export function TransferTableWrapper({
  initialData,
  admissionId,
}: TransferTableWrapperProps) {
  const [data, setData] = useState<Transfer[]>(initialData);
  const { data: session } = useSession();

  const handleTransferAdded = useCallback(async () => {
    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/transfers/admission/${admissionId}`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch transfers");
      }

      const updatedData: Transfer[] = await res.json();
      setData(updatedData);
    } catch (error) {
      console.error("Error refreshing transfers:", error);
    }
  }, [session, admissionId]);

  const columns = useMemo(
    () => createColumns(handleTransferAdded),
    [handleTransferAdded],
  );

  return (
    <SubDataTable
      columns={columns}
      data={data}
      admissionId={admissionId}
      onTransferAdded={handleTransferAdded}
    />
  );
}
