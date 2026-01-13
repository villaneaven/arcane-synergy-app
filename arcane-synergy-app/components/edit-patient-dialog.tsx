"use client"

import * as React from "react"

import {DropdownMenuItem} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PatientForm } from "@/components/patient-form"

type Patient = {
  patientID: string
  firstName: string
  lastName: string
  dob: string
  mrn: string
  group: string
  insurance: string
  pcp: string
  clinic: string
}

export function EditPatientDialog({
  patient,
  onPatientUpdated,
}: {
  patient: Patient
  onPatientUpdated?: () => void
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const handleSubmit = async (formData: {
    patientID: string
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
      const response = await fetch(`http://localhost:5201/api/patients/${patient.patientID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to edit patient")
      }

      // Close dialog on success
      setDialogOpen(false)

      // Call the callback to refresh the data table
      onPatientUpdated?.()
    } catch (error) {
      console.error("Error editing patient:", error)
      alert("Failed to edit patient. Please try again.")
      throw error
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
          }}
        >
          Edit Patient
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106">
        <DialogHeader className="pb-6">
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>
        <PatientForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
          initialValues={{
            patientID: patient.patientID,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dob: patient.dob,
            mrn: patient.mrn,
            group: patient.group,
            insurance: patient.insurance,
            pcp: patient.pcp,
            clinic: patient.clinic,
          }}
        />
      </DialogContent>
    </Dialog>
  )
}