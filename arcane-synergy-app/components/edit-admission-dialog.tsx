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
import { AdmissionForm } from "@/components/admission-form";
import { toPatientOption } from "@/components/patient-search-input";
import { API_BASE_URL } from "@/lib/api";

type Admission = {
  admissionId: string;
  patientID: string;
  patient?: {
    patientID: number | string;
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
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
  notes?: string;
};

export function EditAdmissionDialog({
  admission,
  onAdmissionUpdated,
  trigger,
}: {
  admission: Admission;
  onAdmissionUpdated?: () => void;
  trigger?: React.ReactElement;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: session } = useSession();

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
    notes?: string;
  }) => {
    const admissionData = {
      ...formData,
      admissionId: admission.admissionId,
    };

    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admissions/${admission.admissionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(admissionData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to edit admission");
      }

      setDialogOpen(false);
      toast.success("Admission updated successfully!", {
        position: "top-center",
      });

      onAdmissionUpdated?.();
    } catch (error) {
      console.error("Error editing admission:", error);
      toast.error("Failed to edit admission. Please try again.", {
        position: "top-center",
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
            }}
          >
            Edit Admission
          </DropdownMenuItem>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-106 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle>Edit Admission</DialogTitle>
        </DialogHeader>
        <AdmissionForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
          initialValues={{
            patient: toPatientOption(
              admission.patient
                ? { ...admission.patient, patientID: admission.patientID }
                : null,
            ),
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
            notes: admission.notes ?? undefined,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
