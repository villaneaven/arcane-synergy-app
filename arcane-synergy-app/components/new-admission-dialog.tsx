"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdmissionForm } from "@/components/admission-form";
import { API_BASE_URL } from "@/lib/api";

export function NewAdmissionDialog({
  onAdmissionAdded,
}: {
  onAdmissionAdded?: () => void;
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
    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create admission");
      }

      // const result = await response.json();
      // console.log("Admission created:", result);

      setDialogOpen(false);
      toast.success("Admission created successfully!", {
        position: "top-center",
      });

      onAdmissionAdded?.();
    } catch (error) {
      console.error("Error creating admission:", error);
      toast.error("Error creating admission. Please try again.", {
        position: "top-center",
      });
    }
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
