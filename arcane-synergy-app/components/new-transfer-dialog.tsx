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
import { TransferForm } from "@/components/transfer-form";

export function NewTransferDialog({
  onTransferAdded,
  admissionId,
}: {
  onTransferAdded?: () => void;
  admissionId: string;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: session } = useSession();

  const handleSubmit = async (formData: {
    admissionDate: string;
    dischargeDate?: string | undefined;
    facilityType?: string;
    facility?: string;
    type: string;
    timeOfAdmission?: string | undefined;
    dx?: string;
    notificationSource?: string;
    dateNotified: string;
    dischargeTo?: string;
  }) => {
    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch("http://localhost:5201/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...formData, admissionId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create transfer");
      }

      // const result = await response.json();
      // console.log("Transfer created:", result);

      setDialogOpen(false);
      toast.success("Transfer created successfully!", {
        position: "top-center",
      });

      onTransferAdded?.();
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast.error("Failed to create transfer. Please try again.", {
        position: "top-center",
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Transfer</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle>Add Transfer</DialogTitle>
        </DialogHeader>
        <TransferForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
