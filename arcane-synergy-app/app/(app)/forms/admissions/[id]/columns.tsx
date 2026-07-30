"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Admission } from "../columns";
import { EditTransferDialog } from "@/components/edit-transfer-dialog";

export type Transfer = {
  transferId: string;
  admissionId: string;
  admission: Admission;
  admissionDate: string;
  dischargeDate: string | undefined;
  isFinalDischarge: boolean;
  facilityType: string | undefined;
  facility: string | undefined;
  type: string;
  timeOfAdmission: string;
  dx: string | undefined;
  notificationSource: string | undefined;
  dateNotified: string;
  dischargeTo: string | undefined;
};

export const createColumns = (
  onDataChange?: () => void,
): ColumnDef<Transfer>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "admissionDate",
    header: "Admission Date",
    cell: ({ row }) => {
      const date = new Date(row.getValue("admissionDate"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "dischargeDate",
    header: "Discharge Date",
    cell: ({ row }) => {
      const dischargeDate = row.getValue("dischargeDate");
      if (!dischargeDate) return "N/A";
      const date = new Date(dischargeDate as string);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "isFinalDischarge",
    header: "Final Discharge",
    cell: ({ row }) => {
      const isFinalDischarge = row.getValue("isFinalDischarge");
      return isFinalDischarge ? "Yes" : "No";
    },
  },
  {
    accessorKey: "facilityType",
    header: "Facility Type",
    cell: ({ row }) => {
      const facilityType = row.getValue("facilityType");
      if (!facilityType) return "N/A";
      return facilityType;
    },
  },
  {
    accessorKey: "facility",
    header: "Facility",
    cell: ({ row }) => {
      const facility = row.getValue("facility");
      if (!facility) return "N/A";
      return facility;
    },
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "timeOfAdmission",
    header: "Time of Admission",
    cell: ({ row }) => {
      const admissionDate = row.getValue("admissionDate");
      if (!admissionDate) return "N/A";
      const date = new Date(admissionDate as string);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
  {
    accessorKey: "dx",
    header: "DX",
    cell: ({ row }) => {
      const dx = row.getValue("dx");
      if (!dx) return "N/A";
      return dx;
    },
  },
  {
    accessorKey: "notificationSource",
    header: "Notification Source",
    cell: ({ row }) => {
      const notificationSource = row.getValue("notificationSource");
      if (!notificationSource) return "N/A";
      return notificationSource;
    },
  },
  {
    accessorKey: "dateNotified",
    header: "Date Notified",
    cell: ({ row }) => {
      const date = new Date(row.getValue("dateNotified"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "dischargeTo",
    header: "Discharge To",
    cell: ({ row }) => {
      const dischargeTo = row.getValue("dischargeTo");
      if (!dischargeTo) return "N/A";
      return dischargeTo;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transfer = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(transfer.transferId)}
            >
              Copy transfer ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditTransferDialog
              transfer={transfer}
              onTransferUpdated={onDataChange}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
