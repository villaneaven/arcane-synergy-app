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
  totalERVisits: number;
  totalADMVisits: number;
  dayOfWeekAdmitted: string | undefined;
  monthAdmitted: string | undefined;
  tcmDueDate: string | undefined;
  patientEngagement: number;
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
      const date = new Date(row.getValue("patientDOB"));
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
    cell: ({ row }) => {
      const dischargeTo = row.getValue("dischargeTo");
      if (!dischargeTo) return "N/A";
      return dischargeTo;
    },
  },
  {
    accessorKey: "dateSeen",
    header: "Date Seen",
    cell: ({ row }) => {
      const dateSeen = row.getValue("dateSeen");
      if (!dateSeen) return "N/A";
      const date = new Date(dateSeen as string);
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
    cell: ({ row }) => {
      const seenBy = row.getValue("seenBy");
      if (!seenBy) return "N/A";
      return seenBy;
    },
  },
  {
    accessorKey: "totalERVisits",
    header: "Total ER Visits",
  },
  {
    accessorKey: "totalADMVisits",
    header: "Total ADM Visits",
  },
  {
    accessorKey: "dayOfWeekAdmitted",
    header: "Day of Week Admitted",
    cell: ({ row }) => {
      const dayOfWeekAdmitted = row.getValue("dayOfWeekAdmitted");
      if (!dayOfWeekAdmitted) return "N/A";
      return dayOfWeekAdmitted;
    },
  },
  {
    accessorKey: "monthAdmitted",
    header: "Month Admitted",
    cell: ({ row }) => {
      const monthAdmitted = row.getValue("monthAdmitted");
      if (!monthAdmitted) return "N/A";
      return monthAdmitted;
    },
  },
  {
    accessorKey: "tcmDueDate",
    header: "TCM Due Date",
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
    accessorKey: "patientEngagement",
    header: "Patient Engagement",
  },
  {
    accessorKey: "readmissionFlag",
    header: "Readmission Flag",
    cell: ({ row }) => {
      return row.getValue("readmissionFlag") ? "Yes" : "No";
    },
  },
  {
    accessorKey: "nextAdmissionDate",
    header: "Next Admission Date",
    cell: ({ row }) => {
      const nextAdmissionDate = row.getValue("nextAdmissionDate");
      if (!nextAdmissionDate) return "N/A";
      const date = new Date(nextAdmissionDate as string);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "finalDischargeDate",
    header: "Final Discharge Date",
    cell: ({ row }) => {
      const finalDischargeDate = row.getValue("finalDischargeDate");
      if (!finalDischargeDate) return "N/A";
      const date = new Date(finalDischargeDate as string);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
  {
    accessorKey: "countOfTransfers",
    header: "Count of Transfers",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status");
      if (!status) return "N/A";
      return status;
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
  },
];
