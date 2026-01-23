"use client"

import React, { useState, useCallback } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "./data-table"
import { Patient } from "./columns"

interface PatientsTableWrapperProps {
  columns: ColumnDef<Patient>[]
  initialData: Patient[]
}

export function PatientsTableWrapper({
  columns,
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

  return (
    <DataTable
      columns={columns}
      data={data}
      onPatientAdded={handlePatientAdded}
    />
  )
}
