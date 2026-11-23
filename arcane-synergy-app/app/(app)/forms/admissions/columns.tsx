"use client";

import * as React from "react";
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
import { Patient } from "../patients/columns";
import { EditAdmissionDialog } from "@/components/edit-admission-dialog";

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

function toDate(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string | undefined | null) {
  const date = toDate(value);
  if (!date) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysBetween(start: string | undefined, end: string | undefined) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from || !to) return null;
  const fromDay = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toDay = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toDay - fromDay) / 86_400_000);
}

function Stacked({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: (string | null | undefined)[];
}) {
  const details = (secondary ?? []).filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col leading-tight">
      <span>{primary ?? "N/A"}</span>
      {details ? (
        <span className="text-muted-foreground text-xs">{details}</span>
      ) : null}
    </div>
  );
}

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
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="cursor-pointer"
        >
          Patient
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const patient = row.original.patient;
      return (
        <Stacked
          primary={
            <span className="font-medium">{patient?.fullName || "N/A"}</span>
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
    cell: ({ row }) => row.original.status || "N/A",
    meta: { label: "Status" },
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { label: "Type" },
  },
  {
    id: "facility",
    accessorFn: (row) => row.facility ?? "",
    header: "Facility",
    cell: ({ row }) => (
      <Stacked
        primary={row.original.facility || "N/A"}
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
    id: "stay",
    accessorFn: (row) => row.admissionDate,
    header: "Admitted → Discharged",
    cell: ({ row }) => {
      const { admissionDate, dischargeDate } = row.original;
      const days = daysBetween(admissionDate, dischargeDate);
      return (
        <Stacked
          primary={`${formatDate(admissionDate) ?? "N/A"} → ${
            formatDate(dischargeDate) ?? "N/A"
          }`}
          secondary={[
            formatTime(admissionDate),
            days === null ? null : `${days} ${days === 1 ? "day" : "days"}`,
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
      if (!dx) return "N/A";
      return (
        <div className="max-w-48 truncate" title={dx}>
          {dx}
        </div>
      );
    },
    meta: { label: "DX" },
  },
  {
    id: "notification",
    accessorFn: (row) => row.notificationSource ?? "",
    header: "Notified",
    cell: ({ row }) => (
      <Stacked
        primary={row.original.notificationSource || "N/A"}
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
    cell: ({ row }) => row.original.dischargeTo || "N/A",
    meta: { label: "Discharge To" },
  },
  {
    id: "seen",
    accessorFn: (row) => row.dateSeen ?? "",
    header: "Seen",
    cell: ({ row }) => (
      <Stacked
        primary={formatDate(row.original.dateSeen) ?? "N/A"}
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
    cell: ({ row }) => row.original.dayOfWeekAdmitted || "N/A",
    meta: { label: "Day of Week Admitted" },
  },
  {
    accessorKey: "monthAdmitted",
    header: "Month Admitted",
    cell: ({ row }) => row.original.monthAdmitted || "N/A",
    meta: { label: "Month Admitted" },
  },
  {
    accessorKey: "tcmDueDate",
    header: "TCM Due Date",
    cell: ({ row }) => formatDate(row.original.tcmDueDate) ?? "N/A",
    meta: { label: "TCM Due Date" },
  },
  {
    accessorKey: "patientEngagement",
    header: () => <div className="text-right">Patient Engagement</div>,
    cell: ({ row }) => {
      const days = row.getValue<number | null>("patientEngagement");
      return <div className="text-right tabular-nums">{days ?? ""}</div>;
    },
    meta: { label: "Patient Engagement" },
  },
  {
    accessorKey: "readmissionFlag",
    header: "Readmission Flag",
    cell: ({ row }) => (row.original.readmissionFlag ? "Yes" : "No"),
    meta: { label: "Readmission Flag" },
  },
  {
    accessorKey: "nextAdmissionDate",
    header: "Next Admission Date",
    cell: ({ row }) => formatDate(row.original.nextAdmissionDate) ?? "N/A",
    meta: { label: "Next Admission Date" },
  },
  {
    accessorKey: "finalDischargeDate",
    header: "Final Discharge Date",
    cell: ({ row }) => formatDate(row.original.finalDischargeDate) ?? "N/A",
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
      if (!notes) return "N/A";
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
        primary={row.original.lastEditedBy || "N/A"}
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
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(admission.admissionId)
              }
            >
              Copy admission ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <EditAdmissionDialog
              admission={admission}
              onAdmissionUpdated={onDataChange}
            />
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
