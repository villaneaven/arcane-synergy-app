"use client"

import React, { useState, useCallback, useMemo } from "react"
import { DataTable } from "./data-table"
import { Patient, createColumns } from "./columns"

interface PatientsTableWrapperProps {
  initialData: Patient[]
}

export function PatientsTableWrapper({
  initialData,
}: PatientsTableWrapperProps) {
  const [data, setData] = useState<Patient[]>(initialData)

  const handlePatientAdded = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5201/api/patients", {
        cache: "no-store",
      })

      if (!res.ok) {
        throw new Error("Failed to fetch patients")
      }

      const updatedData: Patient[] = await res.json()
      setData(updatedData)
    } catch (error) {
      console.error("Error refreshing patients:", error)
    }
  }, [])

  const columns = useMemo(() => createColumns(handlePatientAdded), [handlePatientAdded])

  return (
    <DataTable
      columns={columns}
      data={data}
      onPatientAdded={handlePatientAdded}
    />
  )
}
