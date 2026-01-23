"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PatientForm } from "@/components/patient-form"

export function NewPatientDialog({ onPatientAdded }: { onPatientAdded?: () => void }) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleSubmit = async (formData: {
    firstName: string
    lastName: string
    dob: string | undefined
    mrn: string
    group: string
    insurance: string
    pcp: string
    clinic: string
  }) => {
    console.log("Submitting patient data:", formData)

    try {
      const response = await fetch("http://localhost:5201/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to create patient")
      }

      const result = await response.json()
      console.log("Patient created:", result)

      // Close dialog on success
      setDialogOpen(false)

      // Call the callback to refresh the data table
      onPatientAdded?.()
    } catch (error) {
      console.error("Error creating patient:", error)
      alert("Failed to create patient. Please try again.")
      throw error
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Patient</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106">
        <DialogHeader className="pb-6">
          <DialogTitle>Add Patient</DialogTitle>
        </DialogHeader>
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}