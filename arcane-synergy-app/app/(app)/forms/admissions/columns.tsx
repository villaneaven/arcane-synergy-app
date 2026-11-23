"use client";

import * as React from "react";
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
import { Patient } from "../patients/columns";
import { EditAdmissionDialog } from "@/components/edit-admission-dialog";
import {
  FlagBadge,
  SortableHeader,
  Stacked,
  StatusBadge,
  TypeBadge,
  daysBetween,
  formatDate,
  formatDateTime,
  formatStayLength,
  formatTime,
  orEmpty,
} from "./cell-format";

export type Admission = {
  admissionId: string;
  patientID: string;
  patient: Patient;
  facilityType: string | undefined;
  facility: string | undefined;
  type: string;
  dx: string | undefined;
  notificationSource: string | undefined;
  dateNotified: string;
  admissionDate: string;
  dischargeDate: string | undefined;
  dischargeTo: string | undefined;
  dateSeen: string | undefined;
  seenBy: string | undefined;
  notes: string | undefined;
  lastEditedBy: string | undefined;
  lastEditedAt: string | undefined;
  totalERVisits: number;
  totalADMVisits: number;
  dayOfWeekAdmitted: string | undefined;
  monthAdmitted: string | undefined;
  tcmDueDate: string | undefined;
  patientEngagement: number | null;
  readmissionFlag: boolean;
  nextAdmissionDate: string | undefined;
  finalDischargeDate: string | undefined;
  countOfTransfers: number;
  status: string | undefined;
  transfers: string | undefined;
};

export const createColumns = (
  onDataChange?: () => void,
): ColumnDef<Admission>[] => [
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
    id: "patientFullName",
    accessorFn: (row) => row.patient?.fullName ?? "",
    header: ({ column }) => <SortableHeader column={column} label="Patient" />,
    cell: ({ row }) => {
      const patient = row.original.patient;
      return (
        <Stacked
          primary={
            patient?.fullName ? (
              <span className="font-medium">{patient.fullName}</span>
            ) : null
          }
          secondary={[formatDate(patient?.dob), patient?.group]}
        />
      );
    },
    enableHiding: false,
    meta: {
      label: "Patient",
      pin: "left",
      exportFields: [
        { header: "group", value: (row) => row.patient?.group ?? "" },
        {
          header: "patientFullName",
          value: (row) => row.patient?.fullName ?? "",
        },
        { header: "patientDOB", value: (row) => row.patient?.dob ?? "" },
      ],
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { label: "Status" },
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
    header: "Facility",
    cell: ({ row }) => (
      <Stacked
        primary={row.original.facility}
        secondary={[row.original.facilityType]}
      />
    ),
    meta: {
      label: "Facility",
      exportFields: [
        { header: "facilityType", value: (row) => row.facilityType },
        { header: "facility", value: (row) => row.facility },
      ],
    },
  },
  {
    // Shows the whole stay; sorts by admission date.
    id: "admissionDate",
    accessorFn: (row) => row.admissionDate,
    header: ({ column }) => (
      <SortableHeader column={column} label="Admitted → Discharged" descFirst />
    ),
    cell: ({ row }) => {
      const { admissionDate, dischargeDate } = row.original;
      return (
        <Stacked
          primary={
            <>
              {orEmpty(formatDate(admissionDate))} →{" "}
              {orEmpty(formatDate(dischargeDate))}
            </>
          }
          secondary={[
            formatTime(admissionDate),
            formatStayLength(daysBetween(admissionDate, dischargeDate)),
          ]}
        />
      );
    },
    meta: {
      label: "Admitted → Discharged",
      exportFields: [
        { header: "admissionDate", value: (row) => row.admissionDate },
        {
          header: "timeOfAdmission",
          value: (row) => formatTime(row.admissionDate) ?? "",
        },
        { header: "dischargeDate", value: (row) => row.dischargeDate },
      ],
    },
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
    meta: {
      label: "Notified (source & date)",
      exportFields: [
        {
          header: "notificationSource",
          value: (row) => row.notificationSource,
        },
        { header: "dateNotified", value: (row) => row.dateNotified },
      ],
    },
  },
  {
    accessorKey: "dischargeTo",
    header: "Discharge To",
    cell: ({ row }) => orEmpty(row.original.dischargeTo),
    meta: { label: "Discharge To" },
  },
  {
    id: "seen",
    accessorFn: (row) => row.dateSeen ?? "",
    header: "Seen",
    cell: ({ row }) => (
      <Stacked
        primary={formatDate(row.original.dateSeen)}
        secondary={[row.original.seenBy]}
      />
    ),
    meta: {
      label: "Seen (date & by)",
      exportFields: [
        { header: "dateSeen", value: (row) => row.dateSeen },
        { header: "seenBy", value: (row) => row.seenBy },
      ],
    },
  },
  {
    accessorKey: "totalERVisits",
    header: "Total ER Visits",
    meta: { label: "Total ER Visits" },
  },
  {
    accessorKey: "totalADMVisits",
    header: "Total ADM Visits",
    meta: { label: "Total ADM Visits" },
  },
  {
    accessorKey: "dayOfWeekAdmitted",
    header: "Day of Week Admitted",
    cell: ({ row }) => orEmpty(row.original.dayOfWeekAdmitted),
    meta: { label: "Day of Week Admitted" },
  },
  {
    accessorKey: "monthAdmitted",
    header: "Month Admitted",
    cell: ({ row }) => orEmpty(row.original.monthAdmitted),
    meta: { label: "Month Admitted" },
  },
  {
    accessorKey: "tcmDueDate",
    header: "TCM Due Date",
    cell: ({ row }) => orEmpty(formatDate(row.original.tcmDueDate)),
    meta: { label: "TCM Due Date" },
  },
  {
    accessorKey: "patientEngagement",
    header: () => <div className="text-right">Patient Engagement</div>,
    cell: ({ row }) => {
      const days = row.getValue<number | null>("patientEngagement");
      return <div className="text-right tabular-nums">{orEmpty(days)}</div>;
    },
    meta: { label: "Patient Engagement" },
  },
  {
    accessorKey: "readmissionFlag",
    header: "Readmission Flag",
    cell: ({ row }) => <FlagBadge flagged={row.original.readmissionFlag} />,
    meta: { label: "Readmission Flag" },
  },
  {
    accessorKey: "nextAdmissionDate",
    header: "Next Admission Date",
    cell: ({ row }) => orEmpty(formatDate(row.original.nextAdmissionDate)),
    meta: { label: "Next Admission Date" },
  },
  {
    accessorKey: "finalDischargeDate",
    header: "Final Discharge Date",
    cell: ({ row }) => orEmpty(formatDate(row.original.finalDischargeDate)),
    meta: { label: "Final Discharge Date" },
  },
  {
    accessorKey: "countOfTransfers",
    header: "Count of Transfers",
    meta: { label: "Count of Transfers" },
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
    header: "Last Edited",
    cell: ({ row }) => (
      <Stacked
        primary={row.original.lastEditedBy}
        secondary={[formatDateTime(row.original.lastEditedAt)]}
      />
    ),
    meta: {
      label: "Last Edited (by & when)",
      exportFields: [
        { header: "lastEditedBy", value: (row) => row.lastEditedBy },
        { header: "lastEditedAt", value: (row) => row.lastEditedAt },
      ],
    },
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
            <EditAdmissionDialog
              admission={admission}
              onAdmissionUpdated={onDataChange}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/forms/patients/${admission.patientID}`}>
                View patient
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/forms/admissions/${admission.admissionId}`}>
                View transfers
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
