"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PatientForm } from "@/components/patient-form";

type Patient = {
  patientID: string;
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  group: string;
  insurance: string;
  pcp: string;
  clinic: string;
};

export function EditPatientDialog({
  patient,
  onPatientUpdated,
}: {
  patient: Patient;
  onPatientUpdated?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: session } = useSession();

  const handleSubmit = async (formData: {
    patientID?: string;
    firstName: string;
    lastName: string;
    dob: string | undefined;
    mrn: string;
    group: string;
    insurance: string;
    pcp: string;
    clinic: string;
  }) => {
    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch(
        `http://localhost:5201/api/patients/${patient.patientID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(
            "MRN already exists in this group. Please choose a different MRN or change the Group.",
            {
              position: "top-center",
            },
          );
          return;
        }

        const errorText = await response.text();
        throw new Error(errorText || "Failed to edit patient");
      }

      setDialogOpen(false);
      toast.success("Patient updated successfully!", {
        position: "top-center",
      });

      onPatientUpdated?.();
    } catch (error) {
      console.error("Error editing patient:", error);
      toast.error("Failed to edit patient. Please try again.", {
        position: "top-center",
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
          }}
          className="cursor-pointer"
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
  );
}
