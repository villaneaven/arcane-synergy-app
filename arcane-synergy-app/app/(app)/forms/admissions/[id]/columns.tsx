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
import {
  FinalDischargeBadge,
  SortableHeader,
  Stacked,
  TypeBadge,
  daysBetween,
  formatDate,
  formatDateTime,
  formatStayLength,
  formatTime,
  orEmpty,
} from "../cell-format";
import { EditTransferDialog } from "@/components/edit-transfer-dialog";
import { MoveTransferToAdmissionDialog } from "@/components/move-transfer-to-admission-dialog";

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
  notes: string | undefined;
  lastEditedBy: string | undefined;
  lastEditedAt: string | undefined;
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
    meta: { pin: "left" },
  },
  {
    // Shows the whole stay; sorts by admission date.
    id: "admissionDate",
    accessorFn: (row) => row.admissionDate,
    header: ({ column }) => (
      <SortableHeader column={column} label="Admitted → Discharged" />
    ),
    cell: ({ row }) => {
      const { admissionDate, dischargeDate } = row.original;
      return (
        <Stacked
          primary={
            <span className="font-medium">
              {orEmpty(formatDate(admissionDate))} →{" "}
              {orEmpty(formatDate(dischargeDate))}
            </span>
          }
          secondary={[
            formatTime(admissionDate),
            formatStayLength(daysBetween(admissionDate, dischargeDate)),
          ]}
        />
      );
    },
    enableHiding: false,
    meta: { label: "Admitted → Discharged", pin: "left" },
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column} label="Type" />,
    cell: ({ row }) => <TypeBadge type={row.original.type} />,
    meta: { label: "Type" },
  },
  {
    id: "facility",
    accessorFn: (row) => row.facility ?? "",
    header: ({ column }) => <SortableHeader column={column} label="Facility" />,
    cell: ({ row }) => (
      <Stacked
        primary={row.original.facility}
        secondary={[row.original.facilityType]}
      />
    ),
    meta: { label: "Facility" },
  },
  {
    accessorKey: "isFinalDischarge",
    header: "Final Discharge",
    cell: ({ row }) => (
      <FinalDischargeBadge final={row.original.isFinalDischarge} />
    ),
    meta: { label: "Final Discharge" },
  },
  {
    accessorKey: "dx",
    header: "DX",
    cell: ({ row }) => {
      const dx = row.original.dx;
      if (!dx) return orEmpty(dx);
      return (
        <div className="max-w-48 truncate" title={dx}>
          {dx}
        </div>
      );
    },
    meta: { label: "DX" },
  },
  {
    // Shows source and date; sorts by date notified.
    id: "dateNotified",
    accessorFn: (row) => row.dateNotified,
    header: ({ column }) => (
      <SortableHeader column={column} label="Notified" descFirst />
    ),
    cell: ({ row }) => (
      <Stacked
        primary={row.original.notificationSource}
        secondary={[formatDate(row.original.dateNotified)]}
      />
    ),
    meta: { label: "Notified (source & date)" },
  },
  {
    accessorKey: "dischargeTo",
    header: "Discharge To",
    cell: ({ row }) => orEmpty(row.original.dischargeTo),
    meta: { label: "Discharge To" },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
      const notes = row.original.notes;
      if (!notes) return orEmpty(notes);
      return (
        <div className="max-w-64 truncate" title={notes}>
          {notes}
        </div>
      );
    },
    meta: { label: "Notes" },
  },
  {
    id: "lastEdited",
    accessorFn: (row) => row.lastEditedAt ?? "",
    header: ({ column }) => (
      <SortableHeader column={column} label="Last Edited" descFirst />
    ),
    cell: ({ row }) => (
      <Stacked
        primary={row.original.lastEditedBy}
        secondary={[formatDateTime(row.original.lastEditedAt)]}
      />
    ),
    meta: { label: "Last Edited (by & when)" },
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
            <EditTransferDialog
              transfer={transfer}
              onTransferUpdated={onDataChange}
            />
            <MoveTransferToAdmissionDialog
              transferId={transfer.transferId}
              onTransferMoved={onDataChange}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
    meta: { pin: "right" },
  },
];
