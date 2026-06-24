"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransferForm } from "@/components/transfer-form";

type Transfer = {
  transferId: string;
  admissionId: string;
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
};

export function EditTransferDialog({
  transfer,
  onTransferUpdated,
}: {
  transfer: Transfer;
  onTransferUpdated?: () => void;
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
    const transferData = {
      ...formData,
      admissionId: transfer.admissionId,
      transferId: transfer.transferId,
    };

    console.log("Submitting transfer data:", transferData);

    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch(
        `http://localhost:5201/api/transfers/${transfer.transferId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(transferData),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to edit transfer");
      }

      setDialogOpen(false);

      onTransferUpdated?.();
    } catch (error) {
      console.error("Error editing transfer:", error);
      alert("Failed to edit transfer. Please try again.");
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
          Edit Transfer
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle>Edit Transfer</DialogTitle>
        </DialogHeader>
        <TransferForm
          onSubmit={handleSubmit}
          onCancel={() => setDialogOpen(false)}
          initialValues={{
            admissionDate: transfer.admissionDate,
            dischargeDate: transfer.dischargeDate,
            facilityType: transfer.facilityType,
            facility: transfer.facility,
            type: transfer.type,
            timeOfAdmission: transfer.timeOfAdmission,
            dx: transfer.dx,
            notificationSource: transfer.notificationSource,
            dateNotified: transfer.dateNotified,
            dischargeTo: transfer.dischargeTo,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
