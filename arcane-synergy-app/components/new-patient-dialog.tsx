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
import { PatientForm } from "@/components/patient-form";
import { API_BASE_URL } from "@/lib/api";

export function NewPatientDialog({
  onPatientAdded,
}: {
  onPatientAdded?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: session } = useSession();

  const handleSubmit = async (formData: {
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
      const response = await fetch(`${API_BASE_URL}/api/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

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
        throw new Error(errorText || "Failed to create patient");
      }

      // const result = await response.json();
      // console.log("Patient created:", result);

      setDialogOpen(false);
      toast.success("Patient created successfully!", {
        position: "top-center",
      });

      onPatientAdded?.();
    } catch (error) {
      console.error("Error creating patient:", error);
      toast.error("Error creating patient. Please try again.", {
        position: "top-center",
      });
      throw error;
    }
  };

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
  );
}
