"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { API_BASE_URL } from "@/lib/api";

export function MoveTransferToAdmissionDialog({
  transferId,
  onTransferMoved,
}: {
  transferId: string;
  onTransferMoved?: () => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isMoving, setIsMoving] = React.useState(false);
  const { data: session } = useSession();

  const handleMove = async () => {
    const accessToken = (session as { access_token?: string })?.access_token;

    setIsMoving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transfers/${transferId}/move-to-admission`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to move transfer to admission");
      }

      setDialogOpen(false);
      toast.success("Transfer moved to admissions successfully!", {
        position: "top-center",
      });

      onTransferMoved?.();
    } catch (error) {
      console.error("Error moving transfer to admission:", error);
      toast.error("Failed to move transfer to admission. Please try again.", {
        position: "top-center",
      });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
          }}
        >
          Move Transfer to Admission
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Move transfer to admission?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new admission for this patient from this transfer
            and remove the transfer from this admission. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={isMoving}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isMoving}
            onClick={(event) => {
              event.preventDefault();
              handleMove();
            }}
          >
            {isMoving ? (
              <>
                <Spinner />
                Moving
              </>
            ) : (
              "Move"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
