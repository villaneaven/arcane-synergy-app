"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";

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
import { Patient } from "../patients/columns";

export type Admission = {
  admissionId: string;
  patientID: string;
  patient: Patient;
  facilityType: string;
  facility: string;
  type: string;
  timeOfAdmission: string;
  dx: string;
  notificationSource: string;
  dateNotified: string;
  admissionDate: string;
  dischargeDate: string | null;
  dischargeTo: string;
  dateSeen: string;
  seenBy: string;
};

export const createColumns = (): ColumnDef<Admission>[] => [
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
    id: "patientFullName",
    accessorFn: (row) => row.patient?.fullName ?? "",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Patient Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    id: "patientDOB",
    accessorFn: (row) => row.patient?.dob ?? "",
    header: "DOB",
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
    accessorKey: "facilityType",
    header: "Facility Type",
  },
  {
    accessorKey: "facility",
    header: "Facility",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "timeOfAdmission",
    header: "Time of Admission",
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
    accessorKey: "dx",
    header: "DX",
  },
  {
    accessorKey: "notificationSource",
    header: "Notification Source",
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
    accessorKey: "dischargeTo",
    header: "Discharge To",
  },
  {
    accessorKey: "dateSeen",
    header: "Date Seen",
    cell: ({ row }) => {
      const date = new Date(row.getValue("dateSeen"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "seenBy",
    header: "Seen By",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const admission = row.original;

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
              onClick={() =>
                navigator.clipboard.writeText(admission.admissionId)
              }
            >
              Copy admission ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View patient</DropdownMenuItem>
            <DropdownMenuItem>View admissions</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
