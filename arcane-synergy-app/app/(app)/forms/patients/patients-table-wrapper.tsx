"use client"

import React, { useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { DataTable } from "./data-table"
import { Patient, createColumns } from "./columns"

interface PatientsTableWrapperProps {
  initialData: Patient[]
}

export function PatientsTableWrapper({
  initialData,
}: PatientsTableWrapperProps) {
  const [data, setData] = useState<Patient[]>(initialData)
  const { data: session } = useSession()

  const handlePatientAdded = useCallback(async () => {
    const accessToken = (session as { access_token?: string })?.access_token;
    
    try {
      const res = await fetch("http://localhost:5201/api/patients", {
        cache: "no-store",
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch patients")
      }

      const updatedData: Patient[] = await res.json()
      setData(updatedData)
    } catch (error) {
      console.error("Error refreshing patients:", error)
    }
  }, [session])

  const columns = useMemo(() => createColumns(handlePatientAdded), [handlePatientAdded])

  return (
    <DataTable
      columns={columns}
      data={data}
      onPatientAdded={handlePatientAdded}
    />
  )
}
