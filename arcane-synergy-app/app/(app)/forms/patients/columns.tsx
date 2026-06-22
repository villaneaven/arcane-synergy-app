"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
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
import { EditPatientDialog } from "@/components/edit-patient-dialog";

export type Patient = {
  patientID: string;
  firstName: string;
  lastName: string;
  dob: string;
  mrn: string;
  group: string;
  insurance: string;
  pcp: string;
  clinic: string;
  fullName: string;
  version: string;
};

export const createColumns = (
  onDataChange?: () => void,
): ColumnDef<Patient>[] => [
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
    accessorKey: "firstName",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "dob",
    header: "DOB",
    cell: ({ row }) => {
      const date = new Date(row.getValue("dob"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "mrn",
    header: "MRN",
  },
  {
    accessorKey: "group",
    header: "Group",
  },
  {
    accessorKey: "insurance",
    header: "Insurance",
  },
  {
    accessorKey: "pcp",
    header: "PCP",
  },
  {
    accessorKey: "clinic",
    header: "Clinic",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const patient = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(patient.patientID)}
              className="cursor-pointer"
            >
              Copy patient ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditPatientDialog
              patient={patient}
              onPatientUpdated={onDataChange}
            />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/forms/patients/${patient.patientID}`}>
                View patient
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              View admissions
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
