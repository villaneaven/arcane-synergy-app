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
import { API_BASE_URL } from "@/lib/api";

type Admission = {
  admissionId: string;
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
