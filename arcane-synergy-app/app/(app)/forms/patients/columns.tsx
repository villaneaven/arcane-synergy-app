"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
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
import { EditPatientDialog } from "@/components/edit-patient-dialog";
import {
  SortableHeader,
  Stacked,
  formatDate,
  orEmpty,
  toDate,
} from "../admissions/cell-format";

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

/** Age in whole years on `today`, or null when the date can't be read. */
export function ageOn(dob: string | undefined | null, today = new Date()) {
  const birth = toDate(dob);
  if (!birth) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function formatAge(dob: string | undefined | null) {
  const age = ageOn(dob);
  return age === null ? null : `${age} yrs`;
}

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
    meta: { pin: "left" },
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => <SortableHeader column={column} label="Name" />,
    cell: ({ row }) =>
      row.original.fullName ? (
        <span className="font-medium">{row.original.fullName}</span>
      ) : (
        orEmpty(null)
      ),
    enableHiding: false,
    meta: { label: "Name", pin: "left" },
  },
  {
    accessorKey: "firstName",
    header: ({ column }) => (
      <SortableHeader column={column} label="First Name" />
    ),
    cell: ({ row }) => orEmpty(row.original.firstName),
    meta: { label: "First Name" },
  },
  {
    accessorKey: "lastName",
    header: ({ column }) => (
      <SortableHeader column={column} label="Last Name" />
    ),
    cell: ({ row }) => orEmpty(row.original.lastName),
    meta: { label: "Last Name" },
  },
  {
    accessorKey: "dob",
    header: ({ column }) => <SortableHeader column={column} label="DOB" />,
    cell: ({ row }) => (
      <Stacked
        primary={formatDate(row.original.dob)}
        secondary={[formatAge(row.original.dob)]}
      />
    ),
    meta: { label: "DOB (& age)" },
  },
  {
    accessorKey: "mrn",
    header: ({ column }) => <SortableHeader column={column} label="MRN" />,
    cell: ({ row }) =>
      row.original.mrn ? (
        <span className="tabular-nums">{row.original.mrn}</span>
      ) : (
        orEmpty(null)
      ),
    meta: { label: "MRN" },
  },
  {
    accessorKey: "group",
    header: ({ column }) => <SortableHeader column={column} label="Group" />,
    cell: ({ row }) => orEmpty(row.original.group),
    meta: { label: "Group" },
  },
  {
    accessorKey: "insurance",
    header: ({ column }) => (
      <SortableHeader column={column} label="Insurance" />
    ),
    cell: ({ row }) => orEmpty(row.original.insurance),
    meta: { label: "Insurance" },
  },
  {
    accessorKey: "pcp",
    header: ({ column }) => <SortableHeader column={column} label="PCP" />,
    cell: ({ row }) => orEmpty(row.original.pcp),
    meta: { label: "PCP" },
  },
  {
    accessorKey: "clinic",
    header: ({ column }) => <SortableHeader column={column} label="Clinic" />,
    cell: ({ row }) => orEmpty(row.original.clinic),
    meta: { label: "Clinic" },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const patient = row.original;

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
            <EditPatientDialog
              patient={patient}
              onPatientUpdated={onDataChange}
            />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/forms/patients/${patient.patientID}`}>
                View patient
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
    meta: { pin: "right" },
  },
];
