"use client";

import * as React from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdmissionForm } from "@/components/admission-form";

type Admission = {
  patientID: string;
  facilityType?: string;
  facility?: string;
  type: string;
  admissionDate: string;
  dx?: string;
  notificationSource?: string;
  dateNotified: string;
  dischargeDate?: string | undefined;
  dischargeTo?: string;
  dateSeen?: string | undefined;
  seenBy?: string;
};

export function EditAdmissionDialog({
  admission,
  onAdmissionUpdated,
}: {
  admission: Admission;
  onAdmissionUpdated?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleSubmit = async (formData: {
    patientID: string;
    facilityType?: string;
    facility?: string;
    type: string;
    admissionDate: string;
    dx?: string;
    notificationSource?: string;
    dateNotified: string;
    dischargeDate?: string | undefined;
    dischargeTo?: string;
    dateSeen?: string | undefined;
    seenBy?: string;
  }) => {
    try {
      console.log("Submitting admission data:", formData);

      // Close dialog on success
      setDialogOpen(false);

      // Call the callback to refresh the data table
      onAdmissionUpdated?.();
    } catch (error) {
      console.error("Error editing admission:", error);
      alert("Failed to edit admission. Please try again.");
      throw error;
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
          }}
        >
          Edit Admission
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle>Edit Admission</DialogTitle>
        </DialogHeader>
        <AdmissionForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
          initialValues={{
            patientID: admission.patientID,
            facilityType: admission.facilityType ?? undefined,
            facility: admission.facility ?? undefined,
            type: admission.type,
            admissionDate: admission.admissionDate,
            dx: admission.dx ?? undefined,
            notificationSource: admission.notificationSource ?? undefined,
            dateNotified: admission.dateNotified,
            dischargeDate: admission.dischargeDate ?? undefined,
            dischargeTo: admission.dischargeTo ?? undefined,
            dateSeen: admission.dateSeen ?? undefined,
            seenBy: admission.seenBy ?? undefined,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
