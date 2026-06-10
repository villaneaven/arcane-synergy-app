"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdmissionForm } from "@/components/admission-form";

export function NewAdmissionDialog({
  onAdmissionAdded,
}: {
  onAdmissionAdded?: () => void;
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
    console.log("Submitting admission data:", formData);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Admission</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle>Add Admission</DialogTitle>
        </DialogHeader>
        <AdmissionForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
