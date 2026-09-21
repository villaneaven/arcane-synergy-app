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
import { TransferForm } from "@/components/transfer-form";
import { API_BASE_URL } from "@/lib/api";

type Transfer = {
  transferId: string;
  admissionId: string;
  admissionDate: string;
  isFinalDischarge?: boolean;
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
    isFinalDischarge?: boolean;
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
    const accessToken = (session as { access_token?: string })?.access_token;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transfers/${transfer.transferId}`,
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
        if (response.status === 409) {
          toast.error(
            "Final discharge already exists for this admission. Please check the admission details.",
            {
              position: "top-center",
            },
          );
          return;
        }

        const errorText = await response.text();
        throw new Error(errorText || "Failed to edit transfer");
      }

      setDialogOpen(false);
      toast.success("Transfer updated successfully!", {
        position: "top-center",
      });

      onTransferUpdated?.();
    } catch (error) {
      console.error("Error editing transfer:", error);
      toast.error("Failed to edit transfer. Please try again.", {
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
            isFinalDischarge: transfer.isFinalDischarge,
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
